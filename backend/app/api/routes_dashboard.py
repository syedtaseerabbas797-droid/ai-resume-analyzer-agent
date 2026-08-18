"""
Dashboard APIs — JobScout AI
Frontend-ready endpoints that aggregate jobs, match scores, and agent progress
into clean, paginated JSON responses for the React/Next.js dashboard.
"""
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, col

from app.core.database import get_session
from app.models.agent import AgentRun, AgentStep, SearchQuery
from app.models.job import JobResult, JobMatch
from app.models.candidate import Candidate

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_job_card(job: JobResult, match: JobMatch | None) -> dict:
    """Assembles a frontend-ready job card dict."""
    return {
        "job_id":        str(job.id),
        "title":         job.title,
        "company":       job.company,
        "location":      job.location,
        "url":           job.url,
        "source":        job.source,
        "snippet":       (job.description or "")[:300],
        "collected_at":  job.created_at.isoformat() if job.created_at else None,
        # ── Match / ATS scoring ─────────────────────────────────────────
        "match": {
            "match_id":        str(match.id)           if match else None,
            "overall_score":   match.overall_score     if match else None,
            "match_label":     match.match_label       if match else "Not scored",
            "skills_score":    match.skills_score      if match else None,
            "experience_score":match.experience_score  if match else None,
            "role_score":      match.role_score        if match else None,
            "matched_skills":  match.matched_skills    if match else [],
            "missing_skills":  match.missing_skills    if match else [],
            "reasoning":       match.reasoning         if match else None,
            "improvement_tips":match.improvement_tips  if match else [],
        } if match else None,
    }


def _fetch_match_for_job(session: Session, job_id: uuid.UUID) -> JobMatch | None:
    stmt = select(JobMatch).where(JobMatch.job_result_id == job_id)
    return session.exec(stmt).first()


# ---------------------------------------------------------------------------
# 1. GET /dashboard/jobs/{candidate_id}
#    Ranked job list for a candidate — across ALL their agent runs.
# ---------------------------------------------------------------------------
@router.get("/jobs/{candidate_id}")
def get_ranked_jobs(
    candidate_id: uuid.UUID,
    page:      int = Query(default=1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(default=10, ge=1, le=50, description="Results per page"),
    limit: int | None = Query(default=None, ge=1, le=50, description="Optional offset-based result limit"),
    offset: int = Query(default=0, ge=0, description="Optional offset-based result offset"),
    session: Session = Depends(get_session),
):
    """
    Returns all jobs collected for a candidate, ordered by ATS score descending.
    Jobs that were not yet scored appear at the bottom (NULL scores last).
    """
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    # All AgentRun IDs for this candidate
    run_ids_stmt = select(AgentRun.id).where(AgentRun.candidate_id == candidate_id)
    run_ids = [r for r in session.exec(run_ids_stmt).all()]

    if not run_ids:
        return {
            "candidate_id": str(candidate_id),
            "total_jobs": 0,
            "page": page,
            "page_size": page_size,
            "limit": limit or page_size,
            "offset": 0,
            "total_pages": 1,
            "jobs": [],
        }

    # All jobs for those runs
    jobs_stmt = select(JobResult).where(col(JobResult.agent_run_id).in_(run_ids))
    all_jobs = session.exec(jobs_stmt).all()

    # Fetch matches and zip, then sort by score DESC (None treated as -1)
    job_cards = []
    for job in all_jobs:
        match = _fetch_match_for_job(session, job.id)
        job_cards.append((match.overall_score if match else -1, job, match))

    job_cards.sort(key=lambda x: x[0], reverse=True)

    total = len(job_cards)
    if limit is not None:
        start = offset
        end = offset + limit
        response_page_size = limit
        response_page = (offset // limit) + 1
    else:
        start = (page - 1) * page_size
        end = start + page_size
        response_page_size = page_size
        response_page = page

    page_items = job_cards[start:end]

    return {
        "candidate_id": str(candidate_id),
        "total_jobs":   total,
        "page":         response_page,
        "page_size":    response_page_size,
        "limit":        response_page_size,
        "offset":       start,
        "total_pages":  max(1, -(-total // response_page_size)),   # ceiling division
        "jobs": [_build_job_card(job, match) for _, job, match in page_items],
    }


# ---------------------------------------------------------------------------
# 2. GET /dashboard/job/{job_id}
#    Full detail view for a single job result + its match breakdown.
# ---------------------------------------------------------------------------
@router.get("/job/{job_id}")
def get_job_detail(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    """
    Returns full job description + complete ATS score breakdown.
    Intended for the "Job Detail" / "Match Explanation" panel in the dashboard.
    """
    job = session.get(JobResult, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    match = _fetch_match_for_job(session, job_id)

    return {
        "job_id":       str(job.id),
        "agent_run_id": str(job.agent_run_id),
        "title":        job.title,
        "company":      job.company,
        "location":     job.location,
        "url":          job.url,
        "source":       job.source,
        "full_description": job.description,
        "collected_at": job.created_at.isoformat() if job.created_at else None,
        "match": {
            "match_id":        str(match.id)            if match else None,
            "overall_score":   match.overall_score      if match else None,
            "match_label":     match.match_label        if match else "Not scored",
            "skills_score":    match.skills_score       if match else None,
            "experience_score":match.experience_score   if match else None,
            "role_score":      match.role_score         if match else None,
            "matched_skills":  match.matched_skills     if match else [],
            "missing_skills":  match.missing_skills     if match else [],
            "reasoning":       match.reasoning          if match else None,
            "improvement_tips":match.improvement_tips   if match else [],
        } if match else None,
    }


# ---------------------------------------------------------------------------
# 3. GET /dashboard/agent-run/{run_id}
#    Live agent progress — steps timeline + collected queries + job count.
# ---------------------------------------------------------------------------
@router.get("/agent-run/{run_id}")
def get_agent_run_detail(
    run_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    """
    Returns the full agent run timeline: status, steps, search queries, and
    a summary of how many jobs were collected and scored. Ideal for the
    "Agent Timeline" panel that shows real-time progress on the dashboard.
    """
    run = session.get(AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AgentRun not found.")

    # Steps ordered chronologically
    steps = session.exec(
        select(AgentStep)
        .where(AgentStep.agent_run_id == run_id)
        .order_by(col(AgentStep.started_at).asc())
    ).all()

    # Search queries used
    queries = session.exec(
        select(SearchQuery)
        .where(SearchQuery.agent_run_id == run_id)
        .order_by(col(SearchQuery.created_at).asc())
    ).all()

    # Job counts
    all_jobs = session.exec(
        select(JobResult).where(JobResult.agent_run_id == run_id)
    ).all()

    matches = {
        match.job_result_id: match
        for match in session.exec(
            select(JobMatch).where(col(JobMatch.job_result_id).in_([job.id for job in all_jobs]))
        ).all()
    } if all_jobs else {}

    scored_jobs = [job for job in all_jobs if job.id in matches]

    # Quick score distribution
    strong = medium = weak = unscored = 0
    for job in all_jobs:
        m = matches.get(job.id)
        if m is None:
            unscored += 1
        elif m.overall_score >= 80:
            strong += 1
        elif m.overall_score >= 60:
            medium += 1
        else:
            weak += 1

    return {
        "run_id":       str(run.id),
        "candidate_id": str(run.candidate_id),
        "status":       run.status,
        "error_message":run.error_message,
        "started_at":   run.started_at.isoformat()   if run.started_at   else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        # ── Step timeline ────────────────────────────────────────────────
        "steps": [
            {
                "step_name":    s.step_name,
                "status":       s.status,
                "message":      s.message,
                "started_at":   s.started_at.isoformat()   if s.started_at   else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in steps
        ],
        # ── Search queries used ─────────────────────────────────────────
        "search_queries": [
            {"query": q.query, "source": q.source}
            for q in queries
        ],
        # ── Summary ─────────────────────────────────────────────────────
        "summary": {
            "total_jobs_collected": len(all_jobs),
            "jobs_scored":          len(scored_jobs),
            "strong_matches":       strong,
            "medium_matches":       medium,
            "weak_matches":         weak,
            "unscored":             unscored,
        },
    }

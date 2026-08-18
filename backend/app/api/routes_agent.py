import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.candidate import Candidate
from app.models.agent import AgentRun, AgentStep, SearchQuery
from app.models.job import JobResult
from app.services.agent_orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /agent/run/{candidate_id}
# ---------------------------------------------------------------------------
@router.post("/run/{candidate_id}", status_code=status.HTTP_202_ACCEPTED)
async def run_agent(
    candidate_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    Triggers the autonomous JobScout AI agent for a specific candidate.
    Returns immediately (202 Accepted) while the agent runs in the background.
    """
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found.",
        )

    agent_run = AgentRun(candidate_id=candidate.id, status="started")
    session.add(agent_run)
    session.commit()
    session.refresh(agent_run)

    orchestrator = AgentOrchestrator()
    background_tasks.add_task(orchestrator.start_run, agent_run.id)

    return {
        "run_id": str(agent_run.id),
        "candidate_id": str(candidate.id),
        "status": "started",
    }


# ---------------------------------------------------------------------------
# GET /agent/status/{run_id}
# ---------------------------------------------------------------------------
@router.get("/status/{run_id}")
def get_agent_status(run_id: uuid.UUID, session: Session = Depends(get_session)):
    """
    Returns the current status of an agent run plus a timeline of all steps.
    Poll this endpoint to track real-time progress.
    """
    run = session.get(AgentRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AgentRun not found.",
        )

    steps_stmt = (
        select(AgentStep)
        .where(AgentStep.agent_run_id == run_id)
        .order_by(AgentStep.started_at.asc())
    )
    steps = session.exec(steps_stmt).all()

    queries_stmt = (
        select(SearchQuery)
        .where(SearchQuery.agent_run_id == run_id)
        .order_by(SearchQuery.created_at.asc())
    )
    queries = session.exec(queries_stmt).all()

    return {
        "run_id": str(run.id),
        "candidate_id": str(run.candidate_id),
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "error_message": run.error_message,
        "steps": [
            {
                "step_name": s.step_name,
                "status": s.status,
                "message": s.message,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in steps
        ],
        "search_queries": [q.query for q in queries],
    }


# ---------------------------------------------------------------------------
# GET /agent/results/{run_id}
# ---------------------------------------------------------------------------
@router.get("/results/{run_id}")
def get_agent_results(run_id: uuid.UUID, session: Session = Depends(get_session)):
    """
    Returns all JobResult records collected during a completed agent run,
    ordered newest first.
    """
    run = session.get(AgentRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AgentRun not found.",
        )

    jobs_stmt = (
        select(JobResult)
        .where(JobResult.agent_run_id == run_id)
        .order_by(JobResult.created_at.desc())
    )
    jobs = session.exec(jobs_stmt).all()

    return {
        "run_id": str(run.id),
        "candidate_id": str(run.candidate_id),
        "status": run.status,
        "total_jobs": len(jobs),
        "jobs": [
            {
                "job_id": str(j.id),
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "url": j.url,
                "source": j.source,
                "snippet": j.description,
                "search_query_id": str(j.search_query_id) if j.search_query_id else None,
                "collected_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
    }

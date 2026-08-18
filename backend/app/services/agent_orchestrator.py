import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.database import engine
from app.models.agent import AgentRun, AgentStep, SearchQuery
from app.models.job import JobMatch, JobResult
from app.models.resume import ResumeAnalysis
from app.services.analysis.job_matching_service import JobMatchingError, JobMatchingService
from app.services.llm.groq_client import GroqChatClient, GroqClientError
from app.services.search.jina_service import JinaReaderService
from app.services.search.tavily_service import TavilySearchError, TavilySearchService


logger = logging.getLogger(__name__)

MAX_JOBS_TO_ENRICH_PER_RUN = 8
MAX_JOBS_TO_SCORE_PER_RUN = 8
# Bounds a slow Jina page so demo batches stay predictable (attempts capped in JinaReaderService).
JINA_PER_JOB_HTTP_TIMEOUT_SECONDS = 12.0



def utc_now():
    return datetime.now(timezone.utc)


def _candidate_profile_tokens(skills: list[str], roles: list[str]) -> set[str]:
    tokens: set[str] = set()
    for raw in [*skills, *roles]:
        if not raw or not str(raw).strip():
            continue
        for part in re.split(r"[\s,/;|()+]+", str(raw).lower()):
            tok = part.strip()
            if len(tok) >= 2:
                tokens.add(tok)
    return tokens


def _prioritized_jobs_for_demo(
    jobs_collected: list[JobResult],
    skills: list[str],
    roles: list[str],
) -> list[JobResult]:
    """Rank Tavily-backed jobs before enrichment/scoring — title + Tavily snippet (or text)."""
    tokens = _candidate_profile_tokens(skills or [], roles or [])
    if not tokens:
        return list(jobs_collected)

    def relevance(job: JobResult) -> int:
        hay = f"{job.title or ''}\n{(job.description or '')[:2400]}".lower()
        return sum(1 for tok in tokens if tok in hay)

    ranked = sorted(
        enumerate(jobs_collected),
        key=lambda ij: (-relevance(ij[1]), ij[0]),
    )
    return [j for _, j in ranked]


class AgentOrchestrator:
    """
    Orchestrates the hackathon-ready JobScout AI job-search workflow.
    Runs inside FastAPI BackgroundTasks and owns its own database session.
    """

    def __init__(self):
        self._last_query_source = "groq"

    def _create_step(
        self,
        session: Session,
        run_id: uuid.UUID,
        step_name: str,
        status: str,
        message: str | None = None,
    ) -> AgentStep:
        step = AgentStep(
            agent_run_id=run_id,
            step_name=step_name,
            status=status,
            message=message,
        )
        session.add(step)
        session.commit()
        session.refresh(step)
        return step

    def _update_step(
        self,
        session: Session,
        step: AgentStep,
        status: str,
        message: str | None = None,
    ):
        step.status = status
        if message:
            step.message = message
        if status in ["completed", "failed", "skipped"]:
            step.completed_at = utc_now()
        session.add(step)
        session.commit()

    def _finish_run(
        self,
        session: Session,
        run: AgentRun,
        status: str,
        error_message: str | None = None,
    ):
        run.status = status
        run.error_message = error_message
        run.completed_at = utc_now()
        session.add(run)
        session.commit()

    def _fallback_queries(self) -> list[str]:
        self._last_query_source = "fallback"
        return [
            "Software Engineer Remote",
            "Backend Developer",
            "Full Stack Engineer",
            "Python Developer",
            "Tech Jobs",
        ]

    def _validate_query_payload(self, payload: object) -> list[str]:
        if not isinstance(payload, dict):
            raise ValueError("Groq query generation response must be a JSON object.")

        queries = payload.get("queries")
        if not isinstance(queries, list):
            raise ValueError("Groq query generation response must include a queries list.")

        cleaned_queries = []
        seen_queries = set()
        for query in queries:
            if not isinstance(query, str):
                raise ValueError("Every generated query must be a string.")
            query = query.strip()
            if not query:
                continue
            query_key = query.lower()
            if query_key in seen_queries:
                continue
            seen_queries.add(query_key)
            cleaned_queries.append(query)

        if not cleaned_queries:
            raise ValueError("Groq returned no usable job search queries.")

        return cleaned_queries[:5]

    def generate_search_queries(self, session: Session, run_id: uuid.UUID) -> list[str]:
        """
        Generates search queries with Groq from the latest completed resume analysis.
        Falls back to generic queries only after logging the real failure.
        """
        logger.info(f"Generating search queries for run {run_id}")
        self._last_query_source = "groq"

        run = session.get(AgentRun, run_id)
        if not run:
            logger.error(f"AgentRun {run_id} not found.")
            return self._fallback_queries()

        statement = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.candidate_id == run.candidate_id)
            .where(ResumeAnalysis.status == "completed")
            .order_by(ResumeAnalysis.created_at.desc())
        )
        analysis = session.exec(statement).first()

        if not analysis:
            logger.warning(
                f"No completed ResumeAnalysis found for candidate {run.candidate_id}. "
                "Using fallback queries."
            )
            return self._fallback_queries()

        skills = ", ".join(analysis.extracted_skills or []) or "General Software Engineering"
        roles = ", ".join(analysis.recommended_roles or []) or "Software Engineer"
        experience = analysis.experience_summary or "Experience not specified"

        prompt = f"""
You are an expert technical recruiter and job search assistant.
Generate exactly 5 highly optimized job search queries for Tavily.

Candidate profile:
Skills: {skills}
Recommended Roles: {roles}
Experience Summary: {experience}

Return concise, realistic job-search queries that can find current job postings.
""".strip()

        messages = [
            {"role": "system", "content": "You output only valid JSON matching the supplied schema."},
            {"role": "user", "content": prompt},
        ]

        json_schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "queries": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Five optimized job search query strings.",
                }
            },
            "required": ["queries"],
        }

        try:
            result = GroqChatClient().create_json_completion(
                messages=messages,
                json_schema=json_schema,
                schema_name="job_search_queries",
                temperature=0.4,
            )
            payload = json.loads(result.content)
            return self._validate_query_payload(payload)
        except GroqClientError as exc:
            logger.error(f"Groq API/schema error during query generation: {exc}")
            return self._fallback_queries()
        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            logger.error(f"Invalid Groq query generation response: {exc}")
            return self._fallback_queries()
        except Exception as exc:
            logger.exception(f"Unexpected error generating queries: {exc}")
            return self._fallback_queries()

    def start_run(self, agent_run_id: uuid.UUID):
        logger.info(f"Starting agent run {agent_run_id}")

        with Session(engine) as session:
            run = session.get(AgentRun, agent_run_id)
            if not run:
                logger.error(f"AgentRun {agent_run_id} not found.")
                return

            partial_issues: list[str] = []

            try:
                run.status = "running"
                run.error_message = None
                session.add(run)
                session.commit()

                step_gen = self._create_step(
                    session,
                    run.id,
                    "query_generation",
                    "running",
                    "Generating search queries",
                )

                queries = self.generate_search_queries(session, run.id)
                query_source = self._last_query_source

                saved_queries: list[SearchQuery] = []
                for query in queries:
                    search_query = SearchQuery(
                        agent_run_id=run.id,
                        query=query,
                        source=query_source,
                    )
                    session.add(search_query)
                    saved_queries.append(search_query)
                session.commit()
                for search_query in saved_queries:
                    session.refresh(search_query)

                self._update_step(
                    session,
                    step_gen,
                    "completed",
                    f"Generated {len(saved_queries)} queries",
                )

                step_search = self._create_step(
                    session,
                    run.id,
                    "job_search",
                    "running",
                    f"Executing Tavily searches for {len(saved_queries)} queries",
                )

                search_service = TavilySearchService()
                total_jobs_found = 0
                seen_urls: set[str] = set()
                search_errors: list[str] = []

                for search_query in saved_queries:
                    try:
                        results = search_service.search_jobs(search_query.query)
                    except TavilySearchError as exc:
                        message = f"{search_query.query}: {exc}"
                        logger.error(f"Tavily search failed: {message}")
                        search_errors.append(message)
                        continue

                    for result in results:
                        url = (result.get("url") or "").strip()
                        if not url:
                            continue

                        url_key = url.lower()
                        if url_key in seen_urls:
                            continue
                        seen_urls.add(url_key)

                        job_result = JobResult(
                            agent_run_id=run.id,
                            search_query_id=search_query.id,
                            title=result.get("title") or "Job Opportunity",
                            url=url,
                            description=result.get("snippet") or "",
                            source=result.get("source") or "tavily",
                        )
                        session.add(job_result)
                        total_jobs_found += 1

                session.commit()

                if total_jobs_found == 0:
                    self._update_step(session, step_search, "failed", "Tavily: Found 0 jobs")
                    error_message = "Tavily returned 0 jobs for generated queries."
                    if search_errors:
                        error_message += " " + " | ".join(search_errors[:3])
                    self._finish_run(session, run, "failed", error_message)
                    logger.error(error_message)
                    return

                if search_errors:
                    partial_issues.append(f"Some Tavily searches failed ({len(search_errors)}).")

                self._update_step(
                    session,
                    step_search,
                    "completed",
                    f"Tavily: Found {total_jobs_found} jobs",
                )

                candidate_analysis = session.exec(
                    select(ResumeAnalysis)
                    .where(ResumeAnalysis.candidate_id == run.candidate_id)
                    .where(ResumeAnalysis.status == "completed")
                    .order_by(ResumeAnalysis.created_at.desc())
                ).first()

                saved_jobs = session.exec(
                    select(JobResult)
                    .where(JobResult.agent_run_id == run.id)
                    .order_by(JobResult.created_at.asc())
                ).all()

                if candidate_analysis:
                    prioritized_collect = _prioritized_jobs_for_demo(
                        saved_jobs,
                        candidate_analysis.extracted_skills or [],
                        candidate_analysis.recommended_roles or [],
                    )
                else:
                    prioritized_collect = list(saved_jobs)

                to_enrich = prioritized_collect[:MAX_JOBS_TO_ENRICH_PER_RUN]
                demo_prioritized_ordered_ids = [j.id for j in to_enrich]
                skipped_jina_demo_cap = len(saved_jobs) - len(to_enrich)

                step_extract = self._create_step(
                    session,
                    run.id,
                    "jina_extraction",
                    "running",
                    (
                        f"Enriching up to {MAX_JOBS_TO_ENRICH_PER_RUN} prioritized jobs "
                        f"from {total_jobs_found} collected (demo speed)"
                    ),
                )

                logger.info(
                    "Jina demo batch: enrich_selected=%s collected=%s enrich_cap=%s skipped_demo_cap=%s",
                    len(to_enrich),
                    len(saved_jobs),
                    MAX_JOBS_TO_ENRICH_PER_RUN,
                    skipped_jina_demo_cap,
                )

                jina_service = JinaReaderService()
                extracted_count = 0
                jina_failures_in_demo_batch = 0

                for idx, job in enumerate(to_enrich, start=1):
                    snippet_fallback = (job.description or "").strip()

                    if not job.url:
                        jina_failures_in_demo_batch += 1
                        logger.warning(
                            "[jina enrich %s/%s] title=%r url=None success=False duration_sec=0.00 reason=no_url",
                            idx,
                            len(to_enrich),
                            job.title,
                        )
                        continue

                    t_start = time.perf_counter()
                    display_url = job.url[:120] + ("…" if len(job.url) > 120 else "")
                    result = jina_service.extract_job_content(
                        job.url,
                        timeout=JINA_PER_JOB_HTTP_TIMEOUT_SECONDS,
                        max_attempts=2,
                    )
                    elapsed = time.perf_counter() - t_start

                    if result["success"] and result["content"]:
                        job.description = result["content"]
                        session.add(job)
                        extracted_count += 1
                        logger.info(
                            "[jina enrich %s/%s] title=%r url=%s success=True duration_sec=%.2f",
                            idx,
                            len(to_enrich),
                            job.title,
                            display_url,
                            elapsed,
                        )
                    else:
                        job.description = snippet_fallback or (job.description or "")
                        session.add(job)
                        jina_failures_in_demo_batch += 1
                        logger.warning(
                            "[jina enrich %s/%s] title=%r url=%s success=False duration_sec=%.2f "
                            "(snippet retained for scoring)",
                            idx,
                            len(to_enrich),
                            job.title,
                            display_url,
                            elapsed,
                        )

                session.commit()
                extraction_complete_msg = (
                    f"Enriched top {len(to_enrich)} prioritized job(s) for faster demo results "
                    f"({extracted_count} full-page Jina extracts). "
                    f"{skipped_jina_demo_cap} listing(s) kept with search snippets only."
                )
                self._update_step(
                    session,
                    step_extract,
                    "completed",
                    extraction_complete_msg,
                )

                if jina_failures_in_demo_batch > 0:
                    partial_issues.append(
                        f"Jina could not enrich {jina_failures_in_demo_batch} prioritized demo listing(s); "
                        "snippets retained when possible."
                    )

                jobs_for_match = session.exec(
                    select(JobResult)
                    .where(JobResult.agent_run_id == run.id)
                    .order_by(JobResult.created_at.asc())
                ).all()

                if not candidate_analysis:
                    step_match = self._create_step(
                        session,
                        run.id,
                        "job_matching",
                        "running",
                        "Scoring jobs against candidate profile",
                    )
                    self._update_step(
                        session,
                        step_match,
                        "skipped",
                        "No resume analysis found for candidate",
                    )
                    partial_issues.append("No completed resume analysis was available for matching.")
                else:
                    enriched = [j for j in jobs_for_match if (j.description or "").strip()]
                    no_description = [j for j in jobs_for_match if not (j.description or "").strip()]
                    jobs_by_id = {j.id: j for j in jobs_for_match}
                    to_score_ids = demo_prioritized_ordered_ids[:MAX_JOBS_TO_SCORE_PER_RUN]
                    to_score = [jobs_by_id[i] for i in to_score_ids if i in jobs_by_id]

                    leftover_for_demo_speed = len(jobs_for_match) - len(to_score)

                    step_match = self._create_step(
                        session,
                        run.id,
                        "job_matching",
                        "running",
                        (
                            f"Scoring prioritized demo cohort ({len(to_score)} job(s), "
                            f"score_cap={MAX_JOBS_TO_SCORE_PER_RUN})"
                        ),
                    )

                    matching_service = JobMatchingService()
                    matched_count = 0
                    scoring_attempt_failures = 0

                    total_to_score = len(to_score)

                    if no_description:
                        logger.warning(
                            "%s job listing(s) have no description — skipped scoring",
                            len(no_description),
                        )

                    logger.info(
                        "Demo scoring batch: cohort=%s scoring job(s); %s collected total (score_cap=%s)",
                        total_to_score,
                        len(jobs_for_match),
                        MAX_JOBS_TO_SCORE_PER_RUN,
                    )

                    for idx, job in enumerate(to_score, start=1):
                        try:
                            match_result, groq_attempts = matching_service.match_job(
                                candidate_skills=candidate_analysis.extracted_skills or [],
                                candidate_roles=candidate_analysis.recommended_roles or [],
                                experience_summary=candidate_analysis.experience_summary or "",
                                job_title=job.title,
                                job_description=job.description,
                            )
                        except JobMatchingError as exc:
                            scoring_attempt_failures += 1
                            logger.warning(
                                "[match score %s/%s] title=%r success=False score=None groq_attempts=n/a reason=%s",
                                idx,
                                total_to_score,
                                job.title,
                                exc,
                            )
                            continue

                        job_match = JobMatch(
                            job_result_id=job.id,
                            overall_score=match_result.overall_score,
                            match_label=match_result.match_label,
                            skills_score=match_result.skills_score,
                            experience_score=match_result.experience_score,
                            role_score=match_result.role_score,
                            matched_skills=match_result.matched_skills,
                            missing_skills=match_result.missing_skills,
                            reasoning=match_result.reasoning,
                            improvement_tips=match_result.improvement_tips,
                        )
                        session.add(job_match)
                        matched_count += 1
                        logger.info(
                            "[match score %s/%s] title=%r success=True overall_score=%s groq_http_attempts=%s",
                            idx,
                            total_to_score,
                            job.title,
                            match_result.overall_score,
                            groq_attempts,
                        )

                    session.commit()

                    if matched_count == 0:
                        if not enriched:
                            msg = (
                                "No enriched job descriptions available to score "
                                "(every listing lacked description text)."
                            )
                        elif total_to_score == 0:
                            msg = "No jobs met the enrichment criteria for the scoring batch."
                        else:
                            msg = (
                                f"No prioritized jobs scored successfully ({scoring_attempt_failures or total_to_score} "
                                "attempt(s) failed or returned no persisted match)."
                            )
                        self._update_step(session, step_match, "failed", msg)
                        partial_issues.append("No job matches were saved.")
                    else:
                        if leftover_for_demo_speed > 0 and scoring_attempt_failures == 0:
                            completion_msg = (
                                f"Scored top {matched_count} job(s). "
                                f"{leftover_for_demo_speed} job(s) left unscored for faster demo results."
                            )
                        elif leftover_for_demo_speed > 0 and scoring_attempt_failures > 0:
                            completion_msg = (
                                f"Scored {matched_count} prioritized job(s); "
                                f"{scoring_attempt_failures} failed in this batch. "
                                f"{leftover_for_demo_speed} extra jobs skipped for demo speed."
                            )
                        elif scoring_attempt_failures > 0:
                            completion_msg = (
                                f"Scored {matched_count} of {total_to_score} prioritized job(s); "
                                f"{scoring_attempt_failures} scoring attempt(s) failed."
                            )
                        else:
                            completion_msg = (
                                f"Scored {matched_count} prioritized job(s); "
                                "scores stored in jobmatch table."
                            )
                        self._update_step(
                            session,
                            step_match,
                            "completed",
                            completion_msg,
                        )

                    if scoring_attempt_failures > 0:
                        partial_issues.append(
                            f"AI scoring failed for {scoring_attempt_failures} prioritized job(s) "
                            "(rate limit, timeout, or invalid AI response)."
                        )

                if partial_issues:
                    self._finish_run(session, run, "partial_success", " | ".join(partial_issues))
                    logger.warning(f"Agent run {agent_run_id} finished with partial success.")
                else:
                    self._finish_run(session, run, "completed")
                    logger.info(f"Agent run {agent_run_id} completed successfully.")

            except Exception as exc:
                logger.exception(f"Agent run {agent_run_id} failed.")
                self._finish_run(session, run, "failed", str(exc))

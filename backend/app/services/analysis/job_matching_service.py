"""
Job Matching Service — Phase 5
Compares a candidate's ResumeAnalysis against an extracted job description
using Groq LLM and returns a structured ATS-style score.
"""
import json
import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any

from app.services.llm.groq_client import (
    GroqChatClient,
    GroqClientError,
    GroqCompletionResult,
    GroqRateLimitError,
)

logger = logging.getLogger(__name__)

# Per Groq scoring call: retries + backoff must stay inside this wall-clock budget (demo pacing).
MATCH_JOB_DEADLINE_SECONDS = 28.0
MATCH_JOB_MAX_HTTP_ATTEMPTS = 3


class JobMatchingError(RuntimeError):
    pass

# ---------------------------------------------------------------------------
# Score thresholds
# ---------------------------------------------------------------------------
STRONG_MATCH_THRESHOLD = 80
MEDIUM_MATCH_THRESHOLD = 60


def _score_to_label(score: int) -> str:
    if score >= STRONG_MATCH_THRESHOLD:
        return "Strong Match"
    if score >= MEDIUM_MATCH_THRESHOLD:
        return "Medium Match"
    return "Weak Match"


# ---------------------------------------------------------------------------
# Result dataclass — mirrors the JobMatch DB model
# ---------------------------------------------------------------------------
@dataclass
class JobMatchResult:
    overall_score: int
    match_label: str
    skills_score: int
    experience_score: int
    role_score: int
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    improvement_tips: list[str] = field(default_factory=list)
    reasoning: str = ""


# ---------------------------------------------------------------------------
# JSON schema enforced on the Groq response
# ---------------------------------------------------------------------------
_MATCH_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_score":     {"type": "integer", "minimum": 0, "maximum": 100},
        "skills_score":      {"type": "integer", "minimum": 0, "maximum": 100},
        "experience_score":  {"type": "integer", "minimum": 0, "maximum": 100},
        "role_score":        {"type": "integer", "minimum": 0, "maximum": 100},
        "matched_skills":    {"type": "array", "items": {"type": "string"}},
        "missing_skills":    {"type": "array", "items": {"type": "string"}},
        "strengths":         {"type": "array", "items": {"type": "string"}},
        "weaknesses":        {"type": "array", "items": {"type": "string"}},
        "improvement_tips":  {"type": "array", "items": {"type": "string"}},
        "reasoning":         {"type": "string"},
    },
    "required": [
        "overall_score", "skills_score", "experience_score", "role_score",
        "matched_skills", "missing_skills", "strengths", "weaknesses",
        "improvement_tips", "reasoning",
    ],
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class JobMatchingService:
    """
    Uses Groq LLM to score a job description against a candidate profile.
    Raises a clear error if the LLM response cannot be trusted.
    """

    def __init__(self):
        self.client = GroqChatClient()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def match_job(
        self,
        *,
        candidate_skills: list[str],
        candidate_roles: list[str],
        experience_summary: str,
        job_title: str,
        job_description: str,
    ) -> tuple[JobMatchResult, int]:
        """
        Scores a single job against the candidate's profile.

        Args:
            candidate_skills:    extracted_skills from ResumeAnalysis
            candidate_roles:     recommended_roles from ResumeAnalysis
            experience_summary:  experience_summary from ResumeAnalysis
            job_title:           JobResult.title
            job_description:     JobResult.description (Jina-enriched or Tavily snippet)

        Returns:
            (JobMatchResult, groq_http_attempt_count)
        """
        # Trim inputs to avoid overflowing the context window
        safe_desc = (job_description or "")[:3000]
        skills_str = ", ".join(candidate_skills) if candidate_skills else "Not specified"
        roles_str  = ", ".join(candidate_roles)  if candidate_roles  else "Not specified"
        exp_str    = (experience_summary or "Not specified")[:600]

        prompt = f"""You are an expert ATS (Applicant Tracking System) and technical recruiter.

Evaluate how well the following CANDIDATE PROFILE matches the JOB POSTING below.

=== CANDIDATE PROFILE ===
Technical Skills : {skills_str}
Target Roles     : {roles_str}
Experience       : {exp_str}

=== JOB POSTING: {job_title} ===
{safe_desc}

=== SCORING INSTRUCTIONS ===
Score every dimension from 0 to 100 (integer):
- overall_score    : weighted average across all dimensions
- skills_score     : how many required skills the candidate has
- experience_score : does candidate experience match job seniority?
- role_score       : how close is this role to candidate's target roles?

Then provide:
- matched_skills   : list of skills from the job the candidate clearly has
- missing_skills   : important skills from the job the candidate lacks
- strengths        : 2-3 bullet points on why this is a good fit
- weaknesses       : 2-3 bullet points on gaps
- improvement_tips : 2-3 actionable tips the candidate can act on
- reasoning        : 2-4 sentence overall assessment

Be honest and calibrated. Output ONLY valid JSON matching the schema."""

        messages = [
            {"role": "system", "content": "You are a precise ATS evaluator. Output only valid JSON."},
            {"role": "user",   "content": prompt},
        ]

        try:
            result, groq_attempts = self._create_match_completion_with_retries(
                messages=messages,
                job_title=job_title,
            )
            data = json.loads(result.content)
            parsed = self._parse_result(data)
            return parsed, groq_attempts

        except GroqClientError as e:
            logger.error(f"Groq error during job matching for '{job_title}': {e}")
            raise JobMatchingError(f"Groq job matching failed for '{job_title}': {e}") from e
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            logger.error(f"Failed to parse Groq match response for '{job_title}': {e}")
            raise JobMatchingError(f"Invalid Groq job match response for '{job_title}': {e}") from e
        except Exception as e:
            logger.exception(f"Unexpected error matching job '{job_title}': {e}")
            raise JobMatchingError(f"Unexpected job matching error for '{job_title}': {e}") from e

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _create_match_completion_with_retries(
        self,
        *,
        messages: list[dict[str, str]],
        job_title: str,
    ) -> tuple[GroqCompletionResult, int]:
        """
        Limited attempts and a hard deadline so one stuck job cannot block an agent run.
        """
        deadline = time.monotonic() + MATCH_JOB_DEADLINE_SECONDS
        backoff_s = 1.25
        api_key = self.client.api_key
        model = self.client.model

        for attempt in range(MATCH_JOB_MAX_HTTP_ATTEMPTS):
            remaining = deadline - time.monotonic()
            if remaining < 0.35:
                raise JobMatchingError(
                    f"Scoring time budget ({MATCH_JOB_DEADLINE_SECONDS}s) exhausted before "
                    f"calling Groq for '{job_title}' (attempt {attempt + 1})."
                )

            # Leave slack for backoff on 429 between attempts.
            call_timeout = min(14.0, max(4.5, remaining * 0.82))

            transient = GroqChatClient(
                api_key=api_key,
                model=model,
                timeout_seconds=call_timeout,
            )
            try:
                out = transient.create_json_completion(
                    messages=messages,
                    json_schema=_MATCH_JSON_SCHEMA,
                    schema_name="job_match_result",
                    temperature=0.2,
                    max_completion_tokens=1600,
                )
                return out, attempt + 1
            except GroqRateLimitError as exc:
                if attempt >= MATCH_JOB_MAX_HTTP_ATTEMPTS - 1:
                    logger.error(
                        "Groq rate limit persists for '%s' after %s attempts (deadline=%.1fs).",
                        job_title,
                        attempt + 1,
                        MATCH_JOB_DEADLINE_SECONDS,
                    )
                    raise JobMatchingError(
                        f"Groq rate limit when scoring '{job_title}' after {attempt + 1} attempt(s)."
                    ) from exc
                wait_room = deadline - time.monotonic() - 4.5
                nap = min(backoff_s, max(0.5, wait_room))
                if nap < 0.5:
                    raise JobMatchingError(
                        f"Scoring time budget exhausted during rate-limit wait for '{job_title}'."
                    ) from exc
                logger.warning(
                    "Groq rate limited for '%s' (HTTP attempt %s/%s); sleeping %.2fs (budget left ~%.1fs).",
                    job_title,
                    attempt + 1,
                    MATCH_JOB_MAX_HTTP_ATTEMPTS,
                    nap,
                    deadline - time.monotonic(),
                )
                time.sleep(nap)
                backoff_s *= 1.5

        raise JobMatchingError(
            f"Groq scoring exhausted retries for '{job_title}' without success."
        )

    def _parse_result(self, data: dict[str, Any]) -> JobMatchResult:
        if not isinstance(data, dict):
            raise ValueError("Groq match response must be a JSON object.")

        overall = self._coerce_score(data, "overall_score")
        return JobMatchResult(
            overall_score=overall,
            match_label=_score_to_label(overall),
            skills_score=self._coerce_score(data, "skills_score"),
            experience_score=self._coerce_score(data, "experience_score"),
            role_score=self._coerce_score(data, "role_score"),
            matched_skills=self._coerce_string_list(data, "matched_skills"),
            missing_skills=self._coerce_string_list(data, "missing_skills"),
            strengths=self._coerce_string_list(data, "strengths"),
            weaknesses=self._coerce_string_list(data, "weaknesses"),
            improvement_tips=self._coerce_string_list(data, "improvement_tips"),
            reasoning=self._required_string(data, "reasoning"),
        )

    def _coerce_score(self, data: dict[str, Any], key: str) -> int:
        """
        json.loads parses JSON numbers without a fractional part as int, but many
        encoders emit 72.0 which becomes float in Python. Reject bool (subclass of int).
        """
        value = data.get(key)
        if isinstance(value, bool):
            raise ValueError(f"{key} must be a numeric score, not boolean.")
        if isinstance(value, int):
            iv = value
        elif isinstance(value, float):
            iv = int(round(value))
        else:
            try:
                fv = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"{key} must be numeric from 0 to 100.") from exc
            if not math.isfinite(fv):
                raise ValueError(f"{key} must be finite.")
            iv = int(round(fv))
        if iv < 0 or iv > 100:
            raise ValueError(f"{key} must be from 0 to 100.")
        return iv

    def _coerce_string_list(self, data: dict[str, Any], key: str) -> list[str]:
        value = data.get(key)
        if value is None:
            return []
        if isinstance(value, str):
            s = value.strip()
            return [s] if s else []
        if not isinstance(value, list):
            raise ValueError(f"{key} must be a JSON array or string.")
        items: list[str] = []
        for item in value:
            if item is None:
                continue
            s = str(item).strip()
            if s:
                items.append(s)
        return items

    def _required_string(self, data: dict[str, Any], key: str) -> str:
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{key} must be a non-empty string.")
        return value.strip()

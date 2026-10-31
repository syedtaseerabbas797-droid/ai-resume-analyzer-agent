import json
import logging

from pydantic import ValidationError

from app.schemas.resume import ResumeAnalysisData
from app.services.llm.groq_client import (
    GroqClientError,
    GroqChatClient,
    GroqInvalidResponseError,
)
from app.services.prompts.resume_prompts import (
    RESUME_ANALYSIS_SCHEMA,
    build_resume_analysis_messages,
)


logger = logging.getLogger(__name__)


class ResumeAnalysisServiceError(RuntimeError):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


def parse_resume_analysis_json(content: str) -> dict:
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise GroqInvalidResponseError("Groq returned malformed JSON.") from exc

    if not isinstance(data, dict):
        raise GroqInvalidResponseError("Groq JSON response was not an object.")

    return data


def analyze_resume_with_llm(resume_text: str) -> ResumeAnalysisData:
    if not resume_text or not resume_text.strip():
        raise ResumeAnalysisServiceError(
            "Resume text is empty or could not be parsed.",
            status_code=422,
        )

    client = GroqChatClient()
    messages = build_resume_analysis_messages(resume_text)

    try:
        completion = client.create_json_completion(
            messages=messages,
            json_schema=RESUME_ANALYSIS_SCHEMA,
            schema_name="jobscout_resume_analysis",
            max_completion_tokens=4096,
        )
        payload = parse_resume_analysis_json(completion.content)
        analysis = ResumeAnalysisData.model_validate(payload)
    except GroqClientError as exc:
        logger.warning("Groq resume analysis failed: %s", exc)
        raise ResumeAnalysisServiceError(str(exc), status_code=exc.status_code) from exc
    except ValidationError as exc:
        logger.warning("Groq resume analysis schema validation failed: %s", exc)
        raise ResumeAnalysisServiceError(
            "Groq returned resume analysis that did not match the expected schema.",
            status_code=502,
        ) from exc

    return analysis.model_copy(
        update={
            "analysis_provider": "groq",
            "analysis_model": completion.model,
        }
    )

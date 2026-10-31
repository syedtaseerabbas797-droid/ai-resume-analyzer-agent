from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
STRICT_STRUCTURED_OUTPUT_MODELS = {
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
}


class GroqClientError(RuntimeError):
    status_code = 503


class GroqMissingAPIKeyError(GroqClientError):
    status_code = 503


class GroqTimeoutError(GroqClientError):
    status_code = 504


class GroqRateLimitError(GroqClientError):
    status_code = 429


class GroqInvalidResponseError(GroqClientError):
    status_code = 502


@dataclass
class GroqCompletionResult:
    content: str
    model: str
    usage: dict[str, Any] | None = None


class GroqChatClient:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ):
        raw_key = api_key or settings.GROQ_API_KEY or ""
        self.api_key = raw_key.strip()
        raw_model = model or settings.GROQ_MODEL or "openai/gpt-oss-20b"
        self.model = raw_model.strip()
        self.timeout_seconds = timeout_seconds or settings.GROQ_TIMEOUT_SECONDS

    def create_json_completion(
        self,
        messages: list[dict[str, str]],
        json_schema: dict[str, Any],
        schema_name: str,
        max_completion_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> GroqCompletionResult:
        if not self.api_key:
            raise GroqMissingAPIKeyError("GROQ_API_KEY is not configured.")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_completion_tokens": max_completion_tokens,
            "stream": False,
        }

        if self.model in STRICT_STRUCTURED_OUTPUT_MODELS:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": False,
                    "schema": json_schema,
                },
            }
        else:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(
                GROQ_CHAT_COMPLETIONS_URL,
                headers=headers,
                json=payload,
                timeout=httpx.Timeout(self.timeout_seconds),
            )
        except httpx.TimeoutException as exc:
            raise GroqTimeoutError("Groq request timed out.") from exc
        except httpx.HTTPError as exc:
            raise GroqClientError("Groq request failed before a response was received.") from exc

        if response.status_code == 429:
            raise GroqRateLimitError("Groq rate limit was reached.")
        if response.status_code >= 500:
            raise GroqClientError(f"Groq service returned a server error: {response.text}")
        if response.status_code >= 400:
            raise GroqClientError(f"Groq request was rejected: {response.text}")

        try:
            data = response.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise GroqInvalidResponseError("Groq returned an unexpected response shape.") from exc

        if not isinstance(content, str) or not content.strip():
            raise GroqInvalidResponseError("Groq returned an empty response.")

        return GroqCompletionResult(
            content=content,
            model=data.get("model", self.model),
            usage=data.get("usage"),
        )

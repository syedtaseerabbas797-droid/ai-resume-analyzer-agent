import logging
import time as time_module
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Maximum characters to retain from extracted content to avoid
# overwhelming downstream LLM context windows.
MAX_CONTENT_CHARS = 4000

JINA_READER_BASE = "https://r.jina.ai/"


class JinaReaderService:
    """
    Extracts clean, readable text from a URL using the Jina Reader API.
    No SDK needed — Jina Reader is a simple REST prefix service.
    """

    def __init__(self):
        self.api_key = settings.JINA_API_KEY
        self.timeout = 20.0  # default fallback when callers do not override

    def _build_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "Accept": "text/plain",  # ask for clean text instead of HTML
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def extract_job_content(
        self,
        url: str,
        *,
        timeout: float | None = None,
        max_attempts: int = 2,
    ) -> dict[str, Any]:
        """
        Fetches a job listing URL through Jina Reader and returns cleaned text.

        Args:
            url: Page URL (http/https).
            timeout: HTTP client timeout seconds (bounds a single hanging request).
            max_attempts: Retries after timeout/transient failures (minimal back-off).

        Returns:
            {
                "url": "<original url>",
                "content": "<extracted clean text, max 4000 chars>",
                "success": True / False
            }
        """
        if not url or not url.startswith("http"):
            logger.warning(f"Jina: skipping invalid URL: {url!r}")
            return {"url": url, "content": "", "success": False}

        jina_url = f"{JINA_READER_BASE}{url}"
        per_attempt_timeout = float(timeout if timeout is not None else self.timeout)

        for attempt in range(max(1, int(max_attempts))):
            try:
                with httpx.Client(timeout=per_attempt_timeout) as client:
                    response = client.get(
                        jina_url,
                        headers=self._build_headers(),
                        follow_redirects=True,
                    )
                    response.raise_for_status()
                    raw_text = response.text

                content = raw_text.strip()[:MAX_CONTENT_CHARS]

                if not content:
                    logger.warning(
                        "Jina returned empty content (attempt %s/%s) for %s",
                        attempt + 1,
                        max_attempts,
                        url,
                    )
                    if attempt >= max_attempts - 1:
                        return {"url": url, "content": "", "success": False}
                    time_module.sleep(0.35)
                    continue

                logger.debug(
                    "Jina extracted %s chars (attempt %s/%s): %s",
                    len(content),
                    attempt + 1,
                    max_attempts,
                    url[:120],
                )
                return {"url": url, "content": content, "success": True}

            except httpx.TimeoutException:
                logger.warning(
                    "Jina timeout (attempt %s/%s, %.1fs budget) %s — %s",
                    attempt + 1,
                    max_attempts,
                    per_attempt_timeout,
                    url[:120],
                    url,
                )
                if attempt >= max_attempts - 1:
                    return {"url": url, "content": "", "success": False}
                time_module.sleep(0.4 * (attempt + 1))

            except httpx.HTTPStatusError as e:
                status = e.response.status_code if e.response is not None else 0
                transient = status in (408, 429) or status >= 500
                logger.error(
                    "Jina HTTP %s (attempt %s/%s): %s",
                    status,
                    attempt + 1,
                    max_attempts,
                    url[:120],
                )
                if not transient or attempt >= max_attempts - 1:
                    return {"url": url, "content": "", "success": False}
                time_module.sleep(0.5 * (attempt + 1))

            except httpx.RequestError as e:
                logger.error(
                    "Jina request error (attempt %s/%s) %s: %s",
                    attempt + 1,
                    max_attempts,
                    url[:120],
                    e,
                )
                if attempt >= max_attempts - 1:
                    return {"url": url, "content": "", "success": False}
                time_module.sleep(0.4 * (attempt + 1))

            except Exception as e:
                logger.exception(f"Jina unexpected error for {url}: {e}")
                return {"url": url, "content": "", "success": False}

        return {"url": url, "content": "", "success": False}

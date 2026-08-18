import logging
from typing import Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

class TavilySearchError(RuntimeError):
    pass

class TavilySearchService:
    def __init__(self):
        self.api_key = settings.TAVILY_API_KEY
        self.base_url = "https://api.tavily.com/search"
        logger.info("Using TavilySearchService")

    def search_jobs(self, query: str, max_results: int = 5) -> list[dict[str, Any]]:
        """
        Searches for job listings using the Tavily API.
        """
        if not self.api_key:
            raise TavilySearchError("TAVILY_API_KEY is not configured.")

        payload = {
            "query": query,
            "topic": "general",
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
            "include_raw_content": False
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            # We use a synchronous client since this runs within a FastAPI BackgroundTask threadpool
            with httpx.Client(timeout=15.0) as client:
                response = client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            raw_results = data.get("results")
            if not isinstance(raw_results, list):
                raise TavilySearchError("Tavily response did not contain a results list.")

            results = []
            for item in raw_results:
                if not isinstance(item, dict):
                    continue

                results.append({
                    "title": item.get("title", "Job Opportunity"),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "source": "tavily"
                })

            logger.info(f"Tavily returned {len(results)} results for query: {query}")
            return results

        except httpx.HTTPStatusError as e:
            message = f"Tavily API returned status {e.response.status_code}: {e.response.text}"
            logger.error(message)
            raise TavilySearchError(message) from e
        except httpx.TimeoutException as e:
            message = f"Tavily API timed out for query: {query}"
            logger.error(message)
            raise TavilySearchError(message) from e
        except httpx.RequestError as e:
            message = f"Tavily API request failed: {e}"
            logger.error(message)
            raise TavilySearchError(message) from e
        except TavilySearchError:
            raise
        except Exception as e:
            message = f"Unexpected error during Tavily search: {e}"
            logger.exception(message)
            raise TavilySearchError(message) from e

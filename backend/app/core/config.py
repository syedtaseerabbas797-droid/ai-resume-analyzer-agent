from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., min_length=1)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_TIMEOUT_SECONDS: float = 30.0
    GROQ_MAX_RESUME_CHARS: int = 12000
    TAVILY_API_KEY: Optional[str] = None
    JINA_API_KEY: Optional[str] = None
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Auth
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("DATABASE_URL must not be blank")
        return value

    @field_validator("GROQ_API_KEY", "TAVILY_API_KEY", "JINA_API_KEY", mode="before")
    @classmethod
    def empty_secret_to_none(cls, value: Optional[str]) -> Optional[str]:
        if isinstance(value, str) and not value.strip():
            return None
        return value


settings = Settings()

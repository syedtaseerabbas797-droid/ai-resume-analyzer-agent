from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """
    Authenticated user account.
    Each user owns exactly one Candidate row (created on signup).
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    email: str = Field(index=True, unique=True, max_length=254)
    hashed_password: str = Field(min_length=1)
    full_name: Optional[str] = Field(default=None, max_length=200)

    # Ties the user account to the candidate pipeline
    candidate_id: uuid.UUID = Field(foreign_key="candidate.id", index=True)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

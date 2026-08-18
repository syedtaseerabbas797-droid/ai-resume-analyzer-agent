from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime, timezone
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class ApplicationAsset(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_match_id: uuid.UUID = Field(foreign_key="jobmatch.id")
    cover_letter: Optional[str] = None
    cv_suggestions: List[Any] = Field(default=[], sa_column=Column(JSON))
    email_draft: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

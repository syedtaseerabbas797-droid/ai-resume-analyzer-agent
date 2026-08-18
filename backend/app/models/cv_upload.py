from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import TEXT
from datetime import datetime, timezone
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class CVUpload(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    candidate_id: uuid.UUID = Field(foreign_key="candidate.id")
    file_name: str
    file_type: str
    raw_text: str = Field(sa_column=Column(TEXT))
    created_at: datetime = Field(default_factory=utc_now)

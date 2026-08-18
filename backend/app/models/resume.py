from datetime import datetime, timezone
from typing import List, Optional
import uuid

from sqlalchemy import Column, TEXT
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel


def utc_now():
    return datetime.now(timezone.utc)


class ResumeAnalysis(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    candidate_id: uuid.UUID = Field(foreign_key="candidate.id", index=True)
    cv_upload_id: uuid.UUID = Field(foreign_key="cvupload.id", index=True)
    status: str = Field(default="uploaded", index=True)
    ats_score: Optional[int] = None
    extracted_skills: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    soft_skills: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    strengths: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    weaknesses: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    recommended_roles: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    experience_summary: Optional[str] = None
    hiring_recommendation: Optional[str] = Field(default=None, sa_column=Column(TEXT))
    improvement_suggestions: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    analysis_provider: Optional[str] = None
    analysis_model: Optional[str] = None
    error_message: Optional[str] = Field(default=None, sa_column=Column(TEXT))
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

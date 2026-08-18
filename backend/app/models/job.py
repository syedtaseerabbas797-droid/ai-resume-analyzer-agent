from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime, timezone
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class JobResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    agent_run_id: uuid.UUID = Field(foreign_key="agentrun.id")
    search_query_id: Optional[uuid.UUID] = Field(default=None, foreign_key="searchquery.id")
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    url: str
    source: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

class JobMatch(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_result_id: uuid.UUID = Field(foreign_key="jobresult.id")
    overall_score: int
    match_label: str
    skills_score: Optional[int] = None
    role_score: Optional[int] = None
    experience_score: Optional[int] = None
    location_score: Optional[int] = None
    education_score: Optional[int] = None
    matched_skills: List[Any] = Field(default=[], sa_column=Column(JSON))
    missing_skills: List[Any] = Field(default=[], sa_column=Column(JSON))
    reasoning: str
    improvement_tips: List[Any] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)

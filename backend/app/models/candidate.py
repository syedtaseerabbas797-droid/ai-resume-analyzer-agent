from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime, timezone
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class Candidate(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    seniority: Optional[str] = None
    experience_years: Optional[float] = None
    created_at: datetime = Field(default_factory=utc_now)

class CandidateProfile(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    candidate_id: uuid.UUID = Field(foreign_key="candidate.id")
    summary: Optional[str] = None
    skills: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    target_roles: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    education: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    experience: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    preferred_locations: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    preferred_job_type: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

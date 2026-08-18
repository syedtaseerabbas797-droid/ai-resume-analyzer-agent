from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class AgentRun(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    candidate_id: uuid.UUID = Field(foreign_key="candidate.id")
    status: str = Field(default="pending")
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class AgentStep(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    agent_run_id: uuid.UUID = Field(foreign_key="agentrun.id")
    step_name: str
    status: str
    message: Optional[str] = None
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None

class SearchQuery(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    agent_run_id: uuid.UUID = Field(foreign_key="agentrun.id")
    query: str
    source: str = Field(default="tavily")
    created_at: datetime = Field(default_factory=utc_now)

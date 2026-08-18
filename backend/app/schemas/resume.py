from datetime import datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field


class ResumeUploadResponse(BaseModel):
    upload_id: uuid.UUID
    filename: str
    candidate_id: uuid.UUID
    upload_timestamp: datetime
    status: str
    file_type: str


class ResumeAnalysisResponse(BaseModel):
    analysis_id: uuid.UUID
    upload_id: uuid.UUID
    candidate_id: uuid.UUID
    status: str
    ats_score: Optional[int] = None
    technical_skills: List[str] = Field(default_factory=list)
    extracted_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommended_job_roles: List[str] = Field(default_factory=list)
    recommended_roles: List[str] = Field(default_factory=list)
    experience_summary: Optional[str] = None
    hiring_recommendation: Optional[str] = None
    improvement_suggestions: List[str] = Field(default_factory=list)
    analysis_provider: Optional[str] = None
    analysis_model: Optional[str] = None


class ResumeDetailResponse(BaseModel):
    upload_id: uuid.UUID
    filename: str
    candidate_id: uuid.UUID
    upload_timestamp: datetime
    status: str
    file_type: str
    extracted_text: str
    analysis: Optional[ResumeAnalysisResponse] = None


class ResumeListResponse(BaseModel):
    resumes: List[ResumeUploadResponse]


class ResumeAnalysisData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ats_score: int = Field(ge=0, le=100)
    technical_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommended_job_roles: List[str] = Field(default_factory=list)
    experience_summary: str
    hiring_recommendation: str
    improvement_suggestions: List[str] = Field(default_factory=list)
    analysis_provider: Optional[str] = None
    analysis_model: Optional[str] = None

    @property
    def extracted_skills(self) -> List[str]:
        return self.technical_skills

    @property
    def recommended_roles(self) -> List[str]:
        return self.recommended_job_roles

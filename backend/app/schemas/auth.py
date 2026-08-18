"""
Pydantic schemas for the /auth endpoints.
These are request/response shapes only — never ORM models.
"""
from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=200)

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Password must not be blank.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Returned after a successful signup or login."""
    access_token: str
    token_type: str = "bearer"
    candidate_id: str       # UUID string — auto-set in frontend CandidateContext
    user_id: str
    full_name: Optional[str] = None
    email: str


class UserOut(BaseModel):
    """Safe user representation — never includes the hashed password."""
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    candidate_id: uuid.UUID
    is_active: bool

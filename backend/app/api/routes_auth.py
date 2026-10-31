"""
/auth — Sign Up, Login, and current-user endpoints.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.auth import LoginRequest, SignUpRequest, TokenResponse, UserOut

logger = logging.getLogger(__name__)
router = APIRouter()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _build_token_response(user: User) -> TokenResponse:
    token = create_access_token(subject=str(user.id))
    return TokenResponse(
        access_token=token,
        candidate_id=str(user.candidate_id),
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------
@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
)
def signup(body: SignUpRequest, session: Session = Depends(get_session)):
    """
    Creates a User + a linked Candidate row, then returns a JWT.
    The ``candidate_id`` in the response can be stored directly in the
    frontend's CandidateContext so the rest of the pipeline works immediately.
    """
    clean_email = body.email.strip().lower()

    # Reject duplicate emails with a clean 409
    existing = session.exec(select(User).where(func.lower(User.email) == clean_email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in instead.",
        )

    # Create the linked Candidate row first
    candidate = Candidate(
        name=body.full_name or clean_email.split("@")[0],
    )
    session.add(candidate)
    session.flush()  # get candidate.id without full commit

    # Create the User
    user = User(
        email=clean_email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        candidate_id=candidate.id,
    )
    session.add(user)

    try:
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in instead.",
        )

    logger.info("New user signed up: %s (candidate_id=%s)", user.email, user.candidate_id)
    return _build_token_response(user)


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive a JWT",
)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    """
    Validates email + password and returns a JWT access token.
    The response also includes ``candidate_id`` so the frontend can resume
    where the user left off.
    """
    clean_email = body.email.strip().lower()
    user = session.exec(select(User).where(func.lower(User.email) == clean_email)).first()

    # Use a generic message to prevent user-enumeration attacks
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise invalid_exc
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    if not verify_password(body.password, user.hashed_password):
        raise invalid_exc

    logger.info("User logged in: %s", user.email)
    return _build_token_response(user)


# ---------------------------------------------------------------------------
# GET /auth/me  (protected — requires Bearer token)
# ---------------------------------------------------------------------------
@router.get(
    "/me",
    response_model=UserOut,
    summary="Return the authenticated user's profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently authenticated user.
    This is also a convenient way to verify that a stored token is still valid.
    """
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        candidate_id=current_user.candidate_id,
        is_active=current_user.is_active,
    )

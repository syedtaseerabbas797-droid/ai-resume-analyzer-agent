from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from app.core.database import get_session
from app.models.candidate import Candidate
import uuid

router = APIRouter()

@router.get("/db/health")
def db_health_check(session: Session = Depends(get_session)):
    try:
        session.exec(text("SELECT 1")).first()
        return {"database": "connected"}
    except Exception as e:
        return {"database": "disconnected", "error": str(e)}

@router.post("/db/seed")
def seed_db(session: Session = Depends(get_session)):
    candidate = Candidate(
        name="Test Candidate",
        email="test@example.com",
        location="Remote",
        seniority="Senior",
        experience_years=5.0
    )
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    return {"candidate_id": str(candidate.id), "message": "seed candidate created"}

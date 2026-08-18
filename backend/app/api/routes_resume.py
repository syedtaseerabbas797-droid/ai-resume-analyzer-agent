from datetime import datetime, timezone
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.candidate import Candidate
from app.models.cv_upload import CVUpload
from app.models.resume import ResumeAnalysis
from app.schemas.resume import (
    ResumeAnalysisResponse,
    ResumeDetailResponse,
    ResumeListResponse,
    ResumeUploadResponse,
)
from app.services.resume_analysis import analyze_resume_text
from app.services.analysis.resume_llm_analysis import ResumeAnalysisServiceError
from app.services.resume_parser import ResumeParsingError, extract_resume_text
from app.utils.file_storage import FileValidationError, save_resume_file


logger = logging.getLogger(__name__)
router = APIRouter()


def utc_now():
    return datetime.now(timezone.utc)


def get_or_create_candidate(
    session: Session,
    candidate_id: uuid.UUID | None,
    filename: str | None,
) -> Candidate:
    if candidate_id:
        candidate = session.get(Candidate, candidate_id)
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found.",
            )
        return candidate

    candidate = Candidate(name=(filename or "Uploaded Candidate").rsplit(".", 1)[0])
    session.add(candidate)
    return candidate


def latest_upload_for_candidate(session: Session, candidate_id: uuid.UUID) -> CVUpload | None:
    statement = (
        select(CVUpload)
        .where(CVUpload.candidate_id == candidate_id)
        .order_by(CVUpload.created_at.desc())
    )
    return session.exec(statement).first()


def latest_analysis_for_upload(
    session: Session,
    upload_id: uuid.UUID,
) -> ResumeAnalysis | None:
    statement = (
        select(ResumeAnalysis)
        .where(ResumeAnalysis.cv_upload_id == upload_id)
        .order_by(ResumeAnalysis.created_at.desc())
    )
    return session.exec(statement).first()


def to_analysis_response(analysis: ResumeAnalysis) -> ResumeAnalysisResponse:
    return ResumeAnalysisResponse(
        analysis_id=analysis.id,
        upload_id=analysis.cv_upload_id,
        candidate_id=analysis.candidate_id,
        status=analysis.status,
        ats_score=analysis.ats_score,
        technical_skills=analysis.extracted_skills or [],
        extracted_skills=analysis.extracted_skills or [],
        soft_skills=analysis.soft_skills or [],
        strengths=analysis.strengths or [],
        weaknesses=analysis.weaknesses or [],
        recommended_job_roles=analysis.recommended_roles or [],
        recommended_roles=analysis.recommended_roles or [],
        experience_summary=analysis.experience_summary,
        hiring_recommendation=analysis.hiring_recommendation,
        improvement_suggestions=analysis.improvement_suggestions or [],
        analysis_provider=analysis.analysis_provider,
        analysis_model=analysis.analysis_model,
    )


def to_upload_response(upload: CVUpload, status_value: str) -> ResumeUploadResponse:
    return ResumeUploadResponse(
        upload_id=upload.id,
        filename=upload.file_name,
        candidate_id=upload.candidate_id,
        upload_timestamp=upload.created_at,
        status=status_value,
        file_type=upload.file_type,
    )


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    candidate_id: uuid.UUID | None = Form(default=None),
    session: Session = Depends(get_session),
):
    upload_id = uuid.uuid4()
    saved_file = None

    try:
        candidate = get_or_create_candidate(session, candidate_id, file.filename)
        saved_file = await save_resume_file(file, upload_id)

        try:
            extracted_text = extract_resume_text(saved_file.file_path, saved_file.file_type)
            upload_status = "uploaded"
            parse_error = None
        except ResumeParsingError as exc:
            extracted_text = ""
            upload_status = "parse_failed"
            parse_error = str(exc)

        upload = CVUpload(
            id=upload_id,
            candidate_id=candidate.id,
            file_name=saved_file.filename,
            file_type=saved_file.file_type,
            raw_text=extracted_text,
        )
        analysis = ResumeAnalysis(
            candidate_id=candidate.id,
            cv_upload_id=upload.id,
            status=upload_status,
            error_message=parse_error,
        )

        session.add(upload)
        session.add(analysis)
        session.commit()
        session.refresh(upload)

        return to_upload_response(upload, upload_status)
    except FileValidationError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        session.rollback()
        if saved_file and saved_file.file_path.exists():
            saved_file.file_path.unlink()
        logger.exception("Resume upload database operation failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume upload could not be saved.",
        ) from exc


@router.post("/analyze/{candidate_id}", response_model=ResumeAnalysisResponse)
def analyze_resume(
    candidate_id: uuid.UUID,
    force: bool = Query(default=False),
    session: Session = Depends(get_session),
):
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found.",
        )

    upload = latest_upload_for_candidate(session, candidate_id)
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume upload found for candidate.",
        )

    if not upload.raw_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume text is empty or could not be parsed.",
        )

    analysis = latest_analysis_for_upload(session, upload.id)

    if (
        analysis
        and analysis.status == "completed"
        and analysis.analysis_provider == "groq"
        and analysis.ats_score is not None
        and not force
    ):
        return to_analysis_response(analysis)

    if not analysis:
        analysis = ResumeAnalysis(candidate_id=candidate_id, cv_upload_id=upload.id)
        session.add(analysis)

    try:
        analysis_data = analyze_resume_text(upload.raw_text)
    except ResumeAnalysisServiceError as exc:
        analysis.status = "analysis_failed"
        analysis.error_message = str(exc)
        analysis.updated_at = utc_now()
        try:
            session.commit()
        except SQLAlchemyError:
            session.rollback()
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    analysis.status = "completed"
    analysis.ats_score = analysis_data.ats_score
    analysis.extracted_skills = analysis_data.technical_skills
    analysis.soft_skills = analysis_data.soft_skills
    analysis.strengths = analysis_data.strengths
    analysis.weaknesses = analysis_data.weaknesses
    analysis.recommended_roles = analysis_data.recommended_job_roles
    analysis.experience_summary = analysis_data.experience_summary
    analysis.hiring_recommendation = analysis_data.hiring_recommendation
    analysis.improvement_suggestions = analysis_data.improvement_suggestions
    analysis.analysis_provider = analysis_data.analysis_provider
    analysis.analysis_model = analysis_data.analysis_model
    analysis.error_message = None
    analysis.updated_at = utc_now()

    try:
        session.commit()
        session.refresh(analysis)
    except SQLAlchemyError as exc:
        session.rollback()
        logger.exception("Resume analysis database operation failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume analysis could not be saved.",
        ) from exc

    return to_analysis_response(analysis)


@router.get("/list", response_model=ResumeListResponse)
def list_resumes(session: Session = Depends(get_session)):
    statement = select(CVUpload).order_by(CVUpload.created_at.desc())
    uploads = session.exec(statement).all()

    resumes = []
    for upload in uploads:
        analysis = latest_analysis_for_upload(session, upload.id)
        resumes.append(to_upload_response(upload, analysis.status if analysis else "uploaded"))

    return ResumeListResponse(resumes=resumes)


@router.get("/{candidate_id}", response_model=ResumeDetailResponse)
def get_resume(candidate_id: uuid.UUID, session: Session = Depends(get_session)):
    upload = latest_upload_for_candidate(session, candidate_id)
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume upload found for candidate.",
        )

    analysis = latest_analysis_for_upload(session, upload.id)

    return ResumeDetailResponse(
        upload_id=upload.id,
        filename=upload.file_name,
        candidate_id=upload.candidate_id,
        upload_timestamp=upload.created_at,
        status=analysis.status if analysis else "uploaded",
        file_type=upload.file_type,
        extracted_text=upload.raw_text,
        analysis=to_analysis_response(analysis) if analysis else None,
    )

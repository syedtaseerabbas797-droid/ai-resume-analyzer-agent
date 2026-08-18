from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import uuid

from fastapi import UploadFile

from app.core.config import BASE_DIR


MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024
RESUME_UPLOAD_DIR = BASE_DIR / "uploads" / "resumes"
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_RESUME_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}


class FileValidationError(ValueError):
    pass


@dataclass
class SavedResumeFile:
    file_path: Path
    filename: str
    file_type: str
    size_bytes: int


def get_resume_extension(filename: Optional[str]) -> str:
    if not filename:
        raise FileValidationError("Resume filename is required.")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise FileValidationError("Only PDF and DOCX resumes are supported.")

    return extension


def validate_resume_content_type(content_type: Optional[str]) -> None:
    if content_type and content_type not in ALLOWED_RESUME_CONTENT_TYPES:
        raise FileValidationError("Unsupported resume content type.")


async def save_resume_file(file: UploadFile, upload_id: uuid.UUID) -> SavedResumeFile:
    extension = get_resume_extension(file.filename)
    validate_resume_content_type(file.content_type)

    RESUME_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{upload_id}{extension}"
    file_path = RESUME_UPLOAD_DIR / filename
    size_bytes = 0

    try:
        with file_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size_bytes += len(chunk)
                if size_bytes > MAX_RESUME_UPLOAD_BYTES:
                    raise FileValidationError("Resume file is larger than 10 MB.")
                output.write(chunk)
    except Exception:
        if file_path.exists():
            file_path.unlink()
        raise

    if size_bytes == 0:
        if file_path.exists():
            file_path.unlink()
        raise FileValidationError("Resume file is empty.")

    return SavedResumeFile(
        file_path=file_path,
        filename=filename,
        file_type=extension.lstrip("."),
        size_bytes=size_bytes,
    )

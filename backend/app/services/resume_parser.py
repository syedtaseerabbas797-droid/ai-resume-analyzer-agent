from pathlib import Path
import logging
import re


logger = logging.getLogger(__name__)


class ResumeParsingError(ValueError):
    pass


def clean_extracted_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [" ".join(line.split()) for line in text.split("\n")]
    cleaned = "\n".join(line for line in lines if line)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def extract_text_from_pdf(file_path: Path) -> str:
    try:
        import fitz
    except ImportError as exc:
        raise ResumeParsingError("PyMuPDF is required to parse PDF resumes.") from exc

    try:
        text_parts = []
        with fitz.open(file_path) as document:
            for page in document:
                text_parts.append(page.get_text("text"))
        return clean_extracted_text("\n".join(text_parts))
    except Exception as exc:
        logger.exception("PDF resume parsing failed.")
        raise ResumeParsingError("Unable to extract text from PDF resume.") from exc


def extract_text_from_docx(file_path: Path) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise ResumeParsingError("python-docx is required to parse DOCX resumes.") from exc

    try:
        document = Document(file_path)
        paragraphs = [paragraph.text for paragraph in document.paragraphs]
        return clean_extracted_text("\n".join(paragraphs))
    except Exception as exc:
        logger.exception("DOCX resume parsing failed.")
        raise ResumeParsingError("Unable to extract text from DOCX resume.") from exc


def extract_resume_text(file_path: Path, file_type: str) -> str:
    if file_type == "pdf":
        text = extract_text_from_pdf(file_path)
    elif file_type == "docx":
        text = extract_text_from_docx(file_path)
    else:
        raise ResumeParsingError("Unsupported resume file type.")

    if not text:
        raise ResumeParsingError("No readable text was found in the resume.")

    return text

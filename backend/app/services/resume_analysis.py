from app.schemas.resume import ResumeAnalysisData
from app.services.analysis.resume_llm_analysis import analyze_resume_with_llm


def analyze_resume_text(text: str) -> ResumeAnalysisData:
    return analyze_resume_with_llm(text)

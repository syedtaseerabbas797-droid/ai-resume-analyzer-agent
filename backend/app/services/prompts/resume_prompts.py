from app.core.config import settings


RESUME_ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ats_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "technical_skills": {"type": "array", "items": {"type": "string"}},
        "soft_skills": {"type": "array", "items": {"type": "string"}},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "experience_summary": {"type": "string"},
        "recommended_job_roles": {"type": "array", "items": {"type": "string"}},
        "hiring_recommendation": {"type": "string"},
        "improvement_suggestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "ats_score",
        "technical_skills",
        "soft_skills",
        "strengths",
        "weaknesses",
        "experience_summary",
        "recommended_job_roles",
        "hiring_recommendation",
        "improvement_suggestions",
    ],
}


def trim_resume_text(resume_text: str) -> str:
    max_chars = settings.GROQ_MAX_RESUME_CHARS
    if len(resume_text) <= max_chars:
        return resume_text

    head_chars = int(max_chars * 0.7)
    tail_chars = max_chars - head_chars
    return (
        resume_text[:head_chars]
        + "\n\n[Resume truncated for token efficiency. Middle content omitted.]\n\n"
        + resume_text[-tail_chars:]
    )


def build_resume_analysis_messages(resume_text: str) -> list[dict[str, str]]:
    trimmed_text = trim_resume_text(resume_text)

    system_prompt = (
        "You are JobScout AI, an expert hiring analyst and ATS evaluator. "
        "Analyze resumes for software, AI, data, and product roles. "
        "Return only a valid JSON object that matches the requested schema. "
        "Do not include markdown, explanations, comments, or extra keys."
    )
    user_prompt = f"""
Evaluate this resume for an AI hiring platform.

Scoring guidance:
- ats_score must be 0-100.
- Reward clear impact, quantified achievements, role alignment, readable formatting, and relevant skills.
- Penalize missing metrics, vague responsibilities, unclear seniority, missing dates, and weak role targeting.
- technical_skills should contain tools, languages, frameworks, databases, cloud platforms, AI/ML skills, and engineering practices.
- soft_skills should contain communication, ownership, leadership, collaboration, mentoring, problem solving, or similar signals.
- hiring_recommendation should be one concise sentence with a recommendation level and rationale.
- improvement_suggestions should be concrete actions the candidate can take to improve the resume.

Resume text:
{trimmed_text}
""".strip()

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

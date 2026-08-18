from sqlmodel import SQLModel, Session, create_engine, text

from app.core.config import settings


def normalize_database_url(db_url: str) -> str:
    db_url = db_url.strip()

    if db_url.startswith("postgres://"):
        return db_url.replace("postgres://", "postgresql+psycopg://", 1)

    if db_url.startswith("postgresql://"):
        return db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return db_url


engine = create_engine(
    normalize_database_url(settings.DATABASE_URL),
    echo=False,
    pool_pre_ping=True,
)


def create_db_and_tables():
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    ensure_resumeanalysis_schema()
    ensure_jobresult_schema()

def ensure_jobresult_schema():
    if engine.dialect.name != "postgresql":
        return

    statements = [
        "ALTER TABLE jobresult ADD COLUMN IF NOT EXISTS search_query_id UUID REFERENCES searchquery(id)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_resumeanalysis_schema():
    if engine.dialect.name != "postgresql":
        return

    statements = [
        "ALTER TABLE resumeanalysis ADD COLUMN IF NOT EXISTS soft_skills JSON DEFAULT '[]'::json",
        "ALTER TABLE resumeanalysis ADD COLUMN IF NOT EXISTS hiring_recommendation TEXT",
        "ALTER TABLE resumeanalysis ADD COLUMN IF NOT EXISTS improvement_suggestions JSON DEFAULT '[]'::json",
        "ALTER TABLE resumeanalysis ADD COLUMN IF NOT EXISTS analysis_provider VARCHAR",
        "ALTER TABLE resumeanalysis ADD COLUMN IF NOT EXISTS analysis_model VARCHAR",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_session():
    with Session(engine) as session:
        yield session

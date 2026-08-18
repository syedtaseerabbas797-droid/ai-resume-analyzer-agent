from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_db_and_tables
from app.api.routes_health import router as health_router
from app.api.routes_db import router as db_router
from app.api.routes_resume import router as resume_router
from app.api.routes_agent import router as agent_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_auth import router as auth_router
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    yield
    # Shutdown

app = FastAPI(
    title="JobScout AI Backend",
    lifespan=lifespan
)

# CORS middleware for localhost frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["Health"])
app.include_router(db_router, tags=["Database"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(resume_router, prefix="/resume", tags=["Resume Analyzer"])
app.include_router(agent_router, prefix="/agent", tags=["Job Search Agent"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

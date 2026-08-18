# JobScout AI — Local Development Guide

## Project Structure

```
Saylani_Hackthon/
  backend/    ← FastAPI + SQLModel (Python)
  frontend/   ← TanStack Start + React (TypeScript)
```

---

## Required Environment Files

### Backend: `backend/.env`
Copy from `backend/.env.example` and fill in all values:
```env
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...
JINA_API_KEY=jina_...
CHROMA_PERSIST_DIR=./chroma_db
```

### Frontend: `frontend/.env.local`
Already created. Contents:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> ⚠️ Never put backend secrets (DATABASE_URL, API keys) in the frontend env file.

---

## Running Locally

### Terminal 1 — Backend
```powershell
cd backend
# First time only — create a virtual environment:
python -m venv .venv
.venv\Scripts\activate

# Install dependencies:
pip install -r requirements.txt

# Start the server:
uvicorn app.main:app --reload
```

Backend will be available at: **http://127.0.0.1:8000**  
Swagger UI: **http://127.0.0.1:8000/docs**

### Terminal 2 — Frontend
```powershell
cd frontend
npm install
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## API Health Check

```
GET http://127.0.0.1:8000/health
GET http://127.0.0.1:8000/db/health
```

---

## User Flow

1. **`/setup`** → Click "Create Demo Candidate" → calls `POST /db/seed` → stores `candidate_id` in browser localStorage
2. **`/upload`** → Drop PDF/DOCX → calls `POST /resume/upload` with `candidate_id` in FormData
3. **`/analyze`** → Click "Analyze resume" → calls `POST /resume/analyze/{candidate_id}`
4. **`/agent`** → Click "Launch Agent" → calls `POST /agent/run/{candidate_id}` → receives `run_id`
5. **`/agent/progress/{run_id}`** → Auto-polls `GET /agent/status/{run_id}` every 3s until terminal status
6. **`/dashboard/{candidate_id}`** → calls `GET /dashboard/jobs/{candidate_id}?page=1&page_size=10`
7. **`/job/{job_id}`** → calls `GET /dashboard/job/{job_id}`
8. **`/agent/detail/{run_id}`** → calls `GET /dashboard/agent-run/{run_id}`

---

## CORS

Backend allows the following frontend origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

No changes needed for local development.

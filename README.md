# JobScout AI — Autonomous Career Agent & ATS Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791.svg)](https://neon.tech/)
[![Groq](https://img.shields.io/badge/LLM-Groq_Llama_3-f55036.svg)](https://groq.com/)

> **JobScout AI** is an autonomous full-stack AI career platform designed to bridge the gap between job seekers and recruiter ATS systems. It ingests resumes (PDF/DOCX), evaluates them against industry ATS criteria, synthesizes targeted web search queries, autonomously scours live job openings across the web using AI web-readers, and scores opportunities using multidimensional semantic matching.

---

##  Key Features

- ** Autonomous Multi-Step Agent:**
  - **Query Generation:** Deconstructs candidate strengths and generates precision search queries tailored to seniority and skills.
  - **Live Web Hunting:** Discovers and scrapes active job listings via Jina AI Reader and search engines.
  - **Deep Semantic Matching:** Analyzes job descriptions against candidate profiles to calculate weighted ATS match scores.
- ** Recruiter-Grade Resume Analysis:**
  - Real-time ATS compatibility scoring (0–100%).
  - Technical and soft skills taxonomy extraction.
  - Granular strengths, weaknesses, and actionable career improvement suggestions.
- ** Multidimensional Job Scoring:**
  - Breakdown by **Skills Match**, **Experience Fit**, and **Role Alignment**.
  - Visual Matched vs. Missing skills tags to optimize candidate applications.
- ** Real-Time Execution Tracking:**
  - Live timeline showing step-by-step progress, duration, search query logs, and partial-success safeguards.
- ** 100% Responsive Modern Interface:**
  - Fluid layouts tailored for Mobile, Tablet, and Desktop displays with slide-over drawers, touch targets, and safe-area notch support.

---

## 🏗️ Architecture & Workflow

```mermaid
flowchart TD
    subgraph Client ["Frontend (TanStack Start + React 19)"]
        UI[Responsive Modern Web App]
        Upload[Resume Upload - PDF/DOCX]
        Analysis[ATS & Skills Breakdown]
        AgentProgress[Live Agent Execution Timeline]
        Dashboard[Ranked Job Board & Match Radar]
    end

    subgraph Backend ["FastAPI AI Service"]
        API[RESTful Endpoints & Auth]
        Parser[Resume Extraction Engine]
        AgentLoop[Autonomous Agent Orchestrator]
        Matcher[Semantic ATS Scoring Engine]
    end

    subgraph AI_Services ["External AI & Search Services"]
        LLM[Groq / Llama 3 / OpenAI]
        Jina[Jina AI Reader & Web Scraper]
        Tavily[Tavily Search Engine]
        Chroma[ChromaDB Vector Store]
    end

    subgraph Storage ["Cloud Persistence"]
        DB[(Neon PostgreSQL Database)]
    end

    Upload -->|POST /resume/upload| Parser
    Parser -->|Parse & Store| DB
    Analysis -->|POST /resume/analyze| LLM
    LLM -->|ATS Insights| DB
    AgentProgress -->|POST /agent/run| AgentLoop
    AgentLoop -->|Synthesize Queries| LLM
    AgentLoop -->|Scrape Listings| Tavily
    Tavily --> Jina
    Jina --> Matcher
    Matcher -->|Cosine & LLM Scoring| LLM
    Matcher -->|Ranked Matches| DB
    DB --> Dashboard
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TanStack Start (SSR), TanStack Router & Query, TypeScript, Tailwind CSS v4, Lucide Icons, Sonner |
| **Backend** | Python 3.11+, FastAPI, SQLModel (SQLAlchemy ORM), Pydantic v2, PyPDF, python-docx |
| **AI & NLP** | Groq API (Llama 3.3 / GPT-OSS), ChromaDB vector embeddings, Jina Reader API, Tavily Search API |
| **Database & Auth** | Neon Cloud PostgreSQL, JWT (JSON Web Tokens), Passlib (Bcrypt) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL connection string (e.g. Neon, Supabase, or Local PostgreSQL)

### 2. Backend Setup
```powershell
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # On Windows
# source .venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys (Groq, Tavily, Jina)

# Run server
uvicorn app.main:app --reload --port 8000
```
Backend API docs available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
Frontend application accessible at: `http://localhost:8080` (or `http://localhost:5173`)

---

## 🧪 Quick Demo Login

For portfolio reviewers and recruiters testing the live deployment:
- **Email:** `demo@jobscout.ai`
- **Password:** `Demo12345!`
- *(Includes preloaded candidate profile, ATS resume audit, and 70+ scored live job matches).*

---

## 📄 License
This project is licensed under the MIT License.

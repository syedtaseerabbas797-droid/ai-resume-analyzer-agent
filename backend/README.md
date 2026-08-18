# JobScout AI Backend

## Prerequisites
- Python 3.9+
- PostgreSQL database (e.g., Neon)

## Setup Instructions (Windows)

1. **Create a virtual environment:**
```cmd
cd backend
python -m venv venv
```

2. **Activate the virtual environment:**
```cmd
venv\Scripts\activate
```

3. **Install requirements:**
```cmd
pip install -r requirements.txt
```

4. **Environment Variables:**
Copy `.env.example` to `.env`
```cmd
copy .env.example .env
```
Fill in the `DATABASE_URL` in `.env` with your Neon PostgreSQL connection string.

5. **Run the server:**
```cmd
uvicorn app.main:app --reload
```

## API Testing

You can test the endpoints using curl, Postman, or navigating to `http://localhost:8000/docs` in your browser.

- **Health Check:** `GET http://localhost:8000/health`
- **DB Health Check:** `GET http://localhost:8000/db/health`
- **Seed DB:** `POST http://localhost:8000/db/seed`

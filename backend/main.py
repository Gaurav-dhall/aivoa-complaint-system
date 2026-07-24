import sys
import io

# Fix Windows default cp1252 encoding — force UTF-8 so emoji in LLM output
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# pyrefly: ignore [missing-import]
from routers import complaints
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import engine, Base
import models.complaint

load_dotenv()

# This creates the table in PostgreSQL if it doesn't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AIVOA Complaint System",
    description="AI-powered pharmaceutical complaint management API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
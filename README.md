# AIVOA Complaint System

AI-powered Customer Complaint Management System for the pharmaceutical manufacturing QMS (Quality Management System).

## Tech Stack
- **Frontend:** React + Redux Toolkit
- **Backend:** Python + FastAPI
- **AI Agent:** LangGraph (StateGraph)
- **LLM:** Groq (`gemma2-9b-it`)
- **Database:** PostgreSQL (via SQLAlchemy)

## Project Structure
```
aivoa-complaint-system/
├── backend/
│   ├── agents/       # LangGraph StateGraph agent
│   ├── models/       # SQLAlchemy models
│   ├── routers/      # FastAPI route handlers
│   └── services/     # Extraction / parsing helpers
├── frontend/
│   └── src/
│       ├── store/        # Redux slice + store
│       ├── components/   # React components
│       └── services/     # Axios API layer
└── sample_complaints/     # Demo complaint files
```

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic langgraph langchain langchain-groq pypdf python-multipart
cp .env.example .env       # then fill in your real keys
uvicorn main:app --reload
```
Runs at http://localhost:8000 (docs at `/docs`)

### Frontend
```bash
cd frontend
npm install
npm install @reduxjs/toolkit react-redux axios react-dropzone react-router-dom
npm start
```
Runs at http://localhost:3000

## LangGraph Architecture
_(fill this in once the agent is built — describe each node and the graph flow)_

## Features
- [ ] AI document/text extraction into complaint form
- [ ] Conversational field editing via AI chat
- [ ] Complaint save + list view
- [ ] Bonus: Completeness checker
- [ ] Bonus: Duplicate detection
- [ ] Bonus: CAPA + risk classification

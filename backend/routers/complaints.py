# backend/routers/complaints.py

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
import os
import traceback

from database import get_db
from models.complaint import Complaint
from schemas import ComplaintCreate, ComplaintResponse, ChatRequest, ChatResponse
from services.extraction import extract_text_from_upload
from agents.complaint_agent import complaint_graph

# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq

router = APIRouter(prefix="/api")

chat_llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))


# ─────────────────────────────────────────────
# POST /api/extract
# ─────────────────────────────────────────────
@router.post("/extract")
async def extract_complaint(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text")

    if file:
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds 10MB limit")
        raw_text = extract_text_from_upload(file.filename, file_bytes)
    else:
        raw_text = text

    if not raw_text or not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not read any text from input")

    initial_state = {
        "raw_text": raw_text,
        "extracted_fields": {},
        "needs_retry": False,
        "retry_count": 0,
        "risk_assessment": {},
        "ai_summary": "",
        "error": None,
    }

    try:
        final_state = complaint_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction agent failed: {str(e)}")

    fields = final_state.get("extracted_fields", {})
    fields["ai_summary"] = final_state.get("ai_summary", "")

    risk = final_state.get("risk_assessment", {})
    fields["severity_suggested"] = risk.get("severity")
    fields["initial_risk_assessment"] = risk.get("root_cause_hypothesis")
    fields["suggested_next_action"] = ", ".join(risk.get("capa_recommendations", [])) if risk.get("capa_recommendations") else None

    return fields


# ─────────────────────────────────────────────
# POST /api/complaints
# ─────────────────────────────────────────────
@router.post("/complaints", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    new_complaint = Complaint(**complaint.model_dump())
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint


# ─────────────────────────────────────────────
# GET /api/complaints
# ─────────────────────────────────────────────
@router.get("/complaints", response_model=List[ComplaintResponse])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(Complaint).order_by(Complaint.created_at.desc()).all()


# ─────────────────────────────────────────────
# GET /api/complaints/check-duplicate
# ─────────────────────────────────────────────
@router.get("/complaints/check-duplicate")
def check_duplicate(batch: str, product: str, db: Session = Depends(get_db)):
    existing = (
        db.query(Complaint)
        .filter(
            and_(
                Complaint.batch_number == batch,
                Complaint.product_name == product,
            )
        )
        .order_by(Complaint.created_at.desc())
        .first()
    )
    if existing:
        return {"duplicate": True, "existing_complaint_id": existing.id}
    return {"duplicate": False}


# ─────────────────────────────────────────────
# POST /api/chat
# ─────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(payload: ChatRequest):
    prompt = f"""You are a pharma QMS complaint assistant helping a user review a complaint form.

Complaint context:
{payload.complaint_context or "No complaint loaded yet."}

User question:
{payload.message}

Answer clearly and concisely. If the user asks to change a field (e.g. "change quantity to 500 tablets"),
respond confirming the change and state the field name and new value clearly so it can be parsed,
e.g. "Updated quantity_affected to 500 and quantity_unit to tablets."
"""
    try:
        response = chat_llm.invoke(prompt)
        return {"response": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
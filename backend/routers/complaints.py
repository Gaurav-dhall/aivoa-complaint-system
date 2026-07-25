

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
import os
import json
import traceback

from database import get_db
from models.complaint import Complaint
from schemas import ComplaintCreate, ComplaintResponse, ChatRequest
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
    fields["suggested_next_action"] = (
        ", ".join(risk.get("capa_recommendations", []))
        if risk.get("capa_recommendations")
        else None
    )

    # Rename complaint_type → complaint_category to match the frontend field name
    if "complaint_type" in fields:
        fields["complaint_category"] = fields.pop("complaint_type")

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

VALID_FIELDS = {
    "complaint_source", "customer_name", "product_name", "product_strength",
    "batch_number", "manufacturing_date", "expiry_date", "quantity_affected",
    "quantity_unit", "complaint_type", "complaint_date", "description",
    "severity", "priority",
}

CHAT_SYSTEM_PROMPT = """You are an AI assistant helping a user manage a pharmaceutical complaint form.

The user will provide the current form fields as JSON, then ask a question or request a change.

YOUR RULES:
1. If the user wants to CHANGE, UPDATE, EDIT, or CORRECT any field value — fill field_updates with only the fields that need changing.
2. If the user is asking a QUESTION or chatting normally — leave field_updates as an empty object {}.
3. ALWAYS return valid JSON. Nothing else. No markdown, no code fences, no preamble.

Valid field names (use these exact keys only):
complaint_source, customer_name, product_name, product_strength,
batch_number, manufacturing_date, expiry_date, quantity_affected,
quantity_unit, complaint_type, complaint_date, description, severity, priority

Rules for field values:
- Dates → "YYYY-MM-DD"
- quantity_affected → a number (e.g. 500), quantity_unit → a string (e.g. "tablets", "kg")
- severity → one of: Minor, Moderate, Major, Critical
- priority → one of: Low, Medium, High, Critical

Return this exact JSON shape:
{
  "is_field_update": true or false,
  "field_updates": { "field_name": "new_value" },
  "response": "A short human-friendly confirmation or answer."
}"""


@router.post("/chat")
def chat_with_assistant(payload: ChatRequest):
    user_content = f"""Current form fields:
{payload.complaint_context or "{}"}

User message: {payload.message}"""

    try:
        ai_response = chat_llm.invoke([
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ])
        raw = ai_response.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat LLM failed: {str(e)}")

    # Strip markdown fences if the model wraps output despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Model returned plain text — treat as a conversational reply, no field updates
        return {
            "is_field_update": False,
            "field_updates": {},
            "response": raw,
        }

    # Sanitize: only keep keys that are actual form fields to prevent junk updates
    raw_updates = parsed.get("field_updates", {}) or {}
    safe_updates = {k: v for k, v in raw_updates.items() if k in VALID_FIELDS}

    return {
        "is_field_update": bool(safe_updates),
        "field_updates": safe_updates,
        "response": parsed.get("response", "Done."),
    }
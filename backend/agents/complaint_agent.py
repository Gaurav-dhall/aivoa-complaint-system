# backend/agents/complaint_agent.py

import os
import sys
import json
import re
import traceback
from typing import TypedDict, Optional
from dotenv import load_dotenv

load_dotenv()

# Disable LangSmith tracing BEFORE importing LangChain/LangGraph.
# LangSmith's background thread tries to serialize LLM responses and can
# trigger a charmap UnicodeEncodeError on Windows if tracing is active.
os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")
os.environ.setdefault("LANGSMITH_TRACING", "false")
os.environ.setdefault("LANGCHAIN_CALLBACKS_BACKGROUND", "false")

# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, END
# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq

# ─────────────────────────────────────────────
# 1. STATE DEFINITION
# ─────────────────────────────────────────────
class AgentState(TypedDict):
    raw_text: str
    extracted_fields: dict
    needs_retry: bool
    retry_count: int
    risk_assessment: dict
    ai_summary: str
    error: Optional[str]


# ─────────────────────────────────────────────
# 2. LLM SETUP
# ─────────────────────────────────────────────
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,  # low temp = more consistent JSON extraction
    callbacks=[],      # disable all callbacks (prevents LangSmith charmap errors)
)


# ─────────────────────────────────────────────
# 3. HELPER: safely parse JSON out of LLM output
# ─────────────────────────────────────────────
def safe_json_parse(text: str) -> dict:
    """
    LLMs often wrap JSON in ```json ... ``` or add stray text.
    This strips that and parses safely.
    """
    text = text.strip()
    # Remove markdown code fences if present
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    # Try to find the first { ... } block in case there's extra text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


# ─────────────────────────────────────────────
# 4. NODE 1 — parse_document
# ─────────────────────────────────────────────
def parse_document(state: AgentState) -> AgentState:
    print("[NODE] parse_document - cleaning input text")

    text = state.get("raw_text", "") or ""
    # basic cleanup: collapse excessive whitespace
    cleaned = re.sub(r"\n{3,}", "\n\n", text).strip()

    state["raw_text"] = cleaned
    state["retry_count"] = state.get("retry_count", 0)
    state["error"] = None

    print(f"   cleaned text length: {len(cleaned)} chars")
    return state


# ─────────────────────────────────────────────
# 5. NODE 2 — extract_fields
# ─────────────────────────────────────────────
EXTRACTION_PROMPT = """You are a data extraction system for a pharmaceutical company's complaint intake process.

Extract the following fields from the complaint text below. Return ONLY a valid JSON object — no explanation, no markdown, no code fences.

Keys to extract:
- complaint_source (e.g. "Email", "Phone", "Portal")
- customer_name
- product_name
- product_strength
- batch_number
- manufacturing_date (format: YYYY-MM-DD if possible, else as written)
- expiry_date (format: YYYY-MM-DD if possible, else as written)
- quantity_affected (just the number, no units)
- quantity_unit (e.g. "kg", "tablets", "capsules")
- complaint_type (e.g. "Color variation", "Foreign particle", "Packaging defect")
- complaint_date (format: YYYY-MM-DD if possible, else as written)
- description (a clean 1-2 sentence summary of the actual complaint)

If a field cannot be found in the text, use null for its value.

Complaint text:
\"\"\"
{raw_text}
\"\"\"

Return ONLY the JSON object."""


def extract_fields(state: AgentState) -> AgentState:
    attempt = state.get("retry_count", 0) + 1
    print(f"[NODE] extract_fields - attempt #{attempt}")

    prompt = EXTRACTION_PROMPT.format(raw_text=state["raw_text"])

    try:
        response = llm.invoke(prompt)
        parsed = safe_json_parse(response.content)

        if not parsed:
            print("   [WARN] Failed to parse JSON from LLM response")
            state["error"] = "Failed to parse extraction JSON"
            parsed = {}

        state["extracted_fields"] = parsed

        # Check mandatory fields
        mandatory = ["product_name", "batch_number", "description"]
        missing = [f for f in mandatory if not parsed.get(f)]

        if missing:
            print(f"   [WARN] Missing mandatory fields: {missing}")
            state["needs_retry"] = True
        else:
            state["needs_retry"] = False

        state["retry_count"] = attempt

    except Exception as e:
        print(f"   [ERROR] Groq call failed: {e}")
        state["error"] = str(e)
        state["extracted_fields"] = state.get("extracted_fields", {})
        state["needs_retry"] = True
        state["retry_count"] = attempt

    return state


# ─────────────────────────────────────────────
# 6. NODE 3 — validate_fields (this creates the conditional edge)
# ─────────────────────────────────────────────
def validate_fields(state: AgentState) -> AgentState:
    print("[NODE] validate_fields - checking completeness")

    mandatory = ["product_name", "batch_number", "description"]
    fields = state.get("extracted_fields", {})
    missing = [f for f in mandatory if not fields.get(f)]

    if missing and state.get("retry_count", 0) < 2:
        print(f"   still missing {missing}, will retry (retry_count={state['retry_count']})")
        state["needs_retry"] = True
    else:
        if missing:
            print(f"   giving up after max retries, missing: {missing}")
        else:
            print("   all mandatory fields present")
        state["needs_retry"] = False

    return state


def route_after_validation(state: AgentState) -> str:
    """Conditional edge logic: decide next node based on state."""
    if state.get("needs_retry") and state.get("retry_count", 0) < 2:
        return "extract_fields"
    return "assess_risk"


# ─────────────────────────────────────────────
# 7. NODE 4 — assess_risk
# ─────────────────────────────────────────────
RISK_PROMPT = """You are a pharmaceutical QMS (Quality Management System) expert reviewing a customer complaint.

Complaint details:
- Product: {product_name}
- Batch: {batch_number}
- Complaint Type: {complaint_type}
- Description: {description}

Based on this, return ONLY a valid JSON object with these keys:
- severity: one of "Minor", "Moderate", "Major", "Critical"
- priority: one of "Low", "Medium", "High", "Critical"
- risk_type: one of "Patient Safety", "Product Quality", "Regulatory Compliance"
- root_cause_hypothesis: a single sentence hypothesis
- summary: a 2-sentence executive summary of this complaint

Return ONLY the JSON object, no explanation, no markdown."""


def assess_risk(state: AgentState) -> AgentState:
    print("[NODE] assess_risk - calling Groq for risk classification")

    fields = state.get("extracted_fields", {})
    prompt = RISK_PROMPT.format(
        product_name=fields.get("product_name", "Unknown"),
        batch_number=fields.get("batch_number", "Unknown"),
        complaint_type=fields.get("complaint_type", "Unknown"),
        description=fields.get("description", "No description available"),
    )

    try:
        response = llm.invoke(prompt)
        parsed = safe_json_parse(response.content)

        if not parsed:
            print("   [WARN] Failed to parse risk JSON, using fallback defaults")
            parsed = {
                "severity": "Moderate",
                "priority": "Medium",
                "risk_type": "Product Quality",
                "root_cause_hypothesis": "Unable to determine — manual review required.",
                "summary": "Complaint requires manual risk assessment.",
            }

        state["risk_assessment"] = parsed
        state["ai_summary"] = parsed.get("summary", "")

        # merge severity/priority into extracted_fields so the form can use them directly
        state["extracted_fields"]["severity"] = parsed.get("severity", "Moderate")
        state["extracted_fields"]["priority"] = parsed.get("priority", "Medium")

        print(f"   severity={parsed.get('severity')}, priority={parsed.get('priority')}")

    except Exception as e:
        print(f"   [ERROR] Risk assessment failed: {e}")
        state["error"] = str(e)
        state["risk_assessment"] = {}
        state["ai_summary"] = "Risk assessment unavailable due to an error."

    return state


# ─────────────────────────────────────────────
# 8. BUILD THE GRAPH
# ─────────────────────────────────────────────
workflow = StateGraph(AgentState)

workflow.add_node("parse_document", parse_document)
workflow.add_node("extract_fields", extract_fields)
workflow.add_node("validate_fields", validate_fields)
workflow.add_node("assess_risk", assess_risk)

workflow.set_entry_point("parse_document")

workflow.add_edge("parse_document", "extract_fields")
workflow.add_edge("extract_fields", "validate_fields")

workflow.add_conditional_edges(
    "validate_fields",
    route_after_validation,
    {
        "extract_fields": "extract_fields",
        "assess_risk": "assess_risk",
    },
)

workflow.add_edge("assess_risk", END)

complaint_graph = workflow.compile()


# ─────────────────────────────────────────────
# 9. STANDALONE TEST — run this file directly to test
# ─────────────────────────────────────────────
if __name__ == "__main__":
    sample_text = """
    From: quality.assurance@citymedicals.com
    Subject: Complaint - Metformin 500mg Color Variation - Batch BT-2024-0892

    We are writing to formally report a quality complaint regarding Metformin
    Hydrochloride Tablets 500mg received on December 10, 2024.

    Customer Name: City Medicals Pvt Ltd
    Product: Metformin Hydrochloride Tablets 500mg
    Batch/Lot Number: BT-2024-0892
    Manufacturing Date: September 2024
    Expiry Date: August 2026
    Quantity Affected: 200 tablets

    Nature of Complaint:
    Upon inspection, we observed visible color variation across tablets in the
    same batch. Approximately 15-20% of the tablets show a darker shade compared
    to the standard white color specification.

    Regards,
    Priya Sharma
    Quality Assurance Manager
    """

    initial_state = {
        "raw_text": sample_text,
        "extracted_fields": {},
        "needs_retry": False,
        "retry_count": 0,
        "risk_assessment": {},
        "ai_summary": "",
        "error": None,
    }

    print("\n===== RUNNING LANGGRAPH COMPLAINT AGENT =====\n")
    final_state = complaint_graph.invoke(initial_state)

    print("\n===== FINAL STATE =====")
    print(json.dumps(final_state, indent=2, default=str))
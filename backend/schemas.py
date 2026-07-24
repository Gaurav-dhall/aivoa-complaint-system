import re
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime


def parse_flexible_date(v):
    if not v:
        return None
    if isinstance(v, date):
        return v
    if not isinstance(v, str):
        return None
    v = v.strip()
    if not v:
        return None

    formats = [
        "%Y-%m-%d",
        "%B %Y",
        "%b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            pass

    m_year_month = re.match(r"^(\d{4})[-/.](\d{1,2})$", v)
    if m_year_month:
        return date(int(m_year_month.group(1)), int(m_year_month.group(2)), 1)

    m_year = re.match(r"^(\d{4})$", v)
    if m_year:
        return date(int(m_year.group(1)), 1, 1)

    return None


def parse_flexible_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        m = re.search(r"[-+]?\d*\.?\d+", v)
        if m:
            return float(m.group(0))
    return None


class ComplaintCreate(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity_affected: Optional[float] = None
    quantity_unit: Optional[str] = "kg"
    originating_site_block: Optional[str] = None
    impacted_npm: Optional[str] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[date] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = "Pending Triage"
    ai_summary: Optional[str] = None
    severity_suggested: Optional[str] = None
    suggested_next_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None

    @field_validator("manufacturing_date", "expiry_date", "complaint_date", mode="before")
    @classmethod
    def validate_dates(cls, v):
        return parse_flexible_date(v)

    @field_validator("quantity_affected", mode="before")
    @classmethod
    def validate_quantity(cls, v):
        return parse_flexible_float(v)


class ComplaintResponse(ComplaintCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # lets Pydantic read SQLAlchemy objects directly


class ChatRequest(BaseModel):
    message: str
    complaint_context: Optional[str] = ""


class ChatResponse(BaseModel):
    response: str
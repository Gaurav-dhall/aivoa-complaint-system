from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime
from sqlalchemy.sql import func
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_source = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    product_strength = Column(String, nullable=True)
    batch_number = Column(String, nullable=True)
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity_affected = Column(Float, nullable=True)
    quantity_unit = Column(String, nullable=True, default="kg")
    originating_site_block = Column(String, nullable=True)
    impacted_npm = Column(String, nullable=True)
    complaint_type = Column(String, nullable=True)
    complaint_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    severity = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    status = Column(String, default="Pending Triage")
    ai_summary = Column(Text, nullable=True)
    severity_suggested = Column(String, nullable=True)
    suggested_next_action = Column(String, nullable=True)
    initial_risk_assessment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
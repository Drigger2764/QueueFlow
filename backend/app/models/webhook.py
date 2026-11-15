import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    url = Column(String(512), nullable=False)
    description = Column(String(256), nullable=True)
    secret = Column(String(128), nullable=False)
    events = Column(JSON, nullable=False, default=lambda: ["job.completed", "job.failed", "job.dead_letter"])
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    deliveries = relationship("WebhookDelivery", back_populates="endpoint", cascade="all, delete-orphan")


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    endpoint_id = Column(String(36), ForeignKey("webhook_endpoints.id", ondelete="SET NULL"), nullable=True, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    url = Column(String(512), nullable=False)
    
    payload = Column(JSON, nullable=False)
    signature = Column(String(128), nullable=False)
    
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    success = Column(Boolean, default=False, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    endpoint = relationship("WebhookEndpoint", back_populates="deliveries")
    job = relationship("Job", back_populates="webhook_deliveries")

    __table_args__ = (
        Index("ix_deliveries_created_at_desc", created_at.desc()),
    )

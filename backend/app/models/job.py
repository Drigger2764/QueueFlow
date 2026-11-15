import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Enum, Index
from sqlalchemy.orm import relationship
from app.database import Base


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    DEAD_LETTER = "DEAD_LETTER"


class JobPriority(int, enum.Enum):
    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(120), nullable=False, index=True)
    queue = Column(String(64), nullable=False, default="default", index=True)
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.PENDING, index=True)
    priority = Column(Integer, nullable=False, default=JobPriority.NORMAL.value, index=True)
    
    payload = Column(JSON, nullable=True, default=dict)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    max_retries = Column(Integer, nullable=False, default=3)
    retry_count = Column(Integer, nullable=False, default=0)
    backoff_base = Column(Integer, nullable=False, default=2)
    timeout_seconds = Column(Integer, nullable=False, default=300)
    
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    webhook_url = Column(String(512), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    executions = relationship("JobExecution", back_populates="job", cascade="all, delete-orphan", order_by="JobExecution.attempt_number.asc()")
    webhook_deliveries = relationship("WebhookDelivery", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_jobs_status_queue", "status", "queue"),
        Index("ix_jobs_created_at_desc", created_at.desc()),
    )

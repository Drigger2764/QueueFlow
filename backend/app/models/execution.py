import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class ExecutionStatus(str, enum.Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"


class JobExecution(Base):
    __tablename__ = "job_executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False, default=1)
    status = Column(Enum(ExecutionStatus), nullable=False, default=ExecutionStatus.RUNNING)
    worker_id = Column(String(128), nullable=True, index=True)
    
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Float, nullable=True)
    
    error_trace = Column(Text, nullable=True)
    output = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    job = relationship("Job", back_populates="executions")

    __table_args__ = (
        Index("ix_executions_job_attempt", "job_id", "attempt_number"),
    )

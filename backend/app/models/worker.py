from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.database import Base


class WorkerNode(Base):
    __tablename__ = "worker_nodes"

    id = Column(String(128), primary_key=True, index=True)
    hostname = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="IDLE")  # IDLE, BUSY, OFFLINE
    current_job_id = Column(String(36), nullable=True)
    jobs_completed = Column(Integer, default=0, nullable=False)
    jobs_failed = Column(Integer, default=0, nullable=False)
    concurrency = Column(Integer, default=1, nullable=False)
    queues = Column(JSON, nullable=False, default=lambda: ["default"])
    
    last_heartbeat = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

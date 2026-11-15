from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.execution import ExecutionStatus


class ExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    attempt_number: int
    status: ExecutionStatus
    worker_id: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    error_trace: Optional[str] = None
    output: Optional[str] = None
    created_at: datetime

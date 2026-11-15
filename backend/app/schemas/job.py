from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Any, Dict, List
from app.models.job import JobStatus, JobPriority
from app.schemas.execution import ExecutionResponse


class JobCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Name or task type of the job")
    queue: str = Field(default="default", max_length=64, description="Queue target")
    priority: int = Field(default=JobPriority.NORMAL.value, description="Job priority (higher runs first)")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Input parameters/payload for the job")
    max_retries: int = Field(default=3, ge=0, le=20, description="Max retry attempts on failure")
    backoff_base: int = Field(default=2, ge=1, le=10, description="Exponential backoff multiplier in seconds")
    timeout_seconds: int = Field(default=300, ge=1, le=3600, description="Timeout limit in seconds")
    webhook_url: Optional[str] = Field(default=None, max_length=512, description="Optional job-specific webhook URL")


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    queue: str
    status: JobStatus
    priority: int
    payload: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    max_retries: int
    retry_count: int
    backoff_base: int
    timeout_seconds: int
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    webhook_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    execution_count: Optional[int] = 0


class JobDetailResponse(JobResponse):
    executions: List[ExecutionResponse] = []


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    size: int
    pages: int


class JobRetryRequest(BaseModel):
    reset_retries: bool = True

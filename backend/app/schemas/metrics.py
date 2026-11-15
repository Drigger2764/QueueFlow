from pydantic import BaseModel
from typing import Dict, List, Optional


class SystemMetrics(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    pending_jobs: int
    running_jobs: int
    dead_letter_jobs: int
    cancelled_jobs: int
    active_workers: int
    queue_depths: Dict[str, int]
    success_rate: float
    avg_duration_ms: float


class ActivityDataPoint(BaseModel):
    time: str
    completed: int
    failed: int
    submitted: int


class QueueMetrics(BaseModel):
    name: str
    ready: int
    delayed: int

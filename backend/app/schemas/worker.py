from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class WorkerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hostname: str
    status: str
    current_job_id: Optional[str] = None
    jobs_completed: int
    jobs_failed: int
    concurrency: int
    queues: List[str]
    last_heartbeat: datetime
    started_at: datetime
    is_alive: bool = True

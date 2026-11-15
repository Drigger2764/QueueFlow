from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.config import settings
from app.models.worker import WorkerNode
from app.schemas.worker import WorkerResponse

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.get("", response_model=List[WorkerResponse])
def list_workers(db: Session = Depends(get_db)):
    """List all registered worker nodes and their operational health."""
    workers = db.query(WorkerNode).all()
    now = datetime.now(timezone.utc)
    threshold = timedelta(seconds=settings.WORKER_OFFLINE_THRESHOLD_SECONDS)

    result = []
    for w in workers:
        # Check if worker heartbeat is current
        last_hb = w.last_heartbeat
        if last_hb.tzinfo is None:
            last_hb = last_hb.replace(tzinfo=timezone.utc)

        is_alive = (now - last_hb) <= threshold and w.status != "OFFLINE"
        
        status_display = w.status
        if not is_alive and w.status != "OFFLINE":
            status_display = "DISCONNECTED"

        result.append(
            WorkerResponse(
                id=w.id,
                hostname=w.hostname,
                status=status_display,
                current_job_id=w.current_job_id,
                jobs_completed=w.jobs_completed,
                jobs_failed=w.jobs_failed,
                concurrency=w.concurrency,
                queues=w.queues or ["default"],
                last_heartbeat=w.last_heartbeat,
                started_at=w.started_at,
                is_alive=is_alive
            )
        )
    return result

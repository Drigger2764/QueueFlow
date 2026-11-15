from typing import List, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.metrics import SystemMetrics, ActivityDataPoint, QueueMetrics
from app.services.metrics_service import MetricsService
from app.queue.broker import broker

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("", response_model=SystemMetrics)
def get_metrics(db: Session = Depends(get_db)):
    """Retrieve top-level platform overview metrics."""
    service = MetricsService(db)
    return service.get_system_metrics()


@router.get("/activity", response_model=List[ActivityDataPoint])
def get_activity_chart(hours: int = Query(24, ge=1, le=168), db: Session = Depends(get_db)):
    """Retrieve time-series activity data for dashboard charts."""
    service = MetricsService(db)
    return service.get_activity_points(hours=hours)


@router.get("/queues", response_model=List[QueueMetrics])
def get_queue_metrics():
    """Retrieve queue-by-queue breakdown of ready and delayed jobs."""
    data = broker.get_all_queue_metrics()
    return [
        QueueMetrics(name=name, ready=stats["ready"], delayed=stats["delayed"])
        for name, stats in data.items()
    ]

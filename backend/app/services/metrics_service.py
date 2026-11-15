from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.models.job import Job, JobStatus
from app.models.execution import JobExecution, ExecutionStatus
from app.models.worker import WorkerNode
from app.queue.broker import broker
from app.schemas.metrics import SystemMetrics, ActivityDataPoint


class MetricsService:
    def __init__(self, db: Session):
        self.db = db

    def get_system_metrics(self) -> SystemMetrics:
        # Aggregate job status counts in a single query
        status_counts = dict(
            self.db.query(Job.status, func.count(Job.id))
            .group_by(Job.status)
            .all()
        )

        completed = status_counts.get(JobStatus.COMPLETED, 0)
        failed = status_counts.get(JobStatus.FAILED, 0)
        pending = status_counts.get(JobStatus.PENDING, 0)
        queued = status_counts.get(JobStatus.QUEUED, 0)
        running = status_counts.get(JobStatus.RUNNING, 0)
        dead_letter = status_counts.get(JobStatus.DEAD_LETTER, 0)
        cancelled = status_counts.get(JobStatus.CANCELLED, 0)

        total = completed + failed + pending + queued + running + dead_letter + cancelled

        # Success rate
        finished = completed + failed + dead_letter
        success_rate = round((completed / finished * 100), 1) if finished > 0 else 100.0

        # Avg duration
        avg_dur = self.db.query(func.avg(JobExecution.duration_ms)).filter(
            JobExecution.status == ExecutionStatus.COMPLETED
        ).scalar() or 0.0

        # Active workers: workers that have pinged within threshold
        threshold = datetime.now(timezone.utc) - timedelta(seconds=settings.WORKER_OFFLINE_THRESHOLD_SECONDS)
        active_workers = self.db.query(WorkerNode).filter(
            WorkerNode.last_heartbeat >= threshold,
            WorkerNode.status != "OFFLINE"
        ).count()

        # Queue depths from Redis broker
        queue_metrics = broker.get_all_queue_metrics()
        depths = {q: data["ready"] + data["delayed"] for q, data in queue_metrics.items()}
        depths["dead_letter"] = broker.get_dlq_length()

        return SystemMetrics(
            total_jobs=total,
            completed_jobs=completed,
            failed_jobs=failed,
            pending_jobs=pending + queued,
            running_jobs=running,
            dead_letter_jobs=dead_letter,
            cancelled_jobs=cancelled,
            active_workers=active_workers,
            queue_depths=depths,
            success_rate=success_rate,
            avg_duration_ms=round(avg_dur, 2)
        )

    def get_activity_points(self, hours: int = 24) -> List[ActivityDataPoint]:
        """
        Generate time-bucketed activity data points for the Recharts dashboard chart.
        Groups completed, failed, and submitted jobs into hourly intervals.
        """
        now = datetime.now(timezone.utc)
        points: List[ActivityDataPoint] = []

        # Generate buckets for the last 12 intervals (2 hours each)
        intervals = 12
        interval_hours = max(1, hours // intervals)

        for i in range(intervals - 1, -1, -1):
            start = now - timedelta(hours=(i + 1) * interval_hours)
            end = now - timedelta(hours=i * interval_hours)
            time_label = end.strftime("%H:%M")

            submitted_count = self.db.query(Job).filter(
                Job.created_at >= start,
                Job.created_at < end
            ).count()

            completed_count = self.db.query(Job).filter(
                Job.status == JobStatus.COMPLETED,
                Job.completed_at >= start,
                Job.completed_at < end
            ).count()

            failed_count = self.db.query(Job).filter(
                Job.status.in_([JobStatus.FAILED, JobStatus.DEAD_LETTER]),
                Job.completed_at >= start,
                Job.completed_at < end
            ).count()

            points.append(ActivityDataPoint(
                time=time_label,
                completed=completed_count,
                failed=failed_count,
                submitted=submitted_count
            ))

        return points

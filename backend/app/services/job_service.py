import math
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.models.job import Job, JobStatus
from app.schemas.job import JobCreate
from app.queue.broker import broker
from app.utils.logger import logger


class JobService:
    def __init__(self, db: Session):
        self.db = db

    def create_job(self, data: JobCreate) -> Job:
        job = Job(
            name=data.name,
            queue=data.queue or "default",
            priority=data.priority,
            payload=data.payload or {},
            max_retries=data.max_retries,
            backoff_base=data.backoff_base,
            timeout_seconds=data.timeout_seconds,
            webhook_url=data.webhook_url,
            status=JobStatus.QUEUED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # Enqueue in Redis queue broker
        broker.enqueue(job.id, queue=job.queue)
        logger.info(f"Job created and enqueued: {job.id} (name={job.name}, queue={job.queue})")
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def list_jobs(
        self,
        status: Optional[str] = None,
        queue: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Job], int, int]:
        query = self.db.query(Job)

        if status:
            try:
                status_enum = JobStatus(status.upper())
                query = query.filter(Job.status == status_enum)
            except ValueError:
                pass

        if queue:
            query = query.filter(Job.queue == queue)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Job.id.ilike(search_pattern),
                    Job.name.ilike(search_pattern),
                    Job.error_message.ilike(search_pattern)
                )
            )

        total = query.count()
        pages = math.ceil(total / size) if total > 0 else 1
        offset = (page - 1) * size

        items = query.order_by(desc(Job.created_at)).offset(offset).limit(size).all()
        return items, total, pages

    def retry_job(self, job_id: str, reset_retries: bool = True) -> Optional[Job]:
        job = self.get_job(job_id)
        if not job:
            return None

        # Reset retry counter if requested
        if reset_retries:
            job.retry_count = 0

        job.status = JobStatus.QUEUED
        job.error_message = None
        job.started_at = None
        job.completed_at = None
        job.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(job)

        # Re-enqueue in Redis broker
        broker.enqueue(job.id, queue=job.queue)
        logger.info(f"Manual retry initiated for job: {job.id}")
        return job

    def cancel_job(self, job_id: str) -> Optional[Job]:
        job = self.get_job(job_id)
        if not job:
            return None

        if job.status in [JobStatus.PENDING, JobStatus.QUEUED]:
            job.status = JobStatus.CANCELLED
            job.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(job)
            logger.info(f"Job cancelled: {job.id}")
        return job

    def list_dead_letter(self, page: int = 1, size: int = 20) -> Tuple[List[Job], int, int]:
        return self.list_jobs(status=JobStatus.DEAD_LETTER.value, page=page, size=size)

    def replay_all_dead_letter(self) -> int:
        dlq_jobs = self.db.query(Job).filter(Job.status == JobStatus.DEAD_LETTER).all()
        count = 0
        for job in dlq_jobs:
            self.retry_job(job.id, reset_retries=True)
            count += 1
        return count

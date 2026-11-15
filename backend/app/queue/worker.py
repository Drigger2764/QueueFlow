import os
import sys
import time
import socket
import traceback
import signal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
from app.models.job import Job, JobStatus
from app.models.execution import JobExecution, ExecutionStatus
from app.models.worker import WorkerNode
from app.queue.broker import broker
from app.queue.handlers import execute_job_handler
from app.services.webhook_service import WebhookService
from app.utils.logger import logger


class QueueFlowWorker:
    def __init__(self, worker_id: Optional[str] = None, queues: Optional[List[str]] = None):
        self.hostname = socket.gethostname()
        self.worker_id = worker_id or f"worker-{self.hostname}-{os.getpid()}"
        self.queues = queues or ["default"]
        self.running = False
        self._last_heartbeat = 0

    def register(self, db: Session):
        """Register or update worker in the database."""
        worker = db.query(WorkerNode).filter(WorkerNode.id == self.worker_id).first()
        now = datetime.now(timezone.utc)
        if not worker:
            worker = WorkerNode(
                id=self.worker_id,
                hostname=self.hostname,
                status="IDLE",
                concurrency=1,
                queues=self.queues,
                last_heartbeat=now,
                started_at=now
            )
            db.add(worker)
        else:
            worker.status = "IDLE"
            worker.last_heartbeat = now
            worker.queues = self.queues
        db.commit()

    def heartbeat(self, db: Session, status: str = "IDLE", current_job_id: Optional[str] = None):
        """Update worker heartbeat in database."""
        now = time.time()
        if now - self._last_heartbeat >= settings.WORKER_HEARTBEAT_INTERVAL:
            try:
                worker = db.query(WorkerNode).filter(WorkerNode.id == self.worker_id).first()
                if worker:
                    worker.status = status
                    worker.current_job_id = current_job_id
                    worker.last_heartbeat = datetime.now(timezone.utc)
                    db.commit()
                self._last_heartbeat = now
            except Exception as e:
                logger.warning(f"Worker heartbeat failed: {e}")

    def process_job(self, queue_name: str, job_id: str, db: Session) -> bool:
        """
        Execute a single job with execution tracking, exponential backoff retries,
        dead-letter queue routing, and webhook notifications.
        """
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.warning(f"Job {job_id} dequeued but not found in database.")
            return False

        # If job was cancelled while in queue, do not execute
        if job.status == JobStatus.CANCELLED:
            logger.info(f"Job {job_id} was cancelled before worker execution. Skipping.")
            return False

        attempt_number = job.retry_count + 1
        logger.info(f"[{self.worker_id}] Executing Job {job.name} (id={job.id}, attempt={attempt_number}/{job.max_retries})")

        # Update job and worker status
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        self.heartbeat(db, status="BUSY", current_job_id=job.id)

        # Create execution record
        execution = JobExecution(
            job_id=job.id,
            attempt_number=attempt_number,
            status=ExecutionStatus.RUNNING,
            worker_id=self.worker_id,
            started_at=datetime.now(timezone.utc)
        )
        db.add(execution)
        db.commit()

        start_time = time.time()
        error_trace = None
        result = None

        try:
            # Execute handler
            result = execute_job_handler(job.name, job.payload or {}, attempt_number)
            success = True
        except Exception as exc:
            success = False
            error_trace = traceback.format_exc()
            error_message = str(exc)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        now_dt = datetime.now(timezone.utc)

        # Update execution
        execution.completed_at = now_dt
        execution.duration_ms = duration_ms

        webhook_service = WebhookService(db)
        worker_node = db.query(WorkerNode).filter(WorkerNode.id == self.worker_id).first()

        if success:
            job.status = JobStatus.COMPLETED
            job.result = result
            job.completed_at = now_dt
            job.error_message = None

            execution.status = ExecutionStatus.COMPLETED
            execution.output = str(result)[:2000]

            if worker_node:
                worker_node.jobs_completed += 1

            db.commit()
            logger.info(f"Job {job.id} COMPLETED in {duration_ms}ms")

            # Dispatch webhook notification
            try:
                webhook_service.dispatch_job_event(job, "job.completed", {"duration_ms": duration_ms})
            except Exception as e:
                logger.error(f"Error dispatching completed webhook for job {job.id}: {e}")

            return True
        else:
            # Execution Failed
            job.retry_count += 1
            job.error_message = error_message
            execution.status = ExecutionStatus.FAILED
            execution.error_trace = error_trace

            if job.retry_count < job.max_retries:
                # Automatic Retry with Exponential Backoff
                delay_seconds = (job.backoff_base ** job.retry_count)
                run_at_epoch = time.time() + delay_seconds

                job.status = JobStatus.QUEUED
                broker.schedule_delayed(job.id, run_at_epoch, queue=queue_name)

                db.commit()
                logger.warning(
                    f"Job {job.id} failed (attempt {job.retry_count}/{job.max_retries}). "
                    f"Scheduled retry in {delay_seconds}s with exponential backoff."
                )

                try:
                    webhook_service.dispatch_job_event(
                        job, "job.retrying",
                        {"attempt": job.retry_count, "next_retry_delay": delay_seconds}
                    )
                except Exception as e:
                    logger.error(f"Error dispatching retry webhook: {e}")

                return False
            else:
                # Permanent failure -> DEAD-LETTER QUEUE
                job.status = JobStatus.DEAD_LETTER
                job.completed_at = now_dt
                broker.enqueue_dead_letter(job.id, reason=error_message)

                if worker_node:
                    worker_node.jobs_failed += 1

                db.commit()
                logger.error(f"Job {job.id} permanently failed after {job.retry_count} retries. Moved to DEAD_LETTER queue.")

                try:
                    webhook_service.dispatch_job_event(job, "job.failed", {"attempts": job.retry_count})
                    webhook_service.dispatch_job_event(job, "job.dead_letter", {"reason": error_message})
                except Exception as e:
                    logger.error(f"Error dispatching DLQ webhook: {e}")

                return False

    def run_step(self, db: Session, timeout: int = 1) -> bool:
        """Run a single loop step: dequeue and process if available. Returns True if job was processed."""
        self.heartbeat(db, status="IDLE", current_job_id=None)
        item = broker.dequeue(self.queues, timeout=timeout)
        if item:
            queue_name, job_id = item
            return self.process_job(queue_name, job_id, db)
        return False

    def start(self):
        """Continuous worker process loop."""
        self.running = True
        logger.info(f"Starting QueueFlow Worker: {self.worker_id} on queues: {self.queues}")

        db = SessionLocal()
        try:
            self.register(db)
        finally:
            db.close()

        def _handle_exit(signum, frame):
            logger.info("Worker received shutdown signal. Stopping gracefully...")
            self.running = False

        try:
            signal.signal(signal.SIGINT, _handle_exit)
            signal.signal(signal.SIGTERM, _handle_exit)
        except Exception:
            pass

        while self.running:
            db = SessionLocal()
            try:
                self.run_step(db, timeout=2)
            except Exception as e:
                logger.error(f"Worker iteration exception: {e}")
                time.sleep(1)
            finally:
                db.close()

        # Shutdown cleanup
        db = SessionLocal()
        try:
            worker = db.query(WorkerNode).filter(WorkerNode.id == self.worker_id).first()
            if worker:
                worker.status = "OFFLINE"
                db.commit()
        finally:
            db.close()
        logger.info(f"Worker {self.worker_id} terminated cleanly.")

    def stop(self):
        self.running = False

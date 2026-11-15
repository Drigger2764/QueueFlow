import time
from datetime import datetime, timezone, timedelta
from app.database import init_db, SessionLocal
from app.models.job import Job, JobStatus, JobPriority
from app.models.execution import JobExecution, ExecutionStatus
from app.models.webhook import WebhookEndpoint, WebhookDelivery
from app.models.worker import WorkerNode
from app.queue.broker import broker
from app.utils.security import generate_webhook_secret, compute_hmac_signature


def seed():
    init_db()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Job).count() > 0:
            print("Database already contains jobs. Skipping seed.")
            return

        print("Seeding sample QueueFlow data...")
        now = datetime.now(timezone.utc)

        # 1. Seed Worker Nodes
        workers = [
            WorkerNode(
                id="worker-node-alpha-1",
                hostname="prod-worker-az-1a",
                status="IDLE",
                concurrency=4,
                queues=["default", "critical"],
                jobs_completed=142,
                jobs_failed=3,
                last_heartbeat=now,
                started_at=now - timedelta(hours=12)
            ),
            WorkerNode(
                id="worker-node-beta-2",
                hostname="prod-worker-az-1b",
                status="IDLE",
                concurrency=4,
                queues=["default", "low"],
                jobs_completed=98,
                jobs_failed=1,
                last_heartbeat=now,
                started_at=now - timedelta(hours=8)
            ),
        ]
        db.add_all(workers)
        db.commit()

        # 2. Seed Webhook Endpoints
        endpoint = WebhookEndpoint(
            url="https://webhook.site/queueflow-demo-listener",
            description="Production Slack & Event Gateway",
            secret=generate_webhook_secret(),
            events=["job.completed", "job.failed", "job.dead_letter"],
            is_active=True,
            created_at=now - timedelta(days=2)
        )
        db.add(endpoint)
        db.commit()
        db.refresh(endpoint)

        # 3. Seed Sample Completed Jobs
        completed_tasks = [
            ("email_notification", {"to": "alex@enterprise.org", "subject": "Quarterly Billing Statement"}),
            ("data_export", {"type": "csv", "records": 4500}),
            ("report_generation", {"report_name": "Executive KPI Overview"}),
            ("email_notification", {"to": "sarah@techcorp.io", "subject": "Welcome to QueueFlow Cloud"}),
        ]

        for i, (task_name, payload) in enumerate(completed_tasks):
            job_created = now - timedelta(hours=i*2 + 1)
            job = Job(
                name=task_name,
                queue="default",
                priority=JobPriority.NORMAL.value,
                status=JobStatus.COMPLETED,
                payload=payload,
                result={"status": "success", "processed_records": payload.get("records", 1)},
                max_retries=3,
                retry_count=0,
                created_at=job_created,
                started_at=job_created + timedelta(seconds=2),
                completed_at=job_created + timedelta(seconds=3)
            )
            db.add(job)
            db.commit()
            db.refresh(job)

            # Execution
            execution = JobExecution(
                job_id=job.id,
                attempt_number=1,
                status=ExecutionStatus.COMPLETED,
                worker_id="worker-node-alpha-1",
                started_at=job.started_at,
                completed_at=job.completed_at,
                duration_ms=480.2,
                output=str(job.result),
                created_at=job.created_at
            )
            db.add(execution)

            # Webhook Delivery
            delivery = WebhookDelivery(
                endpoint_id=endpoint.id,
                job_id=job.id,
                event_type="job.completed",
                url=endpoint.url,
                payload={"job_id": job.id, "status": "COMPLETED"},
                signature="sha256=mocked_seed_sig",
                status_code=200,
                response_body='{"received": true}',
                success=True,
                duration_ms=120.5,
                created_at=job.completed_at
            )
            db.add(delivery)

        # 4. Seed a Dead-Letter Queue Job
        dlq_created = now - timedelta(hours=3)
        dlq_job = Job(
            name="always_fail",
            queue="default",
            priority=JobPriority.HIGH.value,
            status=JobStatus.DEAD_LETTER,
            payload={"reason": "Payment gateway remote endpoint 503 Service Unavailable"},
            error_message="ValueError: Unrecoverable error: Payment gateway remote endpoint 503 Service Unavailable",
            max_retries=3,
            retry_count=3,
            created_at=dlq_created,
            started_at=dlq_created + timedelta(seconds=1),
            completed_at=dlq_created + timedelta(seconds=30)
        )
        db.add(dlq_job)
        db.commit()
        db.refresh(dlq_job)

        for attempt in range(1, 4):
            exec_time = dlq_created + timedelta(seconds=attempt * 8)
            execution = JobExecution(
                job_id=dlq_job.id,
                attempt_number=attempt,
                status=ExecutionStatus.FAILED,
                worker_id="worker-node-beta-2",
                started_at=exec_time,
                completed_at=exec_time + timedelta(seconds=1),
                duration_ms=210.0,
                error_trace=f"Traceback (most recent call last):\n  File 'handlers.py', line 62, in handle_always_fail\n    raise ValueError('Unrecoverable error')\nValueError: Unrecoverable error (Attempt {attempt}/3)",
                created_at=exec_time
            )
            db.add(execution)

        broker.enqueue_dead_letter(dlq_job.id, reason=dlq_job.error_message)

        db.commit()
        print("Sample data seeded successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

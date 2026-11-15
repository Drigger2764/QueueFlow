import time
from app.models.job import Job, JobStatus
from app.models.execution import JobExecution, ExecutionStatus
from app.queue.broker import broker
from app.queue.worker import QueueFlowWorker
from app.services.job_service import JobService
from app.schemas.job import JobCreate


def test_worker_successful_execution(db_session):
    service = JobService(db_session)
    job = service.create_job(JobCreate(
        name="echo",
        payload={"msg": "worker_unit_test"},
        max_retries=3
    ))

    worker = QueueFlowWorker(worker_id="test-worker-1", queues=["default"])
    worker.register(db_session)

    # Process job
    processed = worker.run_step(db_session, timeout=1)
    assert processed is True

    # Verify Job state
    db_session.refresh(job)
    assert job.status == JobStatus.COMPLETED
    assert job.result is not None
    assert job.result["echo"]["msg"] == "worker_unit_test"
    assert job.completed_at is not None

    # Verify Execution record
    executions = db_session.query(JobExecution).filter(JobExecution.job_id == job.id).all()
    assert len(executions) == 1
    assert executions[0].status == ExecutionStatus.COMPLETED
    assert executions[0].duration_ms is not None
    assert executions[0].attempt_number == 1


def test_worker_retry_with_exponential_backoff(db_session):
    service = JobService(db_session)
    # flaky_task with fail_until_attempt=2
    job = service.create_job(JobCreate(
        name="flaky_task",
        payload={"fail_until_attempt": 2},
        max_retries=3,
        backoff_base=2
    ))

    worker = QueueFlowWorker(worker_id="test-worker-2", queues=["default"])
    worker.register(db_session)

    # Attempt 1 -> should fail and schedule retry
    processed = worker.run_step(db_session, timeout=1)
    assert processed is False

    db_session.refresh(job)
    assert job.status == JobStatus.QUEUED
    assert job.retry_count == 1
    assert "Transient network error on attempt 1/2" in job.error_message

    # Verify delayed queue has 1 item
    assert broker.get_delayed_length("default") == 1

    # Fast forward time or force move delayed jobs to ready queue
    broker.client.zadd("queueflow:delayed:default", {job.id: time.time() - 1})
    moved = broker.move_ready_delayed_jobs("default")
    assert moved == 1

    # Attempt 2 -> should fail again (fail_until_attempt=2)
    processed_2 = worker.run_step(db_session, timeout=1)
    assert processed_2 is False

    db_session.refresh(job)
    assert job.retry_count == 2
    assert "Transient network error on attempt 2/2" in job.error_message

    # Move to ready again
    broker.client.zadd("queueflow:delayed:default", {job.id: time.time() - 1})
    broker.move_ready_delayed_jobs("default")

    # Attempt 3 -> attempt (3) > fail_until_attempt (2) -> SUCCEEDS!
    processed_3 = worker.run_step(db_session, timeout=1)
    assert processed_3 is True

    db_session.refresh(job)
    assert job.status == JobStatus.COMPLETED
    assert job.result["status"] == "recovered"
    assert job.result["attempt_succeeded"] == 3


def test_worker_dead_letter_queue_on_max_retries(db_session):
    service = JobService(db_session)
    job = service.create_job(JobCreate(
        name="always_fail",
        payload={"reason": "Critical corruption"},
        max_retries=2,  # Fail on attempt 1, fail on attempt 2 -> DLQ
        backoff_base=1
    ))

    worker = QueueFlowWorker(worker_id="test-worker-dlq", queues=["default"])
    worker.register(db_session)

    # Attempt 1
    worker.run_step(db_session, timeout=1)
    db_session.refresh(job)
    assert job.status == JobStatus.QUEUED
    assert job.retry_count == 1

    # Force move delayed job
    broker.client.zadd("queueflow:delayed:default", {job.id: time.time() - 1})
    broker.move_ready_delayed_jobs("default")

    # Attempt 2 -> hits max_retries (2) -> DEAD_LETTER
    worker.run_step(db_session, timeout=1)
    db_session.refresh(job)
    assert job.status == JobStatus.DEAD_LETTER
    assert job.retry_count == 2
    assert "Critical corruption" in job.error_message

    # Verify DLQ length in broker
    assert broker.get_dlq_length() == 1

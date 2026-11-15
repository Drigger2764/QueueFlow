from app.models.job import Job, JobStatus
from app.models.worker import WorkerNode
from datetime import datetime, timezone


def test_metrics_api_counts(client, db_session):
    # Add some jobs
    j1 = Job(name="job1", status=JobStatus.COMPLETED)
    j2 = Job(name="job2", status=JobStatus.COMPLETED)
    j3 = Job(name="job3", status=JobStatus.FAILED)
    j4 = Job(name="job4", status=JobStatus.DEAD_LETTER)
    db_session.add_all([j1, j2, j3, j4])

    # Add a worker
    worker = WorkerNode(
        id="worker-metrics-1",
        hostname="localhost",
        status="IDLE",
        last_heartbeat=datetime.now(timezone.utc),
        started_at=datetime.now(timezone.utc)
    )
    db_session.add(worker)
    db_session.commit()

    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 4
    assert data["completed_jobs"] == 2
    assert data["failed_jobs"] == 1
    assert data["dead_letter_jobs"] == 1
    assert data["active_workers"] >= 1
    assert data["success_rate"] == 50.0


def test_metrics_activity_endpoint(client):
    resp = client.get("/api/metrics/activity?hours=24")
    assert resp.status_code == 200
    points = resp.json()
    assert isinstance(points, list)
    assert len(points) > 0
    assert "time" in points[0]
    assert "completed" in points[0]


def test_workers_api(client, db_session):
    worker = WorkerNode(
        id="worker-test-node",
        hostname="worker-box",
        status="IDLE",
        concurrency=2,
        queues=["default"],
        last_heartbeat=datetime.now(timezone.utc),
        started_at=datetime.now(timezone.utc)
    )
    db_session.add(worker)
    db_session.commit()

    resp = client.get("/api/workers")
    assert resp.status_code == 200
    workers = resp.json()
    assert len(workers) >= 1
    w = next(item for item in workers if item["id"] == "worker-test-node")
    assert w["hostname"] == "worker-box"
    assert w["status"] == "IDLE"
    assert w["is_alive"] is True

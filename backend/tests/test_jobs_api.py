def test_create_job(client):
    response = client.post(
        "/api/jobs",
        json={
            "name": "email_notification",
            "queue": "notifications",
            "priority": 10,
            "payload": {"to": "test@example.com", "subject": "Hello Test"},
            "max_retries": 3,
            "backoff_base": 2
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "email_notification"
    assert data["queue"] == "notifications"
    assert data["status"] == "QUEUED"
    assert data["priority"] == 10
    assert data["payload"]["to"] == "test@example.com"
    assert "id" in data


def test_get_job_by_id(client):
    # Create job first
    create_resp = client.post(
        "/api/jobs",
        json={"name": "data_export", "payload": {"records": 500}}
    )
    job_id = create_resp.json()["id"]

    # Fetch
    get_resp = client.get(f"/api/jobs/{job_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == job_id
    assert data["name"] == "data_export"
    assert "executions" in data


def test_get_nonexistent_job_returns_404(client):
    resp = client.get("/api/jobs/nonexistent-id-000")
    assert resp.status_code == 404


def test_list_jobs_pagination_and_filter(client):
    # Create multiple jobs
    for i in range(5):
        client.post("/api/jobs", json={"name": f"task_{i}", "queue": "default"})
    for i in range(3):
        client.post("/api/jobs", json={"name": f"critical_task_{i}", "queue": "critical"})

    # List all
    resp = client.get("/api/jobs?page=1&size=20")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 8
    assert len(data["items"]) == 8

    # Filter by queue
    resp_q = client.get("/api/jobs?queue=critical")
    assert resp_q.status_code == 200
    assert resp_q.json()["total"] == 3

    # Search
    resp_s = client.get("/api/jobs?search=critical_task_1")
    assert resp_s.status_code == 200
    assert resp_s.json()["total"] == 1


def test_cancel_job(client):
    create_resp = client.post("/api/jobs", json={"name": "cancel_target"})
    job_id = create_resp.json()["id"]

    cancel_resp = client.post(f"/api/jobs/{job_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Verify status in database
    get_resp = client.get(f"/api/jobs/{job_id}")
    assert get_resp.json()["status"] == "CANCELLED"


def test_retry_job_endpoint(client):
    create_resp = client.post("/api/jobs", json={"name": "retry_target"})
    job_id = create_resp.json()["id"]

    retry_resp = client.post(f"/api/jobs/{job_id}/retry", json={"reset_retries": True})
    assert retry_resp.status_code == 200
    assert retry_resp.json()["status"] == "QUEUED"
    assert retry_resp.json()["retry_count"] == 0

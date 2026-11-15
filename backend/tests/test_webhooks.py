import json
from unittest.mock import patch, MagicMock
from app.utils.security import compute_hmac_signature, verify_hmac_signature, generate_webhook_secret
from app.models.webhook import WebhookEndpoint, WebhookDelivery
from app.services.webhook_service import WebhookService
from app.models.job import Job, JobStatus


def test_hmac_signature_generation_and_verification():
    secret = "whsec_test_secret_key_12345"
    payload = json.dumps({"event": "job.completed", "job_id": "123"}).encode("utf-8")
    timestamp = "1700000000"

    sig = compute_hmac_signature(secret, payload, timestamp)
    assert sig.startswith("sha256=")

    # Verify matching
    valid = verify_hmac_signature(secret, payload, timestamp, sig)
    assert valid is True

    # Verify tampering detection
    tampered_payload = json.dumps({"event": "job.completed", "job_id": "999"}).encode("utf-8")
    assert verify_hmac_signature(secret, tampered_payload, timestamp, sig) is False

    # Verify wrong secret detection
    assert verify_hmac_signature("whsec_wrong_key", payload, timestamp, sig) is False


def test_webhook_crud_api(client):
    # Create
    create_resp = client.post(
        "/api/webhooks",
        json={
            "url": "https://example.com/webhook",
            "description": "Integration endpoint",
            "events": ["job.completed", "job.failed"]
        }
    )
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["url"] == "https://example.com/webhook"
    assert data["secret"].startswith("whsec_")
    endpoint_id = data["id"]

    # List
    list_resp = client.get("/api/webhooks")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Update
    update_resp = client.put(
        f"/api/webhooks/{endpoint_id}",
        json={"description": "Updated Integration endpoint", "is_active": False}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["description"] == "Updated Integration endpoint"
    assert update_resp.json()["is_active"] is False

    # Delete
    del_resp = client.delete(f"/api/webhooks/{endpoint_id}")
    assert del_resp.status_code == 204

    # Fetch deleted
    get_resp = client.get(f"/api/webhooks/{endpoint_id}")
    assert get_resp.status_code == 404


def test_webhook_dispatch_on_job_event(db_session):
    # Setup active endpoint
    secret = generate_webhook_secret()
    endpoint = WebhookEndpoint(
        url="https://httpbin.org/post",
        description="Test endpoint",
        secret=secret,
        events=["job.completed"],
        is_active=True
    )
    db_session.add(endpoint)

    job = Job(
        name="test_webhook_job",
        queue="default",
        status=JobStatus.COMPLETED,
        result={"status": "ok"}
    )
    db_session.add(job)
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"success": true}'

    with patch("httpx.Client") as mock_client:
        mock_instance = MagicMock()
        mock_instance.__enter__.return_value.post.return_value = mock_resp
        mock_client.return_value = mock_instance

        service = WebhookService(db_session)
        service.dispatch_job_event(job, "job.completed")

    # Verify WebhookDelivery was recorded
    deliveries = db_session.query(WebhookDelivery).filter(WebhookDelivery.job_id == job.id).all()
    assert len(deliveries) >= 1
    assert deliveries[0].event_type == "job.completed"
    assert deliveries[0].signature.startswith("sha256=")
    assert deliveries[0].success is True
    assert deliveries[0].status_code == 200

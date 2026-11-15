import time
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.config import settings
from app.models.webhook import WebhookEndpoint, WebhookDelivery
from app.models.job import Job
from app.utils.security import compute_hmac_signature, generate_webhook_secret
from app.utils.logger import logger


class WebhookService:
    def __init__(self, db: Session):
        self.db = db

    def dispatch_job_event(self, job: Job, event_type: str, custom_data: Optional[Dict[str, Any]] = None):
        """
        Deliver webhook event to all subscribed endpoints and any job-specific webhook_url.
        """
        payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "job": {
                "id": job.id,
                "name": job.name,
                "queue": job.queue,
                "status": job.status.value,
                "priority": job.priority,
                "retry_count": job.retry_count,
                "max_retries": job.max_retries,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "result": job.result,
                "error_message": job.error_message,
            }
        }
        if custom_data:
            payload["extra"] = custom_data

        # 1. Deliver to registered endpoints matching event_type
        endpoints = self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.is_active == True
        ).all()

        for ep in endpoints:
            if ep.events and event_type in ep.events:
                self._send_and_record(
                    endpoint_id=ep.id,
                    job_id=job.id,
                    event_type=event_type,
                    url=ep.url,
                    secret=ep.secret,
                    payload=payload
                )

        # 2. Deliver to job-specific webhook_url if present
        if job.webhook_url:
            self._send_and_record(
                endpoint_id=None,
                job_id=job.id,
                event_type=event_type,
                url=job.webhook_url,
                secret=settings.SECRET_KEY,
                payload=payload
            )

    def test_endpoint(self, endpoint: WebhookEndpoint, event_type: str = "test.ping") -> WebhookDelivery:
        """Send a test event to an endpoint and return the delivery result."""
        test_payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "This is a test notification from QueueFlow Webhook System.",
            "endpoint_id": endpoint.id
        }
        return self._send_and_record(
            endpoint_id=endpoint.id,
            job_id="",  # Test event without job
            event_type=event_type,
            url=endpoint.url,
            secret=endpoint.secret,
            payload=test_payload
        )

    def _send_and_record(
        self,
        endpoint_id: Optional[str],
        job_id: str,
        event_type: str,
        url: str,
        secret: str,
        payload: Dict[str, Any]
    ) -> WebhookDelivery:
        payload_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")
        timestamp_str = str(int(time.time()))
        signature = compute_hmac_signature(secret, payload_bytes, timestamp_str)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "QueueFlow-Webhook/1.0",
            "X-QueueFlow-Event": event_type,
            "X-QueueFlow-Timestamp": timestamp_str,
            "X-QueueFlow-Signature": signature,
        }

        # Attempt HTTP POST
        start_time = time.time()
        status_code = None
        response_body = None
        error_msg = None
        success = False

        for attempt in range(1, settings.WEBHOOK_MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=settings.WEBHOOK_TIMEOUT_SECONDS) as client:
                    resp = client.post(url, content=payload_bytes, headers=headers)
                    status_code = resp.status_code
                    response_body = resp.text[:2000]
                    if 200 <= status_code < 300:
                        success = True
                        break
                    else:
                        error_msg = f"HTTP {status_code}: {response_body[:200]}"
            except Exception as e:
                error_msg = f"Network exception: {str(e)}"
                if attempt < settings.WEBHOOK_MAX_RETRIES:
                    time.sleep(0.5 * attempt)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        delivery = WebhookDelivery(
            endpoint_id=endpoint_id,
            job_id=job_id or "00000000-0000-0000-0000-000000000000",
            event_type=event_type,
            url=url,
            payload=payload,
            signature=signature,
            status_code=status_code,
            response_body=response_body,
            attempt_number=attempt,
            success=success,
            error_message=error_msg,
            duration_ms=duration_ms
        )
        self.db.add(delivery)
        self.db.commit()
        self.db.refresh(delivery)

        logger.info(f"Webhook {event_type} delivered to {url} [Success={success}, Status={status_code}, Duration={duration_ms}ms]")
        return delivery

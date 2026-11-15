import time
import random
from typing import Dict, Any, Callable

# Handler registry
JOB_HANDLERS: Dict[str, Callable[[Dict[str, Any], int], Dict[str, Any]]] = {}


def register_handler(name: str):
    def decorator(fn: Callable[[Dict[str, Any], int], Dict[str, Any]]):
        JOB_HANDLERS[name] = fn
        return fn
    return decorator


@register_handler("email_notification")
def handle_email(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    recipient = payload.get("to", "user@example.com")
    subject = payload.get("subject", "QueueFlow Notification")
    # Simulate work
    time.sleep(0.3)
    return {
        "status": "delivered",
        "recipient": recipient,
        "subject": subject,
        "message_id": f"msg_{int(time.time()*1000)}",
        "delivered_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@register_handler("data_export")
def handle_data_export(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    export_type = payload.get("type", "csv")
    record_count = payload.get("records", 1500)
    time.sleep(0.5)
    return {
        "status": "completed",
        "format": export_type,
        "records_exported": record_count,
        "file_url": f"https://storage.queueflow.internal/exports/export_{int(time.time())}.{export_type}",
        "file_size_kb": record_count * 0.12
    }


@register_handler("report_generation")
def handle_report_generation(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    report_name = payload.get("report_name", "Monthly Performance")
    time.sleep(0.4)
    return {
        "report_id": f"rep_{int(time.time())}",
        "title": report_name,
        "metrics_computed": {
            "total_throughput": 48291,
            "error_rate": "0.12%",
            "p99_latency_ms": 142.5
        },
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@register_handler("flaky_task")
def handle_flaky_task(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    """
    Simulates a task that fails the first N attempts before succeeding.
    Great for verifying exponential backoff retries!
    """
    fail_until_attempt = payload.get("fail_until_attempt", 2)
    if attempt <= fail_until_attempt:
        raise ConnectionResetError(
            f"Transient network error on attempt {attempt}/{fail_until_attempt}. Upstream service temporarily unavailable."
        )
    return {
        "status": "recovered",
        "attempt_succeeded": attempt,
        "message": f"Successfully processed after {attempt} attempts with exponential backoff!"
    }


@register_handler("always_fail")
def handle_always_fail(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    """
    Always throws an exception to demonstrate maximum retry limits and DLQ routing.
    """
    reason = payload.get("reason", "Fatal schema corruption: missing expected fields in payload")
    raise ValueError(f"Unrecoverable error: {reason}")


@register_handler("echo")
def handle_echo(payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    return {
        "echo": payload,
        "attempt": attempt,
        "timestamp": time.time()
    }


def execute_job_handler(name: str, payload: Dict[str, Any], attempt: int) -> Dict[str, Any]:
    """Dispatch to the registered handler, or fallback to echo handler."""
    handler = JOB_HANDLERS.get(name, handle_echo)
    return handler(payload or {}, attempt)

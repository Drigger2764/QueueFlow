import hmac
import hashlib
import secrets
import json
from typing import Any, Dict


def generate_webhook_secret() -> str:
    """Generate a high-entropy secret key for HMAC signing."""
    return f"whsec_{secrets.token_hex(24)}"


def compute_hmac_signature(secret: str, payload_bytes: bytes, timestamp: str) -> str:
    """
    Compute HMAC-SHA256 signature over (timestamp + '.' + payload)
    Standard webhook security format (like Stripe / GitHub / Svix).
    """
    to_sign = f"{timestamp}.".encode("utf-8") + payload_bytes
    signature = hmac.new(
        secret.encode("utf-8"),
        to_sign,
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"


def verify_hmac_signature(secret: str, payload_bytes: bytes, timestamp: str, signature_header: str) -> bool:
    """Verify HMAC signature using constant-time comparison to prevent timing attacks."""
    expected = compute_hmac_signature(secret, payload_bytes, timestamp)
    return hmac.compare_digest(expected, signature_header)

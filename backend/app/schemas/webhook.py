from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


class WebhookCreate(BaseModel):
    url: str = Field(..., max_length=512, description="Target endpoint URL")
    description: Optional[str] = Field(default=None, max_length=256)
    secret: Optional[str] = Field(default=None, max_length=128, description="HMAC secret; generated automatically if omitted")
    events: List[str] = Field(
        default=["job.completed", "job.failed", "job.dead_letter"],
        description="Event types this webhook subscribes to"
    )


class WebhookUpdate(BaseModel):
    url: Optional[str] = Field(default=None, max_length=512)
    description: Optional[str] = Field(default=None, max_length=256)
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    description: Optional[str] = None
    events: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    secret: str


class WebhookDeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    endpoint_id: Optional[str] = None
    job_id: str
    event_type: str
    url: str
    payload: Dict[str, Any]
    signature: str
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    attempt_number: int
    success: bool
    error_message: Optional[str] = None
    duration_ms: Optional[float] = None
    created_at: datetime


class WebhookTestRequest(BaseModel):
    event_type: str = Field(default="test.ping")

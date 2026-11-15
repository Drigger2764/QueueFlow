from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.webhook import WebhookEndpoint, WebhookDelivery
from app.schemas.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookDeliveryResponse,
    WebhookTestRequest,
)
from app.services.webhook_service import WebhookService
from app.utils.security import generate_webhook_secret

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
def create_webhook_endpoint(data: WebhookCreate, db: Session = Depends(get_db)):
    """Register a new webhook endpoint with automatic HMAC secret generation."""
    secret = data.secret or generate_webhook_secret()
    endpoint = WebhookEndpoint(
        url=str(data.url),
        description=data.description,
        secret=secret,
        events=data.events,
        is_active=True
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.get("", response_model=List[WebhookResponse])
def list_webhook_endpoints(db: Session = Depends(get_db)):
    """List all registered webhook endpoints."""
    return db.query(WebhookEndpoint).order_by(WebhookEndpoint.created_at.desc()).all()


@router.get("/{endpoint_id}", response_model=WebhookResponse)
def get_webhook_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    """Get webhook endpoint details."""
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    return ep


@router.put("/{endpoint_id}", response_model=WebhookResponse)
def update_webhook_endpoint(endpoint_id: str, data: WebhookUpdate, db: Session = Depends(get_db)):
    """Update webhook endpoint properties."""
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    if data.url is not None:
        ep.url = str(data.url)
    if data.description is not None:
        ep.description = data.description
    if data.events is not None:
        ep.events = data.events
    if data.is_active is not None:
        ep.is_active = data.is_active

    db.commit()
    db.refresh(ep)
    return ep


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    """Delete a webhook endpoint and its delivery logs."""
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    db.delete(ep)
    db.commit()
    return None


@router.get("/{endpoint_id}/deliveries", response_model=List[WebhookDeliveryResponse])
def get_webhook_deliveries(endpoint_id: str, db: Session = Depends(get_db)):
    """Get recent delivery attempts for this webhook endpoint."""
    return db.query(WebhookDelivery).filter(
        WebhookDelivery.endpoint_id == endpoint_id
    ).order_by(WebhookDelivery.created_at.desc()).limit(50).all()


@router.post("/{endpoint_id}/test", response_model=WebhookDeliveryResponse)
def test_webhook_endpoint(endpoint_id: str, req: WebhookTestRequest, db: Session = Depends(get_db)):
    """Dispatch a test ping event to verify HMAC signature and connectivity."""
    ep = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")

    service = WebhookService(db)
    delivery = service.test_endpoint(ep, event_type=req.event_type)
    return delivery

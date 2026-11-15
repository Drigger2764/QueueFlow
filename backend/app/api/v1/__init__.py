from fastapi import APIRouter
from app.api.v1.jobs import router as jobs_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.workers import router as workers_router
from app.api.v1.metrics import router as metrics_router

api_v1_router = APIRouter()
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(webhooks_router)
api_v1_router.include_router(workers_router)
api_v1_router.include_router(metrics_router)

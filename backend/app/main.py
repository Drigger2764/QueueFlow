import os
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import init_db, SessionLocal
from app.api.v1 import api_v1_router
from app.queue.broker import broker
from app.queue.worker import QueueFlowWorker
from app.utils.logger import logger

# Background worker thread instance for embedded mode
worker_thread = None
embedded_worker = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    logger.info("Initializing database schema...")
    init_db()

    # If EMBEDDED_WORKER is set explicitly, launch a worker thread
    if os.getenv("EMBEDDED_WORKER", "false").lower() in ("true", "1", "yes"):
        global embedded_worker, worker_thread
        logger.info("Starting embedded QueueFlow background worker thread...")
        embedded_worker = QueueFlowWorker(worker_id="embedded-worker-1", queues=["default", "critical", "low"])
        worker_thread = threading.Thread(target=embedded_worker.start, daemon=True)
        worker_thread.start()

    yield

    # Shutdown
    if embedded_worker:
        logger.info("Stopping embedded QueueFlow worker...")
        embedded_worker.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Distributed Background Job Processing and Webhook Delivery Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router under /api
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for Docker container probes and load balancers."""
    redis_healthy = False
    try:
        broker.client.ping()
        redis_healthy = True
    except Exception:
        pass

    db_healthy = False
    try:
        db = SessionLocal()
        db.execute(sqlalchemy.text("SELECT 1") if 'sqlalchemy' in globals() else "SELECT 1")
        db_healthy = True
        db.close()
    except Exception:
        # Simple query verification
        try:
            from app.models.job import Job
            db = SessionLocal()
            db.query(Job).limit(1).all()
            db_healthy = True
            db.close()
        except Exception:
            pass

    return {
        "status": "healthy" if (redis_healthy and db_healthy) else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "components": {
            "database": "connected" if db_healthy else "error",
            "redis": "connected" if redis_healthy else "fallback_or_error"
        }
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": "/api"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "type": type(exc).__name__}
    )

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "QueueFlow"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./queueflow.db")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_FAKE_REDIS_FALLBACK: bool = True
    
    # Worker & Execution Defaults
    DEFAULT_QUEUE_NAME: str = "default"
    DEFAULT_MAX_RETRIES: int = 3
    DEFAULT_RETRY_BACKOFF_BASE: int = 2
    DEFAULT_JOB_TIMEOUT_SECONDS: int = 300
    WORKER_HEARTBEAT_INTERVAL: int = 5
    WORKER_OFFLINE_THRESHOLD_SECONDS: int = 30
    
    # Webhooks
    WEBHOOK_TIMEOUT_SECONDS: int = 10
    WEBHOOK_MAX_RETRIES: int = 3
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "queueflow-super-secret-key-production-ready")

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

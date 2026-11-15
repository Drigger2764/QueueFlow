from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.job import JobCreate, JobResponse, JobDetailResponse, JobListResponse, JobRetryRequest
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """Submit a new background job to the queue."""
    service = JobService(db)
    job = service.create_job(data)
    return job


@router.get("", response_model=JobListResponse)
def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED, DEAD_LETTER)"),
    queue: Optional[str] = Query(None, description="Filter by queue name"),
    search: Optional[str] = Query(None, description="Search by job ID, name, or error message"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """List jobs with pagination and filtering."""
    service = JobService(db)
    items, total, pages = service.list_jobs(status=status, queue=queue, search=search, page=page, size=size)
    return JobListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/dlq", response_model=JobListResponse)
def list_dead_letter_queue(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all jobs that permanently failed and landed in the Dead-Letter Queue."""
    service = JobService(db)
    items, total, pages = service.list_dead_letter(page=page, size=size)
    return JobListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.post("/dlq/replay-all")
def replay_all_dead_letter(db: Session = Depends(get_db)):
    """Replay all jobs currently in the Dead-Letter Queue."""
    service = JobService(db)
    replayed = service.replay_all_dead_letter()
    return {"message": f"Successfully scheduled {replayed} dead-letter jobs for re-execution", "count": replayed}


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Retrieve full details of a job, including all execution attempts and errors."""
    service = JobService(db)
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job with ID '{job_id}' not found")
    return job


@router.post("/{job_id}/retry", response_model=JobResponse)
def retry_job(job_id: str, request: Optional[JobRetryRequest] = None, db: Session = Depends(get_db)):
    """Manually retry a failed or dead-letter job."""
    service = JobService(db)
    reset = request.reset_retries if request else True
    job = service.retry_job(job_id, reset_retries=reset)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job with ID '{job_id}' not found")
    return job


@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """Cancel a pending or queued job before execution."""
    service = JobService(db)
    job = service.cancel_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job with ID '{job_id}' not found")
    return job

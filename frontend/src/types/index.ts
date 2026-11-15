export type JobStatus = 
  | 'PENDING' 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'DEAD_LETTER';

export interface Job {
  id: string;
  name: string;
  queue: string;
  status: JobStatus;
  priority: number;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error_message?: string;
  max_retries: number;
  retry_count: number;
  backoff_base: number;
  timeout_seconds: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  job_id: string;
  attempt_number: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT';
  worker_id?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_trace?: string;
  output?: string;
  created_at: string;
}

export interface JobDetail extends Job {
  executions: JobExecution[];
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id?: string;
  job_id: string;
  event_type: string;
  url: string;
  payload: Record<string, any>;
  signature: string;
  status_code?: number;
  response_body?: string;
  attempt_number: number;
  success: boolean;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

export interface WorkerNode {
  id: string;
  hostname: string;
  status: string;
  current_job_id?: string;
  jobs_completed: number;
  jobs_failed: number;
  concurrency: number;
  queues: string[];
  last_heartbeat: string;
  started_at: string;
  is_alive: boolean;
}

export interface SystemMetrics {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
  running_jobs: number;
  dead_letter_jobs: number;
  cancelled_jobs: number;
  active_workers: number;
  queue_depths: Record<string, number>;
  success_rate: number;
  avg_duration_ms: number;
}

export interface ActivityDataPoint {
  time: string;
  completed: number;
  failed: number;
  submitted: number;
}

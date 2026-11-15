import axios from 'axios';
import { 
  Job, 
  JobDetail, 
  JobListResponse, 
  WebhookEndpoint, 
  WebhookDelivery, 
  WorkerNode, 
  SystemMetrics, 
  ActivityDataPoint 
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Metrics
  getMetrics: async (): Promise<SystemMetrics> => {
    const { data } = await api.get<SystemMetrics>('/metrics');
    return data;
  },

  getActivityChart: async (hours: number = 24): Promise<ActivityDataPoint[]> => {
    const { data } = await api.get<ActivityDataPoint[]>(`/metrics/activity?hours=${hours}`);
    return data;
  },

  // Jobs
  getJobs: async (params?: {
    status?: string;
    queue?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<JobListResponse> => {
    const { data } = await api.get<JobListResponse>('/jobs', { params });
    return data;
  },

  getJob: async (id: string): Promise<JobDetail> => {
    const { data } = await api.get<JobDetail>(`/jobs/${id}`);
    return data;
  },

  createJob: async (jobData: {
    name: string;
    queue?: string;
    priority?: number;
    payload?: Record<string, any>;
    max_retries?: number;
    backoff_base?: number;
    timeout_seconds?: number;
    webhook_url?: string;
  }): Promise<Job> => {
    const { data } = await api.post<Job>('/jobs', jobData);
    return data;
  },

  retryJob: async (id: string, resetRetries: boolean = true): Promise<Job> => {
    const { data } = await api.post<Job>(`/jobs/${id}/retry`, { reset_retries: resetRetries });
    return data;
  },

  cancelJob: async (id: string): Promise<Job> => {
    const { data } = await api.post<Job>(`/jobs/${id}/cancel`);
    return data;
  },

  // Dead Letter Queue
  getDeadLetterJobs: async (page: number = 1, size: number = 20): Promise<JobListResponse> => {
    const { data } = await api.get<JobListResponse>('/jobs/dlq', { params: { page, size } });
    return data;
  },

  replayAllDeadLetter: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.post<{ message: string; count: number }>('/jobs/dlq/replay-all');
    return data;
  },

  // Workers
  getWorkers: async (): Promise<WorkerNode[]> => {
    const { data } = await api.get<WorkerNode[]>('/workers');
    return data;
  },

  // Webhooks
  getWebhooks: async (): Promise<WebhookEndpoint[]> => {
    const { data } = await api.get<WebhookEndpoint[]>('/webhooks');
    return data;
  },

  createWebhook: async (endpointData: {
    url: string;
    description?: string;
    events?: string[];
    secret?: string;
  }): Promise<WebhookEndpoint> => {
    const { data } = await api.post<WebhookEndpoint>('/webhooks', endpointData);
    return data;
  },

  updateWebhook: async (id: string, endpointData: {
    url?: string;
    description?: string;
    events?: string[];
    is_active?: boolean;
  }): Promise<WebhookEndpoint> => {
    const { data } = await api.put<WebhookEndpoint>(`/webhooks/${id}`, endpointData);
    return data;
  },

  deleteWebhook: async (id: string): Promise<void> => {
    await api.delete(`/webhooks/${id}`);
  },

  getWebhookDeliveries: async (id: string): Promise<WebhookDelivery[]> => {
    const { data } = await api.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries`);
    return data;
  },

  testWebhook: async (id: string, event_type: string = 'test.ping'): Promise<WebhookDelivery> => {
    const { data } = await api.post<WebhookDelivery>(`/webhooks/${id}/test`, { event_type });
    return data;
  },
};

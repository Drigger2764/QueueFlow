import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { JobSubmitModal } from './components/jobs/JobSubmitModal';
import { JobDetailModal } from './components/jobs/JobDetailModal';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { DeadLetterPage } from './pages/DeadLetterPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { WorkersPage } from './pages/WorkersPage';
import { apiClient } from './api/client';
import { SystemMetrics, ActivityDataPoint, Job, WorkerNode } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchGlobalData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [m, act, j, w] = await Promise.all([
        apiClient.getMetrics(),
        apiClient.getActivityChart(24),
        apiClient.getJobs({ page: 1, size: 8 }),
        apiClient.getWorkers(),
      ]);
      setMetrics(m);
      setActivityData(act);
      setRecentJobs(j.items);
      setWorkers(w);
    } catch (err: any) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData();
    // Auto-refresh poll every 4 seconds
    const interval = setInterval(fetchGlobalData, 4000);
    return () => clearInterval(interval);
  }, [fetchGlobalData]);

  const handleCreateJob = async (jobData: any) => {
    try {
      const created = await apiClient.createJob(jobData);
      addToast(`Job enqueued: ${created.name} (${created.queue})`, 'success');
      await fetchGlobalData();
    } catch (err: any) {
      addToast(`Job creation failed: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiClient.retryJob(jobId, true);
      addToast(`Job ${jobId.slice(0, 8)}... re-enqueued`, 'success');
      await fetchGlobalData();
    } catch (err: any) {
      addToast(`Retry failed: ${err.message}`, 'error');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await apiClient.cancelJob(jobId);
      addToast(`Job ${jobId.slice(0, 8)}... cancelled`, 'info');
      await fetchGlobalData();
    } catch (err: any) {
      addToast(`Cancel failed: ${err.message}`, 'error');
    }
  };

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Platform Overview',
      subtitle: 'Real-time telemetry of background jobs, workers, and queues',
    },
    jobs: {
      title: 'Job Processing Queue',
      subtitle: 'Inspect, filter, retry, and monitor background tasks',
    },
    dlq: {
      title: 'Dead-Letter Queue (DLQ)',
      subtitle: 'Isolated jobs that exhausted automatic retries',
    },
    webhooks: {
      title: 'Outbound Webhooks',
      subtitle: 'HMAC-SHA256 signed delivery endpoints and attempt audit logs',
    },
    workers: {
      title: 'Worker Cluster Fleet',
      subtitle: 'Active background worker nodes and queue distribution',
    },
  };

  const currentMeta = tabTitles[currentTab] || tabTitles.dashboard;

  return (
    <div className="flex min-h-screen bg-surface-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        dlqCount={metrics?.dead_letter_jobs}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onRefresh={fetchGlobalData}
          isRefreshing={isRefreshing}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              metrics={metrics}
              activityData={activityData}
              recentJobs={recentJobs}
              workers={workers}
              onSelectJob={(id) => setSelectedJobId(id)}
              onRetryJob={handleRetryJob}
              onCancelJob={handleCancelJob}
              onNavigateToJobs={() => setCurrentTab('jobs')}
            />
          )}

          {currentTab === 'jobs' && (
            <JobsPage
              onSelectJob={(id) => setSelectedJobId(id)}
              onRetryJob={handleRetryJob}
              onCancelJob={handleCancelJob}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            />
          )}

          {currentTab === 'dlq' && (
            <DeadLetterPage
              onSelectJob={(id) => setSelectedJobId(id)}
              onRetryJob={handleRetryJob}
              onRefreshMetrics={fetchGlobalData}
            />
          )}

          {currentTab === 'webhooks' && (
            <WebhooksPage onShowToast={addToast} />
          )}

          {currentTab === 'workers' && (
            <WorkersPage workers={workers} metrics={metrics} />
          )}
        </main>
      </div>

      {/* Modals */}
      <JobSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleCreateJob}
      />

      <JobDetailModal
        jobId={selectedJobId}
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onJobUpdated={fetchGlobalData}
      />

      {/* Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;

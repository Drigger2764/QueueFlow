import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  Activity, 
  TrendingUp,
  Layers,
  AlertOctagon
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { ActivityChart } from '../components/metrics/ActivityChart';
import { JobTable } from '../components/jobs/JobTable';
import { SystemMetrics, ActivityDataPoint, Job, WorkerNode } from '../types';
import { StatusBadge } from '../components/common/Badge';

interface DashboardPageProps {
  metrics: SystemMetrics | null;
  activityData: ActivityDataPoint[];
  recentJobs: Job[];
  workers: WorkerNode[];
  onSelectJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onNavigateToJobs: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  activityData,
  recentJobs,
  workers,
  onSelectJob,
  onRetryJob,
  onCancelJob,
  onNavigateToJobs,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Jobs"
          value={metrics?.total_jobs ?? '—'}
          icon={<Layers className="w-5 h-5" />}
          color="slate"
        />
        <StatCard
          title="Completed"
          value={metrics?.completed_jobs ?? '—'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Failed / Retried"
          value={metrics?.failed_jobs ?? '—'}
          icon={<XCircle className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Dead Letter"
          value={metrics?.dead_letter_jobs ?? '—'}
          icon={<AlertOctagon className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title="Active Workers"
          value={metrics?.active_workers ?? '—'}
          icon={<Cpu className="w-5 h-5" />}
          color="brand"
        />
        <StatCard
          title="Success Rate"
          value={metrics ? `${metrics.success_rate}%` : '—'}
          subtitle={metrics?.avg_duration_ms ? `Avg: ${metrics.avg_duration_ms}ms` : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* Main Grid: Chart + Queue Depths */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-surface-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <span>Job Throughput & Execution Activity</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of submitted, completed, and failed jobs
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-brand-400">
                <span className="w-2 h-2 rounded-full bg-brand-500" /> Submitted
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Failed
              </span>
            </div>
          </div>
          <ActivityChart data={activityData} />
        </div>

        {/* Queues and Active Nodes */}
        <div className="space-y-4">
          {/* Queue Depths */}
          <div className="bg-surface-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Queue Depths</span>
            </h3>
            <div className="space-y-2.5">
              {metrics?.queue_depths && Object.keys(metrics.queue_depths).length > 0 ? (
                Object.entries(metrics.queue_depths).map(([qName, count]) => (
                  <div
                    key={qName}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-950 border border-slate-800/80 text-xs"
                  >
                    <span className="font-mono text-slate-300 font-medium">{qName}</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                      count > 0 ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-slate-400'
                    }`}>
                      {count} items
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No active queues.</p>
              )}
            </div>
          </div>

          {/* Connected Workers Mini List */}
          <div className="bg-surface-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-400" />
              <span>Worker Fleet ({workers.length})</span>
            </h3>
            <div className="space-y-2">
              {workers.slice(0, 3).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-950 border border-slate-800/80 text-xs"
                >
                  <div>
                    <div className="font-mono font-medium text-slate-200">{w.hostname}</div>
                    <div className="text-[11px] text-slate-400">
                      Completed: {w.jobs_completed} | Failed: {w.jobs_failed}
                    </div>
                  </div>
                  <StatusBadge status={w.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Recent Job Executions</h3>
            <p className="text-xs text-slate-400">Live stream of latest job submissions across all queues</p>
          </div>
          <button
            onClick={onNavigateToJobs}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all jobs →
          </button>
        </div>
        <JobTable
          jobs={recentJobs}
          onSelectJob={onSelectJob}
          onRetryJob={onRetryJob}
          onCancelJob={onCancelJob}
        />
      </div>
    </div>
  );
};

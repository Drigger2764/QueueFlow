import React from 'react';
import { WorkerNode, SystemMetrics } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { Cpu, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface WorkersPageProps {
  workers: WorkerNode[];
  metrics: SystemMetrics | null;
}

export const WorkersPage: React.FC<WorkersPageProps> = ({ workers, metrics }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" />
            <span>Distributed Worker Cluster & Execution Topology</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Background workers poll Redis queues, manage process concurrency, execute job handlers, and report heartbeats.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">{workers.filter((w) => w.is_alive).length} Workers Online</span>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="p-5 rounded-xl bg-surface-900/80 border border-slate-800 space-y-4 hover:border-slate-700 transition-all shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-semibold text-slate-100 block">
                  {worker.hostname}
                </span>
                <span className="text-xs font-mono text-slate-400 truncate block max-w-[200px]">
                  {worker.id}
                </span>
              </div>
              <StatusBadge status={worker.status} size="sm" />
            </div>

            {/* Subscribed queues */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Listening Queues
              </span>
              <div className="flex flex-wrap gap-1.5">
                {worker.queues?.map((q) => (
                  <span
                    key={q}
                    className="text-xs font-mono px-2 py-0.5 rounded bg-surface-950 border border-slate-800 text-slate-300"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {worker.jobs_completed}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-950 border border-slate-800">
                <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Failed
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {worker.jobs_failed}
                </span>
              </div>
            </div>

            {/* Heartbeat */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Concurrency: {worker.concurrency}x</span>
              <span className="font-mono">
                Ping: {new Date(worker.last_heartbeat).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

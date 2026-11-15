import React from 'react';
import { Job } from '../../types';
import { StatusBadge } from '../common/Badge';
import { RotateCw, Ban, Eye } from 'lucide-react';

interface JobTableProps {
  jobs: Job[];
  onSelectJob: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  onSelectJob,
  onRetryJob,
  onCancelJob,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 bg-surface-900/40 rounded-xl border border-slate-800">
        <p className="text-sm font-medium">No jobs found matching the criteria</p>
        <p className="text-xs text-slate-400 mt-1">Submit a new background job to populate the queue</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-surface-900/50 shadow-sm">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-surface-950/70 border-b border-slate-800">
          <tr>
            <th className="py-3 px-4">Job ID / Name</th>
            <th className="py-3 px-4">Queue</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Priority</th>
            <th className="py-3 px-4">Retries</th>
            <th className="py-3 px-4">Submitted</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
          {jobs.map((job) => {
            const canRetry = job.status === 'FAILED' || job.status === 'DEAD_LETTER' || job.status === 'CANCELLED';
            const canCancel = job.status === 'PENDING' || job.status === 'QUEUED';

            return (
              <tr 
                key={job.id} 
                className="hover:bg-surface-800/40 transition-colors group cursor-pointer"
                onClick={() => onSelectJob(job.id)}
              >
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-200 group-hover:text-brand-400 transition-colors">
                    {job.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-xs">
                    {job.id}
                  </div>
                </td>
                <td className="py-3 px-4 font-sans text-xs">
                  <span className="px-2 py-0.5 rounded bg-surface-800 text-slate-300 border border-slate-700/60">
                    {job.queue}
                  </span>
                </td>
                <td className="py-3 px-4 font-sans">
                  <StatusBadge status={job.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {job.priority}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  <span className={job.retry_count > 0 ? 'text-amber-400 font-bold' : ''}>
                    {job.retry_count}
                  </span>
                  {' '}/ {job.max_retries}
                </td>
                <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                  {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {canRetry && onRetryJob && (
                      <button
                        onClick={() => onRetryJob(job.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Retry Job"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canCancel && onCancelJob && (
                      <button
                        onClick={() => onCancelJob(job.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Cancel Job"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectJob(job.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                      title="Inspect Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

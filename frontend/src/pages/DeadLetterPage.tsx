import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { apiClient } from '../api/client';
import { JobTable } from '../components/jobs/JobTable';
import { Button } from '../components/common/Button';
import { AlertOctagon, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

interface DeadLetterPageProps {
  onSelectJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onRefreshMetrics?: () => void;
}

export const DeadLetterPage: React.FC<DeadLetterPageProps> = ({
  onSelectJob,
  onRetryJob,
  onRefreshMetrics,
}) => {
  const [dlqJobs, setDlqJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replaySuccessMessage, setReplaySuccessMessage] = useState('');

  const fetchDLQ = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDeadLetterJobs(1, 50);
      setDlqJobs(data.items);
    } catch (err) {
      console.error('Failed to load DLQ jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDLQ();
  }, []);

  const handleReplayAll = async () => {
    if (dlqJobs.length === 0) return;
    try {
      setReplaying(true);
      setReplaySuccessMessage('');
      const res = await apiClient.replayAllDeadLetter();
      setReplaySuccessMessage(`Replayed ${res.count} jobs back into ready queues.`);
      await fetchDLQ();
      onRefreshMetrics?.();
      setTimeout(() => setReplaySuccessMessage(''), 4000);
    } catch (err: any) {
      alert(`Replay failed: ${err.message}`);
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Callout */}
      <div className="p-5 rounded-xl bg-surface-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0 mt-0.5">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Dead-Letter Queue (DLQ) Isolation
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Jobs are automatically routed here when they exceed their configured <span className="font-mono text-slate-300">max_retries</span> limit after exponential backoff. Inspect error stack traces below to identify upstream bugs, or replay jobs after deploying a fix.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleReplayAll}
            disabled={dlqJobs.length === 0}
            isLoading={replaying}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Replay All ({dlqJobs.length})
          </Button>
        </div>
      </div>

      {replaySuccessMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{replaySuccessMessage}</span>
        </div>
      )}

      {/* DLQ Jobs Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading Dead-Letter Queue items...</p>
        </div>
      ) : dlqJobs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-surface-900/40 rounded-xl border border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">Dead-Letter Queue is empty</p>
          <p className="text-xs text-slate-400 mt-1">All background jobs are executing successfully!</p>
        </div>
      ) : (
        <JobTable
          jobs={dlqJobs}
          onSelectJob={onSelectJob}
          onRetryJob={async (id) => {
            await onRetryJob(id);
            fetchDLQ();
            onRefreshMetrics?.();
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/Badge';
import { JobDetail } from '../../types';
import { apiClient } from '../../api/client';
import { 
  RotateCw, 
  Ban, 
  Clock, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';

interface JobDetailModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onJobUpdated,
}) => {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getJob(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && jobId) {
      fetchDetails();
    } else {
      setJob(null);
    }
  }, [isOpen, jobId]);

  const handleCopyId = () => {
    if (!jobId) return;
    navigator.clipboard.writeText(jobId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      await apiClient.retryJob(job.id, true);
      await fetchDetails();
      onJobUpdated?.();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    try {
      setActionLoading(true);
      await apiClient.cancelJob(job.id);
      await fetchDetails();
      onJobUpdated?.();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const canCancel = job && (job.status === 'PENDING' || job.status === 'QUEUED');
  const canRetry = job && (job.status === 'FAILED' || job.status === 'DEAD_LETTER' || job.status === 'CANCELLED');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Job Execution Details" maxWidth="3xl">
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Fetching job telemetry...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : job ? (
        <div className="space-y-6">
          {/* Header summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-950/70 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-300 font-semibold">{job.name}</span>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-400">{job.id}</span>
                <button
                  onClick={handleCopyId}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                  title="Copy Job ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canRetry && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetry}
                  isLoading={actionLoading}
                  icon={<RotateCw className="w-3.5 h-3.5" />}
                >
                  Retry Job
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={actionLoading}
                  icon={<Ban className="w-3.5 h-3.5" />}
                >
                  Cancel Job
                </Button>
              )}
            </div>
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-950 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Queue</span>
              <span className="font-semibold text-slate-200">{job.queue}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Priority</span>
              <span className="font-semibold text-slate-200">{job.priority}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Retries</span>
              <span className="font-semibold text-slate-200">{job.retry_count} / {job.max_retries} (Backoff: {job.backoff_base}x)</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Created At</span>
              <span className="font-mono text-slate-200">
                {new Date(job.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Error banner if present */}
          {job.error_message && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono space-y-1">
              <div className="flex items-center gap-2 font-semibold text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Failure Diagnostic</span>
              </div>
              <p className="whitespace-pre-wrap break-all">{job.error_message}</p>
            </div>
          )}

          {/* Execution History Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>Execution Attempts ({job.executions?.length || 0})</span>
            </h4>

            {(!job.executions || job.executions.length === 0) ? (
              <div className="p-4 rounded-lg bg-surface-950 border border-slate-800/80 text-xs text-slate-400 text-center">
                Job has not been picked up by a worker yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {job.executions.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          Attempt #{exec.attempt_number}
                        </span>
                        <StatusBadge status={exec.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 font-mono">
                        {exec.duration_ms && <span>{exec.duration_ms} ms</span>}
                        <span>{new Date(exec.started_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {exec.worker_id && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Cpu className="w-3 h-3 text-slate-400" />
                        <span>Worker: {exec.worker_id}</span>
                      </div>
                    )}

                    {exec.error_trace && (
                      <div className="mt-1 p-2 rounded bg-black/40 border border-rose-900/40 text-[11px] font-mono text-rose-300 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{exec.error_trace}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payload and Result Viewers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Input Payload
              </span>
              <pre className="p-3 rounded-lg bg-surface-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48 custom-scrollbar">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Execution Output / Result
              </span>
              <pre className="p-3 rounded-lg bg-surface-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48 custom-scrollbar">
                {job.result ? JSON.stringify(job.result, null, 2) : '(No result yet)'}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

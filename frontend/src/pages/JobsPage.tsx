import React, { useState, useEffect } from 'react';
import { Job, JobListResponse } from '../types';
import { apiClient } from '../api/client';
import { JobTable } from '../components/jobs/JobTable';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '../components/common/Button';

interface JobsPageProps {
  onSelectJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onOpenSubmitModal: () => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({
  onSelectJob,
  onRetryJob,
  onCancelJob,
  onOpenSubmitModal,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [queueFilter, setQueueFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = { page, size: 15 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (queueFilter !== 'ALL') params.queue = queueFilter;
      if (search.trim()) params.search = search.trim();

      const data = await apiClient.getJobs(params);
      setJobs(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter, queueFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const statusOptions = ['ALL', 'RUNNING', 'QUEUED', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job ID, handler name, error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 font-mono"
          />
        </form>

        {/* Queue Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={queueFilter}
            onChange={(e) => {
              setQueueFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500 font-sans"
          >
            <option value="ALL">All Queues</option>
            <option value="default">Queue: default</option>
            <option value="critical">Queue: critical</option>
            <option value="low">Queue: low</option>
          </select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {statusOptions.map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === st
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-900 border border-transparent'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading jobs from queue...</p>
        </div>
      ) : (
        <JobTable
          jobs={jobs}
          onSelectJob={onSelectJob}
          onRetryJob={async (id) => {
            await onRetryJob(id);
            fetchJobs();
          }}
          onCancelJob={async (id) => {
            await onCancelJob(id);
            fetchJobs();
          }}
        />
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <span>
          Showing <span className="font-semibold text-slate-200">{jobs.length}</span> of{' '}
          <span className="font-semibold text-slate-200">{total}</span> total jobs
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>
          <span className="px-2 font-mono">
            Page {page} of {pages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            icon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

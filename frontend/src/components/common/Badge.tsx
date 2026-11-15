import React from 'react';
import { JobStatus } from '../../types';

interface BadgeProps {
  status: JobStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = (st: string) => {
    switch (st.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RUNNING':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse';
      case 'QUEUED':
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'DEAD_LETTER':
        return 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold';
      case 'CANCELLED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'IDLE':
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'BUSY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OFFLINE':
      case 'DISCONNECTED':
        return 'bg-slate-700/30 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${getStyles(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};

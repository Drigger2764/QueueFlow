import React from 'react';
import { RefreshCw, Plus, Zap } from 'lucide-react';
import { Button } from '../common/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenSubmitModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  onOpenSubmitModal,
}) => {
  return (
    <header className="h-16 px-8 border-b border-slate-800/80 bg-surface-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenSubmitModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Submit New Job
        </Button>
      </div>
    </header>
  );
};

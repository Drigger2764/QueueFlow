import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  AlertOctagon, 
  Webhook, 
  Cpu, 
  ExternalLink,
  Activity,
  Terminal
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  dlqCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  dlqCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'jobs', label: 'Jobs', icon: <Layers className="w-5 h-5" /> },
    { 
      id: 'dlq', 
      label: 'Dead Letter Queue', 
      icon: <AlertOctagon className="w-5 h-5" />, 
      badge: dlqCount > 0 ? dlqCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-5 h-5" /> },
    { id: 'workers', label: 'Workers', icon: <Cpu className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-surface-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">QueueFlow</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Job & Webhook Engine</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 py-6 space-y-1">
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Management
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-brand-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info & Links */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-surface-950">
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-900 transition-colors border border-transparent hover:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>Interactive API Docs</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="p-3 rounded-lg bg-surface-900/70 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Distributed Cluster Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Engine: Redis Broker & Celery-like Workers
          </p>
        </div>
      </div>
    </aside>
  );
};

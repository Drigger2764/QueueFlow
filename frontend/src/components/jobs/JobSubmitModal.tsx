import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles } from 'lucide-react';

interface JobSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => Promise<void>;
}

const PRESETS = [
  {
    label: 'Email Notification',
    name: 'email_notification',
    queue: 'default',
    priority: 5,
    maxRetries: 3,
    payload: {
      to: 'customer@acme.inc',
      subject: 'Your Weekly QueueFlow Summary',
      template: 'weekly_digest_v2'
    }
  },
  {
    label: 'Data Export (CSV)',
    name: 'data_export',
    queue: 'default',
    priority: 10,
    maxRetries: 3,
    payload: {
      type: 'csv',
      records: 2500,
      include_headers: true
    }
  },
  {
    label: 'Report Generation',
    name: 'report_generation',
    queue: 'default',
    priority: 5,
    maxRetries: 3,
    payload: {
      report_name: 'Q3 Distributed Throughput Analysis'
    }
  },
  {
    label: 'Flaky Task (Demonstrate Retries)',
    name: 'flaky_task',
    queue: 'default',
    priority: 10,
    maxRetries: 3,
    payload: {
      fail_until_attempt: 2
    }
  },
  {
    label: 'Always Fail (Demonstrate DLQ)',
    name: 'always_fail',
    queue: 'default',
    priority: 5,
    maxRetries: 2,
    payload: {
      reason: 'Schema validation error: field customer_id cannot be null'
    }
  }
];

export const JobSubmitModal: React.FC<JobSubmitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('email_notification');
  const [queue, setQueue] = useState('default');
  const [priority, setPriority] = useState(5);
  const [maxRetries, setMaxRetries] = useState(3);
  const [backoffBase, setBackoffBase] = useState(2);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify({ to: 'customer@acme.inc', subject: 'Your Weekly QueueFlow Summary' }, null, 2)
  );
  const [jsonError, setJsonError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setQueue(preset.queue);
    setPriority(preset.priority);
    setMaxRetries(preset.maxRetries);
    setPayloadText(JSON.stringify(preset.payload, null, 2));
    setJsonError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError('');

    let parsedPayload = {};
    if (payloadText.trim()) {
      try {
        parsedPayload = JSON.parse(payloadText);
      } catch (err: any) {
        setJsonError('Invalid JSON format in payload');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name,
        queue,
        priority: Number(priority),
        max_retries: Number(maxRetries),
        backoff_base: Number(backoffBase),
        payload: parsedPayload,
        webhook_url: webhookUrl.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setJsonError(err.message || 'Failed to submit job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Background Job" maxWidth="2xl">
      <div className="space-y-6">
        {/* Presets */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Quick Presets</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  name === p.name
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                    : 'bg-surface-800/80 text-slate-300 border-slate-700/80 hover:bg-surface-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Job Name / Task Handler
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Queue
              </label>
              <select
                value={queue}
                onChange={(e) => setQueue(e.target.value)}
                className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="default">default</option>
                <option value="critical">critical (High Priority)</option>
                <option value="low">low (Background Batch)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Priority
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Backoff Base (sec)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={backoffBase}
                onChange={(e) => setBackoffBase(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Optional Webhook URL (Notified on Completion/Failure)
            </label>
            <input
              type="url"
              placeholder="https://your-service.com/webhook/endpoint"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Payload JSON
              </label>
              {jsonError && (
                <span className="text-xs text-rose-400 font-medium">{jsonError}</span>
              )}
            </div>
            <textarea
              rows={5}
              value={payloadText}
              onChange={(e) => {
                setPayloadText(e.target.value);
                setJsonError('');
              }}
              className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Enqueue Job
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

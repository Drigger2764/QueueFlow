import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<string[]>([
    'job.completed',
    'job.failed',
    'job.dead_letter',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleEvent = (event: string) => {
    if (events.includes(event)) {
      setEvents(events.filter((e) => e !== event));
    } else {
      setEvents([...events, event]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit({
        url: url.trim(),
        description: description.trim() || undefined,
        events,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableEvents = [
    { id: 'job.completed', label: 'job.completed (Job successfully processed)' },
    { id: 'job.failed', label: 'job.failed (Job execution error occurred)' },
    { id: 'job.retrying', label: 'job.retrying (Scheduled retry with exponential backoff)' },
    { id: 'job.dead_letter', label: 'job.dead_letter (Permanent failure; routed to DLQ)' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Webhook Endpoint" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Endpoint URL
          </label>
          <input
            type="url"
            required
            placeholder="https://api.yourdomain.com/webhooks/queueflow"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Production Billing Notification Relay"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-surface-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Subscribed Events
          </label>
          <div className="space-y-2">
            {availableEvents.map((evt) => (
              <label
                key={evt.id}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-950 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:bg-surface-800/40"
              >
                <input
                  type="checkbox"
                  checked={events.includes(evt.id)}
                  onChange={() => toggleEvent(evt.id)}
                  className="rounded border-slate-700 bg-surface-900 text-brand-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="font-mono">{evt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs">
          An HMAC-SHA256 secret key will be generated automatically. Every HTTP payload sent to your endpoint includes an <span className="font-mono text-white">X-QueueFlow-Signature</span> header to verify authenticity.
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Webhook
          </Button>
        </div>
      </form>
    </Modal>
  );
};

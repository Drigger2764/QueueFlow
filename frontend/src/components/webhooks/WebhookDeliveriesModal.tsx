import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { WebhookDelivery, WebhookEndpoint } from '../../types';
import { apiClient } from '../../api/client';
import { CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

interface WebhookDeliveriesModalProps {
  endpoint: WebhookEndpoint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookDeliveriesModal: React.FC<WebhookDeliveriesModalProps> = ({
  endpoint,
  isOpen,
  onClose,
}) => {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  const fetchDeliveries = async () => {
    if (!endpoint) return;
    try {
      setLoading(true);
      const data = await apiClient.getWebhookDeliveries(endpoint.id);
      setDeliveries(data);
      if (data.length > 0) setSelectedDelivery(data[0]);
    } catch (err: any) {
      console.error('Failed to fetch deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && endpoint) {
      fetchDeliveries();
    } else {
      setDeliveries([]);
      setSelectedDelivery(null);
    }
  }, [isOpen, endpoint]);

  if (!endpoint) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Webhook Deliveries — ${endpoint.url}`} maxWidth="3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Recent HTTP POST notification logs and HMAC signatures</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDeliveries}
            isLoading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading delivery attempts...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-surface-950 rounded-xl border border-slate-800 text-xs">
            No delivery events recorded yet. Send a test ping to trigger a delivery!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Delivery attempts list */}
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDelivery(d)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedDelivery?.id === d.id
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-surface-950 border-slate-800 hover:bg-surface-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="font-semibold text-slate-200">{d.event_type}</span>
                    {d.success ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {d.status_code || 200}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {d.status_code || 'ERR'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{d.duration_ms} ms</span>
                    <span>{new Date(d.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery inspector detail */}
            <div className="md:col-span-2 p-4 rounded-xl bg-surface-950 border border-slate-800 text-xs space-y-3 font-mono">
              {selectedDelivery ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Event ID: {selectedDelivery.id.slice(0, 12)}...</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>HMAC-SHA256 Signed</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase mb-1">
                      X-QueueFlow-Signature Header
                    </span>
                    <div className="p-2 rounded bg-black/50 border border-slate-800 text-brand-300 break-all text-[11px]">
                      {selectedDelivery.signature}
                    </div>
                  </div>

                  {selectedDelivery.error_message && (
                    <div>
                      <span className="text-rose-400 block text-[11px] uppercase mb-1">
                        Delivery Error
                      </span>
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        {selectedDelivery.error_message}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase mb-1">
                      Payload Sent
                    </span>
                    <pre className="p-2.5 rounded bg-black/50 border border-slate-800 text-slate-300 overflow-x-auto max-h-36 custom-scrollbar text-[11px]">
                      {JSON.stringify(selectedDelivery.payload, null, 2)}
                    </pre>
                  </div>

                  {selectedDelivery.response_body && (
                    <div>
                      <span className="text-slate-400 block text-[11px] uppercase mb-1">
                        Response Body
                      </span>
                      <pre className="p-2.5 rounded bg-black/50 border border-slate-800 text-slate-300 overflow-x-auto max-h-24 custom-scrollbar text-[11px]">
                        {selectedDelivery.response_body}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  Select a delivery on the left to inspect headers and payload.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

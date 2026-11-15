import React, { useState, useEffect } from 'react';
import { WebhookEndpoint } from '../types';
import { apiClient } from '../api/client';
import { Button } from '../components/common/Button';
import { WebhookModal } from '../components/webhooks/WebhookModal';
import { WebhookDeliveriesModal } from '../components/webhooks/WebhookDeliveriesModal';
import { 
  Webhook, 
  Plus, 
  Send, 
  List, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ShieldCheck 
} from 'lucide-react';

interface WebhooksPageProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const WebhooksPage: React.FC<WebhooksPageProps> = ({ onShowToast }) => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEndpointForDeliveries, setSelectedEndpointForDeliveries] = useState<WebhookEndpoint | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWebhooks();
      setEndpoints(data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleCreateWebhook = async (data: any) => {
    await apiClient.createWebhook(data);
    onShowToast('Webhook endpoint registered successfully', 'success');
    fetchEndpoints();
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to remove this webhook endpoint?')) return;
    try {
      await apiClient.deleteWebhook(id);
      onShowToast('Webhook endpoint deleted', 'info');
      fetchEndpoints();
    } catch (err: any) {
      onShowToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const handleTestWebhook = async (endpoint: WebhookEndpoint) => {
    try {
      setTestingId(endpoint.id);
      const delivery = await apiClient.testWebhook(endpoint.id, 'test.ping');
      if (delivery.success) {
        onShowToast(`Ping delivered successfully! HTTP ${delivery.status_code || 200}`, 'success');
      } else {
        onShowToast(`Delivery recorded: ${delivery.error_message || 'Endpoint unreachable'}`, 'info');
      }
    } catch (err: any) {
      onShowToast(`Test ping error: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const toggleSecretReveal = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-surface-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Cryptographically Signed Webhook Delivery
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              QueueFlow signs every outbound payload with <span className="font-mono text-slate-300">HMAC-SHA256</span> using your unique endpoint secret. Verify incoming requests with the <span className="font-mono text-slate-300">X-QueueFlow-Signature</span> header to prevent spoofing.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Webhook Endpoint
        </Button>
      </div>

      {/* Endpoints Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading webhook configurations...</p>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-surface-900/40 rounded-xl border border-slate-800">
          <Webhook className="w-8 h-8 text-brand-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">No webhook endpoints configured</p>
          <p className="text-xs text-slate-400 mt-1">Register an endpoint to receive job status change notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => {
            const isRevealed = !!revealedSecrets[ep.id];
            return (
              <div
                key={ep.id}
                className="p-5 rounded-xl bg-surface-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-slate-200 font-semibold">{ep.url}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ep.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {ep.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {ep.description && (
                    <p className="text-xs text-slate-400">{ep.description}</p>
                  )}

                  {/* Subscribed events */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {ep.events?.map((ev) => (
                      <span
                        key={ev}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-950 border border-slate-800 text-slate-300"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Secret Viewer */}
                  <div className="flex items-center gap-2 pt-1">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-400">Secret:</span>
                    <span className="font-mono text-xs text-slate-300 bg-surface-950 px-2 py-0.5 rounded border border-slate-800">
                      {isRevealed ? ep.secret : '••••••••••••••••••••••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => toggleSecretReveal(ep.id)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                      title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleCopySecret(ep.secret, ep.id)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                      title="Copy secret key"
                    >
                      {copiedKey === ep.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestWebhook(ep)}
                    isLoading={testingId === ep.id}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Test Ping
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedEndpointForDeliveries(ep)}
                    icon={<List className="w-3.5 h-3.5" />}
                  >
                    Deliveries
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWebhook(ep.id)}
                    className="text-slate-400 hover:text-rose-400"
                    title="Delete webhook endpoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <WebhookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateWebhook}
      />

      {/* Deliveries Modal */}
      <WebhookDeliveriesModal
        endpoint={selectedEndpointForDeliveries}
        isOpen={!!selectedEndpointForDeliveries}
        onClose={() => setSelectedEndpointForDeliveries(null)}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pause, Play, XCircle, Search, RefreshCw, Send, Eye, MousePointerClick, UserX, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { CampaignDetailData } from '../../types';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface CampaignDetailProps {
  campaignId: string;
  onBack: () => void;
}

export const CampaignDetail: React.FC<CampaignDetailProps> = ({ campaignId, onBack }) => {
  const { showToast } = useToast();
  const [data, setData] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.getCampaignDetail(campaignId, search, statusFilter);
      setData(res);
    } catch (err: any) {
      showToast('Failed to load campaign statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Auto polling every 5s if sending pipeline is active
    const interval = setInterval(() => {
      if (data?.campaign.status === 'SENDING' || data?.campaign.status === 'QUEUED') {
        fetchDetail();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [campaignId, search, statusFilter, data?.campaign.status]);

  const handleStatusChange = async (newStatus: 'PAUSED' | 'SENDING' | 'CANCELLED') => {
    setActionLoading(true);
    try {
      await api.updateCampaignStatus(campaignId, newStatus);
      showToast(`Campaign status updated to ${newStatus}.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Campaign Analytics...
      </div>
    );
  }

  const { campaign, stats, contacts, draft } = data;

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{campaign.name}</h1>
              <Badge status={campaign.status} />
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Provider: {campaign.provider} • Rate: {campaign.rateLimitPerHour} emails/hr • Created: {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Campaign Control Buttons */}
        <div className="flex items-center gap-2">
          {campaign.status === 'SENDING' && (
            <button
              onClick={() => handleStatusChange('PAUSED')}
              disabled={actionLoading}
              className="btn-secondary gap-1.5 text-amber-700 hover:bg-amber-50"
            >
              <Pause className="w-4 h-4" /> Pause Campaign
            </button>
          )}

          {campaign.status === 'PAUSED' && (
            <button
              onClick={() => handleStatusChange('SENDING')}
              disabled={actionLoading}
              className="btn-accent gap-1.5"
            >
              <Play className="w-4 h-4" /> Resume Campaign
            </button>
          )}

          {['SENDING', 'PAUSED', 'QUEUED', 'DRAFT'].includes(campaign.status) && (
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              disabled={actionLoading}
              className="btn-secondary gap-1.5 text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}

          <button onClick={fetchDetail} className="btn-ghost p-2" title="Refresh Stats">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics Counter Grid */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Total</span>
            <Send className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
            <span>Sent</span>
            <Send className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.sent}</div>
        </div>

        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-indigo-600 font-medium">
            <span>Opened</span>
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {stats.opened} <span className="text-xs font-normal text-neutral-400">({stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-purple-600 font-medium">
            <span>Clicked</span>
            <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {stats.clicked} <span className="text-xs font-normal text-neutral-400">({stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-rose-600 font-medium">
            <span>Failed</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{stats.failed}</div>
        </div>

        <div className="bg-white border border-border p-4 rounded-xl shadow-card">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Unsub/Bounce</span>
            <UserX className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-700 mt-1">{stats.unsubscribed}</div>
        </div>
      </div>

      {/* Draft Summary Snippet */}
      {draft && (
        <div className="bg-white border border-border rounded-xl p-5 shadow-card space-y-2 text-xs">
          <div className="font-semibold text-neutral-900 flex items-center justify-between">
            <span>Subject: {draft.subject}</span>
            <span className="text-neutral-500 font-mono">AI Personalization: {draft.aiPersonalizeEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <p className="text-neutral-600 line-clamp-2 leading-relaxed bg-neutral-50 p-3 rounded border border-neutral-100 font-sans">
            {draft.bodyTemplate}
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-card flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name, email, or company..."
            className="input-field pl-9 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'PENDING', 'SENT', 'FAILED', 'UNSUBSCRIBED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Status Table */}
      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-border text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              <th className="py-3 px-6">Recipient Email</th>
              <th className="py-3 px-6">Name</th>
              <th className="py-3 px-6">Company</th>
              <th className="py-3 px-6">Role</th>
              <th className="py-3 px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  No recipient contacts match the filter criteria.
                </td>
              </tr>
            ) : (
              contacts.map((cnt) => (
                <tr key={cnt.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-6 font-mono font-medium text-neutral-900">{cnt.email}</td>
                  <td className="py-3 px-6 text-neutral-700">{cnt.name || '—'}</td>
                  <td className="py-3 px-6 text-neutral-700">{cnt.company || '—'}</td>
                  <td className="py-3 px-6 text-neutral-500">{cnt.role || '—'}</td>
                  <td className="py-3 px-6">
                    <Badge status={cnt.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Mail, Eye, RefreshCw, Play, Trash2, AlertTriangle
} from 'lucide-react';
import { Campaign } from '@mailpersonalize/shared';
import { apiFetch } from '../../config';

interface ExtendedCampaign extends Omit<Campaign, 'sending_account' | 'stats'> {
  stats?: {
    totalContacts: number;
    sentCount: number;
    failedCount: number;
  };
  sending_account?: {
    sender_email?: string;
  } | null;
}

interface CampaignsListProps {
  onSelectCampaign?: (id: string) => void;
  onResumeDraft?: (id: string) => void;
  onCreateNew?: () => void;
}

export default function CampaignsList({ onSelectCampaign, onResumeDraft, onCreateNew }: CampaignsListProps) {
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    if (onSelectCampaign) onSelectCampaign(id);
    else navigate(`/campaigns/${id}`);
  };

  const handleResume = (id: string) => {
    if (onResumeDraft) onResumeDraft(id);
    else navigate(`/campaigns/${id}/edit`);
  };

  const handleCreate = () => {
    if (onCreateNew) onCreateNew();
    else navigate('/campaigns/new');
  };

  const [campaigns, setCampaigns] = useState<ExtendedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchCampaigns = () => {
    apiFetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.campaigns) {
          setCampaigns(data.campaigns);
        } else {
          setError(data.error || 'Failed to load campaigns');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDeleteCampaign = async (campaignId: string) => {
    setDeletingId(campaignId);
    try {
      const res = await apiFetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        setConfirmDeleteId(null);
      }
    } catch (e) {
      console.error('Delete draft error:', e);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3 font-sans">
        <RefreshCw className="w-6 h-6 text-[#054048] animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#5A5A5A]">Loading campaign dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] border-2 border-[#D64545] text-[#D64545] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">Delete Campaign Draft?</h3>
              <p className="text-xs text-[#5A5A5A]">
                This will permanently discard this draft campaign and all uploaded contacts.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary flex-1 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCampaign(confirmDeleteId)}
                disabled={Boolean(deletingId)}
                className="btn-primary flex-1 py-2 text-xs font-bold bg-[#D64545] hover:bg-[#B53535] text-white border-2 border-black"
              >
                {deletingId ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#1A1A1A]">Email Campaigns</h2>
          <p className="text-xs text-[#5A5A5A] mt-1 font-medium">Manage, resume drafts, and track your cold outreach campaigns</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary py-2.5 px-5 text-xs font-extrabold gap-2 flex items-center cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Create New Campaign
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold">
          {error}
        </div>
      )}

      {/* Empty State */}
      {campaigns.length === 0 ? (
        <div className="bg-white border-2 border-black rounded-2xl p-10 text-center space-y-5 max-w-lg mx-auto my-8 shadow-sm">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src="/assets/Avatar1.png"
              alt="Waving Avatar"
              className="w-24 h-24 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
            />
            <span className="absolute -top-2 -right-2 bg-[#054048] text-white border-2 border-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              👋 Hello!
            </span>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">No campaigns created yet</h3>
            <p className="text-xs text-[#5A5A5A] max-w-sm mx-auto leading-relaxed font-medium">
              Upload your contact list, design your template, and start sending AI-powered personalized emails.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="btn-primary py-3 px-6 text-xs font-extrabold gap-2 inline-flex items-center cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Create Your First Campaign
          </button>
        </div>
      ) : (
        /* Campaigns Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((cmp) => {
            const total = cmp.stats?.totalContacts || cmp._count?.contacts || 0;
            const sent = cmp.stats?.sentCount || 0;
            const failed = cmp.stats?.failedCount || 0;
            const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
            const status = cmp.status || 'draft';
            const isDraft = status === 'draft';
            const senderEmail = cmp.sending_account?.sender_email || 'Connected Email';

            return (
              <div
                key={cmp.id}
                className="bg-white border-2 border-black rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border-2 border-black ${
                      status === 'completed' ? 'bg-[#FEF6EA] text-[#054048]' :
                      status === 'sending' ? 'bg-[#E6F4F1] text-[#054048] animate-pulse' :
                      'bg-[#F8F8F8] text-[#5A5A5A]'
                    }`}>
                      {isDraft ? '✏️ DRAFT' : status}
                    </span>
                    <span className="text-[11px] font-bold text-[#5A5A5A]">
                      {new Date(cmp.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#1A1A1A] line-clamp-1">{cmp.name}</h3>

                  <div className="text-xs text-[#5A5A5A] flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-[#054048]" />
                    <span className="truncate">{senderEmail}</span>
                  </div>

                  {/* Progress Bar & Metrics */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-[#5A5A5A]">
                      <span>
                        {isDraft ? 'Draft Status:' : 'Progress:'}{' '}
                        <strong className="text-[#1A1A1A]">
                          {isDraft ? `${total} Contacts Uploaded` : `${sent} / ${total} Sent`}
                        </strong>
                      </span>
                      {!isDraft && <span className="font-extrabold text-[#1A1A1A]">{percent}%</span>}
                    </div>
                    {!isDraft && (
                      <div className="w-full bg-[#F8F8F8] border border-black rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#054048] h-full transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                    {failed > 0 && (
                      <p className="text-[10px] font-bold text-[#D64545]">⚠️ {failed} failed sends</p>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t-2 border-black flex items-center justify-between">
                  {isDraft ? (
                    <button
                      onClick={() => handleResume(cmp.id)}
                      className="btn-primary text-xs py-1.5 px-3.5 gap-1.5 flex items-center cursor-pointer font-extrabold"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Resume Draft
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelect(cmp.id)}
                      className="btn-secondary text-xs py-1.5 px-3.5 gap-1.5 flex items-center cursor-pointer font-bold"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#054048]" /> View Analytics
                    </button>
                  )}

                  <button
                    onClick={() => setConfirmDeleteId(cmp.id)}
                    className="p-1.5 text-[#5A5A5A] hover:text-[#D64545] hover:bg-[#FEE2E2] transition-colors rounded-lg cursor-pointer border border-transparent hover:border-black"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

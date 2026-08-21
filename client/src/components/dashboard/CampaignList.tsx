import React from 'react';
import { Send, Users, ArrowUpRight, Plus, MailCheck } from 'lucide-react';
import { Campaign } from '../../types';
import { Badge } from '../ui/Badge';

interface CampaignListProps {
  campaigns: Campaign[];
  loading: boolean;
  onSelectCampaign: (id: string) => void;
  onNewCampaign: () => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  loading,
  onSelectCampaign,
  onNewCampaign,
}) => {
  if (loading) {
    return (
      <div className="space-y-4 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-12 text-center shadow-card space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
          <MailCheck className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-900">No campaigns yet</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Create your first AI-personalized bulk email campaign in minutes.
          </p>
        </div>
        <button onClick={onNewCampaign} className="btn-accent gap-2">
          <Plus className="w-4 h-4" /> Create First Campaign
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage and track your active bulk email outreach.</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <div className="divide-y divide-border">
          {campaigns.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCampaign(c.id)}
              className="p-5 flex items-center justify-between hover:bg-neutral-50/80 transition-colors cursor-pointer group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900 group-hover:text-accent transition-colors">
                    {c.name}
                  </span>
                  <Badge status={c.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-400" /> {c.totalContacts} contacts
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="w-3.5 h-3.5 text-neutral-400" /> Provider: {c.provider}
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 group-hover:text-accent transition-colors">
                View Analytics <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

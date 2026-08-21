import React from 'react';
import { Send, Plus, ShieldAlert, Settings, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  user: User | null;
  activeTab: 'campaigns' | 'suppression';
  setActiveTab: (tab: 'campaigns' | 'suppression') => void;
  onNewCampaign: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onNewCampaign,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('campaigns')}>
            <div className="w-8 h-8 rounded-lg bg-foreground text-white flex items-center justify-center font-bold text-sm shadow-subtle">
              <Send className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-neutral-900 tracking-tight text-base">The Mailing Company</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('suppression')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'suppression'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Suppression List
            </button>
          </nav>
        </div>

        {/* Right User & Primary CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="p-2 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
            title="Settings & Integrations"
          >
            <Settings className="w-4 h-4" />
          </button>

          {user && (
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-md">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span className="max-w-[120px] truncate">{user.email}</span>
            </div>
          )}

          <button onClick={onNewCampaign} className="btn-accent gap-1.5">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>
    </header>
  );
};

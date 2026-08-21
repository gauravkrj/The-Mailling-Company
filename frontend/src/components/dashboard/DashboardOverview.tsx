import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Mail, Eye, Send, ArrowRight, Play, RefreshCw, Check, TrendingUp, Sparkles, AlertTriangle, Shield, CheckCircle2, UserCheck, Layers, Radio, HelpCircle, Users, FileSpreadsheet, FileText, Palette, BarChart3, Globe, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { User, Campaign } from '@mailpersonalize/shared';
import { apiFetch } from '../../config';

interface ExtendedCampaign extends Omit<Campaign, 'sending_account' | 'stats'> {
  stats?: {
    totalContacts: number;
    sentCount: number;
    openedCount?: number;
    clickedCount?: number;
    failedCount: number;
  };
  sending_account?: {
    sender_email?: string;
  } | null;
  email_draft?: any;
  email_design?: any;
}

interface DashboardOverviewProps {
  user: User;
  onCreateNew?: () => void;
  onViewAllCampaigns?: () => void;
  onSelectCampaign?: (id: string) => void;
  onResumeDraft?: (id: string) => void;
}

export default function DashboardOverview({
  user,
  onCreateNew,
  onViewAllCampaigns,
  onSelectCampaign,
  onResumeDraft,
}: DashboardOverviewProps) {
  const navigate = useNavigate();

  const handleCreate = () => {
    if (onCreateNew) onCreateNew();
    else navigate('/campaigns/new');
  };

  const handleViewAll = () => {
    if (onViewAllCampaigns) onViewAllCampaigns();
    else navigate('/campaigns');
  };

  const handleSelect = (id: string) => {
    if (onSelectCampaign) onSelectCampaign(id);
    else navigate(`/campaigns/${id}`);
  };

  const handleResume = (id: string) => {
    if (onResumeDraft) onResumeDraft(id);
    else navigate(`/campaigns/${id}/edit`);
  };

  const [campaigns, setCampaigns] = useState<ExtendedCampaign[]>([]);
  const [sendingAccountsCount, setSendingAccountsCount] = useState(0);
  const [directoryCount, setDirectoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistence for onboarding checklist dismissal
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem('dismissed_onboarding') === 'true';
  });

  useEffect(() => {
    Promise.all([
      apiFetch('/api/campaigns').then((r) => r.json()),
      apiFetch('/api/accounts').then((r) => r.json()),
      apiFetch('/api/contacts/directory').then((r) => r.json()),
    ])
      .then(([cmpData, accData, dirData]) => {
        if (cmpData.success && cmpData.campaigns) {
          setCampaigns(cmpData.campaigns);
        }
        if (accData.success && Array.isArray(accData.accounts)) {
          setSendingAccountsCount(accData.accounts.length);
        }
        if (dirData.success && Array.isArray(dirData.directory)) {
          setDirectoryCount(dirData.directory.length);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];

  // Compute aggregate statistics across all campaigns
  const totalCampaigns = campaigns.length;
  let totalEmailsSent = 0;
  let totalOpened = 0;
  let totalClicked = 0;
  let totalContactsAcrossCampaigns = 0;

  campaigns.forEach((c) => {
    const sent = c.stats?.sentCount || 0;
    const opened = c.stats?.openedCount || 0;
    const clicked = c.stats?.clickedCount || 0;
    const contacts = c.stats?.totalContacts || c._count?.contacts || 0;
    totalEmailsSent += sent;
    totalOpened += opened;
    totalClicked += clicked;
    totalContactsAcrossCampaigns += contacts;
  });

  const overallOpenRate = totalEmailsSent > 0 ? ((totalOpened / totalEmailsSent) * 100).toFixed(1) : '0.0';
  const overallClickRate = totalEmailsSent > 0 ? ((totalClicked / totalEmailsSent) * 100).toFixed(1) : '0.0';

  const recentCampaigns = campaigns.slice(0, 3);

  // Real-Data-Driven Completion Checks for exact 8 Onboarding Milestones
  const visitedContacts = localStorage.getItem('visited_contacts') === 'true' || directoryCount > 0;
  const viewedResults = localStorage.getItem('viewed_results') === 'true' || totalEmailsSent > 0;
  const hasSavedDraft = campaigns.some((c) => Boolean(c.email_draft) || (c._count?.contacts || 0) > 0 || totalCampaigns > 0);
  const hasCustomizedDesign = Boolean(user.company_website) || campaigns.some((c) => Boolean(c.email_design));
  const hasSentCampaign = campaigns.some((c) => c.status === 'completed' || c.status === 'sending' || (c.stats?.sentCount || 0) > 0);
  const hasUploadedContacts = directoryCount > 0 || totalContactsAcrossCampaigns > 0;

  const realOnboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome aboard',
      description: 'Create your account',
      completed: true, // Auto-completed on sign up
      avatar: '/assets/Avatar1.png',
      action: undefined,
    },
    {
      id: 'connect_inbox',
      title: 'Connect your inbox',
      description: 'Link a sending account (Gmail, SMTP, or AWS SES)',
      completed: sendingAccountsCount > 0,
      avatar: '/assets/Avatar4.png',
      action: () => navigate('/accounts/connect'),
    },
    {
      id: 'build_list',
      title: 'Build your contact list',
      description: 'Upload your first CSV of contacts',
      completed: hasUploadedContacts,
      avatar: '/assets/Avatar5.png',
      action: handleCreate,
    },
    {
      id: 'write_email',
      title: 'Write your first email',
      description: 'Draft content using a template or AI personalization',
      completed: hasSavedDraft,
      avatar: '/assets/Avatar6.png',
      action: handleCreate,
    },
    {
      id: 'make_yours',
      title: 'Make it yours',
      description: 'Add your logo, colors, or send as plain text',
      completed: hasCustomizedDesign,
      avatar: '/assets/Avatar7.png',
      action: () => navigate('/settings'),
    },
    {
      id: 'hit_send',
      title: 'Hit send',
      description: 'Launch your first campaign',
      completed: hasSentCampaign,
      avatar: '/assets/Avatar1.png',
      action: handleViewAll,
    },
    {
      id: 'check_results',
      title: 'Check your results',
      description: 'See opens, clicks, and delivery stats',
      completed: viewedResults,
      avatar: '/assets/Avatar2.png',
      action: handleViewAll,
    },
    {
      id: 'grow_list',
      title: 'Grow your list',
      description: 'Explore your Contacts directory',
      completed: visitedContacts,
      avatar: '/assets/Avatar3.png',
      action: () => navigate('/contacts'),
    },
  ];

  const completedCount = realOnboardingSteps.filter((s) => s.completed).length;
  const allCompleted = completedCount === 8;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('dismissed_onboarding', 'true');
  };

  const handleReopen = () => {
    setDismissed(false);
    localStorage.setItem('dismissed_onboarding', 'false');
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3 font-sans">
        <RefreshCw className="w-6 h-6 text-[#054048] animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#5A5A5A]">Loading dashboard overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Top Notice/Banner Strip */}
      {sendingAccountsCount === 0 && (
        <div className="notice-banner p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#054048] text-white flex items-center justify-center font-bold text-xs shrink-0">!</span>
            <span>
              You haven't connected a custom SMTP or AWS SES sending account yet. <u>Connect a sending account</u> to begin dispatching.
            </span>
          </div>
          <button
            onClick={() => navigate('/accounts/connect')}
            className="underline font-bold hover:text-[#054048] shrink-0 cursor-pointer"
          >
            Connect Account →
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-[#5A5A5A] font-medium">
            Welcome back, {firstName}! Here is your outreach overview.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="btn-primary py-3 px-6 text-xs font-black gap-2 flex items-center cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> New Campaign
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border-2 border-[#D64545] rounded-xl text-xs text-[#D64545] font-bold">
          {error}
        </div>
      )}

      {/* Accurate Real-Data-Driven Onboarding Checklist */}
      {(!dismissed && !allCompleted) ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-[#1A1A1A]">Getting started</h2>
              <span className="bg-[#FEF6EA] text-[#054048] border border-black px-2.5 py-0.5 rounded-full text-xs font-black">
                {completedCount} / 8 Completed
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="text-xs font-bold text-[#5A5A5A] hover:text-black underline cursor-pointer flex items-center gap-1"
            >
              Show less ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {realOnboardingSteps.map((step) => (
              <div
                key={step.id}
                onClick={step.action}
                className={`bg-white border-2 border-black rounded-xl p-5 relative flex flex-col items-center text-center space-y-3 ${
                  step.action ? 'cursor-pointer hover:bg-[#FEF6EA]' : 'cursor-default'
                } transition-colors`}
              >
                {/* Checkmark Circle (Filled Deep Green for completed vs Empty Outline for incomplete) */}
                <div className="absolute top-3 right-3">
                  {step.completed ? (
                    <div className="w-5 h-5 rounded-full bg-[#054048] text-white flex items-center justify-center border border-black">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-black bg-white" />
                  )}
                </div>

                {/* Avatar Artwork Illustration */}
                <div className="pt-2">
                  <img
                    src={step.avatar}
                    alt={step.title}
                    className="w-12 h-12 rounded-xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
                  />
                </div>

                {/* Card Title & Description */}
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-[#1A1A1A]">{step.title}</h3>
                  <p className="text-[11px] text-[#5A5A5A] leading-snug font-medium">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Collapsed / Dismissed Checklist Bar */
        <div className="bg-white border-2 border-black rounded-xl p-3.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#054048] text-white flex items-center justify-center text-[10px] font-black">
              {completedCount}
            </span>
            <span className="text-[#1A1A1A]">
              Onboarding Progress: <strong>{completedCount} of 8 milestones completed</strong>
            </span>
          </div>

          <button
            onClick={handleReopen}
            className="text-xs text-[#054048] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
          >
            Show Onboarding Checklist <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Aggregate Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black rounded-xl p-5 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Total Campaigns</span>
            <Send className="w-4 h-4 text-[#054048]" />
          </div>
          <p className="text-3xl font-black text-[#1A1A1A]">{totalCampaigns}</p>
          <p className="text-[11px] text-[#5A5A5A]">Active & completed</p>
        </div>

        <div className="bg-[#FFFFFF] border-2 border-black rounded-xl p-5 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Total Emails Sent</span>
            <Mail className="w-4 h-4 text-[#054048]" />
          </div>
          <p className="text-3xl font-black text-[#1A1A1A]">{totalEmailsSent}</p>
          <p className="text-[11px] text-[#5A5A5A]">All-time delivered</p>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-5 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Overall Open Rate</span>
            <Eye className="w-4 h-4 text-[#054048]" />
          </div>
          <p className="text-3xl font-black text-[#054048]">{overallOpenRate}%</p>
          <p className="text-[11px] text-[#054048] font-bold">Average engagement</p>
        </div>

        <div className="bg-white border-2 border-black rounded-xl p-5 space-y-1">
          <div className="text-xs text-[#5A5A5A] flex items-center justify-between font-bold">
            <span>Overall Click Rate</span>
            <TrendingUp className="w-4 h-4 text-[#054048]" />
          </div>
          <p className="text-3xl font-black text-[#1A1A1A]">{overallClickRate}%</p>
          <p className="text-[11px] text-[#5A5A5A]">CTR across campaigns</p>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-[#1A1A1A]">Recent Campaigns</h3>
            <p className="text-xs text-[#5A5A5A]">Your 3 most recently updated outreach campaigns</p>
          </div>

          <button
            onClick={handleViewAll}
            className="text-xs text-[#054048] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
          >
            View All Campaigns ({totalCampaigns}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {totalCampaigns === 0 ? (
          <div className="bg-white border-2 border-black rounded-2xl p-12 text-center space-y-5 max-w-xl mx-auto my-4">
            <div className="w-16 h-16 bg-[#FEF6EA] border-2 border-black rounded-2xl flex items-center justify-center mx-auto text-[#1A1A1A]">
              <Sparkles className="w-8 h-8 text-[#054048]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Ready to launch your first outreach campaign?</h2>
              <p className="text-xs text-[#5A5A5A] leading-relaxed">
                Upload your target lead list, craft AI-personalized messages, and send directly from your connected Google or SMTP accounts.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentCampaigns.map((cmp) => {
              const total = cmp.stats?.totalContacts || cmp._count?.contacts || 0;
              const sent = cmp.stats?.sentCount || 0;
              const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
              const status = cmp.status || 'draft';
              const isDraft = status === 'draft';

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

                    <h4 className="text-sm font-extrabold text-[#1A1A1A] line-clamp-1">{cmp.name}</h4>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-[#5A5A5A]">
                        <span>{isDraft ? 'Contacts:' : 'Sent:'} <strong className="text-[#1A1A1A]">{isDraft ? total : `${sent} / ${total}`}</strong></span>
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
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-black flex justify-end">
                    {isDraft ? (
                      <button
                        onClick={() => handleResume(cmp.id)}
                        className="btn-primary text-xs py-1.5 px-3.5 gap-1.5 flex items-center font-extrabold"
                      >
                        <Play className="w-3 h-3 fill-current" /> Resume Draft
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelect(cmp.id)}
                        className="btn-secondary text-xs py-1.5 px-3.5 gap-1.5 flex items-center font-bold"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#054048]" /> View Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

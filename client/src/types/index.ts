export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  workspaceType: 'GMAIL_PERSONAL' | 'GMAIL_WORKSPACE' | 'SES_ENTERPRISE';
  hasGmailOAuth: boolean;
  hasSESConfigured: boolean;
}

export interface Contact {
  id: string;
  campaignId: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  customFields?: Record<string, any>;
  status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED' | 'UNSUBSCRIBED';
  createdAt?: string;
}

export interface EmailDraft {
  id?: string;
  campaignId?: string;
  subject: string;
  bodyTemplate: string;
  aiPersonalizeEnabled: boolean;
  aiPrompt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'QUEUED' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  provider: 'GMAIL' | 'SES';
  rateLimitPerHour: number;
  totalContacts: number;
  createdAt: string;
}

export interface CampaignDetailData {
  campaign: Campaign;
  draft?: EmailDraft;
  stats: {
    total: number;
    sent: number;
    pending: number;
    failed: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
  contacts: Contact[];
}

export interface SuppressionItem {
  id: string;
  email: string;
  reason: 'UNSUBSCRIBE' | 'BOUNCE' | 'COMPLAINT' | 'MANUAL';
  addedAt: string;
}

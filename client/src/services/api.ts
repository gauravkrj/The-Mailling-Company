import { User, Campaign, CampaignDetailData, SuppressionItem } from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data as T;
}

export const api = {
  // Auth
  getMe: () => fetchJson<User>('/auth/me'),
  getGoogleAuthUrl: () => fetchJson<{ url: string | null; message?: string }>('/auth/google/url'),
  demoLogin: () => fetchJson<{ success: boolean; token: string; user: User }>('/auth/demo-login', { method: 'POST' }),

  // Contacts & Parsing
  parseContacts: (payload: { csvContent?: string; googleSheetUrl?: string }) =>
    fetchJson<{
      headers: string[];
      suggestedMapping: Record<string, string>;
      contacts: any[];
      totalRows: number;
      validCount: number;
      invalidCount: number;
      duplicateCount: number;
      isLargeScrapedListWarning: boolean;
      complianceReminder: string | null;
    }>('/contacts/parse', { method: 'POST', body: JSON.stringify(payload) }),

  importContacts: (payload: { campaignName: string; mappedContacts: any[] }) =>
    fetchJson<{ success: boolean; campaignId: string; importedCount: number }>('/contacts/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Draft & AI
  generateDraft: (prompt: string, availableColumns: string[]) =>
    fetchJson<{ subject: string; bodyTemplate: string }>('/draft/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, availableColumns }),
    }),

  saveDraft: (payload: {
    campaignId: string;
    subject: string;
    bodyTemplate: string;
    aiPersonalizeEnabled: boolean;
    aiPrompt?: string;
  }) => fetchJson<{ success: boolean; draft: any }>('/draft/save', { method: 'POST', body: JSON.stringify(payload) }),

  previewRecipient: (payload: {
    subject: string;
    bodyTemplate: string;
    contact: any;
    aiPersonalizeEnabled: boolean;
    aiPrompt?: string;
  }) => fetchJson<{ subject: string; body: string }>('/draft/preview-recipient', { method: 'POST', body: JSON.stringify(payload) }),

  // Delivery & Schedule
  estimateSchedule: (payload: { totalContacts: number; provider: 'GMAIL' | 'SES'; workspaceType: string }) =>
    fetchJson<{
      totalContacts: number;
      provider: string;
      estimatedDurationHours: number;
      estimatedDays: number;
      exceedsDailyLimit: boolean;
      requiresMultiDaySchedule: boolean;
      recommendation: string;
    }>('/send/estimate-schedule', { method: 'POST', body: JSON.stringify(payload) }),

  launchCampaign: (payload: { campaignId: string; provider: 'GMAIL' | 'SES'; rateLimitPerHour: number; autoSpreadDays: number }) =>
    fetchJson<{ success: boolean; message: string; queuedCount: number }>('/send/launch', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Campaigns & Analytics
  getCampaigns: () => fetchJson<Campaign[]>('/campaigns'),
  getCampaignDetail: (id: string, search?: string, statusFilter?: string) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (statusFilter) query.set('statusFilter', statusFilter);
    return fetchJson<CampaignDetailData>(`/campaigns/${id}?${query.toString()}`);
  },
  updateCampaignStatus: (id: string, status: 'PAUSED' | 'SENDING' | 'CANCELLED') =>
    fetchJson<{ success: boolean; campaignId: string; status: string }>(`/campaigns/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Suppression List
  getSuppressions: () => fetchJson<SuppressionItem[]>('/suppression'),
  addSuppression: (email: string, reason = 'MANUAL') =>
    fetchJson<{ success: boolean; email: string }>('/suppression', {
      method: 'POST',
      body: JSON.stringify({ email, reason }),
    }),
  removeSuppression: (email: string) => fetchJson<{ success: boolean }>(`/suppression/${encodeURIComponent(email)}`, { method: 'DELETE' }),
};

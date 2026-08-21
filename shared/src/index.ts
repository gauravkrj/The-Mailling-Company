export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  service: string;
  version: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url?: string | null;
  google_id?: string | null;
  company_website?: string | null;
  is_email_verified?: boolean;
  terms_accepted_at?: string | null;
  created_at?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: User | null;
}

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  sending_account_id?: string | null;
  status: CampaignStatus;
  current_step?: number;
  created_at: string;
  _count?: {
    contacts: number;
  };
  sending_account?: SendingAccount | null;
  email_draft?: EmailDraft | null;
  email_design?: EmailDesign | null;
  stats?: CampaignStats;
}

export interface Contact {
  id: string;
  campaign_id: string;
  email: string;
  custom_fields: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'suppressed';
  created_at: string;
}

export interface CSVRowPreview {
  rowIndex: number;
  email: string;
  name?: string;
  data: Record<string, string>;
  isValidEmail: boolean;
  isDuplicate: boolean;
}

export interface CSVPreviewResult {
  headers: string[];
  suggestedMapping: {
    email?: string;
    name?: string;
    company?: string;
    role?: string;
  };
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  previewRows: CSVRowPreview[];
  contacts: CSVRowPreview[];
}

export interface SendingAccount {
  id: string;
  user_id: string;
  provider: 'google_oauth' | 'smtp_app_password' | 'aws_ses';
  display_name: string;
  sender_email: string;
  daily_limit: number;
  status: 'active' | 'error' | 'disconnected';
  smtp_host?: string | null;
  smtp_port?: number | null;
  aws_access_key_id?: string | null;
  aws_region?: string | null;
  sender_domain?: string | null;
  verification_status?: 'pending' | 'verified' | 'failed' | null;
  dkim_verified?: boolean;
  production_access?: boolean;
  last_checked_at?: string | null;
  connected_at: string;
  last_verified_at: string;
}

export interface DnsRecordItem {
  type: 'TXT' | 'CNAME';
  host: string;
  value: string;
  purpose: 'domain_verification' | 'dkim' | 'spf' | 'dmarc';
  title: string;
  description: string;
}

export interface SesDomainVerificationResult {
  domain: string;
  verificationToken: string;
  dkimTokens: string[];
  records: DnsRecordItem[];
  spfRecord: DnsRecordItem;
  dmarcRecord: DnsRecordItem;
}

export interface SesStatusCheckResult {
  domain: string;
  verificationStatus: 'Pending' | 'Verified' | 'Failed' | 'NotFound';
  dkimVerified: boolean;
  productionAccess: boolean;
  dailyQuota: number;
  maxSendRate: number;
  lastCheckedAt: string;
}

export type ContentMode = 'fixed_template' | 'ai_personalized';
export type EmailFormat = 'html' | 'plain_text';

export interface EmailDraft {
  id: string;
  campaign_id: string;
  mode: ContentMode;
  format?: EmailFormat;
  subject: string;
  body_template: string;
  plain_signature?: string | null;
  ai_brief?: string | null;
  ai_tone?: string | null;
  created_at: string;
}

export interface EmailDesign {
  id: string;
  campaign_id: string;
  logo_url?: string | null;
  logo_size?: 'small' | 'medium' | 'large' | null;
  logo_align?: 'left' | 'center' | 'right' | null;
  header_color?: string | null;
  header_bg_image?: string | null;
  header_title?: string | null;
  header_subtitle?: string | null;
  header_text_color?: string | null;
  accent_color?: string | null;
  font_family?: string | null;
  signature_html?: string | null;
  cta_button_text?: string | null;
  cta_button_url?: string | null;
  cta_button_bg?: string | null;
  cta_button_bg_color?: string | null;
  cta_button_text_color?: string | null;
  cta_button_radius?: string | number | null;
  cta_button_align?: 'left' | 'center' | 'right' | null;
  layout_preset?: 'simple_text' | 'header_banner' | 'centered_card' | 'product_showcase' | null;
  layout_json?: Record<string, any> | null;
}

export type SendLogStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'suppressed';

export interface SendLog {
  id: string;
  contact_id: string;
  campaign_id: string;
  sending_account_id: string;
  status: SendLogStatus;
  provider_used: string;
  rendered_subject?: string | null;
  rendered_body?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  error_message?: string | null;
  unsubscribe_token: string;
  created_at: string;
}

export interface SuppressionList {
  id: string;
  user_id: string;
  email: string;
  reason: string;
  added_at: string;
}

export interface CampaignSendingProgress {
  campaignId: string;
  status: CampaignStatus;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  suppressedCount: number;
  estimatedCompletion: string;
}

// Phase 7: Analytics & Reporting Contracts
export interface CampaignStats {
  totalContacts: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  failedCount: number;
  unsubscribedCount: number;
  openRate: number; // percentage e.g. 45.5
  clickRate: number; // percentage e.g. 12.0
}

export interface ContactSendLogDetail {
  id: string;
  contactId?: string;
  email: string;
  name?: string | null;
  company?: string | null;
  role?: string | null;
  status: SendLogStatus;
  providerUsed: string;
  renderedSubject?: string | null;
  renderedBody?: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  errorMessage?: string | null;
}

export interface CampaignDetailAnalytics {
  campaign: Campaign;
  stats: CampaignStats;
  logs: ContactSendLogDetail[];
  totalLogs: number;
  page: number;
  pageSize: number;
}

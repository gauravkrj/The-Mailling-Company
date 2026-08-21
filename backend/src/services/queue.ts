import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma, isPrismaConnected } from '../db.js';
import { sendEmailWithProvider } from './emailSender.js';
import { isContactSuppressedOrBounced } from './directorySync.js';
import { renderEmailHtml, renderPlainTextEmail } from '../utils/templateRenderer.js';
import { previewAIPersonalization } from './llm.js';
import { memoryContactStore } from '../routes/contacts.js';
import { memoryDraftStore, memoryDesignStore } from '../routes/campaigns.js';
import { memoryAccountStore } from '../routes/accounts.js';

export interface EmailJobData {
  campaignId: string;
  contactId: string;
  sendingAccountId: string;
  userId: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisConnection: Redis | null = null;
export let emailQueue: Queue | null = null;

try {
  redisConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  emailQueue = new Queue('email-send-queue', { connection: redisConnection });
} catch (e) {
  console.warn('Redis unavailable. In-memory queue fallback active.');
}

// Memory stores for fallback standalone mode when PostgreSQL/Redis are offline
export const memorySendLogStore = new Map<string, any[]>();
export const memorySuppressionStore = new Set<string>();

/**
 * Process a Single Contact Send Job (Phase 6 Core Worker Logic)
 */
export async function processEmailSendJob(data: EmailJobData): Promise<{ success: boolean; status: string; error?: string }> {
  const { campaignId, contactId, sendingAccountId, userId } = data;

  let campaign: any = null;
  let contact: any = null;
  let sendingAccount: any = null;
  let emailDraft: any = null;
  let emailDesign: any = null;

  // 1. Fetch data from Prisma ORM if database is online
  if (isPrismaConnected) {
    try {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          email_draft: true,
          email_design: true,
          sending_account: true,
        },
      });

      contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (campaign) {
        emailDraft = campaign.email_draft;
        emailDesign = campaign.email_design;
        sendingAccount = campaign.sending_account;
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Standalone memory fallback: Retrieve actual stored objects
  if (!contact) {
    const memContacts = memoryContactStore.get(campaignId) || [];
    contact = memContacts.find((c: any) => c.id === contactId);
  }
  if (!contact) {
    contact = { id: contactId, email: 'sample@recipient.com', custom_fields: { name: 'Sample Lead', company: 'Acme' } };
  }

  if (!emailDraft) {
    emailDraft = memoryDraftStore.get(campaignId);
  }
  if (!emailDesign) {
    emailDesign = memoryDesignStore.get(campaignId);
  }

  if (!sendingAccount) {
    sendingAccount = memoryAccountStore.get(sendingAccountId);
    if (!sendingAccount && memoryAccountStore.size > 0) {
      const allAccounts = Array.from(memoryAccountStore.values());
      sendingAccount = allAccounts.find((a) => a.id === sendingAccountId) || allAccounts[allAccounts.length - 1];
    }
  }

  if (campaign && campaign.status === 'paused') {
    return { success: false, status: 'paused', error: 'Campaign is currently paused.' };
  }
  if (campaign && campaign.status === 'cancelled') {
    return { success: false, status: 'cancelled', error: 'Campaign was cancelled.' };
  }

  const recipientEmail = contact.email;

  // 3. Check Global Suppression & Bounce List via ContactDirectory (Phase 13A Requirement)
  let isSuppressed = false;
  let suppressReason = 'suppressed';

  const dirCheck = await isContactSuppressedOrBounced(userId, recipientEmail);
  if (dirCheck.suppressed) {
    isSuppressed = true;
    suppressReason = dirCheck.reason || 'suppressed';
  } else if (isPrismaConnected) {
    const suppressed = await prisma.suppressionList.findFirst({
      where: { user_id: userId, email: recipientEmail.toLowerCase() },
    });
    if (suppressed) isSuppressed = true;
  } else if (memorySuppressionStore.has(recipientEmail.toLowerCase())) {
    isSuppressed = true;
  }

  if (isSuppressed) {
    await recordSendLog({
      contactId,
      campaignId,
      sendingAccountId,
      status: (suppressReason === 'bounced' ? 'bounced' : 'suppressed') as any,
      providerUsed: sendingAccount?.provider || 'smtp_app_password',
      errorMessage: `Contact is ${suppressReason} in global ContactDirectory.`,
    });
    return { success: false, status: suppressReason, error: `Contact is ${suppressReason}` };
  }

  // 4. Prepare Email Content & Perform Tag Replacement on BOTH Subject and Body
  let subject = emailDraft?.subject || 'Quick question regarding {{company}}';
  let bodyContent = emailDraft?.body_template || 'Hi {{name}}...';

  const contactData = {
    email: contact.email,
    name: contact.custom_fields?.name || contact.custom_fields?.['full name'] || '',
    'full name': contact.custom_fields?.['full name'] || contact.custom_fields?.name || '',
    company: contact.custom_fields?.company || '',
    role: contact.custom_fields?.role || '',
    ...(typeof contact.custom_fields === 'object' ? contact.custom_fields : {}),
  };

  // Perform tag substitution on Subject line
  const nameVal = contactData.name || contactData['full name'] || '';
  const companyVal = contactData.company || '';
  const roleVal = contactData.role || '';

  if (nameVal) {
    subject = subject.replace(/\{\{\s*(full\s*name|name|contact_name|fullname|first_name|full_name)\s*\}\}/gi, nameVal);
  }
  if (companyVal) {
    subject = subject.replace(/\{\{\s*(company|organization|company_name|org|company\s*name)\s*\}\}/gi, companyVal);
  }
  if (roleVal) {
    subject = subject.replace(/\{\{\s*(role|title|job_title|position|job\s*title)\s*\}\}/gi, roleVal);
  }
  Object.keys(contactData).forEach((key) => {
    const val = contactData[key] !== null && contactData[key] !== undefined ? String(contactData[key]) : '';
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexExact = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
    subject = subject.replace(regexExact, val);
  });

  // Mode 2 AI Per-Contact Rewrite Pass
  if (emailDraft?.mode === 'ai_personalized') {
    try {
      const rewritten = await previewAIPersonalization({
        prompt: emailDraft.ai_brief || 'Cold outreach email',
        tone: emailDraft.ai_tone || 'Professional',
        contact: contactData,
        subject,
        body: bodyContent,
      });
      subject = rewritten.subject || subject;
      bodyContent = rewritten.body;
    } catch (e) {
      console.warn('AI rewrite pass failed. Using template substitution fallback.');
    }
  }

  // 5. Render Final Email Content (Rich HTML vs Plain Text format)
  const isPlainTextFormat = emailDraft?.format === 'plain_text';

  const finalContent = isPlainTextFormat
    ? renderPlainTextEmail({
        bodyContent,
        plainSignature: emailDraft?.plain_signature,
        contactData,
      })
    : renderEmailHtml({
        bodyContent,
        design: emailDesign,
        contactData,
      });

  const unsubscribeToken = `unsub_${contactId}_${Date.now()}`;
  const senderEmailToUse = sendingAccount?.sender_email || process.env.SMTP_USER || 'thedgwrench@gmail.com';

  // 6. Dispatch Email via Selected Provider
  const result = await sendEmailWithProvider({
    provider: sendingAccount?.provider || 'google_oauth',
    senderEmail: senderEmailToUse,
    recipientEmail,
    subject,
    htmlContent: finalContent,
    unsubscribeToken,
    format: isPlainTextFormat ? 'plain_text' : 'html',
    logoUrl: emailDesign?.logo_url,
    headerBgImage: emailDesign?.header_bg_image,
    encryptedRefreshToken: sendingAccount?.encrypted_refresh_token,
    smtpHost: sendingAccount?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: sendingAccount?.smtp_port || Number(process.env.SMTP_PORT) || 587,
    encryptedSmtpPassword: sendingAccount?.encrypted_smtp_password,
    awsAccessKeyId: sendingAccount?.aws_access_key_id,
    encryptedAwsSecretKey: sendingAccount?.encrypted_aws_secret_key,
    awsRegion: sendingAccount?.aws_region,
  });

  // 7. Save Result to SendLog DB
  const sendStatus = result.success ? 'sent' : 'failed';
  await recordSendLog({
    contactId,
    campaignId,
    sendingAccountId,
    status: sendStatus,
    providerUsed: sendingAccount?.provider || 'google_oauth',
    renderedSubject: subject,
    renderedBody: finalContent,
    errorMessage: result.error,
    unsubscribeToken,
  });

  return {
    success: result.success,
    status: sendStatus,
    error: result.error,
  };
}

/**
 * Record SendLog Entry to DB
 */
async function recordSendLog(log: {
  contactId: string;
  campaignId: string;
  sendingAccountId: string;
  status: 'sent' | 'failed' | 'suppressed';
  providerUsed: string;
  renderedSubject?: string;
  renderedBody?: string;
  errorMessage?: string;
  unsubscribeToken?: string;
}) {
  if (isPrismaConnected) {
    try {
      await prisma.sendLog.create({
        data: {
          contact_id: log.contactId,
          campaign_id: log.campaignId,
          sending_account_id: log.sendingAccountId,
          status: log.status,
          provider_used: log.providerUsed,
          rendered_subject: log.renderedSubject || null,
          rendered_body: log.renderedBody || null,
          sent_at: log.status === 'sent' ? new Date() : null,
          error_message: log.errorMessage || null,
          unsubscribe_token: log.unsubscribeToken || `unsub_${log.contactId}`,
        },
      });

      await prisma.contact.update({
        where: { id: log.contactId },
        data: { status: log.status },
      });
    } catch (e) {
      // Fallback
    }
  }

  let list = memorySendLogStore.get(log.campaignId);
  if (!list) {
    list = [];
    memorySendLogStore.set(log.campaignId, list);
  }
  list.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    contact_id: log.contactId,
    campaign_id: log.campaignId,
    sending_account_id: log.sendingAccountId,
    status: log.status,
    provider_used: log.providerUsed,
    rendered_subject: log.renderedSubject || null,
    rendered_body: log.renderedBody || null,
    sent_at: log.status === 'sent' ? new Date().toISOString() : null,
    error_message: log.errorMessage || null,
    unsubscribe_token: log.unsubscribeToken || `unsub_${log.contactId}`,
    created_at: new Date().toISOString(),
  });
}

// BullMQ Worker Initialization
if (redisConnection) {
  try {
    const worker = new Worker<EmailJobData>(
      'email-send-queue',
      async (job: Job<EmailJobData>) => {
        return processEmailSendJob(job.data);
      },
      {
        connection: redisConnection,
        limiter: {
          max: 80,
          duration: 3600000,
        },
      }
    );

    worker.on('failed', (job, err) => {
      console.error(`[Job ${job?.id} Failed]:`, err.message);
    });
  } catch (e) {
    console.warn('BullMQ worker offline.');
  }
}

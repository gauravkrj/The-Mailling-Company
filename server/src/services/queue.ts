import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../redis.js';
import { prisma, inMemoryStore, isPrismaConnected } from '../db.js';
import { config } from '../config.js';
import { personalizeEmailForContact } from './llm.js';
import { sendViaGmail } from './gmail.js';
import { sendViaSES } from './ses.js';

export interface EmailJobData {
  campaignId: string;
  contactId: string;
  userId: string;
  provider: 'GMAIL' | 'SES';
  googleOAuthToken?: string;
  googleRefreshToken?: string;
}

export const EMAIL_QUEUE_NAME = 'email-sending-queue';

let emailQueue: Queue<EmailJobData> | null = null;
let isRedisAvailable = false;

try {
  emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    },
  });
  isRedisAvailable = true;
} catch (e) {
  console.warn('⚠️ BullMQ queue initialization fallback to inline processor');
}

export async function addEmailJobToQueue(data: EmailJobData, delayMs: number = 0) {
  if (emailQueue && isRedisAvailable) {
    try {
      await emailQueue.add(`send-${data.contactId}`, data, { delay: delayMs });
      return;
    } catch (err) {
      console.warn('⚠️ Redis BullMQ queue add error, switching to inline delay runner:', err);
    }
  }

  // Fallback inline delay execution for standalone dev & testing
  setTimeout(async () => {
    try {
      await processSingleEmailSend(data);
    } catch (err) {
      console.error(`[Inline Queue Fallback Error] Contact ${data.contactId}:`, err);
    }
  }, delayMs);
}

export async function processSingleEmailSend(data: EmailJobData): Promise<void> {
  const { campaignId, contactId, userId, provider, googleOAuthToken, googleRefreshToken } = data;

  // 1. Fetch Contact & Campaign Draft
  let contact: any = null;
  let campaign: any = null;
  let draft: any = null;

  if (isPrismaConnected) {
    try {
      contact = await prisma.contact.findUnique({ where: { id: contactId } });
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { emailDraft: true },
      });
      draft = campaign?.emailDraft;
    } catch (dbErr) {
      // Fallback
    }
  }

  if (!contact || !campaign || !draft) {
    const list = inMemoryStore.contacts.get(campaignId) || [];
    contact = list.find((c: any) => c.id === contactId);
    campaign = inMemoryStore.campaigns.get(campaignId);
    draft = inMemoryStore.drafts.get(campaignId);
  }

  if (!contact || !campaign || !draft) {
    console.error(`❌ [Queue Error] Record missing for contactId ${contactId}`);
    return;
  }

  // Check if Campaign is paused or cancelled
  if (campaign.status === 'PAUSED' || campaign.status === 'CANCELLED') {
    console.log(`⏸️ Campaign ${campaignId} is ${campaign.status}. Skipping send for ${contact.email}.`);
    return;
  }

  // 2. Check Suppression List
  let isSuppressed = false;
  if (isPrismaConnected) {
    try {
      const supp = await prisma.suppressionList.findUnique({
        where: { userId_email: { userId, email: contact.email } },
      });
      if (supp) isSuppressed = true;
    } catch (err) {
      // Fallback
    }
  }

  if (!isSuppressed) {
    const userSupps = inMemoryStore.suppressions.get(userId);
    if (userSupps?.has(contact.email.toLowerCase())) isSuppressed = true;
  }

  if (isSuppressed) {
    console.log(`🚫 Email ${contact.email} is in suppression list. Skipping send.`);
    await updateContactAndLogStatus(contactId, campaignId, 'UNSUBSCRIBED', 'Skipped: Recipient is unsubscribed or bounced.');
    return;
  }

  // 3. Generate Personalised Copy
  let personalized: { subject: string; body: string };
  if (draft.aiPersonalizeEnabled) {
    personalized = await personalizeEmailForContact({
      templateSubject: draft.subject,
      templateBody: draft.bodyTemplate,
      contact: {
        email: contact.email,
        name: contact.name,
        company: contact.company,
        role: contact.role,
        customFields: (contact.customFields as any) || {},
      },
      promptContext: draft.aiPrompt,
    });
  } else {
    personalized = await personalizeEmailForContact({
      templateSubject: draft.subject,
      templateBody: draft.bodyTemplate,
      contact: {
        email: contact.email,
        name: contact.name,
        company: contact.company,
        role: contact.role,
        customFields: (contact.customFields as any) || {},
      },
    });
  }

  // Create tracking token
  const trackingToken = `tr_${contactId}_${Date.now()}`;
  const isLocalhost = config.appUrl.includes('localhost') || config.appUrl.includes('127.0.0.1');

  let finalBodyHtml = personalized.body;
  let unsubscribeUrl: string | undefined = undefined;

  // Only inject tracking pixel and tracking links if appUrl is a public domain (not localhost)
  // Injecting http://localhost:5001 URLs in email HTML triggers Spam filters in Gmail/Outlook.
  if (!isLocalhost) {
    unsubscribeUrl = `${config.appUrl}/api/unsubscribe/${trackingToken}`;
    const footerHtml = `
<br/><br/>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
<p style="font-size:12px;color:#6b7280;font-family:sans-serif;">
  You received this email because you are in our outreach database.<br/>
  <a href="${unsubscribeUrl}" style="color:#4f46e5;text-decoration:underline;">Click here to unsubscribe</a> or manage preferences.
</p>`;

    finalBodyHtml = wrapLinksForTracking(personalized.body, trackingToken);
    finalBodyHtml += footerHtml;
    const openPixelUrl = `${config.appUrl}/api/track/open/${trackingToken}.png`;
    finalBodyHtml += `<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;"/>`;
  }

  // 4. Send Email via chosen Provider
  let sendResult: { messageId: string };
  let sendError: string | null = null;

  try {
    if (provider === 'SES') {
      sendResult = await sendViaSES({
        to: contact.email,
        subject: personalized.subject,
        body: finalBodyHtml,
        unsubscribeUrl,
      });
    } else {
      sendResult = await sendViaGmail({
        accessToken: googleOAuthToken,
        refreshToken: googleRefreshToken,
        to: contact.email,
        subject: personalized.subject,
        body: finalBodyHtml,
        unsubscribeUrl,
      });
    }
  } catch (err: any) {
    sendError = err?.message || 'Send error';
    sendResult = { messageId: '' };
  }

  // 5. Log Result and Update Database
  if (sendError) {
    await updateContactAndLogStatus(contactId, campaignId, 'FAILED', sendError, trackingToken);
  } else {
    await updateContactAndLogStatus(contactId, campaignId, 'SENT', null, trackingToken);
  }

  // Check if all campaign contacts finished
  await checkAndUpdateCampaignCompletion(campaignId);
}

export function wrapLinksForTracking(bodyTextOrHtml: string, trackingToken: string): string {
  // Convert newlines to HTML if raw text
  let html = bodyTextOrHtml.includes('<p>') || bodyTextOrHtml.includes('<br')
    ? bodyTextOrHtml
    : bodyTextOrHtml.replace(/\n/g, '<br/>');

  // Replace standard URLs with click tracking redirect
  const urlRegex = /(href=["'])(https?:\/\/[^"'\s]+)(["'])/gi;
  html = html.replace(urlRegex, (match, prefix, url, suffix) => {
    if (url.includes('/api/unsubscribe') || url.includes('/api/track/')) return match;
    const trackingUrl = `${config.appUrl}/api/track/click/${trackingToken}?url=${encodeURIComponent(url)}`;
    return `${prefix}${trackingUrl}${suffix}`;
  });

  return html;
}

async function updateContactAndLogStatus(
  contactId: string,
  campaignId: string,
  status: 'SENT' | 'FAILED' | 'UNSUBSCRIBED',
  errorMessage: string | null,
  trackingToken?: string
) {
  const isSuccess = status === 'SENT';

  if (isPrismaConnected) {
    try {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: status as any },
      });

      await prisma.sendLog.create({
        data: {
          contactId,
          campaignId,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          sentAt: isSuccess ? new Date() : null,
          errorMessage,
          trackingToken: trackingToken || `tr_${contactId}_${Date.now()}`,
        },
      });
      return;
    } catch (err) {
      // Fallback below
    }
  }

  // In-memory update
    const contacts = inMemoryStore.contacts.get(campaignId) || [];
    const target = contacts.find((c: any) => c.id === contactId);
    if (target) {
      target.status = status;
    }

    const logs = inMemoryStore.sendLogs.get(campaignId) || [];
    logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      contactId,
      campaignId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      sentAt: isSuccess ? new Date() : null,
      errorMessage,
      trackingToken: trackingToken || `tr_${contactId}_${Date.now()}`,
      openedAt: null,
      clickedAt: null,
    });
    inMemoryStore.sendLogs.set(campaignId, logs);
}

async function checkAndUpdateCampaignCompletion(campaignId: string) {
  if (isPrismaConnected) {
    try {
      const pendingCount = await prisma.contact.count({
        where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } },
      });

      if (pendingCount === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED' },
        });
      }
      return;
    } catch (err) {
      // Fallback
    }
  }

  const contacts = inMemoryStore.contacts.get(campaignId) || [];
  const pending = contacts.filter((c: any) => c.status === 'PENDING' || c.status === 'QUEUED');
  if (pending.length === 0) {
    const camp = inMemoryStore.campaigns.get(campaignId);
    if (camp) camp.status = 'COMPLETED';
  }
}

// BullMQ Worker Setup if Redis is active
if (redisConnection) {
  try {
    new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        await processSingleEmailSend(job.data);
      },
      { connection: redisConnection, concurrency: 5 }
    );
  } catch (e) {
    // Worker fallback
  }
}

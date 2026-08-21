import { Router } from 'express';
import { prisma, inMemoryStore, isPrismaConnected } from '../db.js';
import { addEmailJobToQueue } from '../services/queue.js';

const router = Router();

// Calculate deliverability quota & rate limit recommendation
router.post('/estimate-schedule', async (req, res) => {
  const { totalContacts, provider = 'GMAIL', workspaceType = 'GMAIL_PERSONAL' } = req.body;

  const count = parseInt(totalContacts, 10) || 0;
  const maxDailyGmail = workspaceType === 'GMAIL_WORKSPACE' ? 2000 : 500;
  const safeHourlyRate = provider === 'SES' ? 1000 : 80;

  const totalHoursNeeded = Math.ceil(count / safeHourlyRate);
  const daysNeeded = Math.ceil(count / maxDailyGmail);

  const exceedsDailyLimit = provider === 'GMAIL' && count > maxDailyGmail;
  const requiresMultiDaySchedule = daysNeeded > 1;

  return res.json({
    totalContacts: count,
    provider,
    workspaceType,
    maxDailyGmail,
    safeHourlyRate,
    estimatedDurationHours: totalHoursNeeded,
    estimatedDays: daysNeeded,
    exceedsDailyLimit,
    requiresMultiDaySchedule,
    recommendation: exceedsDailyLimit
      ? `Your list of ${count} contacts exceeds your Gmail daily limit (${maxDailyGmail}/day). We recommend auto-spreading sends across ${daysNeeded} days, or switching to AWS SES.`
      : `Your campaign will finish safely in ~${totalHoursNeeded} hour(s) at ${safeHourlyRate} emails/hr via ${provider}.`,
  });
});

// Launch sending pipeline
router.post('/launch', async (req, res) => {
  const { campaignId, provider = 'GMAIL', rateLimitPerHour = 80, autoSpreadDays = 1, userId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID is required.' });
  }

  const targetUserId = userId || 'usr_demo_123';

  let campaign: any = null;
  let contacts: any[] = [];
  let user: any = null;

  if (isPrismaConnected) {
    try {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { emailDraft: true },
      });
      contacts = await prisma.contact.findMany({
        where: { campaignId, status: 'PENDING' },
      });
      user = await prisma.user.findUnique({ where: { id: targetUserId } });
    } catch (err) {
      // Fallback
    }
  }

  if (!campaign || contacts.length === 0) {
    campaign = inMemoryStore.campaigns.get(campaignId);
    if (campaign) campaign.emailDraft = inMemoryStore.drafts.get(campaignId);
    contacts = (inMemoryStore.contacts.get(campaignId) || []).filter((c: any) => c.status === 'PENDING');
    user = inMemoryStore.users.get(targetUserId);
  }

  if (!campaign || !campaign.emailDraft) {
    return res.status(400).json({ error: 'Campaign or Email Draft missing.' });
  }

  if (contacts.length === 0) {
    return res.status(400).json({ error: 'No pending contacts found to send.' });
  }

  // Update campaign status to SENDING
  if (isPrismaConnected) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENDING',
          provider: provider as any,
          rateLimitPerHour: parseInt(rateLimitPerHour, 10) || 80,
        },
      });
    } catch (err) {
      // Fallback
    }
  }

  if (campaign) {
    campaign.status = 'SENDING';
    campaign.provider = provider;
    campaign.rateLimitPerHour = rateLimitPerHour;
  }

  // Calculate stagger delay per contact (in milliseconds)
  const msBetweenSends = Math.floor((3600 * 1000) / (rateLimitPerHour || 80));

  contacts.forEach((contact, idx) => {
    // If multi-day spread is requested, distribute extra offset
    const dayIndex = Math.floor(idx / Math.ceil(contacts.length / autoSpreadDays));
    const delayMs = (dayIndex * 24 * 3600 * 1000) + (idx * msBetweenSends);

    addEmailJobToQueue(
      {
        campaignId,
        contactId: contact.id,
        userId: targetUserId,
        provider: provider as 'GMAIL' | 'SES',
        googleOAuthToken: user?.googleOAuthToken || undefined,
        googleRefreshToken: user?.googleRefreshToken || undefined,
      },
      delayMs
    );
  });

  return res.json({
    success: true,
    message: `Campaign sending pipeline started for ${contacts.length} recipients at ${rateLimitPerHour} emails/hr.`,
    queuedCount: contacts.length,
    estimatedCompletionHours: Math.ceil(contacts.length / rateLimitPerHour),
  });
});

export default router;

import { Router } from 'express';
import { prisma, inMemoryStore, isPrismaConnected } from '../db.js';

const router = Router();

// List all campaigns for a user
router.get('/', async (req, res) => {
  const userId = (req.query.userId as string) || 'usr_demo_123';

  let campaignsList: any[] = [];
  if (isPrismaConnected) {
    try {
      const list = await prisma.campaign.findMany({
        where: { userId },
        include: {
          _count: {
            select: { contacts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      campaignsList = list.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        provider: c.provider,
        rateLimitPerHour: c.rateLimitPerHour,
        totalContacts: c._count.contacts,
        createdAt: c.createdAt,
      }));
    } catch (err) {
      // Fallback
    }
  }

  if (campaignsList.length === 0) {
    const memList = Array.from(inMemoryStore.campaigns.values()).filter(c => c.userId === userId);
    campaignsList = memList.map(c => {
      const contacts = inMemoryStore.contacts.get(c.id) || [];
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        provider: c.provider || 'GMAIL',
        rateLimitPerHour: c.rateLimitPerHour || 80,
        totalContacts: contacts.length,
        createdAt: c.createdAt,
      };
    });
  }

  return res.json(campaignsList);
});

// Get campaign detail by ID with real-time counters and filterable contacts
router.get('/:id', async (req, res) => {
  const campaignId = req.params.id;
  const { search, statusFilter } = req.query;

  let campaign: any = null;
  let contacts: any[] = [];
  let draft: any = null;
  let sendLogs: any[] = [];

  if (isPrismaConnected) {
    try {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { emailDraft: true },
      });
      draft = campaign?.emailDraft;

      const whereClause: any = { campaignId };
      if (statusFilter && statusFilter !== 'ALL') {
        whereClause.status = statusFilter;
      }
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ];
      }

      contacts = await prisma.contact.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
      });

      sendLogs = await prisma.sendLog.findMany({
        where: campaignId ? { campaignId } : {},
      });
    } catch (err) {
      // Fallback
    }
  }

  if (!campaign) {
    campaign = inMemoryStore.campaigns.get(campaignId);
    draft = inMemoryStore.drafts.get(campaignId);
    let allContacts = inMemoryStore.contacts.get(campaignId) || [];

    if (statusFilter && statusFilter !== 'ALL') {
      allContacts = allContacts.filter(c => c.status === statusFilter);
    }
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      allContacts = allContacts.filter(
        c =>
          c.email.toLowerCase().includes(s) ||
          (c.name && c.name.toLowerCase().includes(s)) ||
          (c.company && c.company.toLowerCase().includes(s))
      );
    }
    contacts = allContacts;
    sendLogs = inMemoryStore.sendLogs.get(campaignId) || [];
  }

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  // Calculate real-time stats
  const total = contacts.length;
  const sentCount = sendLogs.filter(l => l.status === 'SUCCESS').length;
  const failedCount = sendLogs.filter(l => l.status === 'FAILED').length;
  const pendingCount = contacts.filter(c => c.status === 'PENDING' || c.status === 'QUEUED').length;
  const openedCount = sendLogs.filter(l => l.openedAt !== null).length;
  const clickedCount = sendLogs.filter(l => l.clickedAt !== null).length;
  const unsubscribedCount = contacts.filter(c => c.status === 'UNSUBSCRIBED').length;

  return res.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      provider: campaign.provider,
      rateLimitPerHour: campaign.rateLimitPerHour,
      createdAt: campaign.createdAt,
    },
    draft,
    stats: {
      total,
      sent: sentCount,
      pending: pendingCount,
      failed: failedCount,
      opened: openedCount,
      clicked: clickedCount,
      unsubscribed: unsubscribedCount,
    },
    contacts,
  });
});

// Pause, Resume, or Cancel campaign
router.post('/:id/status', async (req, res) => {
  const campaignId = req.params.id;
  const { status } = req.body; // PAUSED, SENDING, CANCELLED

  if (!['PAUSED', 'SENDING', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid campaign status action.' });
  }

  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: status as any },
    });
  } catch (err) {
    const camp = inMemoryStore.campaigns.get(campaignId);
    if (camp) camp.status = status;
  }

  return res.json({ success: true, campaignId, status });
});

export default router;

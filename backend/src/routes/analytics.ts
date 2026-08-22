import { Router } from 'express';
import Papa from 'papaparse';
import { prisma, isPrismaConnected } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CampaignStats, ContactSendLogDetail, CampaignDetailAnalytics } from '@mailpersonalize/shared';
import { memoryCampaignStore } from './campaigns.js';
import { memoryContactStore } from './contacts.js';
import { memorySendLogStore } from '../services/queue.js';

const router = Router();

// 1. Get Campaign Analytics & Contact Send Logs: GET /api/campaigns/:id/analytics
router.get('/:id/analytics', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  const statusFilter = ((req.query.status as string) || '').trim().toLowerCase();

  let campaign: any = null;
  let stats: CampaignStats = {
    totalContacts: 0,
    sentCount: 0,
    openedCount: 0,
    clickedCount: 0,
    failedCount: 0,
    unsubscribedCount: 0,
    openRate: 0,
    clickRate: 0,
  };
  let logs: ContactSendLogDetail[] = [];
  let totalLogs = 0;

  if (isPrismaConnected) {
    try {
      campaign = await prisma.campaign.findUnique({
        where: { id },
        include: { sending_account: true },
      });

      if (campaign) {
        const totalContacts = await prisma.contact.count({ where: { campaign_id: id } });
        const sentCount = await prisma.sendLog.count({ where: { campaign_id: id, status: { not: 'failed' } } });
        const openedCount = await prisma.sendLog.count({
          where: {
            campaign_id: id,
            OR: [
              { opened_at: { not: null } },
              { clicked_at: { not: null } },
              { status: 'opened' },
              { status: 'clicked' },
            ],
          },
        });
        const clickedCount = await prisma.sendLog.count({
          where: {
            campaign_id: id,
            OR: [
              { clicked_at: { not: null } },
              { status: 'clicked' },
            ],
          },
        });
        const failedCount = await prisma.sendLog.count({ where: { campaign_id: id, status: 'failed' } });
        const unsubscribedCount = await prisma.sendLog.count({
          where: {
            campaign_id: id,
            OR: [
              { status: 'unsubscribed' },
              { status: 'suppressed' },
            ],
          },
        });

        const openRate = sentCount > 0 ? parseFloat(((openedCount / sentCount) * 100).toFixed(1)) : 0;
        const clickRate = sentCount > 0 ? parseFloat(((clickedCount / sentCount) * 100).toFixed(1)) : 0;

        stats = {
          totalContacts,
          sentCount,
          openedCount,
          clickedCount,
          failedCount,
          unsubscribedCount,
          openRate,
          clickRate,
        };

        const rawLogs = await prisma.sendLog.findMany({
          where: { campaign_id: id },
          include: { contact: true },
          orderBy: { created_at: 'desc' },
        });

        const filtered = rawLogs.filter((l) => {
          const customFields = (l.contact.custom_fields as any) || {};
          const matchSearch =
            !search ||
            l.contact.email.toLowerCase().includes(search) ||
            String(customFields.name || customFields['full name'] || '').toLowerCase().includes(search);
          const matchStatus = !statusFilter || l.status.toLowerCase() === statusFilter;
          return matchSearch && matchStatus;
        });

        totalLogs = filtered.length;
        const startIndex = (page - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        logs = paginated.map((l) => {
          const customFields = (l.contact.custom_fields as any) || {};
          const openTime = l.opened_at || l.clicked_at;
          return {
            id: l.id,
            contactId: l.contact_id,
            email: l.contact.email,
            name: customFields.name || customFields['full name'] || null,
            company: customFields.company || null,
            role: customFields.role || null,
            status: l.status as any,
            providerUsed: l.provider_used,
            renderedSubject: l.rendered_subject || null,
            renderedBody: l.rendered_body || null,
            sentAt: l.sent_at ? l.sent_at.toISOString() : null,
            openedAt: openTime ? openTime.toISOString() : null,
            clickedAt: l.clicked_at ? l.clicked_at.toISOString() : null,
            errorMessage: l.error_message || null,
          };
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  // Memory fallback reading actual uploaded contacts and send logs
  if (!campaign) {
    campaign = memoryCampaignStore.get(id) || {
      id,
      name: 'Outbound CSV Campaign',
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    const memContacts = memoryContactStore.get(id) || [];
    const memLogs = memorySendLogStore.get(id) || [];

    if (memLogs.length > 0) {
      logs = memLogs.map((l, idx) => {
        const matchedContact = memContacts.find((c) => c.id === l.contactId || c.id === l.contact_id) || memContacts[idx] || {};
        const customFields = matchedContact.custom_fields || {};
        const openTime = l.openedAt || l.opened_at || l.clickedAt || l.clicked_at;
        return {
          id: l.id || `lg_${idx + 1}`,
          contactId: l.contactId || l.contact_id || matchedContact.id,
          email: matchedContact.email || l.contactId || 'recipient@domain.com',
          name: customFields.name || customFields['full name'] || null,
          company: customFields.company || null,
          role: customFields.role || null,
          status: l.status || 'sent',
          providerUsed: l.providerUsed || l.provider_used || 'smtp_app_password',
          renderedSubject: l.renderedSubject || l.rendered_subject || null,
          renderedBody: l.renderedBody || l.rendered_body || null,
          sentAt: l.sentAt || l.sent_at || (l.status === 'sent' ? new Date().toISOString() : null),
          openedAt: openTime || null,
          clickedAt: l.clickedAt || l.clicked_at || null,
          errorMessage: l.errorMessage || l.error_message || null,
        };
      });
    } else if (memContacts.length > 0) {
      logs = memContacts.map((c, idx) => ({
        id: c.id || `cnt_${idx + 1}`,
        email: c.email,
        name: c.custom_fields?.name || c.custom_fields?.['full name'] || null,
        company: c.custom_fields?.company || null,
        role: c.custom_fields?.role || null,
        status: 'pending' as any,
        providerUsed: 'smtp_app_password',
        sentAt: null,
        openedAt: null,
        clickedAt: null,
        errorMessage: null,
      }));
    }

    const totalContacts = memContacts.length || logs.length;
    const sentCount = logs.filter((l) => l.status === 'sent').length;
    const openedCount = logs.filter((l) => l.openedAt || (l as any).opened_at || l.clickedAt || (l as any).clicked_at).length;
    const clickedCount = logs.filter((l) => l.clickedAt || (l as any).clicked_at).length;
    const failedCount = logs.filter((l) => l.status === 'failed').length;
    const unsubscribedCount = logs.filter((l) => l.status === 'suppressed').length;

    stats = {
      totalContacts,
      sentCount,
      openedCount,
      clickedCount,
      failedCount,
      unsubscribedCount,
      openRate: sentCount > 0 ? parseFloat(((openedCount / sentCount) * 100).toFixed(1)) : 0,
      clickRate: sentCount > 0 ? parseFloat(((clickedCount / sentCount) * 100).toFixed(1)) : 0,
    };
    totalLogs = logs.length;
  }

  const response: CampaignDetailAnalytics = {
    campaign,
    stats,
    logs,
    totalLogs,
    page,
    pageSize,
  };

  return res.json({
    success: true,
    data: response,
  });
});

// 2. Export Campaign Send Report as CSV: GET /api/analytics/:id/export-csv
router.get('/:id/export-csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  let rawLogs: any[] = [];
  let campaignName = 'Campaign_Report';

  if (isPrismaConnected) {
    try {
      const cmp = await prisma.campaign.findUnique({ where: { id } });
      if (cmp) campaignName = cmp.name.replace(/[^a-zA-Z0-9_-]/g, '_');

      rawLogs = await prisma.sendLog.findMany({
        where: { campaign_id: id },
        include: { contact: true },
        orderBy: { created_at: 'desc' },
      });
    } catch (e) {
      // Fallback
    }
  }

  if (rawLogs.length === 0) {
    const memCmp = memoryCampaignStore.get(id);
    if (memCmp) campaignName = memCmp.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    const memContacts = memoryContactStore.get(id) || [];
    const memLogs = memorySendLogStore.get(id) || [];

    rawLogs = memLogs.map((l, idx) => {
      const c = memContacts.find((mc) => mc.id === l.contactId) || memContacts[idx] || {};
      return {
        contact: {
          email: c.email || 'recipient@domain.com',
          custom_fields: c.custom_fields || {},
        },
        status: l.status || 'sent',
        provider_used: l.providerUsed || 'smtp_app_password',
        sent_at: l.sentAt || l.sent_at || new Date().toISOString(),
        opened_at: l.openedAt || l.opened_at || null,
        clicked_at: l.clickedAt || l.clicked_at || null,
        error_message: l.errorMessage || l.error_message || null,
      };
    });
  }

  const exportRows = rawLogs.map((l) => {
    const custom = l.contact?.custom_fields || {};
    return {
      Email: l.contact?.email || '',
      Name: custom.name || custom['full name'] || '',
      Company: custom.company || '',
      Role: custom.role || '',
      Status: l.status || 'pending',
      'Provider Used': l.provider_used || '',
      'Sent At': l.sent_at ? new Date(l.sent_at).toLocaleString() : '',
      'Opened At': l.opened_at ? new Date(l.opened_at).toLocaleString() : 'Unopened',
      'Clicked At': l.clicked_at ? new Date(l.clicked_at).toLocaleString() : 'No Click',
      'Error Notes': l.error_message || '',
    };
  });

  const csvString = Papa.unparse(exportRows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${campaignName}_SendReport.csv"`);
  return res.status(200).send(csvString);
});

// 3. Get Rendered Sent Email Content for Specific Contact Log: GET /api/campaigns/:id/contact-log/:contactId
router.get('/:id/contact-log/:contactId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, contactId } = req.params;
  let log: any = null;

  if (isPrismaConnected) {
    try {
      log = await prisma.sendLog.findFirst({
        where: {
          campaign_id: id,
          OR: [{ contact_id: contactId }, { id: contactId }],
        },
        include: { contact: true },
      });
    } catch (e) {}
  }

  if (!log) {
    const memLogs = memorySendLogStore.get(id) || [];
    log = memLogs.find((l) => l.contact_id === contactId || l.id === contactId || l.contactId === contactId);
  }

  if (!log) {
    return res.status(404).json({ success: false, error: 'Sent email content log not found for this contact.' });
  }

  return res.json({
    success: true,
    log: {
      id: log.id,
      contactId: log.contact_id || log.contactId,
      renderedSubject: log.rendered_subject || log.renderedSubject || 'No rendered subject saved',
      renderedBody: log.rendered_body || log.renderedBody || 'No rendered body saved',
      status: log.status,
      sentAt: log.sent_at || log.sentAt,
      providerUsed: log.provider_used || log.providerUsed,
    },
  });
});

export default router;

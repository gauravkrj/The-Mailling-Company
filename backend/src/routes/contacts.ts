import { Router } from 'express';
import Papa from 'papaparse';
import multer from 'multer';
import { prisma, isPrismaConnected } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { CSVPreviewResult, CSVRowPreview } from '@mailpersonalize/shared';
import { syncContactsToDirectory, memoryContactDirectoryStore } from '../services/directorySync.js';
import { memoryCampaignStore } from './campaigns.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const memoryContactStore = new Map<string, any[]>();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function verifyCampaignOwner(campaignId: string, userId: string): Promise<boolean> {
  if (isPrismaConnected) {
    try {
      const cmp = await prisma.campaign.findFirst({
        where: { id: campaignId, user_id: userId },
      });
      if (cmp) return true;
    } catch (e) {}
  }
  const memCmp = memoryCampaignStore.get(campaignId);
  if (memCmp && memCmp.user_id === userId) {
    return true;
  }
  return false;
}

// Helper to parse CSV string content and extract header mappings & previews
function parseCSVString(csvContent: string): CSVPreviewResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields || [];

  let suggestedEmailHeader = headers.find((h) => /email|e-mail|mail/i.test(h));
  let suggestedNameHeader = headers.find((h) => /name|full_name|first_name|contact/i.test(h));
  let suggestedCompanyHeader = headers.find((h) => /company|organization|business|org/i.test(h));
  let suggestedRoleHeader = headers.find((h) => /role|title|position|job/i.test(h));

  const seenEmails = new Set<string>();
  const contacts: CSVRowPreview[] = [];

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  parsed.data.forEach((row, idx) => {
    const rawEmail = suggestedEmailHeader ? (row[suggestedEmailHeader] || '').trim() : (row.email || Object.values(row)[0] || '').trim();
    const rawName = suggestedNameHeader ? (row[suggestedNameHeader] || '').trim() : '';

    const isValidEmail = Boolean(rawEmail && EMAIL_REGEX.test(rawEmail));
    const normalizedEmail = rawEmail.toLowerCase();
    const isDuplicate = seenEmails.has(normalizedEmail);

    if (isValidEmail && !isDuplicate) {
      seenEmails.add(normalizedEmail);
      validCount++;
    } else if (isDuplicate) {
      duplicateCount++;
    } else {
      invalidCount++;
    }

    contacts.push({
      rowIndex: idx + 1,
      email: rawEmail,
      name: rawName,
      data: row,
      isValidEmail,
      isDuplicate,
    });
  });

  return {
    headers,
    suggestedMapping: {
      email: suggestedEmailHeader,
      name: suggestedNameHeader,
      company: suggestedCompanyHeader,
      role: suggestedRoleHeader,
    },
    totalRows: parsed.data.length,
    validCount,
    invalidCount,
    duplicateCount,
    previewRows: contacts.slice(0, 5),
    contacts,
  };
}

// 1. Upload & Parse CSV File Endpoint: POST /api/contacts/:campaignId/upload-csv
router.post('/:campaignId/upload-csv', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  const { campaignId } = req.params;
  const isOwner = await verifyCampaignOwner(campaignId, req.user!.id);
  if (!isOwner) {
    return res.status(403).json({ success: false, error: 'Forbidden: Campaign ownership access denied.' });
  }

  let csvContent = '';

  if (req.file) {
    csvContent = req.file.buffer.toString('utf-8');
  } else if (req.body?.csvContent || req.body?.csvText) {
    csvContent = req.body.csvContent || req.body.csvText;
  }

  if (!csvContent || !csvContent.trim()) {
    return res.status(400).json({ success: false, error: 'CSV file or file content string is required.' });
  }

  try {
    const preview = parseCSVString(csvContent);
    return res.json({
      success: true,
      preview,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: 'Failed to parse CSV file format.' });
  }
});

// 2. Save Column Mapping Endpoint: POST /api/contacts/:campaignId/save-mapping
router.post('/:campaignId/save-mapping', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { campaignId } = req.params;
  const isOwner = await verifyCampaignOwner(campaignId, req.user!.id);
  if (!isOwner) {
    return res.status(403).json({ success: false, error: 'Forbidden: Campaign ownership access denied.' });
  }

  const { mapping, contacts, rawRows } = req.body;

  if (!mapping || !mapping.email) {
    return res.status(400).json({ success: false, error: 'Email column mapping is required.' });
  }

  const rowsToProcess = Array.isArray(contacts) && contacts.length > 0 ? contacts : (Array.isArray(rawRows) ? rawRows : []);
  const emailCol = mapping.email;
  const nameCol = mapping.name;
  const companyCol = mapping.company;
  const roleCol = mapping.role;

  const validRecordsToSave: any[] = [];
  const seenEmails = new Set<string>();
  let importedCount = 0;
  let skippedCount = 0;

  rowsToProcess.forEach((item: any, idx: number) => {
    const rowData = item.data || item.customFields || item;
    const rawEmail = item.email || (rowData ? rowData[emailCol] : '') || '';
    const email = String(rawEmail).trim().toLowerCase();

    const isValidEmail = Boolean(email && EMAIL_REGEX.test(email));
    const isDuplicate = seenEmails.has(email);

    if (isValidEmail && !isDuplicate) {
      seenEmails.add(email);
      const fullNameVal = String(rowData[mapping.full_name || mapping.name] || item.full_name || item.name || '').trim();
      const companyVal = String(rowData[mapping.company] || item.company || '').trim();
      const roleVal = String(rowData[mapping.role] || item.role || '').trim();
      const attr1Val = String((mapping.attribute_1 && rowData[mapping.attribute_1]) || item.attribute_1 || rowData.attribute_1 || '').trim();
      const attr2Val = String((mapping.attribute_2 && rowData[mapping.attribute_2]) || item.attribute_2 || rowData.attribute_2 || '').trim();
      const attr3Val = String((mapping.attribute_3 && rowData[mapping.attribute_3]) || item.attribute_3 || rowData.attribute_3 || '').trim();
      const attr4Val = String((mapping.attribute_4 && rowData[mapping.attribute_4]) || item.attribute_4 || rowData.attribute_4 || '').trim();
      const attr5Val = String((mapping.attribute_5 && rowData[mapping.attribute_5]) || item.attribute_5 || rowData.attribute_5 || '').trim();

      const customFields: Record<string, any> = {
        email: email,
        full_name: fullNameVal,
        name: fullNameVal,
        company: companyVal,
        role: roleVal,
        attribute_1: attr1Val,
        attribute_2: attr2Val,
        attribute_3: attr3Val,
        attribute_4: attr4Val,
        attribute_5: attr5Val,
        attribute_labels: mapping.attribute_labels || {},
      };

      validRecordsToSave.push({
        id: `cnt_${campaignId}_${idx + 1}_${Date.now()}`,
        campaign_id: campaignId,
        email: email,
        custom_fields: customFields,
        status: 'pending',
      });
      importedCount++;
    } else {
      skippedCount++;
    }
  });

  if (isPrismaConnected && validRecordsToSave.length > 0) {
    try {
      await prisma.contact.createMany({
        data: validRecordsToSave,
        skipDuplicates: true,
      });
    } catch (e) {}
  }

  memoryContactStore.set(campaignId, validRecordsToSave);

  // Auto-sync into master ContactDirectory as a side-effect (Phase 13A)
  if (req.user?.id && validRecordsToSave.length > 0) {
    syncContactsToDirectory(
      req.user.id,
      campaignId,
      validRecordsToSave.map((rec) => ({
        email: rec.email,
        custom_fields: rec.custom_fields,
      }))
    ).catch((syncErr) => console.warn('ContactDirectory sync notice:', syncErr));
  }

  return res.json({
    success: true,
    importedCount,
    skippedCount,
    message: `${importedCount} contacts imported from uploaded file, ${skippedCount} skipped (invalid/duplicate).`,
  });
});

// 3. Alternate Parse Endpoint: POST /api/contacts/parse
router.post('/parse', requireAuth, async (req: AuthenticatedRequest, res) => {
  let csvContent = req.body?.csvContent || req.body?.csvText;
  if (!csvContent && typeof req.body === 'string') {
    csvContent = req.body;
  }

  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ success: false, error: 'CSV file content string is required.' });
  }

  try {
    const data = parseCSVString(csvContent);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: 'Failed to parse CSV file.' });
  }
});

// 4. Alternate Import Endpoint: POST /api/contacts/import
router.post('/import', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { campaignId, mappedContacts, csvText, columnMapping } = req.body;

  if (!campaignId) {
    return res.status(400).json({ success: false, error: 'Campaign ID is required.' });
  }

  let finalContacts: any[] = [];

  if (Array.isArray(mappedContacts)) {
    finalContacts = mappedContacts;
  } else if (csvText && columnMapping && columnMapping.email) {
    const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    const emailHeader = columnMapping.email;
    const nameHeader = columnMapping.name;
    const companyHeader = columnMapping.company;
    const roleHeader = columnMapping.role;

    parsed.data.forEach((row) => {
      const email = (row[emailHeader] || '').trim();
      const name = nameHeader ? (row[nameHeader] || '').trim() : null;
      const company = companyHeader ? (row[companyHeader] || '').trim() : null;
      const role = roleHeader ? (row[roleHeader] || '').trim() : null;

      if (email) {
        finalContacts.push({ email, name, company, role, customFields: row });
      }
    });
  } else {
    return res.status(400).json({ success: false, error: 'Valid mapped contacts or csvText with columnMapping required.' });
  }

  let importedCount = 0;
  let skippedCount = 0;
  const validRecordsToSave: any[] = [];
  const seenEmails = new Set<string>();

  for (const item of finalContacts) {
    const email = (item.email || '').trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email) || seenEmails.has(email)) {
      skippedCount++;
      continue;
    }

    seenEmails.add(email);

    validRecordsToSave.push({
      campaign_id: campaignId,
      email,
      custom_fields: {
        name: item.name || null,
        company: item.company || null,
        role: item.role || null,
        ...(item.customFields || {}),
      },
      status: 'pending',
    });

    importedCount++;
  }

  if (isPrismaConnected && validRecordsToSave.length > 0) {
    try {
      await prisma.contact.createMany({
        data: validRecordsToSave,
        skipDuplicates: true,
      });
    } catch (err) {}
  }

  memoryContactStore.set(campaignId, validRecordsToSave);

  // Auto-sync into master ContactDirectory as a side-effect (Phase 13A)
  if (req.user?.id && validRecordsToSave.length > 0) {
    syncContactsToDirectory(
      req.user.id,
      campaignId,
      validRecordsToSave.map((rec) => ({
        email: rec.email,
        custom_fields: rec.custom_fields,
      }))
    ).catch((syncErr) => console.warn('ContactDirectory sync notice:', syncErr));
  }

  return res.json({
    success: true,
    importedCount,
    skippedCount,
    message: `${importedCount} contacts imported, ${skippedCount} skipped (invalid/duplicate).`,
  });
});

// 5. Query Master ContactDirectory Endpoint (Supports search & status filter)
router.get('/directory', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const statusFilter = (req.query.status as string || 'all').toLowerCase();
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();

  let directory: any[] = [];

  if (isPrismaConnected) {
    try {
      const whereClause: any = { user_id: userId };
      if (statusFilter !== 'all') {
        whereClause.status = statusFilter;
      }
      if (searchQuery) {
        whereClause.OR = [
          { email: { contains: searchQuery, mode: 'insensitive' } },
          { full_name: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }

      directory = await prisma.contactDirectory.findMany({
        where: whereClause,
        orderBy: { last_updated_at: 'desc' },
      });
    } catch (e) {}
  }

  if (directory.length === 0 && memoryContactDirectoryStore.size > 0) {
    directory = Array.from(memoryContactDirectoryStore.values()).filter((entry) => {
      if (entry.user_id !== userId) return false;
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (searchQuery) {
        const matchesEmail = entry.email?.toLowerCase().includes(searchQuery);
        const matchesName = entry.full_name?.toLowerCase().includes(searchQuery);
        const matchesCustom = JSON.stringify(entry.custom_fields || {}).toLowerCase().includes(searchQuery);
        return matchesEmail || matchesName || matchesCustom;
      }
      return true;
    });
  }

  return res.json({
    success: true,
    count: directory.length,
    directory,
  });
});

// 6. Export Directory View as CSV: GET /api/contacts/directory/export-csv
router.get('/directory/export-csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const statusFilter = (req.query.status as string || 'all').toLowerCase();
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();

  let directory: any[] = [];

  if (isPrismaConnected) {
    try {
      const whereClause: any = { user_id: userId };
      if (statusFilter !== 'all') whereClause.status = statusFilter;
      if (searchQuery) {
        whereClause.OR = [
          { email: { contains: searchQuery, mode: 'insensitive' } },
          { full_name: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }
      directory = await prisma.contactDirectory.findMany({
        where: whereClause,
        orderBy: { last_updated_at: 'desc' },
      });
    } catch (e) {}
  }

  if (directory.length === 0 && memoryContactDirectoryStore.size > 0) {
    directory = Array.from(memoryContactDirectoryStore.values()).filter((entry) => {
      if (entry.user_id !== userId) return false;
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (searchQuery) {
        const matchesEmail = entry.email?.toLowerCase().includes(searchQuery);
        const matchesName = entry.full_name?.toLowerCase().includes(searchQuery);
        return matchesEmail || matchesName;
      }
      return true;
    });
  }

  // Collect all unique custom field keys
  const customFieldKeys = new Set<string>();
  directory.forEach((item) => {
    const fields = typeof item.custom_fields === 'object' && item.custom_fields ? item.custom_fields : {};
    Object.keys(fields).forEach((k) => {
      if (!['email', 'name', 'full_name'].includes(k.toLowerCase())) {
        customFieldKeys.add(k);
      }
    });
  });

  const extraKeys = Array.from(customFieldKeys);
  const headers = ['Email', 'Full Name', 'Status', 'Campaigns Count', 'First Added', 'Last Updated', ...extraKeys];

  const rows = directory.map((item) => {
    const fields = typeof item.custom_fields === 'object' && item.custom_fields ? item.custom_fields : {};
    const extraVals = extraKeys.map((k) => `"${String(fields[k] || '').replace(/"/g, '""')}"`);
    return [
      `"${item.email}"`,
      `"${item.full_name || ''}"`,
      `"${item.status}"`,
      item.campaigns_count || 1,
      `"${item.first_seen_at ? new Date(item.first_seen_at).toISOString().split('T')[0] : ''}"`,
      `"${item.last_updated_at ? new Date(item.last_updated_at).toISOString().split('T')[0] : ''}"`,
      ...extraVals,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="contact_directory_${Date.now()}.csv"`);
  return res.send(csvContent);
});

// 7. Get Contact Details with Joined Send History: GET /api/contacts/directory/:id
router.get('/directory/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  let contact: any = null;
  let sendHistory: any[] = [];

  if (isPrismaConnected) {
    try {
      contact = await prisma.contactDirectory.findFirst({
        where: { id, user_id: userId },
      });
      if (contact) {
        sendHistory = await prisma.sendLog.findMany({
          where: {
            contact: { email: contact.email },
            campaign: { user_id: userId },
          },
          include: {
            campaign: { select: { name: true } },
          },
          orderBy: { created_at: 'desc' },
        });
      }
    } catch (e) {}
  }

  if (!contact && memoryContactDirectoryStore.size > 0) {
    contact = Array.from(memoryContactDirectoryStore.values()).find(
      (entry) => (entry.id === id || entry.email.toLowerCase() === id.toLowerCase()) && entry.user_id === userId
    );
  }

  if (!contact) {
    return res.status(404).json({ success: false, error: 'Contact directory entry not found.' });
  }

  return res.json({
    success: true,
    contact,
    sendHistory,
  });
});

// 8. Manually Suppress Single or Bulk Contacts: POST /api/contacts/directory/suppress
router.post('/directory/suppress', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { ids, emails, email, reason } = req.body;
  const suppressReason = (reason || 'manual_suppression').trim();

  const targetEmails = new Set<string>();

  if (typeof email === 'string' && email.trim()) {
    targetEmails.add(email.trim().toLowerCase());
  }

  if (Array.isArray(emails)) {
    emails.forEach((e) => e && targetEmails.add(e.trim().toLowerCase()));
  }

  if (Array.isArray(ids) && ids.length > 0) {
    if (isPrismaConnected) {
      try {
        const found = await prisma.contactDirectory.findMany({
          where: { id: { in: ids }, user_id: userId },
          select: { email: true },
        });
        found.forEach((f) => targetEmails.add(f.email.toLowerCase()));
      } catch (e) {}
    }
    memoryContactDirectoryStore.forEach((entry) => {
      if (ids.includes(entry.id) && entry.user_id === userId) {
        targetEmails.add(entry.email.toLowerCase());
      }
    });
  }

  const now = new Date();

  for (const targetEmail of targetEmails) {
    if (isPrismaConnected) {
      try {
        await prisma.contactDirectory.updateMany({
          where: { user_id: userId, email: targetEmail },
          data: { status: 'suppressed', last_updated_at: now },
        });
        await prisma.suppressionList.upsert({
          where: { user_id_email: { user_id: userId, email: targetEmail } },
          update: { reason: suppressReason },
          create: { user_id: userId, email: targetEmail, reason: suppressReason },
        });
      } catch (e) {}
    }

    memoryContactDirectoryStore.forEach((entry) => {
      if (entry.user_id === userId && entry.email.toLowerCase() === targetEmail) {
        entry.status = 'suppressed';
        entry.last_updated_at = now.toISOString();
      }
    });
  }

  return res.json({
    success: true,
    count: targetEmails.size,
    message: `${targetEmails.size} contact(s) marked as suppressed.`,
  });
});

// 9. Manually Delete Single or Bulk Contacts from Directory: POST /api/contacts/directory/delete
router.post('/directory/delete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { ids, emails } = req.body;

  const targetIds: string[] = Array.isArray(ids) ? ids : [];
  const targetEmails: string[] = Array.isArray(emails) ? emails.map((e) => e.trim().toLowerCase()) : [];

  if (targetIds.length === 0 && targetEmails.length === 0) {
    return res.status(400).json({ success: false, error: 'Target IDs or emails required for deletion.' });
  }

  let deletedCount = 0;

  if (isPrismaConnected) {
    try {
      const resDb = await prisma.contactDirectory.deleteMany({
        where: {
          user_id: userId,
          OR: [
            { id: { in: targetIds } },
            { email: { in: targetEmails } },
          ],
        },
      });
      deletedCount += resDb.count;
    } catch (e) {}
  }

  memoryContactDirectoryStore.forEach((entry, key) => {
    if (entry.user_id === userId && (targetIds.includes(entry.id) || targetEmails.includes(entry.email.toLowerCase()))) {
      memoryContactDirectoryStore.delete(key);
      deletedCount++;
    }
  });

  return res.json({
    success: true,
    deletedCount,
    message: `${deletedCount} contact(s) removed from directory. Historical send logs preserved.`,
  });
});

export default router;

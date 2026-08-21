import { Router } from 'express';
import { parseCSVContent, extractGoogleSheetId, getGoogleSheetCsvUrl } from '../services/csv.js';
import { prisma, inMemoryStore, isPrismaConnected } from '../db.js';

const router = Router();

// Parse CSV text or Google Sheets URL
router.post('/parse', async (req, res) => {
  const { csvContent, googleSheetUrl } = req.body;

  let rawCsv = csvContent;

  if (googleSheetUrl && !rawCsv) {
    const sheetId = extractGoogleSheetId(googleSheetUrl);
    if (!sheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL or ID.' });
    }
    const exportUrl = getGoogleSheetCsvUrl(sheetId);
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        return res.status(400).json({ error: 'Failed to fetch public Google Sheet. Make sure the sheet sharing setting is set to "Anyone with the link can view".' });
      }
      rawCsv = await response.text();
    } catch (fetchErr: any) {
      return res.status(400).json({ error: 'Failed to download Google Sheet CSV: ' + fetchErr.message });
    }
  }

  if (!rawCsv || typeof rawCsv !== 'string' || !rawCsv.trim()) {
    return res.status(400).json({ error: 'Please upload a valid CSV file or paste a Google Sheet link.' });
  }

  const result = parseCSVContent(rawCsv);

  // Check for compliance warning heuristic
  const hasRelationshipData = result.headers.some(h => /name|company|role|title/i.test(h));
  const isLargeScrapedListWarning = !hasRelationshipData || result.contacts.length > 500;

  return res.json({
    ...result,
    isLargeScrapedListWarning,
    complianceReminder: isLargeScrapedListWarning
      ? 'Note: High ratio of cold emails without prior contact history or name attributes detected. Ensure compliance with CAN-SPAM, GDPR, and India IT Act 2000.'
      : null,
  });
});

// Import mapped contacts into a Campaign
router.post('/import', async (req, res) => {
  const { campaignName, mappedContacts, userId } = req.body;

  if (!campaignName || !Array.isArray(mappedContacts) || mappedContacts.length === 0) {
    return res.status(400).json({ error: 'Campaign name and non-empty contact list required.' });
  }

  const targetUserId = userId || 'usr_demo_123';
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  let campaign: any;
  if (isPrismaConnected) {
    try {
      campaign = await prisma.campaign.create({
        data: {
          id: campaignId,
          userId: targetUserId,
          name: campaignName,
          status: 'DRAFT',
        },
      });

      const contactsData = mappedContacts.map(c => ({
        id: `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        campaignId,
        email: c.email,
        name: c.name || null,
        company: c.company || null,
        role: c.role || null,
        customFields: c.customFields || {},
        status: 'PENDING' as const,
      }));

      await prisma.contact.createMany({
        data: contactsData,
      });
    } catch (err) {
      // Fallback
    }
  }

  if (!campaign) {
    // In-memory fallback
    campaign = {
      id: campaignId,
      userId: targetUserId,
      name: campaignName,
      status: 'DRAFT',
      createdAt: new Date(),
    };
    inMemoryStore.campaigns.set(campaignId, campaign);

    const contactsData = mappedContacts.map(c => ({
      id: `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      campaignId,
      email: c.email,
      name: c.name || null,
      company: c.company || null,
      role: c.role || null,
      customFields: c.customFields || {},
      status: 'PENDING',
      createdAt: new Date(),
    }));
    inMemoryStore.contacts.set(campaignId, contactsData);
  }

  return res.json({
    success: true,
    campaignId,
    importedCount: mappedContacts.length,
  });
});

export default router;

import { Router } from 'express';
import { generateEmailDraft, personalizeEmailForContact } from '../services/llm.js';
import { prisma, inMemoryStore, isPrismaConnected } from '../db.js';

const router = Router();

// Generate email draft template from user prompt using Claude / LLM
router.post('/generate', async (req, res) => {
  const { prompt, availableColumns } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Please enter a prompt describing your target email.' });
  }

  const columns = Array.isArray(availableColumns) ? availableColumns : ['name', 'company', 'role'];
  try {
    const draft = await generateEmailDraft(prompt, columns);
    return res.json(draft);
  } catch (err: any) {
    return res.status(500).json({ error: 'Draft generation error: ' + err.message });
  }
});

// Save or update draft for a campaign
router.post('/save', async (req, res) => {
  const { campaignId, subject, bodyTemplate, aiPersonalizeEnabled, aiPrompt } = req.body;

  if (!campaignId || !subject || !bodyTemplate) {
    return res.status(400).json({ error: 'Campaign ID, subject, and body template are required.' });
  }

  let draftRecord: any;
  if (isPrismaConnected) {
    try {
      draftRecord = await prisma.emailDraft.upsert({
        where: { campaignId },
        update: {
          subject,
          bodyTemplate,
          aiPersonalizeEnabled: Boolean(aiPersonalizeEnabled),
          aiPrompt: aiPrompt || null,
        },
        create: {
          campaignId,
          subject,
          bodyTemplate,
          aiPersonalizeEnabled: Boolean(aiPersonalizeEnabled),
          aiPrompt: aiPrompt || null,
        },
      });
    } catch (err) {
      // Fallback
    }
  }

  if (!draftRecord) {
    draftRecord = {
      id: `drf_${campaignId}`,
      campaignId,
      subject,
      bodyTemplate,
      aiPersonalizeEnabled: Boolean(aiPersonalizeEnabled),
      aiPrompt: aiPrompt || null,
      createdAt: new Date(),
    };
    inMemoryStore.drafts.set(campaignId, draftRecord);
  }

  return res.json({ success: true, draft: draftRecord });
});

// Live AI Personalization preview for a specific contact recipient
router.post('/preview-recipient', async (req, res) => {
  const { subject, bodyTemplate, contact, aiPersonalizeEnabled, aiPrompt } = req.body;

  if (!subject || !bodyTemplate || !contact) {
    return res.status(400).json({ error: 'Subject, bodyTemplate, and contact row data required.' });
  }

  try {
    let result: { subject: string; body: string };
    if (aiPersonalizeEnabled) {
      result = await personalizeEmailForContact({
        templateSubject: subject,
        templateBody: bodyTemplate,
        contact: {
          email: contact.email,
          name: contact.name,
          company: contact.company,
          role: contact.role,
          customFields: contact.customFields || {},
        },
        promptContext: aiPrompt,
      });
    } else {
      result = await personalizeEmailForContact({
        templateSubject: subject,
        templateBody: bodyTemplate,
        contact: {
          email: contact.email,
          name: contact.name,
          company: contact.company,
          role: contact.role,
          customFields: contact.customFields || {},
        },
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Preview generation error: ' + err.message });
  }
});

export default router;

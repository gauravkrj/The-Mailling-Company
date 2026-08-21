import { Router } from 'express';
import { prisma, inMemoryStore } from '../db.js';

const router = Router();

// 1x1 Transparent PNG Image Buffer
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// Open Tracking Pixel Endpoint
router.get('/track/open/:token.png', async (req, res) => {
  const token = req.params.token;

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': TRANSPARENT_PNG.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  });
  res.end(TRANSPARENT_PNG);

  // Async record open event
  if (token) {
    try {
      await prisma.sendLog.updateMany({
        where: { trackingToken: token, openedAt: null },
        data: { openedAt: new Date() },
      });
    } catch (e) {
      // In-memory fallback
      for (const [_, logs] of inMemoryStore.sendLogs.entries()) {
        const target = logs.find((l: any) => l.trackingToken === token);
        if (target && !target.openedAt) {
          target.openedAt = new Date();
        }
      }
    }
  }
});

// Click Tracking Redirect Endpoint
router.get('/track/click/:token', async (req, res) => {
  const { token } = req.params;
  const targetUrl = (req.query.url as string) || 'https://google.com';

  if (token) {
    try {
      await prisma.sendLog.updateMany({
        where: { trackingToken: token },
        data: { clickedAt: new Date() },
      });
    } catch (e) {
      for (const [_, logs] of inMemoryStore.sendLogs.entries()) {
        const target = logs.find((l: any) => l.trackingToken === token);
        if (target) {
          target.clickedAt = new Date();
        }
      }
    }
  }

  return res.redirect(targetUrl);
});

// 1-Click Unsubscribe Endpoint & HTML confirmation page
router.all('/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;
  let email: string = 'recipient@domain.com';
  let userId: string = 'usr_demo_123';

  if (token) {
    try {
      const log = await prisma.sendLog.findUnique({
        where: { trackingToken: token },
        include: { contact: true, campaign: true },
      });
      if (log && log.contact) {
        email = log.contact.email;
        userId = log.campaign.userId;

        await prisma.contact.update({
          where: { id: log.contactId },
          data: { status: 'UNSUBSCRIBED' },
        });

        await prisma.suppressionList.upsert({
          where: { userId_email: { userId, email } },
          update: { reason: 'UNSUBSCRIBE' },
          create: { userId, email, reason: 'UNSUBSCRIBE' },
        });
      }
    } catch (err) {
      for (const [campaignId, contacts] of inMemoryStore.contacts.entries()) {
        const targetLog = (inMemoryStore.sendLogs.get(campaignId) || []).find((l: any) => l.trackingToken === token);
        if (targetLog) {
          const cnt = contacts.find((c: any) => c.id === targetLog.contactId);
          if (cnt) {
            email = cnt.email;
            cnt.status = 'UNSUBSCRIBED';
            let userSupps = inMemoryStore.suppressions.get(userId);
            if (!userSupps) {
              userSupps = new Set();
              inMemoryStore.suppressions.set(userId, userSupps);
            }
            userSupps.add(email.toLowerCase());
          }
        }
      }
    }
  }

  const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed — The Mailing Company</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif; background: #fafafa; color: #111827; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; max-width: 440px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #111827; }
    p { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0; }
    .email-badge { font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✉️</div>
    <h1>You have been unsubscribed</h1>
    <p><span class="email-badge">${email}</span> will no longer receive marketing emails from this sender.</p>
  </div>
</body>
</html>`;

  return res.send(htmlResponse);
});

// Suppression list API routes
router.get('/suppression', async (req, res) => {
  const userId = (req.query.userId as string) || 'usr_demo_123';

  let list: any[] = [];
  try {
    list = await prisma.suppressionList.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
  } catch (err) {
    const memSupps = inMemoryStore.suppressions.get(userId) || new Set();
    list = Array.from(memSupps).map(email => ({
      id: `supp_${email}`,
      email,
      reason: 'UNSUBSCRIBE',
      addedAt: new Date(),
    }));
  }

  return res.json(list);
});

router.post('/suppression', async (req, res) => {
  const { email, reason = 'MANUAL', userId } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required for suppression.' });
  }

  const targetUserId = userId || 'usr_demo_123';

  try {
    await prisma.suppressionList.upsert({
      where: { userId_email: { userId: targetUserId, email: email.toLowerCase() } },
      update: { reason: reason as any },
      create: { userId: targetUserId, email: email.toLowerCase(), reason: reason as any },
    });
  } catch (err) {
    let userSupps = inMemoryStore.suppressions.get(targetUserId);
    if (!userSupps) {
      userSupps = new Set();
      inMemoryStore.suppressions.set(targetUserId, userSupps);
    }
    userSupps.add(email.toLowerCase());
  }

  return res.json({ success: true, email: email.toLowerCase() });
});

router.delete('/suppression/:email', async (req, res) => {
  const email = req.params.email;
  const userId = (req.query.userId as string) || 'usr_demo_123';

  try {
    await prisma.suppressionList.delete({
      where: { userId_email: { userId, email: email.toLowerCase() } },
    });
  } catch (err) {
    const userSupps = inMemoryStore.suppressions.get(userId);
    if (userSupps) {
      userSupps.delete(email.toLowerCase());
    }
  }

  return res.json({ success: true, email });
});

export default router;

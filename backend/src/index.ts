import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import contactRoutes from './routes/contacts.js';
import campaignRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/user.js';
import { prisma, isPrismaConnected } from './db.js';
import { memorySendLogStore, memorySuppressionStore, emailQueue } from './services/queue.js';
import { markDirectorySuppressed, markDirectoryBounced } from './services/directorySync.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

// Trust reverse proxy for Railway/Render/AWS deployment
app.set('trust proxy', 1);

// Task 2: Production HTTPS & Security Headers Middleware
app.use((req, res, next) => {
  if (config.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Force HTTPS redirect if forwarded via HTTP (skip OPTIONS preflight)
    if (req.method !== 'OPTIONS' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

// Task 4: Production CORS client URL & preflight OPTIONS validation
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / same-origin without origin header
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');

    const allowedOrigins = [
      'https://themaillingcompany.com',
      'https://www.themaillingcompany.com',
      'https://api.themaillingcompany.com',
      (config.clientUrl || '').replace(/\/$/, ''),
    ].filter(Boolean);

    if (
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.themaillingcompany.com') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost') ||
      config.nodeEnv !== 'production'
    ) {
      return callback(null, origin); // Pass exact origin string so wildcard '*' is never used for credentials
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie'],
  optionsSuccessStatus: 200,
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// API Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user', userRoutes);

// Task 6: BullMQ Queue Monitoring Admin Dashboard Endpoint
app.get('/api/admin/queues', requireAuth, async (req, res) => {
  try {
    let counts = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    if (emailQueue) {
      const rawCounts = await emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      counts = {
        waiting: rawCounts.waiting || 0,
        active: rawCounts.active || 0,
        completed: rawCounts.completed || 0,
        failed: rawCounts.failed || 0,
        delayed: rawCounts.delayed || 0,
      };
    }
    return res.json({
      success: true,
      queueName: 'email-dispatch-queue',
      jobCounts: counts,
      inMemoryStoreSize: memorySendLogStore.size,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Root API Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'The Mailling Company Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    dbConnected: isPrismaConnected,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'The Mailling Company Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    dbConnected: isPrismaConnected,
    timestamp: new Date().toISOString(),
  });
});

// Phase 7: Open Tracking Pixel Endpoint
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

app.get('/api/track/open/:token', async (req, res) => {
  const { token } = req.params;
  const now = new Date();

  if (isPrismaConnected) {
    try {
      const sendLog = await prisma.sendLog.findFirst({
        where: { unsubscribe_token: token },
      });
      if (sendLog) {
        const newStatus = sendLog.status === 'sent' ? 'opened' : sendLog.status;
        await prisma.sendLog.updateMany({
          where: { unsubscribe_token: token },
          data: {
            opened_at: sendLog.opened_at || now,
            status: newStatus,
          },
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  // Update memorySendLogStore for standalone memory mode
  memorySendLogStore.forEach((logs) => {
    logs.forEach((log) => {
      if (log.unsubscribeToken === token || log.unsubscribe_token === token || log.id === token) {
        log.openedAt = log.openedAt || now.toISOString();
        log.opened_at = log.opened_at || now.toISOString();
        if (log.status === 'sent') log.status = 'opened';
      }
    });
  });

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_1X1_GIF.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  return res.end(TRANSPARENT_1X1_GIF);
});

// Phase 7: Click Tracking Link Redirect Endpoint (Click automatically implies Open!)
app.get('/api/track/click/:token', async (req, res) => {
  const { token } = req.params;
  const targetUrl = (req.query.url as string) || config.clientUrl;
  const now = new Date();

  if (isPrismaConnected) {
    try {
      const sendLog = await prisma.sendLog.findFirst({
        where: { unsubscribe_token: token },
      });
      await prisma.sendLog.updateMany({
        where: { unsubscribe_token: token },
        data: {
          clicked_at: now,
          opened_at: sendLog?.opened_at || now,
          status: 'clicked',
        },
      });
    } catch (e) {
      // Fallback
    }
  }

  // Update memorySendLogStore for standalone memory mode (Click implies Open!)
  memorySendLogStore.forEach((logs) => {
    logs.forEach((log) => {
      if (log.unsubscribeToken === token || log.unsubscribe_token === token || log.id === token) {
        log.openedAt = log.openedAt || log.opened_at || now.toISOString();
        log.opened_at = log.opened_at || log.openedAt || now.toISOString();
        log.clickedAt = now.toISOString();
        log.clicked_at = now.toISOString();
        log.status = 'clicked';
      }
    });
  });

  return res.redirect(302, targetUrl);
});

// Public Unsubscribe Endpoint (Phase 6 Requirement - Unsubscribe also implies Open!)
app.get('/api/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;
  const now = new Date();

  let unsubscribedEmail = 'your email address';

  if (isPrismaConnected) {
    try {
      const sendLog = await prisma.sendLog.findFirst({
        where: { unsubscribe_token: token },
        include: { contact: true, campaign: true },
      });

      if (sendLog && sendLog.contact) {
        unsubscribedEmail = sendLog.contact.email;
        await prisma.sendLog.updateMany({
          where: { unsubscribe_token: token },
          data: {
            opened_at: sendLog.opened_at || now,
            status: 'unsubscribed',
          },
        });

        await prisma.suppressionList.upsert({
          where: {
            user_id_email: {
              user_id: sendLog.campaign.user_id,
              email: sendLog.contact.email.toLowerCase(),
            },
          },
          update: { reason: 'unsubscribe' },
          create: {
            user_id: sendLog.campaign.user_id,
            email: sendLog.contact.email.toLowerCase(),
            reason: 'unsubscribe',
          },
        });

        // Phase 13A: Global ContactDirectory status update to suppressed
        await markDirectorySuppressed(sendLog.campaign.user_id, sendLog.contact.email);
      }
    } catch (e) {
      // Fallback
    }
  }

  // Standalone memory mode unsubscribe processing
  memorySendLogStore.forEach((logs) => {
    logs.forEach((log) => {
      if (log.unsubscribeToken === token || log.unsubscribe_token === token || log.id === token) {
        log.status = 'suppressed';
        log.openedAt = log.openedAt || log.opened_at || now.toISOString();
        log.opened_at = log.opened_at || log.openedAt || now.toISOString();
        if (log.contactEmail) {
          unsubscribedEmail = log.contactEmail;
          memorySuppressionStore.add(log.contactEmail.toLowerCase());
          const userId = log.userId || log.campaignUserId || 'demo_user';
          markDirectorySuppressed(userId, log.contactEmail);
        }
      }
    });
  });

  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unsubscribed — The Mailling Company</title>
        <style>
          body { background-color: #0F0D0E; color: #F2EDEE; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1A1617; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; text-align: center; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h1 { color: #F2EDEE; font-size: 22px; margin-bottom: 12px; }
          p { color: #A89DA0; font-size: 14px; line-height: 1.5; margin: 0; }
          .badge { display: inline-block; background: rgba(74, 157, 110, 0.15); color: #4A9D6E; border: 1px solid rgba(74, 157, 110, 0.3); padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓ Successfully Unsubscribed</div>
          <h1>You have been unsubscribed</h1>
          <p><strong>${unsubscribedEmail}</strong> will no longer receive emails from this sender.</p>
        </div>
      </body>
    </html>
  `);
});

// Bounce Webhook Handler (Phase 13A Requirement: Hard Bounce -> status = "bounced")
app.post(['/api/webhooks/bounce', '/api/accounts/ses/webhook'], async (req, res) => {
  const { userId, email, bouncedRecipients } = req.body;
  const targetUserId = userId || null;
  const recipients: string[] = Array.isArray(bouncedRecipients) ? bouncedRecipients : (email ? [email] : []);

  for (const rEmail of recipients) {
    if (rEmail && typeof rEmail === 'string') {
      await markDirectoryBounced(targetUserId, rEmail.trim());
    }
  }

  return res.json({ success: true, count: recipients.length });
});

const PORT = parseInt(process.env.PORT || '5001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 The Mailling Company Backend running on port ${PORT}`);
});

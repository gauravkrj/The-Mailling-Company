import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import draftRoutes from './routes/draft.js';
import sendRoutes from './routes/send.js';
import campaignRoutes from './routes/campaigns.js';
import trackingRoutes from './routes/tracking.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = express();

// Middleware
app.use(cors({ origin: [config.clientUrl, 'http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), service: 'The Mailing Company API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/send', sendRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api', trackingRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err, 'Unhandled Express Server Error');
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(config.port, () => {
  logger.info(`🚀 The Mailing Company Server running on ${config.appUrl} (Port ${config.port})`);
});

export default app;

import dotenv from 'dotenv';
import path from 'path';

const rootDir = path.resolve(process.cwd());
dotenv.config({ path: path.join(rootDir, '.env'), override: true });
dotenv.config({ path: path.join(rootDir, '../.env'), override: true });

const isProd = (process.env.NODE_ENV || 'development') === 'production';

if (isProd) {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
  }
  if (!process.env.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_MASTER_KEY.includes('0123456789')) {
    throw new Error('FATAL: A secure 64-character hex ENCRYPTION_MASTER_KEY environment variable is required in production!');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5001',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mailpersonalize?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  sentryDsn: process.env.SENTRY_DSN || '',

  get googleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  },
  get googleClientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  },
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback',
  gmailSendRedirectUri: process.env.GMAIL_SEND_REDIRECT_URI || 'http://localhost:5001/api/accounts/google/callback',

  // Master AES-256-GCM Encryption Key for storing sensitive OAuth Refresh Tokens
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  // JWT Secret
  jwtSecret: process.env.JWT_SECRET || 'mailpersonalize-jwt-secret-key-phase1-2026',
};

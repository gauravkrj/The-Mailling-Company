import dotenv from 'dotenv';
import path from 'path';

const rootDir = path.resolve(process.cwd());
dotenv.config({ path: path.join(rootDir, '.env'), override: true });
dotenv.config({ path: path.join(rootDir, '../.env'), override: true });

const isProd = (process.env.NODE_ENV || 'development') === 'production';

if (isProd) {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'mc_prod_jwt_secret_998877_fallback';
  }
  if (!process.env.ENCRYPTION_MASTER_KEY) {
    process.env.ENCRYPTION_MASTER_KEY = 'e4d8f9a2b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5';
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
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || 'e4d8f9a2b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5',

  // JWT Secret
  jwtSecret: process.env.JWT_SECRET || 'mailpersonalize-jwt-secret-key-phase1-2026',
};

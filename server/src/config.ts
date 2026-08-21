import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5001',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mailpersonalize?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback',

  // Anthropic API
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // AWS SES
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsSesFromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@yourdomain.com',

  // SMTP / Gmail App Password for easy local testing
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || process.env.GMAIL_USER || '',
  smtpPass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '',

  // JWT Secret
  jwtSecret: process.env.JWT_SECRET || 'mail-personalize-super-secret-jwt-key-2026',
};

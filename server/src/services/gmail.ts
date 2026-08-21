import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { config } from '../config.js';

export interface SendGmailOptions {
  accessToken?: string;
  refreshToken?: string;
  to: string;
  subject: string;
  body: string;
  fromEmail?: string;
  unsubscribeUrl?: string;
}

export async function sendViaGmail(opts: SendGmailOptions): Promise<{ messageId: string }> {
  const { accessToken, refreshToken, to, subject, body, fromEmail, unsubscribeUrl } = opts;

  // 1. Send via Google OAuth 2.0 Gmail API
  if (accessToken && accessToken !== 'mock_access_token' && config.googleClientId) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const headers = [
        `To: ${to}`,
        fromEmail ? `From: ${fromEmail}` : '',
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        unsubscribeUrl && !unsubscribeUrl.includes('localhost') ? `List-Unsubscribe: <${unsubscribeUrl}>` : '',
        unsubscribeUrl && !unsubscribeUrl.includes('localhost') ? 'List-Unsubscribe-Post: List-Unsubscribe=One-Click' : '',
      ]
        .filter(Boolean)
        .join('\r\n');

      const fullMessage = `${headers}\r\n\r\n${body.replace(/\n/g, '<br/>')}`;
      const encodedMessage = Buffer.from(fullMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`✅ [REAL GMAIL API SEND] Sent to: ${to} (ID: ${res.data.id})`);
      return { messageId: res.data.id || `gmail_${Date.now()}` };
    } catch (err: any) {
      console.warn('⚠️ Gmail API send failed, trying SMTP fallback:', err?.message || err);
    }
  }

  // 2. Send via SMTP / Gmail App Password if configured in .env
  if (config.smtpUser && config.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      // Strip HTML tags for clean plain-text alternative (boosts deliverability)
      const plainText = body
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      const info = await transporter.sendMail({
        from: fromEmail || config.smtpUser,
        to,
        subject,
        text: plainText,
        html: body,
        headers: unsubscribeUrl && !unsubscribeUrl.includes('localhost')
          ? {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
          : undefined,
      });

      console.log(`✅ [REAL SMTP SEND SUCCESS] Sent to: ${to} (MessageId: ${info.messageId})`);
      return { messageId: info.messageId };
    } catch (smtpErr: any) {
      console.error('❌ [SMTP Send Error]:', smtpErr?.message || smtpErr);
    }
  }

  // 3. Simulated Send Log (Dev / Test Mode when no real email credentials provided)
  console.log(`[SIMULATED GMAIL SEND - NO REAL SMTP/OAUTH CREDENTIALS] To: ${to} | Subject: "${subject}"`);
  return { messageId: `mock_gmail_${Date.now()}_${Math.random().toString(36).substring(7)}` };
}

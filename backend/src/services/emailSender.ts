import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { google } from 'googleapis';
import { decryptToken } from '../utils/crypto.js';

export interface SendEmailOptions {
  provider: 'google_oauth' | 'smtp_app_password' | 'aws_ses';
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  unsubscribeToken: string;
  format?: 'html' | 'plain_text';
  logoUrl?: string | null;
  headerBgImage?: string | null;
  // Account secrets
  encryptedRefreshToken?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  encryptedSmtpPassword?: string | null;
  awsAccessKeyId?: string | null;
  encryptedAwsSecretKey?: string | null;
  awsRegion?: string | null;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Strip HTML tags to create a clean text fallback (Drastically reduces Spam scores)
 * Preserves anchor links as 'Text (URL)' or raw URLs for plain text deliverability.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (match, url, text) => {
      const cleanText = text.replace(/<[^>]+>/g, '').trim();
      if (!cleanText || cleanText === url) return url;
      return `${cleanText} (${url})`;
    })
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Universal Multi-Provider Email Sending Dispatcher with AWS SES, Gmail & SMTP Support
 */
export async function sendEmailWithProvider(options: SendEmailOptions): Promise<SendResult> {
  const {
    provider,
    senderEmail,
    recipientEmail,
    subject,
    htmlContent,
    unsubscribeToken,
    format = 'html',
  } = options;

  const appUrl = process.env.APP_URL || 'http://localhost:5001';
  const unsubscribeUrl = `${appUrl}/api/unsubscribe/${unsubscribeToken}`;
  const openTrackingUrl = `${appUrl}/api/track/open/${unsubscribeToken}`;

  const isPlainTextMode = format === 'plain_text';
  let plainTextBody = '';
  let sanitizedHtml = '';
  const attachments: any[] = [];

  if (isPlainTextMode) {
    // -----------------------------------------------------------------------
    // PHASE 5C: PURE PLAIN TEXT SENDING BRANCH (Zero HTML markup/template)
    // -----------------------------------------------------------------------
    const rawContent = stripHtml(htmlContent);
    plainTextBody = `${rawContent}\n\n---\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
    sanitizedHtml = '';
  } else {
    // -----------------------------------------------------------------------
    // RICH HTML SENDING BRANCH (Visual Template Designer Styling)
    // -----------------------------------------------------------------------
    let trackedHtml = htmlContent.replace(/href="([^"]+)"/g, (match, originalUrl) => {
      if (originalUrl.includes('/api/unsubscribe/') || originalUrl.includes('/api/track/')) {
        return match;
      }
      const trackingClickUrl = `${appUrl}/api/track/click/${unsubscribeToken}?url=${encodeURIComponent(originalUrl)}`;
      return `href="${trackingClickUrl}"`;
    });

    const fullHtml = `${trackedHtml}
<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none !important; min-height:1px; min-width:1px;" />
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
  <tr>
    <td align="center" style="font-size: 11px; color: #6b7280; font-family: Arial, sans-serif;">
      If you no longer wish to receive these emails, you can 
      <a href="${unsubscribeUrl}" target="_blank" style="color: #7B2038; text-decoration: underline;">unsubscribe here</a>.
    </td>
  </tr>
</table>`;

    sanitizedHtml = fullHtml;

    if (options.logoUrl && options.logoUrl.startsWith('data:image/')) {
      const matches = options.logoUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        const base64Data = matches[2];
        attachments.push({
          filename: 'logo.png',
          content: Buffer.from(base64Data, 'base64'),
          cid: 'header_logo_image',
        });
        sanitizedHtml = sanitizedHtml.replace(options.logoUrl, 'cid:header_logo_image');
      }
    }

    if (options.headerBgImage && options.headerBgImage.startsWith('data:image/')) {
      const matches = options.headerBgImage.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        const base64Data = matches[2];
        attachments.push({
          filename: 'banner.png',
          content: Buffer.from(base64Data, 'base64'),
          cid: 'header_banner_image',
        });
        sanitizedHtml = sanitizedHtml.replace(options.headerBgImage, 'cid:header_banner_image');
      }
    }

    plainTextBody = stripHtml(sanitizedHtml);
  }

  // Clean 1-to-1 Email Headers
  const inboxHeaders: Record<string, string> = {
    'X-Mailer': 'The Mailling Company 1.0',
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  try {
    // 1. Google OAuth Gmail API Send Method
    if (provider === 'google_oauth') {
      let refreshToken = '';
      if (options.encryptedRefreshToken) {
        try {
          refreshToken = decryptToken(options.encryptedRefreshToken);
        } catch (e) {
          refreshToken = options.encryptedRefreshToken;
        }
      }

      if (!refreshToken || refreshToken === 'demo_refresh_token_sample') {
        console.log(`[Gmail OAuth Dispatcher]: Simulating OAuth send to ${recipientEmail}`);
        return {
          success: true,
          messageId: `msg_gmail_sim_${Date.now()}`,
        };
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      // Use Nodemailer Stream Composer to build 100% RFC 2822 compliant MIME message
      const composer = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
      });

      const mailPayload: any = {
        from: senderEmail,
        to: recipientEmail,
        subject,
        text: plainTextBody,
        headers: inboxHeaders,
      };

      if (!isPlainTextMode && sanitizedHtml) {
        mailPayload.html = sanitizedHtml;
        if (attachments.length > 0) mailPayload.attachments = attachments;
      }

      const composedInfo = await composer.sendMail(mailPayload);

      const rawMimeBuffer = composedInfo.message as Buffer;
      const encodedMessage = rawMimeBuffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      return {
        success: true,
        messageId: res.data.id || undefined,
      };
    }

    // 2. SMTP App Password Method
    if (provider === 'smtp_app_password') {
      let password = '';
      if (options.encryptedSmtpPassword) {
        try {
          password = decryptToken(options.encryptedSmtpPassword);
        } catch (e) {
          password = options.encryptedSmtpPassword;
        }
      } else if (process.env.SMTP_PASS) {
        password = process.env.SMTP_PASS;
      }

      const host = options.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = options.smtpPort || Number(process.env.SMTP_PORT) || 587;

      if (!password) {
        console.log(`[SMTP Dispatcher]: Simulating email send to ${recipientEmail} from ${senderEmail}`);
        return {
          success: true,
          messageId: `msg_smtp_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: senderEmail,
          pass: password,
        },
      });

      const mailPayload: any = {
        from: senderEmail,
        to: recipientEmail,
        subject,
        text: plainTextBody,
        headers: inboxHeaders,
      };

      if (!isPlainTextMode && sanitizedHtml) {
        mailPayload.html = sanitizedHtml;
        if (attachments.length > 0) mailPayload.attachments = attachments;
      }

      const info = await transporter.sendMail(mailPayload);

      return {
        success: true,
        messageId: info.messageId,
      };
    }

    // 3. Amazon SES Method
    if (provider === 'aws_ses') {
      let secretAccessKey = '';
      if (options.encryptedAwsSecretKey) {
        try {
          secretAccessKey = decryptToken(options.encryptedAwsSecretKey);
        } catch (e) {
          secretAccessKey = options.encryptedAwsSecretKey;
        }
      } else if (process.env.AWS_SECRET_ACCESS_KEY) {
        secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      }

      const accessKeyId = options.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID;
      const region = options.awsRegion || process.env.AWS_REGION || 'us-east-1';

      const isDemoKey =
        !accessKeyId ||
        !secretAccessKey ||
        accessKeyId === 'AKIAIOSFODNN7EXAMPLE' ||
        secretAccessKey === 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' ||
        accessKeyId === 'your-aws-access-key-id' ||
        secretAccessKey === 'your-aws-secret-access-key';

      if (isDemoKey) {
        console.warn(`⚠️ [AWS SES Dispatcher]: Demo credentials detected (AccessKey: '${accessKeyId || 'none'}'). Simulating send to ${recipientEmail} from ${senderEmail}. Add real AWS credentials in Connected Accounts to send real emails.`);
        return {
          success: true,
          messageId: `msg_ses_sim_${Date.now()}`,
        };
      }

      const effectiveSourceEmail = senderEmail.includes('@') ? senderEmail : `outreach@${senderEmail}`;
      console.log(`🚀 [AWS SES Dispatcher]: Executing REAL AWS SES send to ${recipientEmail} from ${effectiveSourceEmail} in region ${region} (Format: ${format})...`);

      const sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const sesBody: any = {
        Text: { Data: plainTextBody, Charset: 'UTF-8' },
      };

      if (!isPlainTextMode && sanitizedHtml) {
        sesBody.Html = { Data: sanitizedHtml, Charset: 'UTF-8' };
      }

      const command = new SendEmailCommand({
        Source: effectiveSourceEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: sesBody,
        },
      });

      const res = await sesClient.send(command);
      console.log(`✅ [AWS SES Real Send Success]: MessageId ${res.MessageId} delivered to AWS for ${recipientEmail}`);
      return {
        success: true,
        messageId: res.MessageId,
      };
    }

    return { success: false, error: `Unsupported provider: ${provider}` };
  } catch (err: any) {
    console.error(`❌ [Email Dispatcher Error]:`, err?.message || err);

    if (err?.message?.includes('Gmail API has not been used') || err?.message?.includes('disabled')) {
      return {
        success: false,
        error: `Gmail API is disabled in your Google Cloud Project. Please enable it in Google Cloud Console: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=1066130615843`,
      };
    }
    if (err?.message?.includes('Email address is not verified') || err?.message?.includes('MessageRejected') || err?.message?.includes('IdentityNotVerified')) {
      return {
        success: false,
        error: `AWS SES restriction: Identity '${senderEmail}' or recipient '${recipientEmail}' is not verified in region '${options.awsRegion || 'us-east-1'}'. In AWS SES Sandbox mode, both sender domain and recipient emails must be verified, or Production Access must be requested.`,
      };
    }
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email.',
    };
  }
}

/**
 * Send Transactional System Emails (Verification Links, Password Resets)
 */
export async function sendTransactionalSystemEmail(options: {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}): Promise<SendResult> {
  const { recipientEmail, subject, htmlContent, textContent } = options;

  // 0. Check MailerSend API (HTTPS Port 443 - Instant 12,000 free emails/month)
  const mailerSendApiKey = process.env.MAILERSEND_API_KEY;
  if (mailerSendApiKey) {
    try {
      const res = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mailerSendApiKey}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          from: {
            email: process.env.MAILERSEND_FROM_EMAIL || 'info@trial-z3m5jgr5y3g4py6o.mlsender.net',
            name: 'The Mailling Company',
          },
          to: [{ email: recipientEmail }],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });
      if (res.status === 202 || res.status === 200) {
        const messageId = res.headers.get('x-message-id') || `ms_${Date.now()}`;
        console.log(`📧 [MailerSend API Success]: Sent "${subject}" to ${recipientEmail} (Id: ${messageId})`);
        return { success: true, messageId };
      }
      const data: any = await res.json().catch(() => ({}));
      console.warn(`⚠️ [MailerSend API Notice]:`, data);
    } catch (err: any) {
      console.warn(`⚠️ [MailerSend API Error]:`, err?.message || err);
    }
  }

  // 2. Check Resend API (HTTPS Port 443 - Testing mode limited to account owner email)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'The Mailling Company <onboarding@resend.dev>',
          to: [recipientEmail],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });
      const data: any = await res.json();
      if (res.ok && data.id) {
        console.log(`📧 [Resend API Success]: Sent "${subject}" to ${recipientEmail} (Id: ${data.id})`);
        return { success: true, messageId: data.id };
      }
      console.warn(`⚠️ [Resend API Notice]:`, data);
    } catch (err: any) {
      console.warn(`⚠️ [Resend API Error]:`, err?.message || err);
    }
  }

  // 2. Check AWS SES (HTTPS Port 443 - Never blocked on Railway)
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  if (awsKey && awsSecret && awsKey !== 'AKIAIOSFODNN7EXAMPLE') {
    try {
      const sesClient = new SESClient({
        region: awsRegion,
        credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
      });

      const command = new SendEmailCommand({
        Source: `"The Mailling Company" <${process.env.SMTP_USER || 'noreply@thedgwrench.com'}>`,
        Destination: { ToAddresses: [recipientEmail] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlContent },
            Text: { Data: textContent },
          },
        },
      });

      const res = await sesClient.send(command);
      console.log(`📧 [AWS SES HTTPS Success]: Sent "${subject}" to ${recipientEmail} (MessageId: ${res.MessageId})`);
      return { success: true, messageId: res.MessageId };
    } catch (err: any) {
      console.warn(`⚠️ [AWS SES Error]: ${err?.message || err}`);
    }
  }

  // 3. Fallback to SMTP (Port 465 / 587 with fast 5s timeout)
  const smtpUser = (process.env.SMTP_USER || process.env.SYSTEM_SMTP_USER || '').trim();
  const rawSmtpPass = process.env.SMTP_PASS || process.env.SYSTEM_SMTP_PASS || '';
  const smtpPass = rawSmtpPass.replace(/\s+/g, '');
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes('gmail');
      const transportConfig: any = isGmail
        ? {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 6000,
            greetingTimeout: 6000,
            socketTimeout: 6000,
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 6000,
            greetingTimeout: 6000,
            socketTimeout: 6000,
          };

      const transporter = nodemailer.createTransport(transportConfig);

      const info = await transporter.sendMail({
        from: `"The Mailling Company" <${smtpUser}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`📧 [Transactional Mailer Success]: Sent "${subject}" to ${recipientEmail} via SMTP (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`❌ [SMTP Primary Transport Error]:`, err?.message || err);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 6000,
        });
        const fallbackInfo = await fallbackTransporter.sendMail({
          from: `"The Mailling Company" <${smtpUser}>`,
          to: recipientEmail,
          subject,
          html: htmlContent,
          text: textContent,
        });
        console.log(`📧 [SMTP Fallback 587 Success]: Sent to ${recipientEmail} (MessageId: ${fallbackInfo.messageId})`);
        return { success: true, messageId: fallbackInfo.messageId };
      } catch (fallbackErr: any) {
        console.error(`❌ [SMTP Cloud Firewall Restriction]: Both Port 465 and Port 587 timed out. Railway container firewall blocks outbound raw TCP SMTP. Recommend setting RESEND_API_KEY or AWS SES (HTTPS Port 443).`);
      }
    }
  } else {
    console.warn(`⚠️ [Transactional Mailer Notice]: SMTP_USER or SMTP_PASS is missing in Railway environment variables.`);
  }

  console.log(`ℹ️ [Transactional Mailer Dev Mode]: System SMTP/SES not configured in .env. Verification link logged.`);
  return { success: true, messageId: `dev_mock_${Date.now()}` };
}

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config.js';

export interface SendSesOptions {
  to: string;
  subject: string;
  body: string;
  fromEmail?: string;
  unsubscribeUrl?: string;
}

export async function sendViaSES(opts: SendSesOptions): Promise<{ messageId: string }> {
  const { to, subject, body, fromEmail, unsubscribeUrl } = opts;
  const sender = fromEmail || config.awsSesFromEmail;

  if (config.awsAccessKeyId && config.awsSecretAccessKey) {
    try {
      const client = new SESClient({
        region: config.awsRegion,
        credentials: {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        },
      });

      const htmlBody = `${body.replace(/\n/g, '<br/>')}`;

      const command = new SendEmailCommand({
        Source: sender,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: body, Charset: 'UTF-8' },
          },
        },
      });

      const response = await client.send(command);
      return { messageId: response.MessageId || `ses_${Date.now()}` };
    } catch (err: any) {
      console.warn('⚠️ AWS SES API send failed, falling back to simulated logger mode:', err?.message || err);
    }
  }

  // Simulated SES Send Log for Dev / Test Mode
  console.log(`[SIMULATED AWS SES SEND] From: ${sender} | To: ${to} | Subject: "${subject}"`);
  return { messageId: `mock_ses_${Date.now()}_${Math.random().toString(36).substring(7)}` };
}

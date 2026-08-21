import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateRequestBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: ' + err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          details: err.errors,
        });
      }
      return res.status(400).json({ success: false, error: 'Invalid input request body.' });
    }
  };
}

// Schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long').trim(),
});

export const saveDraftSchema = z.object({
  mode: z.enum(['fixed_template', 'ai_personalized']).default('fixed_template'),
  format: z.enum(['html', 'plain_text']).default('html'),
  subject: z.string().min(1, 'Subject line is required').max(250).trim(),
  body_template: z.string().min(1, 'Body template is required').max(50000),
  plain_signature: z.string().nullable().optional(),
  ai_brief: z.string().nullable().optional(),
  ai_tone: z.string().nullable().optional(),
});

export const connectSmtpAccountSchema = z.object({
  display_name: z.string().min(1).max(100).trim(),
  sender_email: z.string().email('Invalid sender email address').trim(),
  smtp_host: z.string().min(1, 'SMTP host is required').trim(),
  smtp_port: z.number().int().positive(),
  smtp_password: z.string().min(1, 'SMTP password is required'),
  daily_limit: z.number().int().min(1).max(10000).default(500),
});

export const connectSesAccountSchema = z.object({
  display_name: z.string().min(1).max(100).trim(),
  sender_email: z.string().email('Invalid sender email address').trim(),
  aws_access_key_id: z.string().min(1).trim(),
  aws_secret_access_key: z.string().min(1).trim(),
  aws_region: z.string().min(1).default('us-east-1'),
  daily_limit: z.number().int().min(1).max(50000).default(10000),
});

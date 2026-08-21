import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

let anthropicClient: Anthropic | null = null;
if (config.anthropicApiKey) {
  anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
}

export interface GeneratedDraft {
  subject: string;
  bodyTemplate: string;
}

export interface PersonalizeRequest {
  templateSubject: string;
  templateBody: string;
  contact: {
    email: string;
    name?: string;
    company?: string;
    role?: string;
    customFields?: Record<string, any>;
  };
  promptContext?: string;
}

export async function generateEmailDraft(
  userPrompt: string,
  availableColumns: string[]
): Promise<GeneratedDraft> {
  const columnsList = availableColumns.map(col => `{{${col}}}`).join(', ');

  if (anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are an expert cold email & personalized marketing copywriter.
Generate a high-converting, professional, yet friendly email template based on this directive:
"${userPrompt}"

Available personalization placeholder tokens from the user's data:
${columnsList}

INSTRUCTIONS:
1. Output valid JSON only with keys "subject" and "bodyTemplate".
2. Use placeholder tokens like {{name}}, {{company}}, {{role}} inside the body where appropriate.
3. Keep the email concise, engaging, and clear.
4. Do NOT include markdown code blocks or text outside the JSON object.`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        subject: parsed.subject || 'Introducing MailPersonalize',
        bodyTemplate: parsed.bodyTemplate || parsed.body || '',
      };
    } catch (err) {
      console.warn('⚠️ Anthropic API call failed, using intelligent copy generation fallback:', err);
    }
  }

  // Fallback Copy Generator Engine when API Key is not set or rate-limited
  return fallbackGenerateDraft(userPrompt, availableColumns);
}

export async function personalizeEmailForContact(req: PersonalizeRequest): Promise<{ subject: string; body: string }> {
  const { templateSubject, templateBody, contact, promptContext } = req;

  // First substitute variables directly
  let substitutedSubject = substituteVariables(templateSubject, contact);
  let substitutedBody = substituteVariables(templateBody, contact);

  // If Anthropic API key is provided and LLM personalization is requested, call Claude to rewrite
  if (anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: `You are an AI cold email personalization specialist.
Take this base email message and lightly customize it specifically for this recipient to make it feel 100% human-crafted and tailored to them.

Recipient Details:
- Name: ${contact.name || 'Friend'}
- Company: ${contact.company || 'their organization'}
- Role: ${contact.role || 'Professional'}
- Extra Data: ${JSON.stringify(contact.customFields || {})}

Base Email Subject: "${substitutedSubject}"
Base Email Body:
"${substitutedBody}"

Special Tone/Context Guidelines: ${promptContext || 'Keep it authentic, concise, and focused on value.'}

INSTRUCTIONS:
Output valid JSON only with keys "subject" and "body". Lightly adapt the opening or a line in the body to reference their specific role/company context seamlessly. Do NOT format as markdown block.`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        subject: parsed.subject || substitutedSubject,
        body: parsed.body || substitutedBody,
      };
    } catch (err) {
      console.warn('⚠️ Anthropic API call failed for row personalization, using variable substitution fallback.');
    }
  }

  // Smart variable substitution + natural phrasing touch
  return {
    subject: substitutedSubject,
    body: substitutedBody,
  };
}

export function substituteVariables(text: string, contact: PersonalizeRequest['contact']): string {
  let result = text;

  // Substitute standard keys
  result = result.replace(/\{\{\s*name\s*\}\}/gi, contact.name || 'there');
  result = result.replace(/\{\{\s*email\s*\}\}/gi, contact.email);
  result = result.replace(/\{\{\s*company\s*\}\}/gi, contact.company || 'your company');
  result = result.replace(/\{\{\s*role\s*\}\}/gi, contact.role || 'team');

  // Substitute custom fields
  if (contact.customFields) {
    Object.entries(contact.customFields).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, String(val ?? ''));
    });
  }

  // Clean up any unhandled tokens gracefully
  result = result.replace(/\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/g, '');
  return result;
}

function fallbackGenerateDraft(userPrompt: string, columns: string[]): GeneratedDraft {
  const nameTag = columns.includes('name') ? '{{name}}' : 'there';
  const companyTag = columns.includes('company') ? '{{company}}' : 'your company';
  const roleTag = columns.includes('role') ? ' (as {{role}})' : '';

  return {
    subject: `Scaling engagement at ${companyTag}`,
    bodyTemplate: `Hi ${nameTag},\n\nI noticed the impressive work you are leading at ${companyTag}${roleTag}.\n\nWe recently built a platform designed to streamline operations and drive higher conversion rates for team leaders like yourself.\n\nWould you be open to a quick 5-minute chat this Thursday to explore how this could benefit ${companyTag}?\n\nBest regards,\nThe Mailing Company Team`,
  };
}

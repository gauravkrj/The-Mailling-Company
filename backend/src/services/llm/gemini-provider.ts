import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, DraftParams, PersonalizeParams, LLMResult } from './llm-provider.js';

export class GeminiProvider implements ILLMProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI | null = null;
  private candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-flash'];

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key.trim()) {
      this.genAI = new GoogleGenerativeAI(key.trim());
    }
  }

  async generateDraft(params: DraftParams): Promise<LLMResult> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is missing or invalid in backend/.env');
    }

    const colList = params.availableColumns.map((c) => `{{${c}}}`).join(', ');
    const isPlainText = params.format === 'plain_text';

    const prompt = `You are an expert B2B cold email copywriter.
Campaign Goal: ${params.prompt}
Available sheet placeholder tags: ${colList}
Target Email Format: ${isPlainText ? 'Plain Text (no HTML formatting, no bold/italics markdown, natural personal 1-to-1 conversational style)' : 'Rich HTML'}

Instructions:
1. Write a high-converting cold email subject line using placeholders like {{company}} or {{full_name}}.
2. Write a professional cold email body template containing placeholders like {{full_name}}, {{company}}, and {{role}}.
3. ${isPlainText ? 'STRICTLY write in simple, direct human plain text without any HTML tags or markdown formatting.' : 'Write clean, persuasive email body copy.'}
4. DO NOT include any closing sign-off (such as "Best regards,", "Sincerely,", "Thanks,") or signature lines at the end of the email body copy, because a dedicated signature block will be appended automatically. End the body content right at your call-to-action question.
5. Output ONLY a valid JSON object with exact keys "subject" and "body". Do not include markdown code block formatting or extra text.

JSON format example:
{"subject": "Quick question regarding {{company}}", "body": "Hi {{full_name}},\\n\\nI noticed your work as {{role}} at {{company}}..."}`;

    let lastError: any = null;
    for (const modelName of this.candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.85 },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.parseJSONResponse(text, params.prompt);
      } catch (err: any) {
        lastError = err;
      }
    }

    console.error('[Gemini API Call Failed]:', lastError?.message || lastError);
    this.handleGeminiError(lastError);
    throw lastError;
  }

  async generatePersonalizedEmail(params: PersonalizeParams): Promise<LLMResult> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is missing or invalid in backend/.env');
    }

    const tone = params.tone || 'Professional';
    const contactData = params.contact || params.sampleContact || { name: 'Alex Rivera', company: 'Acme Corp', role: 'CMO' };
    const isPlainText = params.format === 'plain_text';

    const prompt = `You are an elite B2B sales email strategist.
Campaign Goal / Brief: ${params.prompt || 'Introduce our personalization platform'}
Tone: ${tone}
Recipient Contact Data: Name: ${contactData.name || contactData['full name'] || 'Alex'}, Company: ${contactData.company || 'Acme'}, Role: ${contactData.role || 'CMO'}
Target Format: ${isPlainText ? 'Plain Text (STRICTLY no HTML tags, no bold/italic markdown)' : 'Rich HTML'}

Instructions:
Write a uniquely personalized cold outreach email tailored specifically for this person based on their name, role, and company.
${isPlainText ? 'STRICTLY write in natural 1-to-1 conversational human plain text without any HTML tags (<p>, <br>, <strong>) or markdown.' : ''}
DO NOT output square bracket placeholders like [Your Name] or [Name].
Output ONLY a valid JSON object with exact keys "subject" and "body".

JSON format example:
{"subject": "Exclusive update for ${contactData.company || 'Acme'}", "body": "Hi ${contactData.name || 'Alex'},..."}`;

    let lastError: any = null;
    for (const modelName of this.candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.85 },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.parseJSONResponse(text, params.prompt || 'Personalized email', isPlainText);
      } catch (err: any) {
        lastError = err;
      }
    }

    console.error('[Gemini API Call Failed]:', lastError?.message || lastError);
    this.handleGeminiError(lastError);
    throw lastError;
  }

  private parseJSONResponse(rawText: string, fallbackPrompt: string, isPlainText = false): LLMResult {
    try {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.subject && parsed.body) {
        let cleanBody = String(parsed.body)
          .replace(/\[\s*(your\s*name|name|my\s*name|insert\s*name)\s*\]/gi, '')
          .trim();

        if (isPlainText) {
          cleanBody = cleanBody
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }

        return {
          subject: String(parsed.subject).trim(),
          body: cleanBody,
        };
      }
    } catch (e) {
      // Fallback regex parser
      const subjectMatch = rawText.match(/(?:subject|title):\s*(.+)/i);
      let bodyText = rawText;
      if (subjectMatch) {
        bodyText = rawText.replace(subjectMatch[0], '').trim();
      }
      bodyText = bodyText.replace(/\[\s*(your\s*name|name|my\s*name|insert\s*name)\s*\]/gi, '').trim();

      if (isPlainText) {
        bodyText = bodyText
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      return {
        subject: subjectMatch ? subjectMatch[1].trim() : 'Quick question regarding {{company}}',
        body: bodyText || rawText,
      };
    }

    return {
      subject: `Streamlining email outreach for {{company}}`,
      body: `Hi {{full name}},\n\nI noticed your work as {{role}} at {{company}} and wanted to reach out directly.\n\nGiven your focus at {{company}}, I thought our platform might be worth 5 minutes of your time. Would you be open to a quick 10-minute catch-up next Tuesday?\n\nBest regards,\nThe Mailling Company Team`,
    };
  }

  private handleGeminiError(err: any): void {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
      throw new Error('Daily AI generation limit or rate limit reached. Please try again later or use manual template.');
    }
    if (msg.includes('api_key') || msg.includes('invalid') || msg.includes('400')) {
      throw new Error('Invalid Gemini API Key configured in backend/.env.');
    }
  }
}

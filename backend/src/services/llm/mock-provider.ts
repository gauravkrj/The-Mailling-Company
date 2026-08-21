import { ILLMProvider, DraftParams, PersonalizeParams, LLMResult } from './llm-provider.js';

export class MockLLMProvider implements ILLMProvider {
  name = 'mock';

  async generateDraft(params: DraftParams): Promise<LLMResult> {
    const promptLower = params.prompt.toLowerCase();
    let subject = 'Quick question regarding {{company}}';
    let body = `Hi {{full name}},\n\nI noticed your work as {{role}} at {{company}} and wanted to reach out directly.\n\nWe help teams at {{company}} scale personalized outreach while maintaining high deliverability.\n\nGiven your focus at {{company}}, I thought our platform might be worth 5 minutes of your time. Would you be open to a quick 10-minute catch-up next Tuesday?\n\nBest regards,\nThe Mailling Company Team`;

    if (promptLower.includes('follow-up') || promptLower.includes('meeting')) {
      subject = 'Follow-up on our conversation for {{company}}';
      body = `Hi {{full name}},\n\nFollowing up on our recent communication regarding {{role}} initiatives at {{company}}.\n\nWould you have 10 minutes available this Thursday for a brief discussion?\n\nBest regards,\nThe Mailling Company Team`;
    }

    if (promptLower.includes('demo') || promptLower.includes('product')) {
      subject = 'Exclusive product demo invitation for {{full name}}';
      body = `Hi {{full name}},\n\nWe recently launched a new feature designed specifically for {{role}} leaders at {{company}}.\n\nWe would love to get your feedback on a brief live demo.\n\nBest regards,\nThe Mailling Company Team`;
    }

    return { subject, body };
  }

  async generatePersonalizedEmail(params: PersonalizeParams): Promise<LLMResult> {
    const contact = params.contact || params.sampleContact || {};
    const name = contact.name || contact['full name'] || contact['Full Name'] || 'Alex Rivera';
    const company = contact.company || contact['company_name'] || 'Acme Corp';
    const role = contact.role || contact['job_title'] || 'CMO';
    const tone = params.tone || 'Professional';

    return {
      subject: `Streamlining outreach for ${company}`,
      body: `Hi ${name},\n\nI noticed your work leading ${role} initiatives at ${company} and wanted to share how we are helping similar teams accelerate campaign workflows.\n\nOur platform personalizes emails per recipient automatically while maintaining top deliverability.\n\nWould you be open to a quick 10-minute introduction next Tuesday?\n\nBest regards,\nThe Mailling Company Team`,
    };
  }
}

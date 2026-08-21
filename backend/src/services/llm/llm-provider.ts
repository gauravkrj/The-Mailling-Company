export interface DraftParams {
  prompt: string;
  availableColumns: string[];
  format?: 'html' | 'plain_text';
}

export interface PersonalizeParams {
  prompt?: string;
  tone?: string;
  format?: 'html' | 'plain_text';
  contact?: Record<string, any>;
  sampleContact?: Record<string, any>;
  subject?: string;
  body?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export interface LLMResult {
  subject: string;
  body: string;
}

/**
 * Swappable Provider Interface (Phase 5B Task 1 Requirement)
 * Abstracts LLM interactions so providers (Gemini, Anthropic, OpenAI, Mock) can be swapped seamlessly.
 */
export interface ILLMProvider {
  name: string;
  generateDraft(params: DraftParams): Promise<LLMResult>;
  generatePersonalizedEmail(params: PersonalizeParams): Promise<LLMResult>;
}

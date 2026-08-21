import { describe, it, expect } from 'vitest';
import { substituteVariables } from '../services/llm.js';

describe('Variable Substitution & Link Wrapping', () => {
  it('substitutes {{name}}, {{company}}, and {{custom_field}} placeholders', () => {
    const template = 'Hi {{name}}, welcome to {{company}}! Your plan is {{plan_tier}}.';
    const contact = {
      email: 'test@example.com',
      name: 'Sarah',
      company: 'Stripe',
      customFields: { plan_tier: 'Enterprise' },
    };

    const result = substituteVariables(template, contact);
    expect(result).toBe('Hi Sarah, welcome to Stripe! Your plan is Enterprise.');
  });

  it('handles missing fields with sensible fallbacks without breaking template', () => {
    const template = 'Hello {{name}}, checking in regarding {{company}}.';
    const contact = { email: 'anonymous@domain.com' };

    const result = substituteVariables(template, contact);
    expect(result).toBe('Hello there, checking in regarding your company.');
  });
});

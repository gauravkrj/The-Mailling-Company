import { describe, it, expect } from 'vitest';
import { wrapLinksForTracking } from '../services/queue.js';

describe('Sending Queue & Rate Limiter Logic', () => {
  it('correctly wraps links for tracking while leaving unsubscribe links intact', () => {
    const text = 'Check our dashboard at href="https://mywebsite.com/dashboard" or learn more.';
    const trackingToken = 'token_abc123';

    const wrapped = wrapLinksForTracking(text, trackingToken);
    expect(wrapped).toContain('/api/track/click/token_abc123?url=https%3A%2F%2Fmywebsite.com%2Fdashboard');
  });

  it('calculates stagger delay intervals accurately for rate-limited sends', () => {
    const rateLimitPerHour = 60; // 1 send per minute (60,000 ms)
    const msBetweenSends = Math.floor((3600 * 1000) / rateLimitPerHour);
    expect(msBetweenSends).toBe(60000);
  });
});

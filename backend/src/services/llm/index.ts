import { ILLMProvider, DraftParams, PersonalizeParams, LLMResult } from './llm-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { MockLLMProvider } from './mock-provider.js';

// In-Memory Short-TTL Cache for Draft Generation (Task 6 Requirement: 10 minutes = 600,000 ms)
const draftCache = new Map<string, { result: LLMResult; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Rate Limiting Queue State (Task 3 Requirement: Throttle calls for Gemini Free Tier)
let lastCallTimestamp = 0;
const MIN_INTERVAL_BETWEEN_CALLS_MS = 1000; // 1 second minimum gap = max 60 calls/min, comfortably under limits

/**
 * Get Active Swappable Provider (Task 1 & 2 Requirement)
 */
export function getLLMProvider(): ILLMProvider {
  const providerName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  if (providerName === 'gemini' && apiKey) {
    return new GeminiProvider(apiKey);
  }

  return new MockLLMProvider();
}

/**
 * Throttle helper to enforce rate-limit delays between LLM API calls
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastCallTimestamp;
  if (timeSinceLast < MIN_INTERVAL_BETWEEN_CALLS_MS) {
    const delay = MIN_INTERVAL_BETWEEN_CALLS_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastCallTimestamp = Date.now();
}

/**
 * One-Time Draft Generation with Short-TTL Cache & Rate-Limiting (Task 4a & 6 Requirement)
 */
export async function generateAIDraft(params: DraftParams): Promise<LLMResult> {
  // 1. Check Short-TTL Cache
  const cacheKey = `draft:${params.prompt.trim().toLowerCase()}:${params.availableColumns.sort().join(',')}`;
  const cached = draftCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // 2. Enforce Rate Limit Queue
  await enforceRateLimit();

  // 3. Invoke Swappable Provider
  const provider = getLLMProvider();
  try {
    const result = await provider.generateDraft(params);
    
    // Store in short-TTL cache
    draftCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (err: any) {
    // Fallback to mock provider on quota exhaustion or network error
    if (provider.name !== 'mock') {
      console.warn(`[LLM Provider ${provider.name} failed]: ${err.message}. Using fallback generator.`);
      const fallback = new MockLLMProvider();
      return fallback.generateDraft(params);
    }
    throw err;
  }
}

/**
 * Per-Contact Generation & Personalization Preview (Task 4b Requirement)
 */
export async function previewAIPersonalization(params: PersonalizeParams): Promise<LLMResult> {
  await enforceRateLimit();

  const provider = getLLMProvider();
  try {
    return await provider.generatePersonalizedEmail(params);
  } catch (err: any) {
    if (provider.name !== 'mock') {
      console.warn(`[LLM Provider ${provider.name} failed]: ${err.message}. Using fallback generator.`);
      const fallback = new MockLLMProvider();
      return fallback.generatePersonalizedEmail(params);
    }
    throw err;
  }
}

export * from './llm-provider.js';

import { createHash } from 'crypto';

const MAX_PROMPT_CACHE_KEY_LENGTH = 64;

function cleanCacheKey(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, MAX_PROMPT_CACHE_KEY_LENGTH);
}

export function createPromptCacheKey(parts: Array<string | null | undefined>) {
  const stable = parts.filter(Boolean).join(':');
  if (!stable) return undefined;

  const cleaned = cleanCacheKey(stable);
  if (cleaned.length <= MAX_PROMPT_CACHE_KEY_LENGTH && cleaned.length >= 8) return cleaned;

  return createHash('sha256').update(stable).digest('hex').slice(0, MAX_PROMPT_CACHE_KEY_LENGTH);
}

export function createPromptCacheHeaders(cacheKey?: string) {
  if (!cacheKey) return undefined;
  return {
    session_id: cacheKey,
    'x-client-request-id': cacheKey,
    'x-session-affinity': cacheKey,
  };
}

export function createOpenAIPromptCacheOptions(cacheKey?: string) {
  if (!cacheKey) return {};
  return {
    promptCacheKey: cacheKey,
    promptCacheRetention: '24h' as const,
  };
}

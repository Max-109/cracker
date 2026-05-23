import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENAI_API_KEY || process.env.PROXY_API_KEY || '';

export type ProviderOverride = {
  baseURL?: string | null;
  apiKey?: string | null;
};

export const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey,
});

function isValidProviderUrl(baseURL?: string | null) {
  if (!baseURL) return false;
  try {
    const url = new URL(baseURL);
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
  } catch {
    return false;
  }
}

export function createOpenAIProviderOverride(override?: ProviderOverride | null) {
  const key = override?.apiKey?.trim();
  if (!key) return null;
  const baseURL = override?.baseURL?.trim().replace(/\/+$/, '') || undefined;
  if (!isValidProviderUrl(baseURL)) {
    throw new Error('Provider API URL must be a valid HTTPS URL. HTTP is only allowed in development.');
  }
  return createOpenAI({ baseURL, apiKey: key });
}

export function getOpenAIConfigError(override?: ProviderOverride | null): string | null {
  if (override?.apiKey?.trim()) {
    if (!override.baseURL?.trim()) {
      return 'Provider API URL is required when using a provider API key.';
    }
    if (!isValidProviderUrl(override.baseURL)) {
      return 'Provider API URL must be a valid HTTPS URL. HTTP is only allowed in development.';
    }
    return null;
  }

  if (!apiKey || apiKey === 'local' || apiKey.includes('REPLACE_WITH')) {
    return 'Missing OpenAI-compatible proxy API key. Connect an OpenAI account, add a provider API key, or set OPENAI_API_KEY in .env.';
  }

  return null;
}

export function openAIProviderOptions(options?: {
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  priority?: boolean;
}) {
  const requestedEffort = options?.reasoningEffort || 'medium';
  const reasoningEffort = requestedEffort === 'none' || requestedEffort === 'minimal' ? 'low' : requestedEffort;

  return {
    openai: {
      reasoningEffort,
      reasoningSummary: 'auto' as const,
      ...(options?.priority ? { serviceTier: 'priority' as const } : {}),
      forceReasoning: true,
    },
  };
}

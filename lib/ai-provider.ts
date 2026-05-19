import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENAI_API_KEY || process.env.PROXY_API_KEY || '';

export const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'http://130.61.143.0:8080/v1',
  apiKey,
});

export function getOpenAIConfigError(): string | null {
  if (!apiKey || apiKey === 'local' || apiKey.includes('REPLACE_WITH')) {
    return 'Missing OpenAI-compatible proxy API key. Set OPENAI_API_KEY in .env to the key expected by your server at OPENAI_BASE_URL.';
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
      ...(options?.priority ? { serviceTier: 'priority' as const } : {}),
      forceReasoning: true,
    },
  };
}

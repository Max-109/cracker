import { modelSupportsPriority } from '@/lib/model-capabilities';
import type { ReasoningEffort } from './types';

export function normalizeReasoningEffort(effort: string): ReasoningEffort {
  if (effort === 'none' || effort === 'minimal' || effort === 'low' || effort === 'medium' || effort === 'high' || effort === 'xhigh') {
    return effort;
  }
  return 'medium';
}

export function createOpenAIProviderOptions(effort: string, modelId: string, fastMode: boolean) {
  return {
    reasoningEffort: normalizeReasoningEffort(effort),
    // OpenAI reasoning models do not stream summaries unless this is explicitly enabled.
    // AI SDK maps these summaries to reasoning deltas when the upstream supports them.
    reasoningSummary: 'auto' as const,
    ...(fastMode && modelSupportsPriority(modelId) ? { serviceTier: 'priority' as const } : {}),
    forceReasoning: true,
  };
}

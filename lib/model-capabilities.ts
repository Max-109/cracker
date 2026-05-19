export type AppModelId = 'gpt-5.5' | 'gpt-5.4-mini' | 'gpt-5.3-codex-spark';

export const MODEL_CAPABILITIES: Record<string, {
  id: AppModelId;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsPriority: boolean;
}> = {
  'gpt-5.5': {
    id: 'gpt-5.5',
    name: 'Expert',
    description: 'GPT-5.5',
    supportsImages: true,
    supportsPriority: true,
  },
  'gpt-5.4-mini': {
    id: 'gpt-5.4-mini',
    name: 'Balanced',
    description: 'GPT-5.4 Mini',
    supportsImages: true,
    supportsPriority: false,
  },
  'gpt-5.3-codex-spark': {
    id: 'gpt-5.3-codex-spark',
    name: 'Ultra Fast',
    description: 'GPT-5.3 Codex Spark',
    supportsImages: false,
    supportsPriority: false,
  },
};

const LEGACY_MODEL_MAP: Record<string, AppModelId> = {
  'gemini-3-pro-preview': 'gpt-5.5',
  'gemini-3-flash-preview': 'gpt-5.4-mini',
  'gemini-2.5-flash-lite': 'gpt-5.3-codex-spark',
  'gemini-2.5-flash-lite-preview-09-2025': 'gpt-5.3-codex-spark',
};

export function normalizeModelId(modelId: string): string {
  return LEGACY_MODEL_MAP[modelId] || modelId.replace('openai/', '');
}

export function getModelCapabilities(modelId: string) {
  const normalized = normalizeModelId(modelId);
  return MODEL_CAPABILITIES[normalized] || {
    id: normalized,
    name: normalized,
    description: normalized,
    supportsImages: true,
    supportsPriority: false,
  };
}

export function modelSupportsImages(modelId: string) {
  return getModelCapabilities(modelId).supportsImages;
}

export function modelSupportsPriority(modelId: string) {
  return getModelCapabilities(modelId).supportsPriority;
}

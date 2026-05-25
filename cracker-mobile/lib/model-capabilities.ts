const PRIORITY_MODEL_IDS = new Set(['gpt-5.5']);

const LEGACY_MODEL_IDS: Record<string, string> = {
    'gemini-3-pro-preview': 'gpt-5.5',
};

export function normalizeModelId(modelId?: string | null) {
    const id = modelId || '';
    return LEGACY_MODEL_IDS[id] || id.replace('openai/', '');
}

export function modelSupportsPriority(modelId?: string | null) {
    return PRIORITY_MODEL_IDS.has(normalizeModelId(modelId));
}

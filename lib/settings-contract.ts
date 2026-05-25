const ALLOWED_FIELDS = [
  'currentModelId',
  'currentModelName',
  'reasoningEffort',
  'responseLength',
  'learningMode',
  'chatMode',
  'learningSubMode',
  'customInstructions',
  'userName',
  'userGender',
  'enabledMcpServers',
  'memoryEnabled',
  'codeWrap',
  'autoScroll',
  'fastMode',
  'accentColor',
] as const;

const stringFields = new Set(['currentModelId', 'currentModelName', 'reasoningEffort', 'chatMode', 'learningSubMode', 'customInstructions', 'userName', 'userGender', 'accentColor']);
const booleanFields = new Set(['learningMode', 'memoryEnabled', 'codeWrap', 'autoScroll', 'fastMode']);
const chatModes = new Set(['chat', 'image', 'learning', 'deep-search', 'cracking']);
const learningSubModes = new Set(['summary', 'flashcard', 'teaching']);
const reasoningEfforts = new Set(['low', 'medium', 'high', 'xhigh']);

export type SettingsUpdate = Record<string, unknown>;

export function validateSettingsUpdate(body: unknown): { ok: true; data: SettingsUpdate; changedFields: string[] } | { ok: false; issues: string[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, issues: ['body must be an object'] };
  }

  const input = body as Record<string, unknown>;
  const data: SettingsUpdate = {};
  const issues: string[] = [];

  for (const field of ALLOWED_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;

    if (stringFields.has(field)) {
      if (value !== null && typeof value !== 'string') {
        issues.push(`${field} must be a string or null`);
        continue;
      }
      if (field === 'accentColor' && typeof value === 'string' && !/^#[0-9a-fA-F]{6}$/.test(value)) {
        issues.push('accentColor must be a 6-digit hex color');
        continue;
      }
      if (field === 'chatMode' && typeof value === 'string' && !chatModes.has(value)) {
        issues.push('chatMode is invalid');
        continue;
      }
      if (field === 'learningSubMode' && typeof value === 'string' && !learningSubModes.has(value)) {
        issues.push('learningSubMode is invalid');
        continue;
      }
      if (field === 'reasoningEffort' && typeof value === 'string' && !reasoningEfforts.has(value)) {
        issues.push('reasoningEffort is invalid');
        continue;
      }
      data[field] = value;
      continue;
    }

    if (booleanFields.has(field)) {
      if (typeof value !== 'boolean') {
        issues.push(`${field} must be a boolean`);
        continue;
      }
      data[field] = value;
      continue;
    }

    if (field === 'responseLength') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
        issues.push('responseLength must be a number between 0 and 100');
        continue;
      }
      data[field] = Math.round(value);
      continue;
    }

    if (field === 'enabledMcpServers') {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        issues.push('enabledMcpServers must be an array of strings');
        continue;
      }
      data[field] = Array.from(new Set(value));
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, data, changedFields: Object.keys(data) };
}

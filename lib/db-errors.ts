export type DbErrorClassification =
  | {
      kind: 'quota_exceeded';
      status: 429;
      code: 'DB_TRANSFER_QUOTA_EXCEEDED';
      message: string;
    }
  | {
      kind: 'unknown';
      status: 500;
      code: 'DB_QUERY_FAILED';
      message: string;
    };

function getAllErrorMessages(error: unknown, maxDepth = 8): string[] {
  const messages: string[] = [];
  const visited = new Set<unknown>();

  let current: unknown = error;
  for (let depth = 0; depth < maxDepth; depth++) {
    if (!current || typeof current !== 'object') {
      if (typeof current === 'string' && current.trim()) messages.push(current);
      break;
    }

    if (visited.has(current)) break;
    visited.add(current);

    const maybeMessage = (current as any).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) messages.push(maybeMessage);

    const maybeCause = (current as any).cause;
    if (!maybeCause) break;
    current = maybeCause;
  }

  if (messages.length > 0) return messages;

  try {
    const fallback = JSON.stringify(error);
    return fallback ? [fallback] : [];
  } catch {
    return [String(error)];
  }
}

export function classifyDbError(error: unknown): DbErrorClassification {
  const messages = getAllErrorMessages(error);
  const normalizedJoined = messages.join(' | ').toLowerCase();

  if (
    normalizedJoined.includes('data transfer quota') ||
    normalizedJoined.includes('exceeded the data transfer quota')
  ) {
    return {
      kind: 'quota_exceeded',
      status: 429,
      code: 'DB_TRANSFER_QUOTA_EXCEEDED',
      message:
        'Database quota exceeded (data transfer). Upgrade your Neon plan, wait for the quota to reset, or switch to a different database.',
    };
  }

  return {
    kind: 'unknown',
    status: 500,
    code: 'DB_QUERY_FAILED',
    message: 'Database query failed.',
  };
}

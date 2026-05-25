import { redisGetJson, redisProvider, redisPublish, redisSetJson, redisStatus } from '@/lib/redis';

export type SettingsPayload = Record<string, unknown> & {
  _version: number;
  _etag: string;
};

const SETTINGS_TTL_SECONDS = 60 * 60 * 24;

function settingsKey(userId: string) {
  return `settings:v1:user:${userId}`;
}

function settingsChannel(userId: string) {
  return `settings:v1:events:${userId}`;
}

export function settingsVersion(settings: Record<string, unknown>) {
  const raw = settings.updatedAt;
  const time = raw instanceof Date ? raw.getTime() : typeof raw === 'string' ? Date.parse(raw) : Date.now();
  return Number.isFinite(time) ? time : Date.now();
}

export function settingsEtag(userId: string, version: number) {
  return `"settings:${userId}:${version}"`;
}

export function serializeSettings(settings: Record<string, unknown>, userId: string): SettingsPayload {
  const version = settingsVersion(settings);
  return {
    ...settings,
    updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,
    createdAt: settings.createdAt instanceof Date ? settings.createdAt.toISOString() : settings.createdAt,
    _version: version,
    _etag: settingsEtag(userId, version),
  };
}

function isSettingsPayload(value: unknown): value is SettingsPayload {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as SettingsPayload)._version === 'number' &&
    typeof (value as SettingsPayload)._etag === 'string'
  );
}

export async function getCachedSettings(userId: string) {
  const cached = await redisGetJson<SettingsPayload>(settingsKey(userId));
  return isSettingsPayload(cached) ? cached : null;
}

export async function setCachedSettings(userId: string, settings: SettingsPayload) {
  return redisSetJson(settingsKey(userId), settings, SETTINGS_TTL_SECONDS);
}

export async function publishSettingsUpdated(userId: string, payload: SettingsPayload, changedFields: string[]) {
  await redisPublish(settingsChannel(userId), {
    type: 'settings.updated',
    version: payload._version,
    updatedAt: payload.updatedAt ? String(payload.updatedAt) : null,
    changedFields,
  });
}

export function settingsHeaders(payload: SettingsPayload, redis: 'hit' | 'miss' | 'write' | 'disabled' | 'error' = 'disabled') {
  return {
    'Cache-Control': 'private, no-store',
    'ETag': payload._etag,
    'X-Settings-Version': String(payload._version),
    'X-Redis-Status': redisStatus() === 'enabled' ? redis : 'disabled',
    'X-Redis-Provider': redisProvider(),
  };
}

export function requestMatchesSettings(request: Request, payload: SettingsPayload) {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === payload._etag) return true;

  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  return since !== null && Number(since) === payload._version;
}

import { randomBytes } from 'crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

export const TEMP_ATTACHMENT_TTL_MS = 60 * 60 * 1000;
export const MAX_TEMP_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export const ALLOWED_TEMP_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const TEMP_DIR = path.join(os.tmpdir(), 'cracker-attachments');

export type TempAttachmentMeta = {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  createdAt: number;
};

function metaPath(id: string) {
  return path.join(TEMP_DIR, `${id}.json`);
}

function dataPath(id: string) {
  return path.join(TEMP_DIR, `${id}.bin`);
}

export function createTempAttachmentId() {
  return randomBytes(24).toString('base64url');
}

export function isValidTempAttachmentId(id: string) {
  return /^[a-zA-Z0-9_-]{16,80}$/.test(id);
}

export function getTempAttachmentIdFromUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value, 'http://local');
    if (url.pathname !== '/api/upload') return null;
    const id = url.searchParams.get('id');
    return id && isValidTempAttachmentId(id) ? id : null;
  } catch {
    return null;
  }
}

export async function saveTempAttachment(file: File) {
  if (!ALLOWED_TEMP_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }

  if (file.size > MAX_TEMP_ATTACHMENT_BYTES) {
    throw new Error('File too large');
  }

  await mkdir(TEMP_DIR, { recursive: true });

  const id = createTempAttachmentId();
  const meta: TempAttachmentMeta = {
    id,
    name: file.name,
    mediaType: file.type,
    size: file.size,
    createdAt: Date.now(),
  };

  await writeFile(dataPath(id), Buffer.from(await file.arrayBuffer()));
  await writeFile(metaPath(id), JSON.stringify(meta));

  return meta;
}

export async function readTempAttachment(id: string) {
  if (!isValidTempAttachmentId(id)) return null;

  try {
    const [metaRaw, data] = await Promise.all([
      readFile(metaPath(id), 'utf8'),
      readFile(dataPath(id)),
    ]);

    return {
      meta: JSON.parse(metaRaw) as TempAttachmentMeta,
      data,
    };
  } catch {
    return null;
  }
}

export async function deleteTempAttachment(id: string) {
  if (!isValidTempAttachmentId(id)) return;
  await Promise.allSettled([
    rm(metaPath(id), { force: true }),
    rm(dataPath(id), { force: true }),
  ]);
}

export async function deleteTempAttachments(ids: Iterable<string>) {
  await Promise.allSettled([...new Set(ids)].map((id) => deleteTempAttachment(id)));
}

export async function cleanupStaleTempAttachments(ttlMs = TEMP_ATTACHMENT_TTL_MS) {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
    const entries = await readdir(TEMP_DIR);
    const now = Date.now();
    const staleIds = new Set<string>();

    for (const entry of entries) {
      const fullPath = path.join(TEMP_DIR, entry);
      const info = await stat(fullPath).catch(() => null);
      if (!info || now - info.mtimeMs <= ttlMs) continue;
      const id = entry.replace(/\.(json|bin)$/, '');
      if (isValidTempAttachmentId(id)) staleIds.add(id);
    }

    await deleteTempAttachments(staleIds);
  } catch (error) {
    console.warn('[attachments] stale cleanup failed:', error);
  }
}

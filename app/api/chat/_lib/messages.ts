import { convertToModelMessages, type UIMessage } from 'ai';
import { getTempAttachmentIdFromUrl, readTempAttachment } from '@/lib/temp-attachments';
import { stripThinkingBlocks } from '@/lib/thinking-text';
import type { ChatInputMessage } from './types';

export async function prepareModelMessages(messages: ChatInputMessage[]) {
  logIncomingMessages(messages);
  const processedMessages = preprocessMessages(messages);
  const hydratedMessages = await hydrateBlobParts(processedMessages);
  console.log('[API] Processed messages:', hydratedMessages.length);

  const normalizedMessages = normalizeUiMessages(hydratedMessages);
  console.log('[API] Normalized messages:', normalizedMessages.length, 'messages');

  let modelMessages = await convertToModelMessages(normalizedMessages as unknown as UIMessage[]);
  modelMessages = flattenAssistantHistory(modelMessages);

  console.log('Message count:', modelMessages.length);
  for (let i = 0; i < modelMessages.length; i++) {
    const msg = modelMessages[i] as { role: string; content?: unknown };
    console.log(`Message ${i}: role=${msg.role}, content type=${typeof msg.content}, content length=${JSON.stringify(msg.content).length}`);
  }

  return { hydratedMessages, normalizedMessages, modelMessages };
}

function logIncomingMessages(messages: ChatInputMessage[]) {
  console.log('[API] Incoming messages:', JSON.stringify(messages.map((m) => ({
    role: m.role,
    hasParts: !!m.parts,
    partsCount: Array.isArray(m.parts) ? m.parts.length : 0,
    partTypes: Array.isArray(m.parts) ? m.parts.map((p) => (p as { type?: string })?.type) : [],
    hasContent: !!m.content,
    contentType: typeof m.content,
    contentIsArray: Array.isArray(m.content),
  })), null, 2));
}

function preprocessMessages(messages: ChatInputMessage[]) {
  return messages.map((msg) => {
    if (Array.isArray(msg.content)) {
      return { ...msg, parts: msg.content, content: undefined };
    }

    if (msg.content && typeof msg.content === 'object') {
      const contentObj = msg.content as Record<string, unknown>;
      if (contentObj.type === 'text' || contentObj.type === 'image' || contentObj.type === 'file') {
        return { ...msg, parts: [msg.content], content: undefined };
      }
    }

    return msg;
  });
}

async function hydrateBlobParts(messages: ChatInputMessage[]) {
  return Promise.all(messages.map(async (msg) => {
    if (!msg.parts || !Array.isArray(msg.parts)) return msg;

    const newParts = await Promise.all(msg.parts.map(async (part: unknown) => {
      const p = part as { type?: string; data?: string; url?: string; image?: string };
      const fileUrl = typeof p.data === 'string' ? p.data : typeof p.url === 'string' ? p.url : '';

      if (p.type === 'file' && fileUrl && shouldHydrateUrl(fileUrl)) {
        return hydrateFilePart(p);
      }

      if (p.type === 'image' && typeof p.image === 'string' && shouldHydrateUrl(p.image)) {
        return hydrateImagePart(p);
      }

      return part;
    }));

    return { ...msg, parts: newParts };
  }));
}

function shouldHydrateUrl(value: string) {
  return value.startsWith('http') || getTempAttachmentIdFromUrl(value) !== null;
}

async function readAttachmentBytes(value: string) {
  const tempId = getTempAttachmentIdFromUrl(value);
  if (tempId) {
    const attachment = await readTempAttachment(tempId);
    if (!attachment) throw new Error(`Temporary attachment not found: ${tempId}`);
    return attachment.data;
  }

  const response = await fetch(value);
  if (!response.ok) throw new Error(`Failed to fetch ${value}: ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

async function hydrateFilePart<T extends { data?: string; url?: string; mediaType?: string; mimeType?: string }>(part: T) {
  const source = part.data || part.url;
  console.log(`[API] Hydrating file attachment: ${source}`);
  try {
    if (!source) return part;
    const bytes = await readAttachmentBytes(source);
    const mediaType = part.mediaType || part.mimeType || 'application/octet-stream';
    return { ...part, data: undefined, url: `data:${mediaType};base64,${bytes.toString('base64')}` };
  } catch (e) {
    console.error('[API] Failed to hydrate file:', e);
    return part;
  }
}

async function hydrateImagePart<T extends { image?: string }>(part: T) {
  console.log(`[API] Hydrating image attachment: ${part.image}`);
  try {
    const bytes = await readAttachmentBytes(part.image!);
    return { ...part, image: bytes.toString('base64') };
  } catch (e) {
    console.error('[API] Failed to hydrate image:', e);
    return part;
  }
}

function normalizeUiMessages(messages: ChatInputMessage[]) {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      const parts = [{ type: 'text', text: msg.role === 'assistant' ? stripThinkingBlocks(msg.content) : msg.content }];
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
    }

    if (Array.isArray(msg.content)) {
      const parts = normalizePartsForModel(msg.content, msg.role);
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
    }

    if (msg.parts && Array.isArray(msg.parts)) {
      const parts = normalizePartsForModel(msg.parts, msg.role);
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
    }

    const parts = [{ type: 'text', text: String(msg.content || '') }];
    return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
  });
}

function normalizePartsForModel(parts: unknown[], role: string) {
  const normalizedParts = normalizeParts(parts);
  if (role !== 'user') return normalizedParts;

  const attachments = parts
    .map((part) => {
      const p = part as { type?: string; filename?: string; name?: string; mediaType?: string; mimeType?: string };
      if (p.type !== 'file' && p.type !== 'image') return null;
      return {
        name: p.filename || p.name || 'unnamed attachment',
        mediaType: p.mediaType || p.mimeType || 'application/octet-stream',
      };
    })
    .filter(Boolean) as Array<{ name: string; mediaType: string }>;

  if (attachments.length === 0) return normalizedParts;

  const manifest = {
    type: 'text',
    text: `\n\n[Attached files in this user message: ${attachments.length}]\n${attachments.map((file, index) => `${index + 1}. ${file.name} (${file.mediaType})`).join('\n')}\n`,
  };

  const firstNonTextIndex = normalizedParts.findIndex((part) => (part as { type?: string }).type !== 'text');
  if (firstNonTextIndex === -1) return [...normalizedParts, manifest];

  return [
    ...normalizedParts.slice(0, firstNonTextIndex),
    manifest,
    ...normalizedParts.slice(firstNonTextIndex),
  ];
}

function normalizeParts(parts: unknown[]) {
  return parts.map((part) => {
    const p = part as { type?: string; data?: string; url?: string; mediaType?: string; mimeType?: string; filename?: string; name?: string };
    const mediaType = p.mediaType || p.mimeType || '';
    const fileData = typeof p.data === 'string' ? p.data : typeof p.url === 'string' ? p.url : '';

    if (p.type === 'text' && typeof (p as { text?: unknown }).text === 'string') {
      return { ...p, text: stripThinkingBlocks(String((p as { text?: string }).text || '')) };
    }

    if (p.type === 'file' && fileData && isTextLikeAttachment(mediaType)) {
      const text = decodeAttachmentText(fileData);
      if (text !== null) {
        return {
          type: 'text',
          text: `[Attached file: ${p.filename || p.name || 'file'}]\n\n${text}`,
        };
      }
    }

    return part;
  });
}

function isTextLikeAttachment(mediaType: string) {
  return mediaType.startsWith('text/')
    || mediaType === 'application/json'
    || mediaType === 'application/javascript'
    || mediaType === 'application/xml'
    || mediaType === 'application/sql';
}

function decodeAttachmentText(data: string) {
  try {
    if (data.startsWith('data:')) {
      const commaIndex = data.indexOf(',');
      if (commaIndex === -1) return null;
      const meta = data.slice(0, commaIndex);
      const payload = data.slice(commaIndex + 1);
      return meta.includes(';base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
    }

    return Buffer.from(data, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function flattenAssistantHistory<T extends Array<{ role: string; content?: unknown }>>(modelMessages: T) {
  return modelMessages.map((msg) => {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;

    const text = msg.content
      .map((part) => {
        const p = part as { type?: string; text?: string };
        // Never send hidden reasoning back as assistant history. It can be very
        // large and some providers reject or stall on reasoning parts in prior
        // assistant messages. Keep only user-visible assistant text.
        if (p.type === 'text' && typeof p.text === 'string') return stripThinkingBlocks(p.text);
        return '';
      })
      .filter(Boolean)
      .join('\n');

    return { ...msg, content: text };
  }).filter((msg) => msg.role !== 'assistant' || (typeof msg.content === 'string' && msg.content.trim().length > 0)) as T;
}

export function extractTextFromLastUserMessage(messages: ChatInputMessage[]) {
  const lastUserMessage = messages.findLast((m) => m.role === 'user');
  if (!lastUserMessage) return '';

  if (typeof lastUserMessage.content === 'string') return lastUserMessage.content;

  if (Array.isArray(lastUserMessage.content)) {
    return textFromParts(lastUserMessage.content);
  }

  if (Array.isArray(lastUserMessage.parts)) {
    return textFromParts(lastUserMessage.parts);
  }

  return '';
}

function textFromParts(parts: unknown[]) {
  return parts
    .map((part) => {
      const p = part as { type?: string; text?: string };
      return p.type === 'text' && p.text ? p.text : '';
    })
    .filter(Boolean)
    .join(' ');
}

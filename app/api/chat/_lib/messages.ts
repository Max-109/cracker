import { convertToModelMessages, type UIMessage } from 'ai';
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
      const p = part as { type?: string; data?: string; image?: string };

      if (p.type === 'file' && typeof p.data === 'string' && p.data.startsWith('http')) {
        return hydrateFilePart(p);
      }

      if (p.type === 'image' && typeof p.image === 'string' && p.image.startsWith('http')) {
        return hydrateImagePart(p);
      }

      return part;
    }));

    return { ...msg, parts: newParts };
  }));
}

async function hydrateFilePart<T extends { data?: string }>(part: T) {
  console.log(`[API] Downloading file from Blob: ${part.data}`);
  try {
    const response = await fetch(part.data!);
    if (!response.ok) throw new Error(`Failed to fetch ${part.data}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return { ...part, data: Buffer.from(arrayBuffer).toString('base64') };
  } catch (e) {
    console.error('[API] Failed to download file:', e);
    return part;
  }
}

async function hydrateImagePart<T extends { image?: string }>(part: T) {
  console.log(`[API] Downloading image from Blob: ${part.image}`);
  try {
    const response = await fetch(part.image!);
    if (!response.ok) throw new Error(`Failed to fetch ${part.image}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return { ...part, image: Buffer.from(arrayBuffer).toString('base64') };
  } catch (e) {
    console.error('[API] Failed to download image:', e);
    return part;
  }
}

function normalizeUiMessages(messages: ChatInputMessage[]) {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      const parts = [{ type: 'text', text: msg.content }];
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
    }

    if (Array.isArray(msg.content)) {
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: msg.content, parts: msg.content };
    }

    if (msg.parts && Array.isArray(msg.parts)) {
      return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: msg.parts, parts: msg.parts };
    }

    const parts = [{ type: 'text', text: String(msg.content || '') }];
    return { id: msg.id || `msg-${Date.now()}`, role: msg.role, content: parts, parts };
  });
}

function flattenAssistantHistory<T extends Array<{ role: string; content?: unknown }>>(modelMessages: T) {
  return modelMessages.map((msg) => {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;

    const text = msg.content
      .map((part) => {
        const p = part as { type?: string; text?: string; reasoning?: string };
        if (typeof p.text === 'string') return p.text;
        if (typeof p.reasoning === 'string') return p.reasoning;
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

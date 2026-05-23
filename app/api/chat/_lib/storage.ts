import { messages as messagesTable } from '@/db/schema';
import { encryptContent, getOrCreateChatDek } from '@/lib/encryption';
import { splitThinkingBlocks } from '@/lib/thinking-text';
import { and, desc, eq } from 'drizzle-orm';
import type { LearningSubMode } from './types';

const MAX_REASONABLE_TOKENS_PER_SECOND = 500;

function normalizeTokensPerSecond(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_REASONABLE_TOKENS_PER_SECOND ? parsed : null;
}

function formatTokensPerSecond(value: unknown): string | null {
  const normalized = normalizeTokensPerSecond(value);
  return normalized == null ? null : String(Math.round(normalized * 10) / 10);
}

export async function getLatestAssistantStats(db: any, chatId: string) {
  const [lastMessage] = await db
    .select({
      tokensPerSecond: messagesTable.tokensPerSecond,
      model: messagesTable.model,
    })
    .from(messagesTable)
    .where(and(eq(messagesTable.chatId, chatId), eq(messagesTable.role, 'assistant')))
    .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
    .limit(1);

  const tokensPerSecond = normalizeTokensPerSecond(lastMessage?.tokensPerSecond);

  return {
    tokensPerSecond,
    tokenSpeed: tokensPerSecond,
    modelId: lastMessage?.model || null,
  };
}

export async function saveAssistantMessage(db: any, params: {
  chatId?: string;
  modelId: string;
  subMode: LearningSubMode;
  text?: string;
  reasoning?: unknown;
  files?: Array<{ mediaType: string; base64: string }>;
  toolCalls: Array<{ toolCallId: string; toolName: string; args?: unknown }>;
  toolResults: unknown[];
  tokensPerSecond: number | null;
}) {
  const { chatId, modelId, subMode, text, reasoning, files, toolCalls, toolResults, tokensPerSecond } = params;
  if (!chatId) return;

  try {
    const contentParts: Array<{
      type: string;
      text?: string;
      reasoning?: string;
      toolCallId?: string;
      toolName?: string;
      state?: string;
      args?: unknown;
      result?: unknown;
      mediaType?: string;
      url?: string;
    }> = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      contentParts.push({
        type: 'tool-invocation',
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        state: 'result',
        args: call.args,
        result: toolResults[i],
      });
    }

    const splitText = splitThinkingBlocks(text || '');
    const reasoningParts: string[] = [];

    if (reasoning && typeof reasoning === 'string') {
      reasoningParts.push(reasoning);
    } else if (Array.isArray(reasoning) && reasoning.length > 0) {
      const reasoningText = reasoning.map((r) => r.text || '').join('');
      if (reasoningText) reasoningParts.push(reasoningText);
    }
    if (splitText.thinking) reasoningParts.push(splitText.thinking);

    const reasoningText = reasoningParts.filter(Boolean).join('\n\n');
    if (reasoningText) contentParts.push({ type: 'reasoning', text: reasoningText, reasoning: reasoningText });

    if (splitText.text) contentParts.push({ type: 'text', text: splitText.text });

    if (files && files.length > 0) {
      console.log(`[API] Processing ${files.length} generated files`);
      for (const file of files) {
        const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
        contentParts.push({ type: 'file', mediaType: file.mediaType, url: dataUrl });
        console.log(`[API] Added generated image: ${file.mediaType}, ${file.base64.length} chars base64`);
      }
    }

    if (contentParts.length === 0) return;

    const dek = await getOrCreateChatDek(chatId);
    const encryptedContent = encryptContent(contentParts, dek);

    await db.insert(messagesTable).values({
      chatId,
      role: 'assistant',
      content: encryptedContent,
      model: modelId,
      learningSubMode: subMode,
      tokensPerSecond: formatTokensPerSecond(tokensPerSecond),
    });
  } catch (error) {
    console.error('Failed to save message to DB:', error);
  }
}

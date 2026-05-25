import { messages as messagesTable } from '@/db/schema';
import { encryptContent, getOrCreateChatDek } from '@/lib/encryption';
import { splitThinkingBlocks } from '@/lib/thinking-text';
import { and, desc, eq, gt } from 'drizzle-orm';
import type { LearningSubMode } from './types';
import { redisGetJson, redisSetJson } from '@/lib/redis';

const MAX_REASONABLE_TOKENS_PER_SECOND = 500;

function normalizeTokensPerSecond(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_REASONABLE_TOKENS_PER_SECOND ? parsed : null;
}

function formatTokensPerSecond(value: unknown): string | null {
  const normalized = normalizeTokensPerSecond(value);
  return normalized == null ? null : String(Math.round(normalized * 10) / 10);
}

function statsCacheKey(chatId: string) {
  return `chat:v1:${chatId}:latestAssistantStats`;
}

export async function getLatestAssistantStats(db: any, chatId: string, after?: Date) {
  const cached = await redisGetJson<{
    tokensPerSecond: number | null;
    tokenSpeed: number | null;
    modelId: string | null;
    messageId: string | null;
    createdAt: string | null;
  }>(statsCacheKey(chatId));

  if (cached?.createdAt) {
    const cachedCreatedAt = new Date(cached.createdAt);
    if (!after || cachedCreatedAt > after) {
      return { ...cached, createdAt: cachedCreatedAt };
    }
  }

  const [lastMessage] = await db
    .select({
      id: messagesTable.id,
      createdAt: messagesTable.createdAt,
      tokensPerSecond: messagesTable.tokensPerSecond,
      model: messagesTable.model,
    })
    .from(messagesTable)
    .where(and(
      eq(messagesTable.chatId, chatId),
      eq(messagesTable.role, 'assistant'),
      ...(after ? [gt(messagesTable.createdAt, after)] : []),
    ))
    .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
    .limit(1);

  const tokensPerSecond = normalizeTokensPerSecond(lastMessage?.tokensPerSecond);

  const stats = {
    tokensPerSecond,
    tokenSpeed: tokensPerSecond,
    modelId: lastMessage?.model || null,
    messageId: lastMessage?.id || null,
    createdAt: lastMessage?.createdAt || null,
  };

  if (stats.messageId) {
    await redisSetJson(statsCacheKey(chatId), {
      ...stats,
      createdAt: stats.createdAt instanceof Date ? stats.createdAt.toISOString() : stats.createdAt,
    }, 60 * 60);
  }

  return stats;
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

    const formattedTokensPerSecond = formatTokensPerSecond(tokensPerSecond);
    const [savedMessage] = await db.insert(messagesTable).values({
      chatId,
      role: 'assistant',
      content: encryptedContent,
      model: modelId,
      learningSubMode: subMode,
      tokensPerSecond: formattedTokensPerSecond,
    }).returning({ id: messagesTable.id, createdAt: messagesTable.createdAt });

    const normalizedTokensPerSecond = normalizeTokensPerSecond(formattedTokensPerSecond);
    await redisSetJson(statsCacheKey(chatId), {
      tokensPerSecond: normalizedTokensPerSecond,
      tokenSpeed: normalizedTokensPerSecond,
      modelId,
      messageId: savedMessage?.id || null,
      createdAt: savedMessage?.createdAt instanceof Date ? savedMessage.createdAt.toISOString() : savedMessage?.createdAt || null,
    }, 60 * 60);
  } catch (error) {
    console.error('Failed to save message to DB:', error);
  }
}

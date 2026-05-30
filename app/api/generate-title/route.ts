import { generateText } from "ai";
import { getDb } from '@/db';
import { chats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getOrCreateChatDek, encryptTitle } from '@/lib/encryption';
import { createOpenAIPromptCacheOptions, createPromptCacheHeaders, createPromptCacheKey } from '@/lib/ai-cache';
import { createOpenAIProviderOverride, openai, openAIProviderOptions } from '@/lib/ai-provider';
import { normalizeModelId } from '@/lib/model-capabilities';
import { createOpenAIAccountProvider } from '@/lib/openai-account';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { chatId, prompt, model, openAIAccountAuth, providerApiBaseUrl, providerApiKey } = await req.json() as { chatId?: string; prompt?: string; model?: string | null; openAIAccountAuth?: OpenAIAccountAuth | OpenAIAccountAuth[] | null; providerApiBaseUrl?: string | null; providerApiKey?: string | null };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const openAIAccountAuths = Array.isArray(openAIAccountAuth) ? openAIAccountAuth : openAIAccountAuth ? [openAIAccountAuth] : [];
    const overrideProvider = createOpenAIProviderOverride({ baseURL: providerApiBaseUrl, apiKey: providerApiKey });
    const provider = openAIAccountAuths.length > 0 ? createOpenAIAccountProvider(openAIAccountAuths) : overrideProvider || openai;
    const titleModel = normalizeModelId(model || 'gpt-5.3-codex-spark');
    const promptCacheKey = createPromptCacheKey(['title', chatId, titleModel]);
    const { text } = await generateText({
      model: provider.chat(titleModel),
      prompt: `Summarize this conversation start in 3-5 words for a title. Avoid using symbols like quotes, asterisks, plus, minus, colons, or special characters unless absolutely necessary. For example, write "2 plus 2" not "2+2". Text: "${prompt.substring(0, 300)}..."`,
      providerOptions: { openai: { ...openAIProviderOptions({ reasoningEffort: 'low' }).openai, ...createOpenAIPromptCacheOptions(promptCacheKey) } as any },
      headers: createPromptCacheHeaders(promptCacheKey),
    });

    const title = text.trim().replace(/^["']|["']$/g, '');

    if (chatId) {
      const dek = await getOrCreateChatDek(chatId);
      const encryptedTitle = encryptTitle(title, dek);
      await db.update(chats).set({ title: encryptedTitle }).where(eq(chats.id, chatId));
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}

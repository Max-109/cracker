import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { db } from '@/db';
import { chats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const openrouter = createOpenRouter({
  apiKey: "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",
});

export async function POST(req: Request) {
  try {
    const { chatId, prompt } = await req.json();
    
    if (!prompt) {
        return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const { text } = await generateText({
      model: openrouter("meta-llama/llama-3.2-3b-instruct:free"),
      prompt: `Summarize this conversation start in 3-5 words for a title. No quotes. Text: "${prompt.substring(0, 300)}..."`,
    });

    const title = text.trim().replace(/^["']|["']$/g, ''); // Remove quotes if any

    if (chatId) {
        await db.update(chats).set({ title }).where(eq(chats.id, chatId));
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}

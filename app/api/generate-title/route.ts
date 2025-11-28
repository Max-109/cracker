import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { db } from '@/db';
import { chats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || 'global',
});

export async function POST(req: Request) {
  try {
    const { chatId, prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const { text } = await generateText({
      model: vertex("gemini-2.5-flash-lite"),
      prompt: `Summarize this conversation start in 3-5 words for a title. No quotes. Text: "${prompt.substring(0, 300)}..."`,
      providerOptions: {
        vertex: {
          thinkingConfig: {
            thinkingBudget: 0, // Disable thinking for fast title generation
          },
          generationConfig: {
            maxOutputTokens: 20,
            temperature: 0.3,
          },
        },
      },
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

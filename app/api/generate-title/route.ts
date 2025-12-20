import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { getDb } from '@/db';
import { chats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getOrCreateChatDek, encryptTitle } from '@/lib/encryption';

// Initialize Google Generative AI with API key
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { chatId, prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const { text } = await generateText({
      model: google("gemini-2.5-flash-lite"),
      prompt: `Summarize this conversation start in 3-5 words for a title. Avoid using symbols like quotes, asterisks, plus, minus, colons, or special characters unless absolutely necessary. For example, write "2 plus 2" not "2+2". Text: "${prompt.substring(0, 300)}..."`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 512,
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
      // Encrypt the title before saving
      const dek = await getOrCreateChatDek(chatId);
      const encryptedTitle = encryptTitle(title, dek);
      await db.update(chats).set({ title: encryptedTitle }).where(eq(chats.id, chatId));
    }

    // Return plaintext title to frontend (they don't need to know about encryption)
    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}


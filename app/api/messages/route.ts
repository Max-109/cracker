import { getDb } from '@/db';
import { messages } from '@/db/schema';
import { NextResponse } from 'next/server';
import { getOrCreateChatDek, encryptContent } from '@/lib/encryption';

const MAX_REASONABLE_TOKENS_PER_SECOND = 500;

function formatTokensPerSecond(value: unknown): string | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_REASONABLE_TOKENS_PER_SECOND
    ? String(Math.round(parsed * 10) / 10)
    : null;
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { chatId, role, content, model, tokenSpeed, tokensPerSecond, learningSubMode } = await req.json();
    if (!chatId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create DEK for this chat and encrypt content
    const dek = await getOrCreateChatDek(chatId);
    const encryptedContent = encryptContent(content, dek);

    const [newMessage] = await db.insert(messages).values({
      chatId,
      role,
      content: encryptedContent,
      model: model || null,
      tokensPerSecond: role === 'assistant' ? null : formatTokensPerSecond(tokenSpeed ?? tokensPerSecond),
      learningSubMode: learningSubMode || null,
    }).returning();

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Save message error:", error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

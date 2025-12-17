import { getDb } from '@/db';
import { messages } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { chatId, role, content, model, tokensPerSecond, learningSubMode } = await req.json();
    if (!chatId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newMessage] = await db.insert(messages).values({
      chatId,
      role,
      content,
      model: model || null,
      tokensPerSecond: tokensPerSecond ? String(tokensPerSecond) : null,
      learningSubMode: learningSubMode || null,
    }).returning();

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Save message error:", error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

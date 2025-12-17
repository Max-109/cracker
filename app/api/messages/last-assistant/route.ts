import { getDb } from '@/db';
import { messages } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  try {
    const db = getDb();
    const { chatId } = await req.json();
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    // Find the last assistant message for this chat
    const lastAssistantMessages = await db
      .select()
      .from(messages)
      .where(and(eq(messages.chatId, chatId), eq(messages.role, 'assistant')))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (lastAssistantMessages.length > 0) {
      await db.delete(messages).where(eq(messages.id, lastAssistantMessages[0].id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete last assistant message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}

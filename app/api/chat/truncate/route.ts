import { getDb } from '@/db';
import { messages } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const { chatId, count } = await req.json();

    if (!chatId || typeof count !== 'number' || count <= 0) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    // 1. Find the IDs of the most recent 'count' messages
    const messagesToDelete = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(count);

    if (messagesToDelete.length > 0) {
      const ids = messagesToDelete.map(m => m.id);
      
      // 2. Delete them
      await db.delete(messages)
        .where(inArray(messages.id, ids));
    }

    return NextResponse.json({ success: true, deleted: messagesToDelete.length });
  } catch (error) {
    console.error("Truncate error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

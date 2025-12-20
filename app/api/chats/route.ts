import { getDb } from '@/db';
import { chats, messages } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { classifyDbError } from '@/lib/db-errors';
import { getChatDek, decryptTitle } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 15, 1), 100) : 100;

    const allChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, user.id))
      .orderBy(desc(chats.createdAt))
      .limit(limit);

    // Decrypt titles
    const decryptedChats = await Promise.all(
      allChats.map(async (chat) => {
        const dek = await getChatDek(chat.id);
        return {
          ...chat,
          title: decryptTitle(chat.title, dek),
        };
      })
    );

    return NextResponse.json(decryptedChats);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching chats.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to fetch chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats', code: classified.code }, { status: classified.status });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, mode } = await req.json();
    const [newChat] = await db
      .insert(chats)
      .values({
        title: title || 'New Chat',
        userId: user.id,
        mode: mode || 'chat',
      })
      .returning();
    return NextResponse.json(newChat);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while creating chat.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to create chat:', error);
    return NextResponse.json({ error: 'Failed to create chat', code: classified.code }, { status: classified.status });
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all chat IDs for the current user
    const userChats = await db
      .select({ id: chats.id })
      .from(chats)
      .where(eq(chats.userId, user.id));

    if (userChats.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const chatIds = userChats.map(c => c.id);

    // Delete messages then chats
    await db.delete(messages).where(inArray(messages.chatId, chatIds));
    await db.delete(chats).where(eq(chats.userId, user.id));

    return NextResponse.json({ success: true, deleted: chatIds.length });
  } catch (e) {
    const classified = classifyDbError(e);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while deleting chats.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to delete all chats:', e);
    return NextResponse.json({ error: 'Failed to delete chats', code: classified.code }, { status: classified.status });
  }
}

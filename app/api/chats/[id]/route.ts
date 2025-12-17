import { getDb } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { classifyDbError } from '@/lib/db-errors';

// Helper to verify chat ownership
async function verifyChatOwnership(chatId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId));
  return chat?.userId === userId;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Run ownership check and message fetch in parallel for better performance
    const [isOwner, chatMessages] = await Promise.all([
      verifyChatOwnership(id, user.id),
      db
        .select()
        .from(messages)
        .where(eq(messages.chatId, id))
        .orderBy(asc(messages.createdAt))
    ]);

    // Verify ownership
    if (!isOwner) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chatMessages);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching messages.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages', code: classified.code }, { status: classified.status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    // Verify ownership
    if (!(await verifyChatOwnership(id, user.id))) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    await db
      .update(chats)
      .set({ title })
      .where(and(eq(chats.id, id), eq(chats.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while updating chat.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to update chat:', error);
    return NextResponse.json({ error: 'Failed to update chat', code: classified.code }, { status: classified.status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    if (!(await verifyChatOwnership(id, user.id))) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Delete messages then chat
    await db.delete(messages).where(eq(messages.chatId, id));
    await db.delete(chats).where(and(eq(chats.id, id), eq(chats.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (e) {
    const classified = classifyDbError(e);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while deleting chat.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to delete chat:', e);
    return NextResponse.json({ error: 'Failed to delete chat', code: classified.code }, { status: classified.status });
  }
}

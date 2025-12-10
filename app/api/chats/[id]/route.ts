import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to verify chat ownership
async function verifyChatOwnership(chatId: string, userId: string): Promise<boolean> {
  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId));
  return chat?.userId === userId;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
  } catch {
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
    console.error('Failed to delete chat:', e);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

import { db } from '@/db';
import { chats, messages, activeGenerations } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, user.id))
      .orderBy(desc(chats.createdAt))
      .limit(100);
    return NextResponse.json(allChats);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
  } catch {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Delete in order: activeGenerations -> messages -> chats (due to foreign key constraints)
    await db.delete(activeGenerations).where(inArray(activeGenerations.chatId, chatIds));
    await db.delete(messages).where(inArray(messages.chatId, chatIds));
    await db.delete(chats).where(eq(chats.userId, user.id));

    return NextResponse.json({ success: true, deleted: chatIds.length });
  } catch (e) {
    console.error('Failed to delete all chats:', e);
    return NextResponse.json({ error: 'Failed to delete chats' }, { status: 500 });
  }
}

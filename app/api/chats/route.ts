import { db } from '@/db';
import { chats } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
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

    const { title } = await req.json();
    const [newChat] = await db
      .insert(chats)
      .values({ 
        title: title || 'New Chat',
        userId: user.id,
      })
      .returning();
    return NextResponse.json(newChat);
  } catch {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

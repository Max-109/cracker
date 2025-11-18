import { db } from '@/db';
import { chats } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allChats = await db.select().from(chats).orderBy(desc(chats.createdAt));
    return NextResponse.json(allChats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    const [newChat] = await db.insert(chats).values({ title: title || 'New Chat' }).returning();
    return NextResponse.json(newChat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

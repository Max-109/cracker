import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const chatMessages = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
    return NextResponse.json(chatMessages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(messages).where(eq(messages.chatId, id));
        await db.delete(chats).where(eq(chats.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }
}

import { db } from '@/db';
import { chats, messages, activeGenerations } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const chatMessages = await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
    return NextResponse.json(chatMessages);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    
    await db.update(chats).set({ title }).where(eq(chats.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Delete in order: activeGenerations -> messages -> chats (due to foreign key constraints)
        await db.delete(activeGenerations).where(eq(activeGenerations.chatId, id));
        await db.delete(messages).where(eq(messages.chatId, id));
        await db.delete(chats).where(eq(chats.id, id));
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete chat:', e);
        return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }
}

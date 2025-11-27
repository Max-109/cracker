import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, activeGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST - Save partial content as stopped message when user stops generation
export async function POST(req: Request) {
  try {
    const { chatId, partialText, partialReasoning, model } = await req.json();
    
    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    // Build content parts
    const contentParts: Array<{ type: string; text?: string; reasoning?: string; stopped?: boolean }> = [];
    
    // Add reasoning if present
    if (partialReasoning) {
      contentParts.push({ type: 'reasoning', text: partialReasoning, reasoning: partialReasoning });
    }
    
    // Add text if present
    if (partialText) {
      contentParts.push({ type: 'text', text: partialText });
    }
    
    // Add stopped indicator
    contentParts.push({ type: 'stopped', stopped: true });
    
    // Only save if we have content
    if (contentParts.length > 1) { // More than just the stopped indicator
      await db.insert(messages).values({
        chatId,
        role: 'assistant',
        content: contentParts,
        model: model || null,
      });
    } else {
      // If no content, still save a stopped message
      await db.insert(messages).values({
        chatId,
        role: 'assistant',
        content: [{ type: 'stopped', stopped: true, text: '' }],
        model: model || null,
      });
    }
    
    // Clean up any active generation records for this chat
    await db.delete(activeGenerations).where(eq(activeGenerations.chatId, chatId));
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to save stopped message:', e);
    return NextResponse.json({ error: 'Failed to save stopped message' }, { status: 500 });
  }
}

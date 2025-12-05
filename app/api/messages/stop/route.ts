import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';

// POST - Save partial content as stopped message when user stops generation
export async function POST(req: Request) {
  try {
    const { chatId, partialText, partialReasoning, stopType, model } = await req.json();
    
    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    // Build content parts based on stopType:
    // - 'connection': stopped before any response (show stopped indicator)
    // - 'thinking': stopped during reasoning (show reasoning + interrupted indicator)
    // - 'streaming': stopped during text generation (just keep text, no indicator)
    const contentParts: Array<{ type: string; text?: string; reasoning?: string; stopType?: string }> = [];
    
    // Add reasoning if present
    if (partialReasoning) {
      contentParts.push({ type: 'reasoning', text: partialReasoning, reasoning: partialReasoning });
    }
    
    // Add text if present
    if (partialText) {
      contentParts.push({ type: 'text', text: partialText });
    }
    
    // Only add stopped indicator for connection and thinking phases
    if (stopType !== 'streaming') {
      contentParts.push({ type: 'stopped', stopType: stopType || 'connection' });
    }
    
    // Save the message
    await db.insert(messages).values({
      chatId,
      role: 'assistant',
      content: contentParts.length > 0 ? contentParts : [{ type: 'stopped', stopType: 'connection' }],
      model: model || null,
    });
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to save stopped message:', e);
    return NextResponse.json({ error: 'Failed to save stopped message' }, { status: 500 });
  }
}

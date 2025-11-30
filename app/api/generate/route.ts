import { NextResponse } from "next/server";
import { db } from "@/db";
import { activeGenerations, messages as messagesTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// How long before we consider a generation stale (server died mid-stream)
// Use different timeouts: longer for initial waiting (before first chunk), shorter once streaming
const STALE_THRESHOLD_INITIAL_MS = 120000; // 2 minutes for initial waiting (Gemini thinking)
const STALE_THRESHOLD_STREAMING_MS = 30000; // 30 seconds once streaming has started

// GET - Check active generation status (for resume support)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const generationId = url.searchParams.get('generationId');
  const chatId = url.searchParams.get('chatId');

  if (generationId) {
    // Get specific generation
    const [gen] = await db.select().from(activeGenerations).where(eq(activeGenerations.id, generationId));
    if (!gen) {
      return NextResponse.json({ status: 'none' });
    }
    
    // Check if generation is stale - use different timeouts based on streaming state
    const hasStartedStreaming = gen.firstChunkAt || gen.partialText || gen.partialReasoning;
    const staleThreshold = hasStartedStreaming ? STALE_THRESHOLD_STREAMING_MS : STALE_THRESHOLD_INITIAL_MS;
    const referenceTime = hasStartedStreaming 
      ? (gen.lastUpdateAt ? new Date(gen.lastUpdateAt).getTime() : gen.startedAt.getTime())
      : gen.startedAt.getTime();
    const isStale = Date.now() - referenceTime > staleThreshold;
    
    if (isStale && gen.status === 'streaming') {
      // Generation is stale - save partial content as final message and cleanup
      console.log(`[Generate] Stale generation detected: ${gen.id}, saving partial content`);
      
      try {
        // Save partial content as message if we have any
        if (gen.partialText || gen.partialReasoning) {
          const contentParts: Array<{ type: string; text?: string; reasoning?: string; stopType?: string }> = [];
          if (gen.partialReasoning) {
            contentParts.push({ type: 'reasoning', text: gen.partialReasoning, reasoning: gen.partialReasoning });
          }
          if (gen.partialText) {
            contentParts.push({ type: 'text', text: gen.partialText });
          }
          // Add stopped indicator so UI knows this was an interrupted generation
          contentParts.push({ type: 'stopped', stopType: 'stale' });
          
          await db.insert(messagesTable).values({
            chatId: gen.chatId,
            role: 'assistant',
            content: contentParts,
            model: gen.modelId,
          });
        }
        
        // Delete the stale record
        await db.delete(activeGenerations).where(eq(activeGenerations.id, gen.id));
        
        return NextResponse.json({ status: 'none' }); // Treated as completed
      } catch (e) {
        console.error('[Generate] Failed to cleanup stale generation:', e);
      }
    }
    
    return NextResponse.json({
      id: gen.id,
      status: gen.status,
      modelId: gen.modelId,
      partialText: gen.partialText,
      partialReasoning: gen.partialReasoning,
      tokensPerSecond: gen.tokensPerSecond,
      totalTokens: gen.totalTokens,
      error: gen.error,
      startedAt: gen.startedAt,
      lastUpdateAt: gen.lastUpdateAt,
      completedAt: gen.completedAt,
    });
  }

  if (chatId) {
    // Get active generation for chat (if any)
    const gens = await db.select()
      .from(activeGenerations)
      .where(eq(activeGenerations.chatId, chatId))
      .orderBy(desc(activeGenerations.createdAt))
      .limit(1);
    
    if (gens.length === 0) {
      return NextResponse.json({ status: 'none' });
    }
    
    const gen = gens[0];
    
    // Check if generation is stale - use different timeouts based on streaming state
    const hasStartedStreaming = gen.firstChunkAt || gen.partialText || gen.partialReasoning;
    const staleThreshold = hasStartedStreaming ? STALE_THRESHOLD_STREAMING_MS : STALE_THRESHOLD_INITIAL_MS;
    const referenceTime = hasStartedStreaming 
      ? (gen.lastUpdateAt ? new Date(gen.lastUpdateAt).getTime() : gen.startedAt.getTime())
      : gen.startedAt.getTime();
    const isStale = Date.now() - referenceTime > staleThreshold;
    
    if (isStale && gen.status === 'streaming') {
      // Generation is stale - save partial content and cleanup
      console.log(`[Generate] Stale generation detected for chat: ${chatId}, saving partial content`);
      
      try {
        if (gen.partialText || gen.partialReasoning) {
          const contentParts: Array<{ type: string; text?: string; reasoning?: string; stopType?: string }> = [];
          if (gen.partialReasoning) {
            contentParts.push({ type: 'reasoning', text: gen.partialReasoning, reasoning: gen.partialReasoning });
          }
          if (gen.partialText) {
            contentParts.push({ type: 'text', text: gen.partialText });
          }
          // Add stopped indicator so UI knows this was an interrupted generation
          contentParts.push({ type: 'stopped', stopType: 'stale' });
          
          await db.insert(messagesTable).values({
            chatId: gen.chatId,
            role: 'assistant',
            content: contentParts,
            model: gen.modelId,
          });
        }
        
        await db.delete(activeGenerations).where(eq(activeGenerations.id, gen.id));
        return NextResponse.json({ status: 'none' });
      } catch (e) {
        console.error('[Generate] Failed to cleanup stale generation:', e);
      }
    }
    
    return NextResponse.json({
      id: gen.id,
      status: gen.status,
      modelId: gen.modelId,
      partialText: gen.partialText,
      partialReasoning: gen.partialReasoning,
      tokensPerSecond: gen.tokensPerSecond,
      totalTokens: gen.totalTokens,
      error: gen.error,
      startedAt: gen.startedAt,
      lastUpdateAt: gen.lastUpdateAt,
      completedAt: gen.completedAt,
    });
  }

  return NextResponse.json({ error: "generationId or chatId required" }, { status: 400 });
}

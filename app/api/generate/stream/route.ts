import { db } from "@/db";
import { activeGenerations, messages as messagesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 300; // 5 minutes max

// How long before we consider a generation stale
// Use a longer timeout for the "waiting for first chunk" phase (Gemini thinking server-side)
const STALE_THRESHOLD_INITIAL_MS = 120000; // 2 minutes for initial waiting (Gemini can think for a long time)
const STALE_THRESHOLD_STREAMING_MS = 30000; // 30 seconds once streaming has started

// How often to poll the database for updates
const POLL_INTERVAL_MS = 300; // 300ms for smooth streaming experience

// SSE endpoint for reconnecting to an active generation
export async function GET(req: Request) {
  const url = new URL(req.url);
  const generationId = url.searchParams.get('generationId');
  const chatId = url.searchParams.get('chatId');

  if (!generationId && !chatId) {
    return new Response(JSON.stringify({ error: 'generationId or chatId required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let isStreamClosed = false;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Track what we've already sent to avoid duplicates
      let lastSentText = '';
      let lastSentReasoning = '';
      let lastUpdateTime = Date.now();

      const sendEvent = (event: Record<string, unknown>) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed
          isStreamClosed = true;
        }
      };

      const cleanup = async (gen: typeof activeGenerations.$inferSelect | null, reason: 'completed' | 'stale' | 'not_found') => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }

        if (reason === 'stale' && gen && (gen.partialText || gen.partialReasoning)) {
          // Save partial content as final message
          console.log(`[GenerateStream] Stale generation ${gen.id}, saving partial content`);
          try {
            const contentParts: Array<{ type: string; text?: string; reasoning?: string }> = [];
            if (gen.partialReasoning) {
              contentParts.push({ type: 'reasoning', text: gen.partialReasoning, reasoning: gen.partialReasoning });
            }
            if (gen.partialText) {
              contentParts.push({ type: 'text', text: gen.partialText });
            }
            // Add stopped indicator
            contentParts.push({ type: 'stopped', stopType: 'stale' } as { type: string; text?: string; reasoning?: string });
            
            await db.insert(messagesTable).values({
              chatId: gen.chatId,
              role: 'assistant',
              content: contentParts,
              model: gen.modelId,
            });
          } catch (e) {
            console.error('[GenerateStream] Failed to save stale message:', e);
          }
        }

        // Delete the generation record
        if (gen) {
          try {
            await db.delete(activeGenerations).where(eq(activeGenerations.id, gen.id));
          } catch (e) {
            console.error('[GenerateStream] Failed to delete generation:', e);
          }
        }

        sendEvent({ type: 'done', reason });
        
        try {
          controller.close();
        } catch {
          // Already closed
        }
        isStreamClosed = true;
      };

      // Initial fetch to get the generation
      let gen: typeof activeGenerations.$inferSelect | null = null;
      
      if (generationId) {
        const [result] = await db.select().from(activeGenerations).where(eq(activeGenerations.id, generationId));
        gen = result || null;
      } else if (chatId) {
        const results = await db.select()
          .from(activeGenerations)
          .where(eq(activeGenerations.chatId, chatId))
          .orderBy(activeGenerations.createdAt)
          .limit(1);
        gen = results[0] || null;
      }

      if (!gen) {
        sendEvent({ type: 'error', message: 'Generation not found' });
        await cleanup(null, 'not_found');
        return;
      }

      // Check if already completed
      if (gen.status === 'completed') {
        sendEvent({ type: 'done', reason: 'completed' });
        await cleanup(gen, 'completed');
        return;
      }

      // Check if already failed
      if (gen.status === 'failed') {
        sendEvent({ type: 'error', message: gen.error || 'Generation failed' });
        await cleanup(gen, 'completed');
        return;
      }

      // Log initial state for debugging
      console.log(`[GenerateStream] Connecting to generation ${gen.id}:`);
      console.log(`[GenerateStream]   - startedAt: ${gen.startedAt.toISOString()}`);
      console.log(`[GenerateStream]   - firstChunkAt: ${gen.firstChunkAt?.toISOString() || 'null'}`);
      console.log(`[GenerateStream]   - lastUpdateAt: ${gen.lastUpdateAt?.toISOString() || 'null'}`);
      console.log(`[GenerateStream]   - partialText: ${gen.partialText?.length || 0} chars`);
      console.log(`[GenerateStream]   - partialReasoning: ${gen.partialReasoning?.length || 0} chars`);
      
      // Send initial state
      sendEvent({
        type: 'init',
        generationId: gen.id,
        chatId: gen.chatId,
        modelId: gen.modelId,
        status: gen.status,
        startedAt: gen.startedAt.toISOString(),
      });

      // Send initial content if any, or waiting status if no content yet
      if (gen.partialText || gen.partialReasoning) {
        sendEvent({
          type: 'content',
          text: gen.partialText || '',
          reasoning: gen.partialReasoning || '',
          isIncremental: false, // Full content, not incremental
        });
        lastSentText = gen.partialText || '';
        lastSentReasoning = gen.partialReasoning || '';
      } else {
        // No content yet - send waiting status so client knows we're connected
        sendEvent({
          type: 'waiting',
          message: 'Waiting for generation to start...',
          hasFirstChunk: !!gen.firstChunkAt,
        });
      }

      // Poll for updates
      pollInterval = setInterval(async () => {
        if (isStreamClosed) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        try {
          const [currentGen] = await db.select().from(activeGenerations).where(eq(activeGenerations.id, gen!.id));
          
          if (!currentGen) {
            // Generation was deleted (completed by main route)
            await cleanup(null, 'completed');
            return;
          }

          // Check for stale generation
          // Use different timeouts: longer for initial waiting (before first chunk), shorter once streaming
          const hasStartedStreaming = currentGen.firstChunkAt || currentGen.partialText || currentGen.partialReasoning;
          const staleThreshold = hasStartedStreaming ? STALE_THRESHOLD_STREAMING_MS : STALE_THRESHOLD_INITIAL_MS;
          
          // For initial phase, use startedAt. Once streaming, use lastUpdateAt
          const referenceTime = hasStartedStreaming 
            ? (currentGen.lastUpdateAt ? new Date(currentGen.lastUpdateAt).getTime() : currentGen.startedAt.getTime())
            : currentGen.startedAt.getTime();
          const timeSinceUpdate = Date.now() - referenceTime;
          
          if (timeSinceUpdate > staleThreshold && currentGen.status === 'streaming') {
            console.log(`[GenerateStream] Generation ${currentGen.id} is STALE:`);
            console.log(`[GenerateStream]   - timeSinceUpdate: ${timeSinceUpdate}ms`);
            console.log(`[GenerateStream]   - threshold: ${staleThreshold}ms`);
            console.log(`[GenerateStream]   - hasStartedStreaming: ${!!hasStartedStreaming}`);
            console.log(`[GenerateStream]   - firstChunkAt: ${currentGen.firstChunkAt?.toISOString() || 'null'}`);
            console.log(`[GenerateStream]   - lastUpdateAt: ${currentGen.lastUpdateAt?.toISOString() || 'null'}`);
            console.log(`[GenerateStream]   - partialText: ${currentGen.partialText?.length || 0} chars`);
            console.log(`[GenerateStream]   - partialReasoning: ${currentGen.partialReasoning?.length || 0} chars`);
            await cleanup(currentGen, 'stale');
            return;
          }

          // Check if completed
          if (currentGen.status === 'completed') {
            // Send final content
            if (currentGen.partialText !== lastSentText || currentGen.partialReasoning !== lastSentReasoning) {
              const newText = currentGen.partialText || '';
              const newReasoning = currentGen.partialReasoning || '';
              
              // Send only the new parts (incremental)
              const textDelta = newText.slice(lastSentText.length);
              const reasoningDelta = newReasoning.slice(lastSentReasoning.length);
              
              if (textDelta || reasoningDelta) {
                sendEvent({
                  type: 'content',
                  text: textDelta,
                  reasoning: reasoningDelta,
                  isIncremental: true,
                });
              }
            }
            
            // Send completion info
            sendEvent({
              type: 'complete',
              tokensPerSecond: currentGen.tokensPerSecond,
              totalTokens: currentGen.totalTokens,
            });
            
            await cleanup(currentGen, 'completed');
            return;
          }

          // Check if failed
          if (currentGen.status === 'failed') {
            sendEvent({ type: 'error', message: currentGen.error || 'Generation failed' });
            await cleanup(currentGen, 'completed');
            return;
          }

          // Send incremental updates
          const newText = currentGen.partialText || '';
          const newReasoning = currentGen.partialReasoning || '';
          
          // Special handling for deep search - partialText contains JSON progress
          if (currentGen.modelId === 'deep-search') {
            if (newText !== lastSentText) {
              try {
                const progress = JSON.parse(newText);
                sendEvent({
                  type: 'deep-search-progress',
                  progress,
                });
              } catch {
                // Not valid JSON, send as regular text
                sendEvent({
                  type: 'content',
                  text: newText.slice(lastSentText.length),
                  reasoning: '',
                  isIncremental: true,
                });
              }
              lastSentText = newText;
              lastUpdateTime = Date.now();
            }
          } else if (newText !== lastSentText || newReasoning !== lastSentReasoning) {
            const textDelta = newText.slice(lastSentText.length);
            const reasoningDelta = newReasoning.slice(lastSentReasoning.length);
            
            if (textDelta || reasoningDelta) {
              sendEvent({
                type: 'content',
                text: textDelta,
                reasoning: reasoningDelta,
                isIncremental: true,
              });
              
              lastSentText = newText;
              lastSentReasoning = newReasoning;
              lastUpdateTime = Date.now();
            }
          } else if (!newText && !newReasoning) {
            // No content yet - send periodic heartbeat to keep connection alive
            // and let client know we're still waiting
            const now = Date.now();
            if (now - lastUpdateTime > 2000) { // Every 2 seconds
              sendEvent({
                type: 'heartbeat',
                status: 'waiting',
                hasFirstChunk: !!currentGen.firstChunkAt,
                elapsedMs: now - currentGen.startedAt.getTime(),
              });
              lastUpdateTime = now;
            }
          }

        } catch (err) {
          console.error('[GenerateStream] Poll error:', err);
          // Don't close on transient errors, just log
        }
      }, POLL_INTERVAL_MS);
    },

    cancel() {
      isStreamClosed = true;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

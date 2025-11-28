import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createVertex } from "@ai-sdk/google-vertex";
import { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { db } from "@/db";
import { messages as messagesTable, activeGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const maxDuration = 300;

// Track fetch timing for TPS calculation
let lastVertexFetchStartTime: number | null = null;
let lastVertexResponseTime: number | null = null;

// Debug fetch wrapper for Vertex AI API calls
function createDebugVertexFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const startTime = Date.now();
    lastVertexFetchStartTime = startTime;  // Track when fetch actually starts
    console.log(`[VERTEX_FETCH] === STARTING REQUEST ===`);
    console.log(`[VERTEX_FETCH] URL: ${url}`);
    console.log(`[VERTEX_FETCH] Method: ${init?.method || 'GET'}`);
    console.log(`[VERTEX_FETCH] Timestamp: ${new Date().toISOString()}`);
    
    try {
      console.log(`[VERTEX_FETCH] Calling fetch()...`);
      const response = await fetch(input, init);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      lastVertexResponseTime = Date.now();  // Track when we get 200 OK
      console.log(`[VERTEX_FETCH] === RESPONSE RECEIVED === (+${elapsed}s)`);
      console.log(`[VERTEX_FETCH] Status: ${response.status} ${response.statusText}`);
      console.log(`[VERTEX_FETCH] Content-Type: ${response.headers.get('content-type')}`);
      return response;
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      console.log(`[VERTEX_FETCH] === FETCH ERROR === (+${elapsed}s)`);
      console.log(`[VERTEX_FETCH] Error: ${error}`);
      throw error;
    }
  };
}

// Initialize Vertex AI provider with debug fetch and explicit credentials
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || 'global',
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  },
  fetch: createDebugVertexFetch(),
});

// Reference to the vertex provider for tools access
const vertexProvider = vertex;

// Custom fetch that filters out problematic file annotations from OpenRouter responses
function createFilteredFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    
    // Only filter streaming responses
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
      return response;
    }
    
    const filteredStream = filterSSEStream(response.body);
    
    return new Response(filteredStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

// Filter SSE stream to remove file annotations that cause validation errors
function filterSSEStream(inputStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const reader = inputStream.getReader();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(processSSEBuffer(buffer)));
            }
            controller.close();
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages (separated by double newlines)
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          
          for (const part of parts) {
            const processed = processSSEBuffer(part + '\n\n');
            if (processed) {
              controller.enqueue(encoder.encode(processed));
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function processSSEBuffer(text: string): string {
  // Process each line in the SSE message
  const lines = text.split('\n');
  const processedLines: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6); // Remove 'data: ' prefix
      if (jsonStr === '[DONE]') {
        processedLines.push(line);
        continue;
      }
      
      try {
        const parsed = JSON.parse(jsonStr);
        
        // Filter out file annotations from choices
        if (parsed.choices) {
          for (const choice of parsed.choices) {
            if (choice.delta?.annotations) {
              choice.delta.annotations = choice.delta.annotations.filter(
                (ann: { type: string }) => ann.type !== 'file'
              );
              if (choice.delta.annotations.length === 0) {
                delete choice.delta.annotations;
              }
            }
          }
        }
        
        processedLines.push('data: ' + JSON.stringify(parsed));
      } catch {
        // If parsing fails, pass through as-is
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  fetch: createFilteredFetch(),
});

const SYSTEM_PROMPT = `You are a highly knowledgeable and helpful AI assistant. Your goal is to provide accurate, clear, and insightful responses.

## Formatting Guidelines

**CRITICAL**: Always use inline code formatting with backticks for important information to make it visually distinct:

- Technical terms: \`API\`, \`HTTP\`, \`JSON\`, \`SQL\`
- Names of functions, methods, variables: \`useState\`, \`fetchData()\`, \`myVariable\`
- File names and paths: \`index.ts\`, \`/api/users\`
- Commands: \`npm install\`, \`git commit\`
- Key concepts and terminology: \`Big O notation\`, \`dependency injection\`
- Technologies, frameworks, libraries: \`React\`, \`PostgreSQL\`, \`TensorFlow\`
- Constants and special values: \`null\`, \`undefined\`, \`true\`, \`false\`
- Database/table/column names: \`users\`, \`created_at\`
- Environment variables: \`NODE_ENV\`, \`DATABASE_URL\`
- **Numbers and numeric values**: \`5\`, \`100\`, \`3.14\`, \`-112\`
- **Coefficients and assignments**: \`a = 2\`, \`b = -4\`, \`n = 10\`
- **Results and answers**: \`x = 5\`, \`Δ = -112\`, \`result = 42\`

## Section Headers - Use Backticks

**ALWAYS** wrap header text in backticks for visual emphasis:

CORRECT:
### \`Solution\`
### \`Example\`
### \`Result\`
### \`Step 1\`

WRONG:
### Solution ← NO, use ### \`Solution\`

## Mathematics - Use BOTH LaTeX AND Backticks

Use LaTeX for complex mathematical expressions that need proper rendering.
Use backticks for key values, coefficients, and results mentioned in text.

**LaTeX syntax rules:**
- Inline math (same line): $E = mc^2$ ← single $ on SAME line
- Block/display math (own line): use DOUBLE $$ for multi-line equations

CORRECT block math:
$$
\\Delta = b^2 - 4ac = 16 - 128 = -112
$$

WRONG block math (single $ with line breaks):
$
\\Delta = b^2 - 4ac
$
← This won't render! Use $$ for blocks.

**CRITICAL**: Inside backticks, use PLAIN TEXT or Unicode symbols, NEVER LaTeX commands!

CORRECT backtick usage (plain text/unicode):
- \`x = 1 + √7i\` ← Unicode √
- \`Δ = -112\` ← Unicode Δ
- \`a = 2\`, \`b = -4\`
- \`x² + 2x + 1 = 0\` ← Unicode superscript

WRONG backtick usage (LaTeX inside backticks):
- \`x = 1 + \\sqrt{7}i\` ← NO! \\sqrt doesn't render in backticks
- \`\\Delta = -112\` ← NO! Use Δ not \\Delta
- \`x^2 + 2x + 1\` ← NO! Use x² not x^2

Example of correct formatting:
- Given equation: \`2x² - 4x + 16 = 0\`
- Coefficients: \`a = 2\`, \`b = -4\`, \`c = 16\`
- The discriminant formula is $\\Delta = b^2 - 4ac$
- Calculating: $\\Delta = (-4)^2 - 4(2)(16) = 16 - 128 = -112$
- Since \`Δ = -112 < 0\`, there are no real roots
- Using quadratic formula: $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$
- Final roots: \`x = 1 + √7i\` and \`x = 1 - √7i\`

Key principle:
- LaTeX for formulas and calculations: $x^2 + 2x + 1$, $\\sqrt{7}$, $\\frac{a}{b}$
- Backticks with plain text for values/results: \`x = 5\`, \`Δ = -112\`, \`√7\`

## Response Style

1. **Be Direct**: Start with the answer or solution, then elaborate if needed.
2. **Be Precise**: Use exact terminology. Avoid vague language.
3. **Be Structured**: Use headings, lists, and code blocks to organize information.
4. **Be Comprehensive**: Cover edge cases and potential issues when relevant.
5. **Be Practical**: Provide working examples and actionable advice.

## Code Examples

When providing code:
- Include brief comments only for non-obvious logic
- Use proper syntax highlighting by specifying the language
- Show complete, runnable examples when possible
- Mention any dependencies or prerequisites

## Knowledge Boundaries

- Acknowledge when information might be outdated
- Distinguish between facts and opinions/recommendations
- If unsure, say so clearly rather than guessing`;

// Store the last completion stats for retrieval by chatId
const completionStatsStore = new Map<string, { modelId: string; tokensPerSecond: number; timestamp: number }>();

// Clean up old entries (older than 5 minutes)
function cleanupStatsStore() {
  const now = Date.now();
  for (const [key, value] of completionStatsStore.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      completionStatsStore.delete(key);
    }
  }
}

// Fetch generation stats from OpenRouter API with retry
async function fetchGenerationStats(generationId: string, maxRetries = 3, delayMs = 1000): Promise<{ nativeTokensCompletion: number; generationTime: number } | null> {
  const url = `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait before fetching (generation stats may not be immediately available)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      } else {
        // Initial delay to let OpenRouter process the generation
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 404 && attempt < maxRetries) {
        continue;
      }
      
      if (!response.ok) {
        if (attempt === maxRetries) return null;
        continue;
      }
      
      const data = await response.json();
      
      // Response format: { data: { generation_time, native_tokens_completion, ... } }
      const genData = data.data || data;
      const nativeTokensCompletion = genData.native_tokens_completion || genData.tokens_completion || 0;
      const generationTime = genData.generation_time || 0;
      
      if (nativeTokensCompletion > 0 && generationTime > 0) {
        return { nativeTokensCompletion, generationTime };
      }
      
      if (attempt === maxRetries) return { nativeTokensCompletion, generationTime };
      
    } catch {
      if (attempt === maxRetries) return null;
    }
  }
  
  return null;
}

// Helper to check if model is a Google model
function isGoogleModel(modelId: string): boolean {
  return modelId.startsWith("google/") || modelId.startsWith("gemini-");
}

// Helper to get the actual model ID for Google (strip "google/" prefix if present)
function getGoogleModelId(modelId: string): string {
  if (modelId.startsWith("google/")) {
    return modelId.replace("google/", "");
  }
  return modelId;
}

export async function POST(req: Request) {
  const requestReceivedAt = Date.now();
  const debugLog = (msg: string) => {
    const elapsed = ((Date.now() - requestReceivedAt) / 1000).toFixed(3);
    console.log(`[DEBUG +${elapsed}s] ${msg}`);
  };
  
  debugLog('=== REQUEST RECEIVED ===');
  
  try {
    debugLog('Parsing request body...');
    const { messages, model, reasoningEffort, chatId } = await req.json();
    const modelId = model || "x-ai/grok-4.1-fast";
    const effort = reasoningEffort || "medium";
    
    debugLog(`Model: ${modelId}, Effort: ${effort}, ChatId: ${chatId}`);
    debugLog(`Messages count: ${messages?.length || 0}`);

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    // Convert UI messages to model messages using the SDK helper
    debugLog('Converting UI messages to model messages...');
    const modelMessages = convertToModelMessages(messages as UIMessage[]);
    debugLog(`Converted ${modelMessages.length} model messages`);

    // Store the model immediately for this chat
    if (chatId) {
      cleanupStatsStore();
      completionStatsStore.set(chatId, {
        modelId,
        tokensPerSecond: 0,
        timestamp: Date.now()
      });
    }

    // Route to appropriate provider based on model
    const isGoogle = isGoogleModel(modelId);
    debugLog(`Provider: ${isGoogle ? 'VERTEX_AI' : 'OPENROUTER'}`);

    // Select the model based on provider
    debugLog('Creating model instance...');
    const selectedModel = isGoogle
      ? vertex(getGoogleModelId(modelId))
      : openrouter(modelId);
    debugLog('Model instance created');

    // Build tools object - add Google Search for Google/Vertex models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> | undefined = isGoogle
      ? {
          google_search: vertexProvider.tools.googleSearch({}),
        }
      : undefined;
    
    if (isGoogle) {
      debugLog('Google Search tool enabled (Vertex AI)');
    }

    // Track timing for TPS calculation
    const requestStartTime = Date.now();
    debugLog('=== CALLING streamText() ===');
    let firstChunkTime: number | null = null;
    
    // Track partial content for background resume support
    let partialText = '';
    let partialReasoning = '';
    const partialSources: Array<{ url: string; title: string }> = [];
    let lastDbUpdate = 0;
    const DB_UPDATE_INTERVAL = 1000; // Update DB every 1 second for smoother resume
    let chunkCount = 0;
    
    // Pre-generate UUID so we don't block on DB insert
    // Fire-and-forget: insert generation record without waiting
    const generationId: string | null = chatId ? randomUUID() : null;
    if (chatId && generationId) {
      // Non-blocking insert - don't await, let it run in background
      db.insert(activeGenerations).values({
        id: generationId,
        chatId,
        modelId,
        reasoningEffort: effort,
        status: 'streaming',
      }).catch(e => console.error('[Chat] Failed to create generation record:', e));
    }

    debugLog('streamText() configuration ready, initiating...');
    const result = streamText({
      model: selectedModel,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      providerOptions: isGoogle
        ? {
            google: {
              thinkingConfig: {
                includeThoughts: true,
                // Gemini 3 Pro uses thinkingLevel ("low" or "high")
                // Gemini 2.5 uses thinkingBudget (numeric)
                // For Gemini 3: map our effort to thinkingLevel
                ...(modelId.includes('gemini-3') 
                  ? { thinkingLevel: effort === 'low' ? 'low' : 'high' }
                  : { thinkingBudget: effort === 'high' ? 24576 : effort === 'medium' ? 8192 : 2048 }
                ),
              },
            },
          }
        : {
            openrouter: {
              reasoning: {
                effort: effort,
                exclude: false,
              },
            },
          },
      onChunk: async ({ chunk }) => {
        chunkCount++;
        // Track first chunk time (any type - including reasoning)
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
          const timeToFirstChunk = ((firstChunkTime - requestStartTime) / 1000).toFixed(3);
          debugLog(`=== FIRST CHUNK RECEIVED === (${timeToFirstChunk}s after streamText call)`);
          debugLog(`First chunk type: ${chunk.type}`);
          // Update first chunk time in DB
          if (generationId) {
            db.update(activeGenerations)
              .set({ firstChunkAt: new Date() })
              .where(eq(activeGenerations.id, generationId))
              .catch(() => {});
          }
        }
        
        // Log every 10th chunk to avoid spam but track progress
        if (chunkCount % 10 === 0) {
          debugLog(`Chunk #${chunkCount}, type: ${chunk.type}`);
        }
        
        const chunkAny = chunk as Record<string, unknown>;
        const chunkType = chunk.type as string;
        
        // Accumulate partial content based on chunk type
        if (chunkType === 'text-delta') {
          // AI SDK v5 uses 'text' property
          const textContent = chunkAny.text as string || chunkAny.textDelta as string || '';
          partialText += textContent;
        } else if (chunkType === 'reasoning' || chunkType === 'reasoning-delta') {
          const reasoningContent = chunkAny.text as string || '';
          partialReasoning += reasoningContent;
        } else if (chunkType === 'source' || chunkType === 'source-url') {
          // Capture source URLs for Google Search grounding
          const url = chunkAny.url as string || '';
          const title = chunkAny.title as string || url;
          if (url && !partialSources.some(s => s.url === url)) {
            partialSources.push({ url, title });
          }
        }
        
        // Periodically save partial content to DB (every 2 seconds)
        const now = Date.now();
        if (generationId && now - lastDbUpdate > DB_UPDATE_INTERVAL) {
          lastDbUpdate = now;
          console.log(`[Chat] Saving partial: text=${partialText.length}, reasoning=${partialReasoning.length}, sources=${partialSources.length}`);
          db.update(activeGenerations)
            .set({ 
              partialText, 
              partialReasoning,
              lastUpdateAt: new Date()
            })
            .where(eq(activeGenerations.id, generationId))
            .catch((e) => console.error('[Chat] Failed to update generation:', e));
        }
      },
      onFinish: async ({ response, providerMetadata, usage }) => {
        debugLog('=== STREAM FINISHED (onFinish) ===');
        debugLog(`Total chunks received: ${chunkCount}`);
        let tps = 0;
        const endTime = Date.now();
        
        // For Vertex AI: thinking happens server-side BEFORE first chunk arrives
        // So we must measure from requestStartTime to endTime for accurate TPS
        // For OpenRouter: first chunk arrives quickly, so firstChunk->end is accurate
        const totalGenerationTimeMs = endTime - requestStartTime;
        const streamingTimeMs = firstChunkTime ? endTime - firstChunkTime : totalGenerationTimeMs;
        
        // Handle Google/Gemini models (Vertex AI)
        if (isGoogle) {
          // === DEBUG: Log all available metadata ===
          debugLog('=== VERTEX AI TPS DEBUG ===');
          debugLog(`providerMetadata keys: ${providerMetadata ? Object.keys(providerMetadata).join(', ') : 'null'}`);
          debugLog(`usage object: ${JSON.stringify(usage)}`);
          debugLog(`response object keys: ${response ? Object.keys(response).join(', ') : 'null'}`);
          
          // Access Google metadata - usageMetadata contains token counts
          // Structure: providerMetadata.google.usageMetadata.thoughtsTokenCount
          const googleMeta = providerMetadata?.google as (GoogleGenerativeAIProviderMetadata & {
            usageMetadata?: {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              thoughtsTokenCount?: number;
              totalTokenCount?: number;
              cachedContentTokenCount?: number;
            };
          }) | undefined;
          
          debugLog(`googleMeta keys: ${googleMeta ? Object.keys(googleMeta).join(', ') : 'null'}`);
          debugLog(`googleMeta.usageMetadata: ${JSON.stringify(googleMeta?.usageMetadata)}`);
          
          // Get token counts from providerMetadata.google.usageMetadata (correct path per AI SDK docs)
          const usageMeta = googleMeta?.usageMetadata;
          let completionTokens = usageMeta?.candidatesTokenCount || usage?.outputTokens || 0;
          let thoughtsTokens = usageMeta?.thoughtsTokenCount || 0;
          
          // If API didn't return token counts, estimate from partial content (approx 4.5 chars per token)
          if (completionTokens === 0 && partialText.length > 0) {
            completionTokens = Math.round(partialText.length / 4.5);
            debugLog(`Estimated completionTokens from partialText (${partialText.length} chars): ${completionTokens}`);
          }
          if (thoughtsTokens === 0 && partialReasoning.length > 0) {
            thoughtsTokens = Math.round(partialReasoning.length / 4.5);
            debugLog(`Estimated thoughtsTokens from partialReasoning (${partialReasoning.length} chars): ${thoughtsTokens}`);
          }
          
          const totalOutputTokens = completionTokens + thoughtsTokens;
          
          debugLog(`Token counts: completionTokens=${completionTokens}, thoughtsTokens=${thoughtsTokens}, total=${totalOutputTokens}`);
          debugLog(`Timing: totalGenerationTimeMs=${totalGenerationTimeMs}, streamingTimeMs=${streamingTimeMs}`);
          debugLog(`Fetch timing: fetchStartTime=${lastVertexFetchStartTime}, responseTime=${lastVertexResponseTime}, endTime=${endTime}`);
          
          // Calculate time from when we received 200 OK (model started responding) to finish
          // This is the actual "generation time" - excludes network latency to reach Google
          const fetchToEndMs = lastVertexResponseTime ? endTime - lastVertexResponseTime : null;
          const fetchStartToEndMs = lastVertexFetchStartTime ? endTime - lastVertexFetchStartTime : null;
          
          debugLog(`fetchToEndMs (200 OK to finish): ${fetchToEndMs}ms`);
          debugLog(`fetchStartToEndMs (fetch call to finish): ${fetchStartToEndMs}ms`);
          
          // Use full request time (fetch start to finish) for accurate user-perceived TPS
          const generationTimeMs = fetchStartToEndMs || fetchToEndMs || totalGenerationTimeMs;
          
          if (totalOutputTokens > 0 && generationTimeMs > 0) {
            tps = totalOutputTokens / (generationTimeMs / 1000);
            const modelShort = modelId.split('/').pop() || modelId;
            debugLog(`TPS calculation: ${totalOutputTokens} / (${generationTimeMs} / 1000) = ${tps.toFixed(1)}`);
            console.log(`[${modelShort}] ${totalOutputTokens} tokens (${completionTokens} output + ${thoughtsTokens} thoughts) / ${(generationTimeMs / 1000).toFixed(2)}s = ${tps.toFixed(1)} t/s`);
          } else {
            debugLog(`TPS not calculated: totalOutputTokens=${totalOutputTokens}, generationTimeMs=${generationTimeMs}`);
          }
          
          // Reset fetch timing for next request
          lastVertexFetchStartTime = null;
          lastVertexResponseTime = null;
            
          // Log grounding metadata if present
          if (googleMeta?.groundingMetadata) {
            const gm = googleMeta.groundingMetadata;
            console.log(`[${modelId.split('/').pop()}] Google Search grounding:`, {
              queries: gm.webSearchQueries,
              chunks: gm.groundingChunks?.length || 0
            });
          }
        } else {
          // OpenRouter models
          let generationId: string | undefined;
          
          // Try to get generation ID from response
          generationId = response?.id;
          
          // Check providerMetadata for ID fallback
          const meta = providerMetadata?.openrouter as Record<string, unknown> | undefined;
          if (meta && !generationId) {
            generationId = (meta.id || meta.generationId) as string | undefined;
          }
          
          // Fetch stats from OpenRouter Generation API
          if (generationId) {
            const stats = await fetchGenerationStats(generationId);
            if (stats && stats.generationTime > 0 && stats.nativeTokensCompletion > 0) {
              // TPS = native_tokens_completion / (generation_time_ms / 1000)
              tps = stats.nativeTokensCompletion / (stats.generationTime / 1000);
              const modelShort = modelId.split('/').pop() || modelId;
              console.log(`[${modelShort}] ${stats.nativeTokensCompletion} tokens / ${(stats.generationTime / 1000).toFixed(2)}s = ${tps.toFixed(1)} t/s`);
            }
          }
          
          // Fallback: try to get stats from metadata if API didn't work
          if (tps === 0 && meta) {
            const genTime = (meta.generationTime || meta.generation_time) as number | undefined;
            const nativeTokens = (meta.nativeTokensCompletion || meta.native_tokens_completion || 
              (usage as Record<string, unknown>)?.completionTokens || 
              (usage as Record<string, unknown>)?.outputTokens) as number | undefined;
            
            if (genTime && genTime > 0 && nativeTokens && nativeTokens > 0) {
              tps = nativeTokens / (genTime / 1000);
              const modelShort = modelId.split('/').pop() || modelId;
              console.log(`[${modelShort}] ${nativeTokens} tokens / ${(genTime / 1000).toFixed(2)}s = ${tps.toFixed(1)} t/s (fallback)`);
            }
          }
        }
        
        // Update stats for client retrieval
        if (chatId) {
          completionStatsStore.set(chatId, {
            modelId,
            tokensPerSecond: Math.round(tps * 10) / 10,
            timestamp: Date.now()
          });
          
          // Save assistant message to DB server-side (survives client disconnect)
          try {
            // Build content parts from accumulated partial content
            const contentParts: Array<{ type: string; text?: string; reasoning?: string }> = [];
            
            // Add reasoning if present
            if (partialReasoning) {
              contentParts.push({ type: 'reasoning', text: partialReasoning, reasoning: partialReasoning });
            }
            
            // Add text
            if (partialText) {
              contentParts.push({ type: 'text', text: partialText });
            }
            
            // If we got content, save to DB
            if (contentParts.length > 0) {
              await db.insert(messagesTable).values({
                chatId,
                role: 'assistant',
                content: contentParts,
                model: modelId,
                tokensPerSecond: String(Math.round(tps * 10) / 10),
              });
              console.log(`[Chat] Saved assistant message to DB for chat ${chatId}`);
            }
            
            // Mark generation as completed and delete the record
            if (generationId) {
              await db.delete(activeGenerations)
                .where(eq(activeGenerations.id, generationId));
              console.log(`[Chat] Deleted generation record ${generationId}`);
            }
          } catch (dbError) {
            console.error('[Chat] Failed to save message to DB:', dbError);
            // Still try to delete the generation record even if save failed
            if (generationId) {
              try {
                await db.delete(activeGenerations)
                  .where(eq(activeGenerations.id, generationId));
                console.log(`[Chat] Deleted generation record ${generationId} (after error)`);
              } catch (e) {
                console.error('[Chat] Failed to delete generation record:', e);
              }
            }
          }
        }
      },
    });

    debugLog('streamText() returned result object');
    debugLog('=== RETURNING STREAM RESPONSE TO CLIENT ===');

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    console.log(`[DEBUG ERROR] Request failed at ${new Date().toISOString()}`);
    console.log(`[DEBUG ERROR] Error details:`, error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// GET endpoint to retrieve completion stats
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId');
  
  if (!chatId) {
    return new Response(JSON.stringify({ error: 'chatId required' }), { status: 400 });
  }
  
  const stats = completionStatsStore.get(chatId);
  if (stats) {
    completionStatsStore.delete(chatId); // One-time retrieval
    return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json' } });
  }
  
  return new Response(JSON.stringify({ modelId: null, tokensPerSecond: null }), { headers: { 'Content-Type': 'application/json' } });
}

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI, GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { streamText, convertToModelMessages, UIMessage } from "ai";

export const maxDuration = 300;

// Initialize Google Generative AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Reference to the google provider for tools access
const googleProvider = google;

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
  try {
    const { messages, model, reasoningEffort, chatId } = await req.json();
    const modelId = model || "x-ai/grok-4.1-fast";
    const effort = reasoningEffort || "medium";

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    // Convert UI messages to model messages using the SDK helper
    const modelMessages = convertToModelMessages(messages as UIMessage[]);

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

    // Select the model based on provider
    const selectedModel = isGoogle
      ? google(getGoogleModelId(modelId))
      : openrouter(modelId);

    // Build tools object - add Google Search for Google models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> | undefined = isGoogle
      ? {
          google_search: googleProvider.tools.googleSearch({}),
        }
      : undefined;

    // Track start time for Gemini TPS calculation
    const startTime = Date.now();

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
                thinkingBudget: effort === 'high' ? 24576 : effort === 'medium' ? 8192 : 2048,
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
      onFinish: async ({ response, providerMetadata, usage }) => {
        let tps = 0;
        const endTime = Date.now();
        const elapsedMs = endTime - startTime;
        
        // Handle Google/Gemini models
        if (isGoogle) {
          // Access Google metadata with flexible typing for extended properties
          const googleMeta = providerMetadata?.google as (GoogleGenerativeAIProviderMetadata & {
            thoughtsTokenCount?: number;
          }) | undefined;
          
          // Get token counts from usage or metadata
          // LanguageModelV2Usage uses outputTokens instead of completionTokens
          const completionTokens = usage?.outputTokens || 0;
          const thoughtsTokens = googleMeta?.thoughtsTokenCount || 0;
          const totalOutputTokens = completionTokens + thoughtsTokens;
          
          if (totalOutputTokens > 0 && elapsedMs > 0) {
            tps = totalOutputTokens / (elapsedMs / 1000);
            const modelShort = modelId.split('/').pop() || modelId;
            console.log(`[${modelShort}] ${totalOutputTokens} tokens (${completionTokens} output + ${thoughtsTokens} thoughts) / ${(elapsedMs / 1000).toFixed(2)}s = ${tps.toFixed(1)} t/s`);
            
            // Log grounding metadata if present
            if (googleMeta?.groundingMetadata) {
              console.log(`[${modelShort}] Used Google Search grounding`);
            }
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
        }
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
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

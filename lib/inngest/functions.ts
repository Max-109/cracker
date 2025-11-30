import { inngest } from "./client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, CoreMessage } from "ai";
import { db } from "@/db";
import { messages as messagesTable, activeGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";

// Initialize providers
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || 'global',
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  },
});

// Reference for tools
const vertexProvider = vertex;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Helper to check if model is Google
function isGoogleModel(modelId: string): boolean {
  return modelId.startsWith("google/") || modelId.startsWith("gemini-");
}

function getGoogleModelId(modelId: string): string {
  return modelId.startsWith("google/") ? modelId.replace("google/", "") : modelId;
}

// System prompt generator (simplified version)
function generateSystemPrompt(responseLength: number, userName: string, userGender: string, learningMode: boolean, customInstructions?: string): string {
  let userPersonalization = '';
  if (userName || (userGender && userGender !== 'not-specified')) {
    const possessive = userGender === 'male' ? 'his' : userGender === 'female' ? 'her' : 'their';
    userPersonalization = `\n## User`;
    if (userName) userPersonalization += `\n- Name: ${userName}`;
    if (userGender && userGender !== 'not-specified') userPersonalization += `\n- Gender: ${userGender}`;
    userPersonalization += `\n- Address the user by ${possessive} name when appropriate`;
  }

  let styleInstructions = '';
  if (responseLength <= 15) {
    styleInstructions = `\n## Response Style: MINIMAL (${responseLength}/100)\n- Maximum 1-2 sentences\n- Answer ONLY what was asked`;
  } else if (responseLength <= 30) {
    styleInstructions = `\n## Response Style: BRIEF (${responseLength}/100)\n- Maximum 2-4 sentences\n- Get to the point immediately`;
  } else if (responseLength <= 60) {
    styleInstructions = `\n## Response Style: BALANCED (${responseLength}/100)\n- A few short paragraphs maximum\n- Include key context but don't over-explain`;
  } else if (responseLength <= 85) {
    styleInstructions = `\n## Response Style: THOROUGH (${responseLength}/100)\n- Full explanations with proper context\n- Multiple examples when helpful`;
  } else {
    styleInstructions = `\n## Response Style: COMPREHENSIVE (${responseLength}/100)\n- Cover all angles and nuances thoroughly`;
  }

  let customSection = '';
  if (customInstructions?.trim()) {
    customSection = `\n## HIGHEST PRIORITY - User's Custom Instructions\n${customInstructions.trim()}\n---\n`;
  }

  return `${customSection}You are a knowledgeable AI assistant. Be accurate, clear, and helpful.

**CRITICAL**: Always respond in the SAME LANGUAGE as the user's message.
${userPersonalization}
${styleInstructions}

## Honesty
- If unsure, say so clearly`;
}

// The main background generation function
export const generateInBackground = inngest.createFunction(
  {
    id: "generate-ai-response",
    retries: 2,
  },
  { event: "chat/message.sent" },
  async ({ event, step }) => {
    const {
      chatId,
      generationId,
      modelId,
      reasoningEffort,
      responseLength,
      userName,
      userGender,
      learningMode,
      customInstructions,
      messages,
    } = event.data;

    console.log(`[Inngest] Starting background generation for chat ${chatId}, generation ${generationId}`);

    // Step 1: Mark generation as started
    await step.run("mark-started", async () => {
      await db.update(activeGenerations)
        .set({ status: 'streaming', startedAt: new Date() })
        .where(eq(activeGenerations.id, generationId));
      console.log(`[Inngest] Marked generation ${generationId} as started`);
    });

    // Step 2: Run the AI generation
    const result = await step.run("generate-response", async () => {
      const isGoogle = isGoogleModel(modelId);
      const selectedModel = isGoogle
        ? vertex(getGoogleModelId(modelId))
        : openrouter(modelId);

      const systemPrompt = generateSystemPrompt(
        responseLength,
        userName,
        userGender,
        learningMode,
        customInstructions
      );

      // Convert messages to CoreMessage format for AI SDK
      const modelMessages: CoreMessage[] = messages.map((m: { role: string; content: unknown }) => {
        // Handle different content formats
        let content: string;
        if (typeof m.content === 'string') {
          content = m.content;
        } else if (Array.isArray(m.content)) {
          // Extract text from parts array
          content = m.content
            .filter((p: { type?: string }) => p.type === 'text')
            .map((p: { text?: string }) => p.text || '')
            .join('');
        } else {
          content = String(m.content || '');
        }
        return {
          role: m.role as 'user' | 'assistant' | 'system',
          content,
        };
      });

      let partialText = '';
      let partialReasoning = '';
      let lastDbUpdate = 0;
      const DB_UPDATE_INTERVAL = 500;

      console.log(`[Inngest] Starting streamText for model ${modelId}`);

      // Build tools - add Google Search for Google/Vertex models
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools: Record<string, any> | undefined = isGoogle
        ? { google_search: vertexProvider.tools.googleSearch({}) }
        : undefined;

      const streamResult = streamText({
        model: selectedModel,
        system: systemPrompt,
        messages: modelMessages,
        tools,
        providerOptions: isGoogle
          ? {
              google: {
                thinkingConfig: {
                  includeThoughts: true,
                  ...(modelId.includes('gemini-3')
                    ? { thinkingLevel: reasoningEffort === 'low' ? 'low' : 'high' }
                    : { thinkingBudget: reasoningEffort === 'high' ? 24576 : reasoningEffort === 'medium' ? 8192 : 2048 }
                  ),
                },
              },
            }
          : {
              openrouter: {
                reasoning: {
                  effort: reasoningEffort,
                  exclude: false,
                },
              },
            },
        onChunk: async ({ chunk }) => {
          const chunkAny = chunk as Record<string, unknown>;
          const chunkType = chunk.type as string;

          if (chunkType === 'text-delta') {
            const textContent = chunkAny.text as string || chunkAny.textDelta as string || '';
            partialText += textContent;
          } else if (chunkType === 'reasoning' || chunkType === 'reasoning-delta') {
            const reasoningContent = chunkAny.text as string || '';
            partialReasoning += reasoningContent;
          }

          // Save to DB periodically
          const now = Date.now();
          if (now - lastDbUpdate > DB_UPDATE_INTERVAL) {
            lastDbUpdate = now;
            try {
              await db.update(activeGenerations)
                .set({
                  partialText,
                  partialReasoning,
                  lastUpdateAt: new Date(),
                })
                .where(eq(activeGenerations.id, generationId));
            } catch (e) {
              console.error('[Inngest] Failed to update partial content:', e);
            }
          }
        },
      });

      // Wait for the stream to complete
      const finalText = await streamResult.text;
      const finalReasoning = partialReasoning; // Reasoning is accumulated in onChunk

      console.log(`[Inngest] Generation complete: text=${finalText.length}, reasoning=${finalReasoning.length}`);

      return {
        text: finalText || partialText,
        reasoning: finalReasoning,
      };
    });

    // Step 3: Save the final message to DB
    await step.run("save-message", async () => {
      const contentParts: Array<{ type: string; text?: string; reasoning?: string }> = [];

      if (result.reasoning) {
        contentParts.push({ type: 'reasoning', text: result.reasoning, reasoning: result.reasoning });
      }
      if (result.text) {
        contentParts.push({ type: 'text', text: result.text });
      }

      if (contentParts.length > 0) {
        await db.insert(messagesTable).values({
          chatId,
          role: 'assistant',
          content: contentParts,
          model: modelId,
        });
        console.log(`[Inngest] Saved assistant message for chat ${chatId}`);
      }
    });

    // Step 4: Cleanup generation record
    await step.run("cleanup", async () => {
      await db.delete(activeGenerations)
        .where(eq(activeGenerations.id, generationId));
      console.log(`[Inngest] Cleaned up generation record ${generationId}`);
    });

    return { success: true, chatId, generationId };
  }
);

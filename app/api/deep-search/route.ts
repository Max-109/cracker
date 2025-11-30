import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { db } from "@/db";
import { activeGenerations, chats as chatsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { inngest } from "@/lib/inngest/client";

export const maxDuration = 30; // Just need time for clarifying questions

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

const RESEARCH_MODEL = 'gemini-3-pro-preview';

// Get current date context
function getDateContext(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
  };
  const formattedDate = now.toLocaleDateString('en-US', options);
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  
  return `CURRENT DATE: ${formattedDate}
TEMPORAL CONTEXT: We are in Q${quarter} ${year}. When researching, prioritize recent information from ${year} and late ${year - 1}.`;
}

// Generate clarifying questions
async function generateClarifyingQuestions(query: string): Promise<string[]> {
  try {
    const result = await generateText({
      model: vertex(RESEARCH_MODEL),
      system: `You are a research assistant preparing to conduct deep research.

${getDateContext()}

Analyze the query and generate 2-3 clarifying questions to improve research quality:
1. SCOPE: Broad overview vs. deep dive?
2. USE CASE: Personal decision, academic, professional?
3. CONSTRAINTS: Budget, region, timeline, specific features?

Return ONLY a JSON array: ["Question 1?", "Question 2?"]`,
      messages: [{ role: 'user', content: query }],
    });
    
    const match = result.text.trim().match(/\[[\s\S]*\]/);
    if (match) {
      const questions = JSON.parse(match[0]);
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, 3);
      }
    }
    return [];
  } catch (error) {
    console.error('[DeepSearch] Error generating clarifying questions:', error);
    return [];
  }
}

// SSE stream helper
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });

  const send = (event: Record<string, unknown>) => {
    if (!controller) return;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch { /* closed */ }
  };

  const close = () => {
    try { controller?.close(); } catch { /* closed */ }
  };

  return { stream, send, close };
}

export async function POST(req: Request) {
  console.log('[DeepSearch] === REQUEST RECEIVED ===');

  try {
    const body = await req.json();
    const { query, chatId, clarifyAnswers, skipClarify } = body;
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    console.log(`[DeepSearch] Query: ${query}`);
    console.log(`[DeepSearch] ChatId: ${chatId}`);
    console.log(`[DeepSearch] Skip clarify: ${skipClarify}, Has answers: ${!!clarifyAnswers}`);

    // Phase 0: Clarifying questions (unless skipped or answers provided)
    // This is done inline since it's quick and needs immediate response
    if (!skipClarify && !clarifyAnswers) {
      const { stream, send, close } = createSSEStream();
      
      (async () => {
        send({ type: 'phase', phase: 'clarify', description: 'Understanding your needs...' });
        
        const questions = await generateClarifyingQuestions(query);
        if (questions.length > 0) {
          send({ type: 'clarify', questions });
        } else {
          // No questions needed, trigger Inngest immediately
          const generationId = await startDeepSearchBackground(chatId, query, undefined);
          send({ type: 'started', generationId });
        }
        close();
      })();

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // If we have answers or skipped clarification, start the background research
    const generationId = await startDeepSearchBackground(chatId, query, clarifyAnswers);
    
    // Return immediately with generationId - client will connect to /api/generate/stream
    return new Response(JSON.stringify({ 
      success: true, 
      generationId,
      chatId,
      message: 'Deep search started in background',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DeepSearch] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Deep search failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Start deep search in background via Inngest
async function startDeepSearchBackground(
  chatId: string, 
  query: string, 
  clarifyAnswers?: Array<{ q: string; a: string }>
): Promise<string> {
  const generationId = randomUUID();
  
  // Create generation record
  await db.insert(activeGenerations).values({
    id: generationId,
    chatId,
    modelId: 'deep-search',
    status: 'pending',
    partialText: JSON.stringify({ phase: 'starting', percent: 0, message: 'Initializing...' }),
  });
  
  // Update chat mode
  await db.update(chatsTable)
    .set({ mode: 'deep-search' })
    .where(eq(chatsTable.id, chatId));
  
  console.log(`[DeepSearch] Created generation ${generationId}, triggering Inngest`);
  
  // Trigger Inngest
  await inngest.send({
    name: "deep-search/start",
    data: {
      chatId,
      generationId,
      query,
      clarifyAnswers,
    },
  });
  
  return generationId;
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { getDb } from "@/db";
import { messages as messagesTable, chats as chatsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 300; // 5 minutes for full research

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const RESEARCH_MODEL = 'gemini-3-pro-preview';

function getDateContext(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', options);
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `CURRENT DATE: ${formattedDate}\nTEMPORAL CONTEXT: Q${quarter} ${year}. Prioritize recent information from ${year}.`;
}

async function generateClarifyingQuestions(query: string): Promise<string[]> {
  try {
    const result = await generateText({
      model: google(RESEARCH_MODEL),
      system: `You are a research assistant. Generate 2-3 clarifying questions about scope, use case, or constraints. Return ONLY a JSON array: ["Question 1?", "Question 2?"]`,
      messages: [{ role: 'user', content: query }],
    });
    const match = result.text.trim().match(/\[[\s\S]*\]/);
    if (match) {
      const questions = JSON.parse(match[0]);
      if (Array.isArray(questions)) return questions.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}

async function tavilySearch(query: string, maxResults = 10): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: true,
        search_depth: 'advanced',
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: { title: string; url: string; content: string; raw_content?: string }) => ({
      title: r.title,
      url: r.url,
      content: (r.raw_content || r.content || '').slice(0, 1000),
    }));
  } catch {
    return [];
  }
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
  const send = (event: Record<string, unknown>) => {
    if (!controller) return;
    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { /* closed */ }
  };
  const close = () => { try { controller?.close(); } catch { /* closed */ } };
  return { stream, send, close };
}

export async function POST(req: Request) {
  console.log('[DeepSearch] === REQUEST RECEIVED ===');

  try {
    const db = getDb();
    const body = await req.json();
    const { query, chatId, clarifyAnswers, skipClarify } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    // Phase 0: Clarifying questions (unless skipped or answers provided)
    if (!skipClarify && !clarifyAnswers) {
      const { stream, send, close } = createSSEStream();
      (async () => {
        try {
          send({ type: 'phase', phase: 'clarify', description: 'Understanding your needs...' });
          const questions = await generateClarifyingQuestions(query);
          if (questions.length > 0) {
            send({ type: 'clarify', questions });
          } else {
            send({ type: 'phase', phase: 'planning', description: 'No clarification needed, starting research...' });
          }
        } catch (error) {
          send({ type: 'error', message: 'Failed to generate clarifying questions' });
        } finally {
          close();
        }
      })();
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    // Full research - streaming inline
    const { stream, send, close } = createSSEStream();

    (async () => {
      const startTime = Date.now();
      try {
        // Update chat mode
        if (chatId) {
          await db.update(chatsTable).set({ mode: 'deep-search' }).where(eq(chatsTable.id, chatId));
        }

        // Phase 1: Generate search queries
        send({ type: 'phase', phase: 'planning', description: 'Planning research approach...' });
        send({ type: 'progress', percent: 5, message: 'Generating search queries...' });

        const clarifyContext = clarifyAnswers
          ? `\n\nUser clarifications:\n${clarifyAnswers.map((a: { q: string; a: string }) => `Q: ${a.q}\nA: ${a.a}`).join('\n\n')}`
          : '';

        const queryResult = await generateText({
          model: google(RESEARCH_MODEL),
          prompt: `${getDateContext()}\n\nGenerate 8 diverse search queries for: "${query}"${clarifyContext}\n\nCover: main topic, comparisons, reviews, news, technical specs, pricing, issues.\n\nReturn ONLY queries, one per line.`,
        });

        const searchQueries = queryResult.text.split('\n').filter(q => q.trim().length > 0).slice(0, 8);
        console.log(`[DeepSearch] Generated ${searchQueries.length} queries`);

        // Phase 2: Execute searches
        send({ type: 'phase', phase: 'searching', description: 'Searching the web...' });
        const sources = new Map<string, { title: string; url: string; content: string }>();

        for (let i = 0; i < searchQueries.length; i++) {
          const sq = searchQueries[i];
          send({ type: 'search', query: sq, index: i + 1, total: searchQueries.length });
          send({ type: 'progress', percent: 15 + Math.floor((i / searchQueries.length) * 30), message: `Searching: ${sq.slice(0, 50)}...` });

          const results = await tavilySearch(sq, 5);
          results.forEach(r => {
            if (!sources.has(r.url)) {
              sources.set(r.url, r);
              send({ type: 'source', url: r.url, title: r.title });
            }
          });
        }

        console.log(`[DeepSearch] Found ${sources.size} unique sources`);

        // Phase 3: Deep dive
        send({ type: 'phase', phase: 'analyzing', description: 'Analyzing findings...' });
        send({ type: 'progress', percent: 50, message: 'Analyzing findings...' });

        const topTitles = Array.from(sources.values()).slice(0, 15).map(s => s.title).join('\n');
        const ddResult = await generateText({
          model: google(RESEARCH_MODEL),
          prompt: `Generate 3 follow-up searches to fill gaps:\n\nOriginal: ${query}\nFindings:\n${topTitles}\n\nReturn ONLY queries, one per line.`,
        });

        const deepQueries = ddResult.text.split('\n').filter(q => q.trim()).slice(0, 3);
        for (const dq of deepQueries) {
          const results = await tavilySearch(dq, 3);
          results.forEach(r => {
            if (!sources.has(r.url)) {
              sources.set(r.url, r);
              send({ type: 'source', url: r.url, title: r.title });
            }
          });
        }

        send({ type: 'progress', percent: 65, message: `Collected ${sources.size} sources` });

        // Phase 4: Generate report
        send({ type: 'phase', phase: 'writing', description: 'Writing comprehensive report...' });
        send({ type: 'progress', percent: 70, message: 'Generating report...' });

        const finalSources = Array.from(sources.values()).slice(0, 40);
        const sourcesContext = finalSources.map((s, i) =>
          `[${i + 1}] ${s.title}\nURL: ${s.url}\nContent: ${s.content.slice(0, 600)}`
        ).join('\n---\n');

        send({ type: 'report_start' });

        const reportResult = await generateText({
          model: google(RESEARCH_MODEL),
          prompt: `${getDateContext()}

Create a comprehensive research report for: "${query}"
${clarifyContext}

SOURCES (${finalSources.length} total):
${sourcesContext}

REQUIREMENTS:
1. Start with "## Executive Summary"
2. Use inline citations [1], [2], etc.
3. Include specific data, specs, prices
4. End with formatted Sources section

Be thorough and cite every claim.`,
        });

        const reportText = reportResult.text;

        // Stream the report text in chunks
        const chunkSize = 100;
        for (let i = 0; i < reportText.length; i += chunkSize) {
          send({ type: 'text', text: reportText.slice(i, i + chunkSize) });
          send({ type: 'progress', percent: 70 + Math.floor((i / reportText.length) * 25), message: 'Writing report...' });
        }

        // Save to database
        if (chatId) {
          const contentParts: Array<{ type: string; text?: string; url?: string; title?: string }> = [
            { type: 'text', text: reportText }
          ];
          finalSources.forEach(s => {
            contentParts.push({ type: 'source', url: s.url, title: s.title });
          });

          await db.insert(messagesTable).values({
            chatId,
            role: 'assistant',
            content: contentParts,
            model: 'deep-search/' + RESEARCH_MODEL,
          });
          console.log(`[DeepSearch] Saved report for chat ${chatId}`);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        send({ type: 'complete', elapsed, sources: finalSources.map(s => ({ url: s.url, title: s.title })) });
        send({ type: 'progress', percent: 100, message: `Research complete in ${elapsed}s` });

      } catch (error) {
        console.error('[DeepSearch] Error:', error);
        send({ type: 'error', message: 'Research failed', details: String(error) });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });

  } catch (error) {
    console.error('[DeepSearch] Error:', error);
    return new Response(JSON.stringify({ error: 'Deep search failed' }), { status: 500 });
  }
}

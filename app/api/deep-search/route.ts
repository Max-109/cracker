import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, generateText } from "ai";
import { db } from "@/db";
import { messages as messagesTable, chats as chatsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 2000;

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

// Use Gemini 3 Pro Preview (same as Expert model)
const RESEARCH_MODEL = 'gemini-3-pro-preview';

// Progress event types for SSE
type ProgressEvent = 
  | { type: 'phase'; phase: string; description: string }
  | { type: 'search'; query: string; index: number; total: number }
  | { type: 'source'; url: string; title: string; count: number }
  | { type: 'progress'; percent: number; message: string }
  | { type: 'clarify'; questions: string[] }
  | { type: 'report_start' }
  | { type: 'text'; text: string }
  | { type: 'complete'; sources: { url: string; title: string }[]; elapsed: number };

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (event: ProgressEvent | string) => {
    if (!controller) return;
    try {
      if (typeof event === 'string') {
        // Text chunk for report streaming
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event })}\n\n`));
      } else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
    } catch {
      // Stream closed
    }
  };

  const close = () => {
    try {
      controller?.close();
    } catch {
      // Already closed
    }
  };

  return { stream, send, close };
}

async function tavilySearch(query: string, maxResults: number = 10): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error('[DeepSearch] TAVILY_API_KEY not set');
    return [];
  }

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

    if (!response.ok) {
      console.error('[DeepSearch] Tavily API error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r: { title: string; url: string; content: string; raw_content?: string }) => ({
      title: r.title,
      url: r.url,
      content: r.raw_content || r.content || '',
    }));
  } catch (error) {
    console.error('[DeepSearch] Tavily search error:', error);
    return [];
  }
}

// Clarifying questions system prompt
const CLARIFY_SYSTEM_PROMPT = `You are a research assistant preparing to conduct deep research. Your goal is to understand the user's needs better before starting.

Analyze the user's query and generate 2-3 clarifying questions that will help you:
1. Understand the specific SCOPE (broad overview vs. deep dive on specific aspect)
2. Identify their USE CASE (personal decision, academic, professional, curiosity)
3. Clarify any PREFERENCES or CONSTRAINTS (budget, timeline, specific features)

Rules:
- Only ask questions that will genuinely improve the research output
- Questions should be specific and actionable
- If the query is already crystal clear, you can return fewer questions
- Keep questions concise but meaningful

Return ONLY a JSON array of question strings, like:
["Question 1?", "Question 2?", "Question 3?"]`;

// Generate clarifying questions
async function generateClarifyingQuestions(query: string): Promise<string[]> {
  try {
    const result = await generateText({
      model: vertex(RESEARCH_MODEL),
      system: CLARIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });
    
    const text = result.text.trim();
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
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

async function generateSearchQueries(query: string, context?: string): Promise<string[]> {
  const contextPrompt = context ? `\n\nAdditional context from user:\n${context}` : '';
  
  const result = await generateText({
    model: vertex(RESEARCH_MODEL),
    system: `You are conducting exhaustive research. Generate 15-20 diverse search queries covering ALL angles:
- Main topic variations
- Comparisons and alternatives
- Technical specs and benchmarks
- Expert and user reviews
- Recent news (2024-2025)
- Pricing and value analysis
- Common issues and problems
- Best use cases

Return ONLY search queries, one per line. No numbering.`,
    messages: [{ role: 'user', content: query + contextPrompt }],
  });
  
  return result.text.split('\n').filter(q => q.trim().length > 0).slice(0, 20);
}

const FINAL_REPORT_SYSTEM_PROMPT = `You are producing the DEFINITIVE research report. Today: ${new Date().toISOString().split('T')[0]}.

## Mission
Create the most comprehensive, authoritative report possible. Leave NOTHING out.

## Structure (adapt based on topic type)

**For product comparisons:**
1. Executive Summary with clear recommendations
2. Detailed breakdown of each option
3. Head-to-head comparisons
4. Price-to-performance analysis
5. Use case recommendations
6. Potential issues for each
7. Final verdict

**For informational topics:**
1. Comprehensive overview
2. Deep dive into each aspect
3. Expert consensus
4. Common misconceptions
5. Practical applications
6. Future outlook

## Formatting
- Use \`backticks\` for technical terms, products, specs
- Headers: ### \`Section Title\`
- **Bold** for key points
- LaTeX for formulas: $E = mc^2$
- Write detailed paragraphs

## Citations (MANDATORY)
- EVERY claim needs citations: [1], [2], [3]
- Multiple citations when sources agree
- End with ### \`Sources\` listing ALL cited URLs`;

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  console.log('[DeepSearch] === REQUEST RECEIVED ===');

  try {
    const body = await req.json();
    const { query, chatId, clarifyAnswers, skipClarify } = body;
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    console.log(`[DeepSearch] Query: ${query}`);
    console.log(`[DeepSearch] ChatId: ${chatId}`);
    console.log(`[DeepSearch] Skip clarify: ${skipClarify}`);

    const { stream, send, close } = createSSEStream();

    // Run research in background
    (async () => {
      try {
        // Phase 0: Clarifying questions (unless skipped or answers provided)
        if (!skipClarify && !clarifyAnswers) {
          send({ type: 'phase', phase: 'clarify', description: 'Understanding your needs...' });
          
          const questions = await generateClarifyingQuestions(query);
          if (questions.length > 0) {
            send({ type: 'clarify', questions });
            close();
            return;
          }
        }

        // Build context from clarifying answers
        const clarifyContext = clarifyAnswers ? 
          `User's clarifications:\n${clarifyAnswers.map((a: { q: string; a: string }) => `Q: ${a.q}\nA: ${a.a}`).join('\n\n')}` 
          : '';

        const allSources: Map<string, { title: string; url: string; content: string }> = new Map();
        
        // Phase 1: Generate search queries
        send({ type: 'phase', phase: 'planning', description: 'Planning research strategy...' });
        send({ type: 'progress', percent: 5, message: 'Generating search queries' });
        
        const searchQueries = await generateSearchQueries(query, clarifyContext);
        console.log(`[DeepSearch] Generated ${searchQueries.length} queries`);
        
        // Phase 2: Execute searches
        send({ type: 'phase', phase: 'searching', description: 'Searching the web...' });
        
        const batchSize = 3;
        const totalSearches = searchQueries.length;
        let completedSearches = 0;
        
        for (let i = 0; i < searchQueries.length; i += batchSize) {
          const batch = searchQueries.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(async (searchQuery, idx) => {
              send({ type: 'search', query: searchQuery, index: completedSearches + idx + 1, total: totalSearches });
              return tavilySearch(searchQuery, 10);
            })
          );
          
          batchResults.flat().forEach(r => {
            if (!allSources.has(r.url)) {
              allSources.set(r.url, r);
              send({ type: 'source', url: r.url, title: r.title, count: allSources.size });
            }
          });
          
          completedSearches += batch.length;
          const progress = 10 + Math.floor((completedSearches / totalSearches) * 35);
          send({ type: 'progress', percent: progress, message: `Searched ${completedSearches}/${totalSearches} queries` });
        }
        
        // Phase 3: Deep dive
        send({ type: 'phase', phase: 'analyzing', description: 'Analyzing initial findings...' });
        send({ type: 'progress', percent: 50, message: 'Generating follow-up queries' });
        
        const topSourceTitles = Array.from(allSources.values()).slice(0, 15).map(s => s.title).join('\n');
        const deepDiveResult = await generateText({
          model: vertex(RESEARCH_MODEL),
          system: `Generate 10-15 follow-up searches to fill gaps:
- Specific comparisons from initial findings
- Technical benchmarks
- User experiences and long-term reviews
- Known issues and complaints
- Price history
- Expert analysis
- Recent news (last 3 months)

Return ONLY search queries, one per line.`,
          messages: [{ role: 'user', content: `Original: ${query}\n\nFindings:\n${topSourceTitles}` }],
        });
        
        const deepDiveQueries = deepDiveResult.text.split('\n').filter(q => q.trim()).slice(0, 15);
        
        send({ type: 'phase', phase: 'deep-dive', description: 'Deep diving into specifics...' });
        
        const totalDeepDive = deepDiveQueries.length;
        let completedDeepDive = 0;
        
        for (let i = 0; i < deepDiveQueries.length; i += batchSize) {
          const batch = deepDiveQueries.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(async (searchQuery) => {
              send({ type: 'search', query: searchQuery, index: completedSearches + completedDeepDive + 1, total: totalSearches + totalDeepDive });
              return tavilySearch(searchQuery, 10);
            })
          );
          
          batchResults.flat().forEach(r => {
            if (!allSources.has(r.url)) {
              allSources.set(r.url, r);
              send({ type: 'source', url: r.url, title: r.title, count: allSources.size });
            }
          });
          
          completedDeepDive += batch.length;
          const progress = 50 + Math.floor((completedDeepDive / totalDeepDive) * 25);
          send({ type: 'progress', percent: progress, message: `Deep dive: ${completedDeepDive}/${totalDeepDive}` });
        }
        
        console.log(`[DeepSearch] Total sources: ${allSources.size}`);
        
        // Phase 4: Generate report
        send({ type: 'phase', phase: 'writing', description: 'Writing comprehensive report...' });
        send({ type: 'progress', percent: 80, message: 'Synthesizing findings' });
        send({ type: 'report_start' });
        
        const sourcesList = Array.from(allSources.values());
        const sourcesContext = sourcesList.map((s, i) => 
          `[${i + 1}] ${s.title}\nURL: ${s.url}\nContent: ${s.content.slice(0, 1500)}\n`
        ).join('\n---\n');

        const finalReportPrompt = `Research completed with ${sourcesList.length} sources. Create the DEFINITIVE report for: "${query}"

${clarifyContext}

## Research Data
${sourcesContext}

Requirements:
- EXHAUSTIVE coverage using ALL relevant sources
- Cite extensively: [1], [2], [3]...
- Include specific numbers, specs, prices
- Cover ALL angles: comparisons, pros, cons, use cases
- Provide CLEAR recommendations
- End with ### \`Sources\` section`;

        let partialText = '';
        const partialSources = sourcesList.map(s => ({ url: s.url, title: s.title }));

        const result = streamText({
          model: vertex(RESEARCH_MODEL),
          system: FINAL_REPORT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: finalReportPrompt }],
          onChunk: ({ chunk }) => {
            if (chunk.type === 'text-delta' && chunk.text) {
              partialText += chunk.text;
              send(chunk.text);
            }
          },
          onFinish: async () => {
            const elapsed = (Date.now() - requestStartTime) / 1000;
            console.log(`[DeepSearch] Complete in ${elapsed.toFixed(2)}s`);
            
            send({ type: 'progress', percent: 100, message: 'Research complete!' });
            send({ type: 'complete', sources: partialSources, elapsed });
            
            // Save to database
            if (chatId && partialText) {
              try {
                // Create content parts with sources
                const contentParts: Array<{ type: string; text?: string; url?: string; title?: string }> = [
                  { type: 'text', text: partialText }
                ];
                
                partialSources.forEach(s => {
                  contentParts.push({ type: 'source', url: s.url, title: s.title });
                });

                await db.insert(messagesTable).values({
                  chatId,
                  role: 'assistant',
                  content: contentParts,
                  model: `deep-search/${RESEARCH_MODEL}`,
                });
                
                // Update chat mode
                await db.update(chatsTable)
                  .set({ mode: 'deep-search' })
                  .where(eq(chatsTable.id, chatId));
                  
                console.log('[DeepSearch] Saved to database');
              } catch (dbError) {
                console.error('[DeepSearch] DB save error:', dbError);
              }
            }
            
            close();
          },
        });

        // Consume the stream
        await result.text;
        
      } catch (error) {
        console.error('[DeepSearch] Error:', error);
        send({ type: 'progress', percent: 0, message: `Error: ${String(error)}` });
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[DeepSearch] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Deep search failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

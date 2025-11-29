import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, generateText } from "ai";
import { db } from "@/db";
import { messages as messagesTable } from "@/db/schema";

export const maxDuration = 2000; // Extended for exhaustive research

// Initialize Vertex AI provider
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

// Tavily search function
async function tavilySearch(query: string, maxResults: number = 10): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error('[DeepSearch] TAVILY_API_KEY not set');
    return [];
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// Generate search queries for exhaustive research
async function generateSearchQueries(query: string, model: ReturnType<typeof vertex>): Promise<string[]> {
  const result = await generateText({
    model,
    system: `You are conducting exhaustive solo research. Your job is to leave NO stone unturned.

Given a query, generate 15-20 search queries covering EVERY possible angle:
- Main topic direct searches (multiple variations)
- Head-to-head comparisons
- Technical specifications and benchmarks
- Expert reviews and professional opinions
- User reviews and real-world experiences
- Latest news and recent developments (2024-2025)
- Price analysis and value propositions
- Alternatives and competitors
- Common problems and issues
- Best use cases and recommendations
- Historical context and evolution
- Future outlook and upcoming releases

Be EXHAUSTIVE. Cover ALL angles. This is serious research work.

Return ONLY search queries, one per line. No numbering, no explanations. Generate at least 15 queries.`,
    messages: [{ role: 'user', content: query }],
  });
  
  return result.text.split('\n').filter(q => q.trim().length > 0).slice(0, 20);
}

const FINAL_REPORT_SYSTEM_PROMPT = `You are producing the DEFINITIVE research report on this topic. Today's date is ${new Date().toISOString().split('T')[0]}.

This is solo work. You have gathered exhaustive research from dozens of sources. Now synthesize it into the most comprehensive, authoritative report possible.

## Your Mission
- Leave NOTHING out. Cover EVERY angle discovered in research.
- This report should be the ONLY resource someone needs on this topic.
- Be thorough, detailed, and exhaustive. Length is not a concern - completeness is.

## Report Structure
Structure based on topic type:

**For product comparisons/recommendations:**
1. Executive Summary with clear winner(s)
2. Detailed breakdown of EACH option
3. Head-to-head comparisons with specs/benchmarks
4. Price-to-performance analysis
5. Use case recommendations (who should buy what)
6. Potential issues/drawbacks for each
7. Final verdict with reasoning

**For informational topics:**
1. Comprehensive overview
2. Deep dive into each major aspect
3. Expert opinions and consensus
4. Common misconceptions
5. Practical applications
6. Future outlook

## Formatting (STRICT)
- Use \`backticks\` for: technical terms, product names, specs, numbers
- Headers: ### \`Section Title\`
- LaTeX for formulas: $E = mc^2$
- **Bold** for key points
- Write DETAILED paragraphs - this is a research report, not a summary
- NO phrases like "I found", "Based on my research" - just state facts

## Citations (MANDATORY)
- EVERY factual claim needs a citation: [1], [2], [3]
- Use MULTIPLE citations when multiple sources confirm something
- End with ### \`Sources\` listing ALL cited URLs exactly as provided

## Quality Bar
- This must be EXHAUSTIVE - use ALL relevant sources
- Include specific numbers, benchmarks, prices
- Address pros AND cons for everything
- Provide actionable recommendations
- No fluff, no filler - pure valuable information`;

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  console.log('[DeepSearch] === REQUEST RECEIVED ===');

  try {
    const { query, chatId } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    console.log(`[DeepSearch] Query: ${query}`);
    console.log(`[DeepSearch] ChatId: ${chatId}`);

    const model = vertex('gemini-2.0-flash');
    
    // Track all sources
    const allSources: Map<string, { title: string; url: string; content: string }> = new Map();
    
    // ============================================
    // PHASE 1: Generate diverse search queries
    // ============================================
    console.log('[DeepSearch] === PHASE 1: GENERATING SEARCH QUERIES ===');
    const searchQueries = await generateSearchQueries(query, model);
    console.log(`[DeepSearch] Generated ${searchQueries.length} search queries`);
    
    // ============================================
    // PHASE 2-N: Execute all searches in parallel batches
    // ============================================
    console.log('[DeepSearch] === PHASE 2: EXECUTING SEARCHES ===');
    
    // Execute searches in batches of 3 to avoid rate limits
    const batchSize = 3;
    let searchPhase = 1;
    
    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      console.log(`[DeepSearch] --- Search Phase ${searchPhase} (${batch.length} queries) ---`);
      
      const batchResults = await Promise.all(
        batch.map(async (searchQuery) => {
          console.log(`[DeepSearch] Searching: "${searchQuery}"`);
          return tavilySearch(searchQuery, 10);
        })
      );
      
      // Collect all results
      batchResults.flat().forEach(r => {
        if (!allSources.has(r.url)) {
          allSources.set(r.url, r);
        }
      });
      
      console.log(`[DeepSearch] Phase ${searchPhase} complete. Total sources: ${allSources.size}`);
      searchPhase++;
    }
    
    // ============================================
    // PHASE N+1: Deep dive on key topics
    // ============================================
    console.log('[DeepSearch] === PHASE 3: DEEP DIVE SEARCHES ===');
    
    // Generate follow-up queries based on initial findings - GO DEEPER
    const topSourceTitles = Array.from(allSources.values()).slice(0, 15).map(s => s.title).join('\n');
    const deepDiveResult = await generateText({
      model,
      system: `You've done initial research. Now go DEEPER. Generate 10-15 follow-up searches to fill gaps and get MORE detail:

- Specific product/item comparisons found in initial research
- Technical benchmarks and specifications
- Real user experiences and long-term reviews
- Known issues, problems, complaints
- Price history and deals
- Expert deep-dives and technical analysis
- Competitor analysis
- Recent news (last 3 months)
- Video review summaries
- Reddit/forum discussions

Leave NO gaps. This is the deep dive phase. Be thorough.

Return ONLY search queries, one per line. Generate at least 10.`,
      messages: [{ role: 'user', content: `Original query: ${query}\n\nInitial findings titles:\n${topSourceTitles}` }],
    });
    
    const deepDiveQueries = deepDiveResult.text.split('\n').filter(q => q.trim().length > 0).slice(0, 15);
    console.log(`[DeepSearch] Generated ${deepDiveQueries.length} deep dive queries`);
    
    // Execute deep dive searches
    for (let i = 0; i < deepDiveQueries.length; i += batchSize) {
      const batch = deepDiveQueries.slice(i, i + batchSize);
      console.log(`[DeepSearch] --- Deep Dive Phase ${Math.floor(i/batchSize) + 1} ---`);
      
      const batchResults = await Promise.all(
        batch.map(async (searchQuery) => {
          console.log(`[DeepSearch] Deep dive: "${searchQuery}"`);
          return tavilySearch(searchQuery, 10);
        })
      );
      
      batchResults.flat().forEach(r => {
        if (!allSources.has(r.url)) {
          allSources.set(r.url, r);
        }
      });
      
      console.log(`[DeepSearch] Total sources: ${allSources.size}`);
    }
    
    console.log(`[DeepSearch] === RESEARCH COMPLETE: ${allSources.size} TOTAL SOURCES ===`);

    // Prepare sources for final report
    const sourcesList = Array.from(allSources.values());
    const sourcesContext = sourcesList.map((s, i) => 
      `[${i + 1}] ${s.title}\nURL: ${s.url}\nContent: ${s.content.slice(0, 1500)}\n`
    ).join('\n---\n');

    // ============================================
    // FINAL PHASE: Generate comprehensive report
    // ============================================
    console.log('[DeepSearch] === FINAL PHASE: GENERATING REPORT ===');

    const finalReportPrompt = `You have completed EXHAUSTIVE research with ${sourcesList.length} sources. Now produce the DEFINITIVE report answering: "${query}"

## Research Data (${sourcesList.length} sources gathered)
${sourcesContext}

THIS IS YOUR MASTERPIECE. Requirements:
- This report must be EXHAUSTIVE - leave NOTHING out
- Use EVERY relevant source - cite extensively [1], [2], [3], [4]...
- Include ALL specific numbers, specs, benchmarks, prices found
- Cover EVERY angle: comparisons, pros, cons, use cases, issues, alternatives
- Provide CLEAR, ACTIONABLE recommendations
- EVERY factual claim needs citations - multiple citations when sources agree
- Be THOROUGH - length doesn't matter, completeness does
- End with ### \`Sources\` section with ALL cited URLs

This should be the ONLY resource anyone needs on this topic. Make it count.`;

    // Track content for DB save
    let partialText = '';
    const partialSources = sourcesList.map(s => ({ url: s.url, title: s.title }));

    const result = streamText({
      model: vertex('gemini-2.0-flash'),
      system: FINAL_REPORT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: finalReportPrompt }],
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          partialText += chunk.text || '';
        }
      },
      onFinish: async () => {
        const elapsed = ((Date.now() - requestStartTime) / 1000).toFixed(2);
        console.log(`[DeepSearch] === COMPLETE === (${elapsed}s)`);

        if (chatId && partialText) {
          try {
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
              model: 'deep-search/gemini-2.0-flash',
            });
            console.log(`[DeepSearch] Saved to database`);
          } catch (dbError) {
            console.error('[DeepSearch] DB save error:', dbError);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });

  } catch (error) {
    console.error('[DeepSearch] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Deep search failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

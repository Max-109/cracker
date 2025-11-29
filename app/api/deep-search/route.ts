import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, generateText, CoreMessage, tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { messages as messagesTable } from "@/db/schema";

export const maxDuration = 300;

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

// System prompts for deep research
const RESEARCH_SYSTEM_PROMPT = `You are a research assistant conducting deep research on topics. Today's date is ${new Date().toISOString().split('T')[0]}.

## Your Task
Use the available tools to gather comprehensive information about the user's query. You have access to:
1. **web_search**: Search the web for information
2. **think**: Reflect on your findings and plan next steps

## Research Process
1. Start with broad searches to understand the topic
2. After each search, use the think tool to analyze findings and identify gaps
3. Conduct focused follow-up searches to fill gaps
4. Stop when you have enough information to provide a comprehensive answer

## Search Strategy
- Perform as many searches as needed to fully research the topic
- Start with broad searches, then do focused follow-up searches on specific aspects
- Each search returns multiple sources - keep searching until you have comprehensive coverage
- No limit on searches - prioritize thoroughness and quality over speed

## Response Guidelines
When you have gathered enough information, provide your findings with:
1. Clear, organized sections
2. Inline citations using [1], [2], [3] format
3. A Sources section at the end listing all URLs

## Formatting Rules
- Use **backticks** for technical terms, names, numbers
- Use ### headers wrapped in backticks: ### \`Section Title\`
- Use LaTeX for mathematical formulas: $formula$
- Write comprehensive paragraphs, not just bullet points`;

const FINAL_REPORT_SYSTEM_PROMPT = `You are writing a comprehensive research report based on gathered findings. Today's date is ${new Date().toISOString().split('T')[0]}.

## Report Structure Guidelines

**For comparisons:**
1. Introduction
2. Overview of each element
3. Detailed comparison
4. Conclusion

**For lists/rankings:**
Simply list items with detailed explanations.

**For summaries/overviews:**
1. Overview
2. Key concepts (detailed sections for each)
3. Conclusion

## Formatting Requirements
- Use **backticks** for: technical terms (\`API\`), names (\`OpenAI\`), values (\`x = 5\`)
- Wrap headers in backticks: ### \`Solution\`, ### \`Key Findings\`
- Use LaTeX for formulas: $E = mc^2$
- Use bold for emphasis: **important point**
- Write in comprehensive paragraphs (text-heavy, not bullet-heavy)
- NO self-referential language ("I found...", "I researched...")

## Citation Format
- Cite sources inline: [1], [2], [3]
- End with ### \`Sources\` section:
  [1] Title: URL
  [2] Title: URL

## Quality Standards
- Every claim must be cited
- All links must be from the provided research
- Be comprehensive but concise
- Ensure all URLs are correct (copy exactly from sources)`;

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

    // Track all sources for the final report
    const allSources: Map<string, { title: string; url: string; content: string }> = new Map();
    const researchNotes: string[] = [];
    
    // Research phase - gather information
    const model = vertex('gemini-2.0-flash');
    
    // Define tools for research (AI SDK v5 uses inputSchema)
    const webSearchTool = tool({
      description: 'Search the web for information on a topic. Returns titles, URLs, and content.',
      inputSchema: z.object({
        query: z.string().describe('The search query'),
        maxResults: z.number().optional().describe('Maximum number of results (default: 3)'),
      }),
      execute: async ({ query, maxResults }) => {
        console.log(`[DeepSearch] Executing web search: "${query}"`);
        const results = await tavilySearch(query, maxResults ?? 10);
        
        // Store results
        results.forEach(r => {
          if (!allSources.has(r.url)) {
            allSources.set(r.url, r);
          }
        });
        
        console.log(`[DeepSearch] Found ${results.length} results`);
        return results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 1000) + (r.content.length > 1000 ? '...' : ''),
        }));
      },
    });

    const thinkTool = tool({
      description: 'Reflect on research progress and plan next steps. Use after each search.',
      inputSchema: z.object({
        reflection: z.string().describe('Your analysis of current findings, gaps, and next steps'),
      }),
      execute: async ({ reflection }) => {
        console.log(`[DeepSearch] Think: ${reflection.slice(0, 200)}...`);
        researchNotes.push(reflection);
        return { recorded: true, reflection };
      },
    });
    
    const tools = { web_search: webSearchTool, think: thinkTool };

    // Phase 1: Research with tools
    console.log('[DeepSearch] === PHASE 1: RESEARCH ===');
    
    const researchMessages: CoreMessage[] = [
      { role: 'user', content: `Research the following topic thoroughly: ${query}` }
    ];

    const researchResult = await generateText({
      model,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: researchMessages,
      tools,
    });

    console.log(`[DeepSearch] Research complete. Sources: ${allSources.size}`);
    console.log(`[DeepSearch] Research notes: ${researchNotes.length}`);

    // Prepare sources list for final report
    const sourcesList = Array.from(allSources.values());
    const sourcesContext = sourcesList.map((s, i) => 
      `[${i + 1}] ${s.title}\nURL: ${s.url}\nContent: ${s.content.slice(0, 2000)}\n`
    ).join('\n---\n');

    // Phase 2: Generate final report with streaming
    console.log('[DeepSearch] === PHASE 2: FINAL REPORT ===');

    const finalReportPrompt = `Based on the following research findings, write a comprehensive report answering the query: "${query}"

## Research Findings
${researchResult.text}

## Available Sources (use these URLs exactly when citing)
${sourcesContext}

## Research Notes
${researchNotes.join('\n---\n')}

Write a detailed, well-structured report with proper citations. Every factual claim must have a citation. Use the exact URLs from the sources above.`;

    // Track partial content for DB save
    let partialText = '';
    const partialSources: Array<{ url: string; title: string }> = sourcesList.map(s => ({ url: s.url, title: s.title }));

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

        // Save to database if chatId provided
        if (chatId && partialText) {
          try {
            // Build content with sources
            const contentParts: Array<{ type: string; text?: string; url?: string; title?: string }> = [
              { type: 'text', text: partialText }
            ];
            
            // Add source references
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

    // Return streaming response with sources metadata
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

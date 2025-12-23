/**
 * Brave Search Tools for AI SDK with Vertex AI
 * 
 * FIX APPLIED: Use `inputSchema` with `zodSchema()` wrapper instead of `parameters`.
 * The SDK reads `tool.inputSchema` internally, not `tool.parameters`.
 */

import { z } from 'zod';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1';

// Result types
interface WebSearchResult {
    title: string;
    url: string;
    description: string;
    age?: string;
}

interface NewsSearchResult {
    title: string;
    url: string;
    description: string;
    age?: string;
    source?: string;
}

// Define Zod schemas
const webSearchSchema = z.object({
    query: z.string().describe('The search query'),
    count: z.number().optional().describe('Number of results to return (default 10)'),
});

const newsSearchSchema = z.object({
    query: z.string().describe('The news search query'),
    count: z.number().optional().describe('Number of results to return (default 10)'),
});

type WebSearchParams = z.infer<typeof webSearchSchema>;
type NewsSearchParams = z.infer<typeof newsSearchSchema>;

/**
 * Web Search Tool - Comprehensive web search using Brave Search API
 */
export const braveWebSearch = {
    description: 'Search the web for current information. Use this when you need to find up-to-date information, facts, news, or any web content.',
    parameters: webSearchSchema,
    execute: async (args: WebSearchParams) => {
        const { query, count = 10 } = args;
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            console.error('[BraveSearch] No API key found');
            return { error: 'Brave Search API key not configured.' };
        }

        try {
            console.log('[BraveSearch] Searching for:', query);

            const params = new URLSearchParams({
                q: query.slice(0, 400),
                count: String(Math.min(Math.max(count, 1), 20)),
            });

            const response = await fetch(`${BRAVE_API_BASE}/web/search?${params}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[BraveSearch] API error:', response.status, errorText);
                return { error: `Brave Search API error: ${response.status}` };
            }

            const data = await response.json();

            const results: WebSearchResult[] = (data.web?.results || []).slice(0, count).map((r: {
                title: string;
                url: string;
                description: string;
                age?: string;
            }) => ({
                title: r.title,
                url: r.url,
                description: r.description,
                age: r.age,
            }));

            console.log('[BraveSearch] Found', results.length, 'results');

            return {
                query,
                resultCount: results.length,
                results,
            };
        } catch (error) {
            console.error('[BraveSearch] Error:', error);
            return { error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    },
};

/**
 * News Search Tool - Search recent news articles
 */
export const braveNewsSearch = {
    description: 'Search for recent news articles. Use this when you need current news, headlines, or recent events.',
    parameters: newsSearchSchema,
    execute: async (args: NewsSearchParams) => {
        const { query, count = 10 } = args;
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            console.error('[BraveNews] No API key found');
            return { error: 'Brave Search API key not configured.' };
        }

        try {
            console.log('[BraveNews] Searching news for:', query);

            const params = new URLSearchParams({
                q: query.slice(0, 400),
                count: String(Math.min(Math.max(count, 1), 20)),
            });

            const response = await fetch(`${BRAVE_API_BASE}/news/search?${params}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[BraveNews] API error:', response.status, errorText);
                return { error: `Brave News API error: ${response.status}` };
            }

            const data = await response.json();

            const results: NewsSearchResult[] = (data.results || []).slice(0, count).map((r: {
                title: string;
                url: string;
                description: string;
                age?: string;
                meta_url?: { hostname?: string };
            }) => ({
                title: r.title,
                url: r.url,
                description: r.description,
                age: r.age,
                source: r.meta_url?.hostname,
            }));

            console.log('[BraveNews] Found', results.length, 'articles');

            return {
                query,
                resultCount: results.length,
                results,
            };
        } catch (error) {
            console.error('[BraveNews] Error:', error);
            return { error: `News search failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    },
};

/**
 * Combined tools object for easy registration
 */
export const braveTools = {
    brave_web_search: braveWebSearch,
    brave_news_search: braveNewsSearch,
};

/**
 * Get enabled tools based on configuration
 */
export function getEnabledBraveTools(enabledServers: string[]) {
    if (enabledServers.includes('brave-search') && process.env.BRAVE_API_KEY) {
        return braveTools;
    }
    return {};
}

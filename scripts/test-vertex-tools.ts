/**
 * Standalone debug script for Vertex AI tool calling
 * Run with: bun scripts/test-vertex-tools.ts
 * 
 * SDK uses Zod schemas for inputSchema in built-in tools.
 * Testing: Set inputSchema to actual Zod schema (not parameters)
 */

import { createVertex } from '@ai-sdk/google-vertex';
import { generateText, zodSchema } from 'ai';
import { z } from 'zod';

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'project-1972ed27-e546-4aa5-8fd';
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

console.log('=== Vertex AI Tool Calling Debug Script ===');
console.log('Project:', GOOGLE_CLOUD_PROJECT);
console.log('Location:', GOOGLE_CLOUD_LOCATION);

const vertex = createVertex({
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
});

// Define Zod schema
const querySchema = z.object({
    query: z.string().describe('The search query'),
});

// Use zodSchema() wrapper for inputSchema
const myTool = {
    description: 'Search the web for information.',
    inputSchema: zodSchema(querySchema),
    execute: async (args: { query: string }) => {
        console.log('[Tool Execute] Search query:', args.query);
        return {
            query: args.query,
            results: [
                { title: 'Test Result', url: 'https://example.com', description: 'A test result' }
            ]
        };
    },
};

console.log('\n--- Tool object ---');
console.log('Has inputSchema:', 'inputSchema' in myTool);
console.log('inputSchema type:', typeof myTool.inputSchema);
console.log('inputSchema:', myTool.inputSchema);

async function testToolCalling() {
    console.log('\n--- Test: zodSchema for inputSchema ---');

    try {
        const result = await generateText({
            model: vertex('gemini-2.0-flash'),
            prompt: 'Who is the richest person in the world today?',
            tools: {
                web_search: myTool as any,
            },
            maxSteps: 3,
        });

        console.log('SUCCESS! Response:', result.text);
        console.log('Tool calls:', JSON.stringify(result.toolCalls, null, 2));
        console.log('Tool results:', JSON.stringify(result.toolResults, null, 2));
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.responseBody) {
            console.error('Response body:', error.responseBody);
        }
        if (error.requestBodyValues) {
            console.error('Request body tools:', JSON.stringify(error.requestBodyValues?.tools, null, 2));
        }
    }
}

testToolCalling();

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";

// Initialize Google Generative AI provider
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// System prompt for classifying reasoning effort
const CLASSIFIER_SYSTEM_PROMPT = `You are a prompt complexity analyzer. Your ONLY job is to analyze user prompts and determine how much "thinking effort" an AI would need to answer them well.

OUTPUT RULES:
- Respond with EXACTLY ONE WORD: "low", "medium", or "high"
- No explanations, no punctuation, no other text

CLASSIFICATION GUIDE:

**LOW** - Quick, factual, simple tasks:
- Simple greetings: "hi", "hello", "thanks"
- Direct factual questions: "What is the capital of France?"
- Simple definitions: "What is photosynthesis?"
- Basic translations or formatting tasks
- Casual conversation
- Simple yes/no questions

**MEDIUM** - Requires some reasoning or creativity:
- Explanations: "Explain how X works"
- Comparisons: "What's the difference between X and Y?"
- Simple creative tasks: "Write a short poem"
- General advice: "How should I approach..."
- Multi-step questions requiring basic reasoning
- Summarization tasks

**HIGH** - Complex thinking, analysis, or problem-solving:
- Math problems (especially algebra, calculus, logic puzzles)
- Code debugging or writing complex algorithms
- Frustrated or confused users needing careful help (indicated by "!!", "ugh", excessive punctuation, emotional language)
- Multi-part questions requiring deep analysis
- Scientific reasoning or proofs
- Strategic planning or decision analysis
- Emotional support requiring empathy and care
- Ambiguous questions needing careful interpretation
- Debugging issues or troubleshooting complex problems
- Questions about "why" something doesn't work

When in doubt between two levels, choose the HIGHER one to ensure quality responses.`;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ effort: 'medium' }); // Default fallback
        }

        // Log the analysis request
        console.log('\n========== AUTO-REASONING ANALYSIS ==========');
        console.log('[AUTO-REASONING] Analyzing prompt:', prompt.slice(0, 200) + (prompt.length > 200 ? '...' : ''));
        console.log('[AUTO-REASONING] System prompt (first 500 chars):', CLASSIFIER_SYSTEM_PROMPT.slice(0, 500) + '...');

        // Use Gemini Flash without reasoning for quick classification
        const result = await generateText({
            model: google('gemini-2.0-flash'),
            system: CLASSIFIER_SYSTEM_PROMPT,
            prompt: prompt,
        });

        // Extract and validate the response
        const response = result.text.trim().toLowerCase();
        let effort: 'low' | 'medium' | 'high' = 'medium'; // Default

        if (response === 'low') {
            effort = 'low';
        } else if (response === 'medium') {
            effort = 'medium';
        } else if (response === 'high') {
            effort = 'high';
        } else {
            // If the model didn't follow instructions, parse more liberally
            if (response.includes('low')) effort = 'low';
            else if (response.includes('high')) effort = 'high';
            else effort = 'medium';
            console.log('[AUTO-REASONING] Unexpected response format, parsed as:', effort);
        }

        console.log('[AUTO-REASONING] AI raw response:', result.text);
        console.log('[AUTO-REASONING] Result:', effort);
        console.log('==============================================\n');

        return NextResponse.json({ effort });
    } catch (error) {
        console.error('[AUTO-REASONING] Error:', error);
        // Return medium as a safe default
        return NextResponse.json({ effort: 'medium' });
    }
}

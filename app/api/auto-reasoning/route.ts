import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createOpenAIProviderOverride, openai, openAIProviderOptions } from '@/lib/ai-provider';
import { createOpenAIAccountProvider } from '@/lib/openai-account';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';
import { createHash } from 'crypto';
import { redisGetJson, redisSetJson, redisSetNx } from '@/lib/redis';

// GPT reasoning effort classifier. The target chat models accept: low, medium, high, xhigh.
const CLASSIFIER_SYSTEM_PROMPT = `You are a prompt complexity analyzer. Your ONLY job is to analyze user prompts and choose the best GPT reasoning_effort value.

OUTPUT RULES:
- Respond with EXACTLY ONE WORD: "low", "medium", "high", or "xhigh"
- No explanations, no punctuation, no other text

CLASSIFICATION GUIDE:

**LOW** - Quick, factual, simple tasks:
- Simple greetings: "hi", "hello", "thanks"
- Direct factual questions: "What is the capital of France?"
- Simple definitions
- Basic translation or formatting tasks
- Casual conversation
- Simple yes/no questions

**MEDIUM** - Normal useful reasoning:
- Explanations: "Explain how X works"
- Comparisons: "What's the difference between X and Y?"
- Simple creative tasks
- General advice
- Multi-step questions requiring basic reasoning
- Summarization tasks

**HIGH** - Complex thinking, analysis, or problem-solving:
- Math problems, coding/debugging, algorithms
- Multi-part questions requiring deep analysis
- Scientific reasoning or proofs
- Strategic planning or decision analysis
- Troubleshooting confusing issues
- Ambiguous questions needing careful interpretation
- Frustrated users needing careful help

**XHIGH** - Maximum reasoning for hard or high-stakes work:
- Very complex architecture, security, database, deployment, or production debugging
- Long multi-file coding tasks with many constraints
- Deep research synthesis or difficult technical tradeoff analysis
- Advanced math/proofs/logic puzzles requiring rigorous step-by-step reasoning
- Any request where a shallow answer would likely be wrong or risky

When in doubt between two levels, choose the HIGHER one to ensure quality responses.`;

type GptReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

function promptCacheKey(prompt: string) {
    const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 4000);
    const hash = createHash('sha256').update(`spark-v1:${normalized}`).digest('hex');
    return `auto-reasoning:v2:${hash}`;
}

async function waitForCachedEffort(cacheKey: string) {
    for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
        const cached = await redisGetJson<{ effort: GptReasoningEffort }>(cacheKey);
        if (cached?.effort) return cached.effort;
    }
    return null;
}

function parseEffort(response: string): GptReasoningEffort {
    const normalized = response.trim().toLowerCase();

    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
        return normalized;
    }

    if (normalized.includes('xhigh') || normalized.includes('x-high') || normalized.includes('extra high')) return 'xhigh';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('low')) return 'low';
    return 'medium';
}

export async function POST(req: Request) {
    try {
        const { prompt, openAIAccountAuth, providerApiBaseUrl, providerApiKey } = await req.json() as { prompt?: string; openAIAccountAuth?: OpenAIAccountAuth | OpenAIAccountAuth[] | null; providerApiBaseUrl?: string | null; providerApiKey?: string | null };

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ effort: 'medium' });
        }

        console.log('\n========== AUTO-REASONING ANALYSIS ==========');
        console.log('[AUTO-REASONING] Analyzing prompt:', prompt.slice(0, 200) + (prompt.length > 200 ? '...' : ''));

        const openAIAccountAuths = Array.isArray(openAIAccountAuth) ? openAIAccountAuth : openAIAccountAuth ? [openAIAccountAuth] : [];
        const canUseSharedCache = openAIAccountAuths.length === 0 && !providerApiBaseUrl && !providerApiKey;
        const cacheKey = canUseSharedCache ? promptCacheKey(prompt) : null;
        let ownsLock = false;
        if (cacheKey) {
            const cached = await redisGetJson<{ effort: GptReasoningEffort }>(cacheKey);
            if (cached?.effort) {
                console.log('[AUTO-REASONING] Redis cache hit:', cached.effort);
                return NextResponse.json({ effort: cached.effort, cached: true });
            }

            ownsLock = await redisSetNx(`${cacheKey}:lock`, '1', 30);
            if (!ownsLock) {
                const lockedResult = await waitForCachedEffort(cacheKey);
                if (lockedResult) {
                    console.log('[AUTO-REASONING] Redis singleflight hit:', lockedResult);
                    return NextResponse.json({ effort: lockedResult, cached: true });
                }
            }
        }

        const overrideProvider = createOpenAIProviderOverride({ baseURL: providerApiBaseUrl, apiKey: providerApiKey });
        const provider = openAIAccountAuths.length > 0 ? createOpenAIAccountProvider(openAIAccountAuths) : overrideProvider || openai;
        const result = await generateText({
            model: provider.chat('gpt-5.3-codex-spark'),
            system: CLASSIFIER_SYSTEM_PROMPT,
            prompt,
            // Spark supports low/medium/high/xhigh. Use low for the cheap classifier call.
            providerOptions: openAIProviderOptions({ reasoningEffort: 'low' }),
        });

        const effort = parseEffort(result.text);

        console.log('[AUTO-REASONING] AI raw response:', result.text);
        console.log('[AUTO-REASONING] Result:', effort);
        console.log('==============================================\n');

        if (cacheKey) {
            await redisSetJson(cacheKey, { effort }, 60 * 60 * 24 * 7);
        }

        return NextResponse.json({ effort });
    } catch (error) {
        console.error('[AUTO-REASONING] Error:', error);
        return NextResponse.json({ effort: 'medium' });
    }
}

import { createPromptCacheHeaders } from '@/lib/ai-cache';
import { openai } from '@/lib/ai-provider';
import { streamText, stepCountIs } from 'ai';
import { saveAssistantMessage } from './storage';
import type { LearningSubMode } from './types';

export function streamChatCompletion(params: {
  db: any;
  chatId?: string;
  modelId: string;
  cleanModelId: string;
  subMode: LearningSubMode;
  systemPrompt: string;
  modelMessages: any[];
  tools: Record<string, unknown>;
  hasTools: boolean;
  providerOptions: Record<string, unknown>;
  promptCacheKey?: string;
  openaiProvider?: typeof openai;
  useResponsesApi?: boolean;
}) {
  const requestStartTime = Date.now();
  let firstChunkTime: number | null = null;
  let firstGeneratedChunkTime: number | null = null;
  let firstReasoningTime: number | null = null;

  const modelMessages = sanitizeModelMessages(params.modelMessages);
  if (modelMessages.length === 0) {
    throw new Error('No valid user message content was provided. Add text or re-upload the attachment and try again.');
  }

  return streamText({
    model: params.useResponsesApi
      ? (params.openaiProvider || openai).responses(params.cleanModelId)
      : (params.openaiProvider || openai).chat(params.cleanModelId),
    system: params.systemPrompt,
    messages: modelMessages as any,
    tools: params.hasTools ? params.tools as any : undefined,
    stopWhen: params.hasTools ? stepCountIs(5) : undefined,
    providerOptions: { openai: params.providerOptions as any },
    headers: createPromptCacheHeaders(params.promptCacheKey),
    onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
      console.log(`[Step Finished] finishReason: ${finishReason}`);
      console.log(`  text length: ${text?.length || 0}, toolCalls: ${toolCalls?.length || 0}, toolResults: ${toolResults?.length || 0}`);
      console.log(`  text preview: ${text?.slice(0, 200) || '(empty)'}...`);
      if (toolCalls && toolCalls.length > 0) {
        console.log(`  Tool called: ${toolCalls.map((tc: { toolName: string }) => tc.toolName).join(', ')}`);
      }
    },
    onChunk: ({ chunk }) => {
      const now = Date.now();
      const chunkType = chunk.type as string;
      if (!firstChunkTime) {
        firstChunkTime = now;
        console.log(`[CHUNK] First chunk type: ${chunkType}`);
      }
      if (chunkType === 'text-delta') {
        if (!firstGeneratedChunkTime) firstGeneratedChunkTime = now;
        const textChunk = chunk as { type: string; textDelta?: string };
        console.log(`[CHUNK] text-delta: "${textChunk.textDelta?.slice(0, 50)}..."`);
      } else {
        console.log(`[CHUNK] type: ${chunkType}`);
      }
      if ((chunkType === 'reasoning-delta' || chunkType === 'reasoning') && !firstReasoningTime) {
        firstReasoningTime = now;
        if (!firstGeneratedChunkTime) firstGeneratedChunkTime = now;
        console.log(`[CHUNK] First reasoning chunk detected at ${now - requestStartTime}ms`);
      }
    },
    onFinish: async ({ text, reasoning, usage, steps, files }) => {
      const endTime = Date.now();
      const { tps, toolCalls, toolResults } = collectFinishStats({
        modelId: params.modelId,
        requestStartTime,
        firstChunkTime,
        firstGeneratedChunkTime,
        firstReasoningTime,
        endTime,
        text,
        reasoning,
        usage,
        steps,
      });

      await saveAssistantMessage(params.db, {
        chatId: params.chatId,
        modelId: params.modelId,
        subMode: params.subMode,
        text,
        reasoning,
        files,
        toolCalls,
        toolResults,
        tokensPerSecond: tps,
      });
    },
  });
}

function sanitizeModelMessages(messages: any[]) {
  return messages
    .map((message) => {
      const role = message?.role === 'assistant' || message?.role === 'system' || message?.role === 'tool' ? message.role : 'user';

      if (role === 'system') {
        return { role, content: stringifyContent(message?.content) };
      }

      if (role === 'assistant') {
        const content = Array.isArray(message?.content)
          ? message.content
            .map((part: any) => part?.type === 'text' && typeof part.text === 'string' ? part.text : '')
            .filter(Boolean)
            .join('\n')
          : stringifyContent(message?.content);
        return content.trim() ? { role, content } : null;
      }

      if (role === 'tool') {
        return null;
      }

      if (!Array.isArray(message?.content)) {
        return { role: 'user', content: stringifyContent(message?.content) };
      }

      const content = message.content
        .map((part: any) => {
          if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) return { type: 'text', text: part.text };

          if (part?.type === 'image') {
            const image = part.image || part.url || part.data;
            if (!image) return null;
            return compactPart({ type: 'image', image, mediaType: part.mediaType });
          }

          if (part?.type === 'file') {
            const data = part.data || part.url;
            const mediaType = part.mediaType || part.mimeType;
            if (!data || !mediaType) return null;
            return compactPart({ type: 'file', data, filename: part.filename || part.name, mediaType });
          }

          return null;
        })
        .filter(Boolean);

      return { role: 'user', content: content.length ? content : '' };
    })
    .filter((message): message is { role: string; content: unknown } => !!message && (message.role !== 'user' || hasPromptContent(message.content)));
}

function compactPart(part: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(part).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

function hasPromptContent(content: unknown) {
  if (typeof content === 'string') return content.trim().length > 0;
  if (!Array.isArray(content)) return stringifyContent(content).trim().length > 0;

  return content.some((part: any) => {
    if (part?.type === 'text') return typeof part.text === 'string' && part.text.trim().length > 0;
    if (part?.type === 'image') return !!part.image;
    if (part?.type === 'file') return !!part.data && !!part.mediaType;
    return false;
  });
}

function stringifyContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  if (Array.isArray(content)) {
    return content
      .map((part: any) => part?.type === 'text' && typeof part.text === 'string' ? part.text : '')
      .filter(Boolean)
      .join('\n');
  }
  return String(content);
}

const MIN_MEASURED_GENERATION_MS = 500;
const MAX_REASONABLE_TOKENS_PER_SECOND = 500;

function collectFinishStats(args: {
  modelId: string;
  requestStartTime: number;
  firstChunkTime: number | null;
  firstGeneratedChunkTime: number | null;
  firstReasoningTime: number | null;
  endTime: number;
  text?: string;
  reasoning?: unknown;
  usage?: any;
  steps?: any[];
}) {
  let tps: number | null = null;
  const { modelId, requestStartTime, firstChunkTime, firstGeneratedChunkTime, firstReasoningTime, endTime, text, reasoning, usage, steps } = args;

  console.log(`\n========== TPS DEBUG [${modelId}] ==========`);
  console.log(`requestStartTime: ${requestStartTime}`);
  console.log(`firstReasoningTime: ${firstReasoningTime}`);
  console.log(`firstGeneratedChunkTime: ${firstGeneratedChunkTime}`);
  console.log(`firstChunkTime: ${firstChunkTime}`);
  console.log(`endTime: ${endTime}`);
  console.log('usage object:', JSON.stringify(usage, null, 2));
  console.log(`text length: ${text?.length || 0} chars`);
  console.log('reasoning:', reasoning ? 'present' : 'none');
  console.log('steps count:', steps?.length || 0);

  const toolCalls: Array<{ toolCallId: string; toolName: string; args?: unknown }> = [];
  const toolResults: unknown[] = [];

  if (steps && steps.length > 0) {
    for (const step of steps) {
      const stepToolCalls = (step as { toolCalls?: Array<{ toolCallId: string; toolName: string; input?: unknown }> }).toolCalls;
      const stepToolResults = (step as { toolResults?: Array<{ toolCallId?: string; toolName?: string; output?: unknown }> }).toolResults;
      if (!stepToolCalls) continue;

      for (let i = 0; i < stepToolCalls.length; i++) {
        const call = stepToolCalls[i];
        toolCalls.push({ toolCallId: call.toolCallId, toolName: call.toolName, args: call.input });
        if (stepToolResults && i < stepToolResults.length && stepToolResults[i]) {
          const result = stepToolResults[i];
          console.log(`[DEBUG] Saving tool output for ${result.toolName}:`, JSON.stringify(result.output).slice(0, 100));
          toolResults.push(result.output);
        } else {
          toolResults.push(undefined);
        }
      }
    }
  }

  console.log(`Total tool calls across all steps: ${toolCalls.length}`);
  console.log(`Total tool results collected: ${toolResults.length}`);
  if (toolResults.length > 0 && toolResults[0]) console.log('First result sample:', JSON.stringify(toolResults[0]).slice(0, 200));

  const outputTokens = Number.isFinite(usage?.outputTokens) ? usage.outputTokens : 0;
  const inputTokens = Number.isFinite(usage?.inputTokens) ? usage.inputTokens : 0;
  const totalTokens = Number.isFinite(usage?.totalTokens) ? usage.totalTokens : 0;
  const reasoningTokens = Number.isFinite(usage?.reasoningTokens) ? usage.reasoningTokens : 0;

  console.log(`inputTokens: ${inputTokens}`);
  console.log(`outputTokens: ${outputTokens}`);
  console.log(`totalTokens: ${totalTokens}`);
  console.log(`reasoningTokens: ${reasoningTokens}`);

  const generationStartTime = firstGeneratedChunkTime || firstReasoningTime;
  if (generationStartTime) {
    const ttft = (generationStartTime - requestStartTime) / 1000;
    const measuredGenerationMs = endTime - generationStartTime;
    const totalMs = endTime - requestStartTime;
    const generationMs = measuredGenerationMs >= MIN_MEASURED_GENERATION_MS ? measuredGenerationMs : totalMs;
    const generationSeconds = generationMs / 1000;
    const totalSeconds = totalMs / 1000;
    console.log(`TTFT (to first token): ${ttft.toFixed(3)}s`);
    console.log(`Generation time (first token -> end): ${(measuredGenerationMs / 1000).toFixed(3)}s`);
    console.log(`Total time (request -> end): ${totalSeconds.toFixed(3)}s`);
    if (measuredGenerationMs > 0 && measuredGenerationMs < MIN_MEASURED_GENERATION_MS) {
      console.log(`Generation window was ${measuredGenerationMs}ms; using total request time for stable TPS.`);
    }

    const fallbackGeneratedTokens = totalTokens > inputTokens ? totalTokens - inputTokens : outputTokens;
    const tokensGenerated = outputTokens > 0 ? outputTokens : fallbackGeneratedTokens;
    const rawTps = tokensGenerated > 0 && generationSeconds > 0 ? tokensGenerated / generationSeconds : null;
    if (rawTps && rawTps > 0 && rawTps <= MAX_REASONABLE_TOKENS_PER_SECOND) {
      tps = rawTps;
      console.log(`TPS = ${tokensGenerated} tokens / ${generationSeconds.toFixed(3)}s = ${tps.toFixed(1)} t/s`);
    } else {
      console.log(`TPS calculation skipped: tokensGenerated=${tokensGenerated}, generationSeconds=${generationSeconds}, rawTps=${rawTps}`);
    }
  } else {
    console.log('ERROR: No chunk timestamps recorded - callbacks never fired?');
  }

  console.log('==========================================\n');
  return { tps, toolCalls, toolResults };
}

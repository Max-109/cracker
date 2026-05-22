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
  openaiProvider?: typeof openai;
}) {
  const requestStartTime = Date.now();
  let firstChunkTime: number | null = null;
  let firstReasoningTime: number | null = null;

  return streamText({
    model: (params.openaiProvider || openai).chat(params.cleanModelId),
    system: params.systemPrompt,
    messages: params.modelMessages,
    tools: params.hasTools ? params.tools as any : undefined,
    stopWhen: params.hasTools ? stepCountIs(5) : undefined,
    providerOptions: { openai: params.providerOptions as any },
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
        const textChunk = chunk as { type: string; textDelta?: string };
        console.log(`[CHUNK] text-delta: "${textChunk.textDelta?.slice(0, 50)}..."`);
      } else {
        console.log(`[CHUNK] type: ${chunkType}`);
      }
      if ((chunkType === 'reasoning-delta' || chunkType === 'reasoning') && !firstReasoningTime) {
        firstReasoningTime = now;
        console.log(`[CHUNK] First reasoning chunk detected at ${now - requestStartTime}ms`);
      }
    },
    onFinish: async ({ text, reasoning, usage, steps, files }) => {
      const endTime = Date.now();
      const { tps, toolCalls, toolResults } = collectFinishStats({
        modelId: params.modelId,
        requestStartTime,
        firstChunkTime,
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

function collectFinishStats(args: {
  modelId: string;
  requestStartTime: number;
  firstChunkTime: number | null;
  firstReasoningTime: number | null;
  endTime: number;
  text?: string;
  reasoning?: unknown;
  usage?: any;
  steps?: any[];
}) {
  let tps = 0;
  const { modelId, requestStartTime, firstChunkTime, firstReasoningTime, endTime, text, reasoning, usage, steps } = args;

  console.log(`\n========== TPS DEBUG [${modelId}] ==========`);
  console.log(`requestStartTime: ${requestStartTime}`);
  console.log(`firstReasoningTime: ${firstReasoningTime}`);
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

  const outputTokens = usage?.outputTokens || 0;
  const inputTokens = usage?.inputTokens || 0;
  const totalTokens = usage?.totalTokens || 0;
  const reasoningTokens = usage?.reasoningTokens || 0;

  console.log(`inputTokens: ${inputTokens}`);
  console.log(`outputTokens: ${outputTokens}`);
  console.log(`totalTokens: ${totalTokens}`);
  console.log(`reasoningTokens: ${reasoningTokens}`);

  const generationStartTime = firstReasoningTime || firstChunkTime;
  if (generationStartTime) {
    const ttft = (generationStartTime - requestStartTime) / 1000;
    const generationSeconds = (endTime - generationStartTime) / 1000;
    const totalSeconds = (endTime - requestStartTime) / 1000;
    console.log(`TTFT (to first token): ${ttft.toFixed(3)}s`);
    console.log(`Generation time (first token -> end): ${generationSeconds.toFixed(3)}s`);
    console.log(`Total time (request -> end): ${totalSeconds.toFixed(3)}s`);

    const tokensGenerated = reasoningTokens > 0 ? outputTokens + reasoningTokens : (totalTokens > 0 ? totalTokens - inputTokens : outputTokens);
    if (tokensGenerated > 0 && generationSeconds > 0) {
      tps = tokensGenerated / generationSeconds;
      console.log(`TPS = ${tokensGenerated} tokens / ${generationSeconds.toFixed(3)}s = ${tps.toFixed(1)} t/s`);
    } else {
      console.log(`TPS calculation skipped: tokensGenerated=${tokensGenerated}, generationSeconds=${generationSeconds}`);
    }
  } else {
    console.log('ERROR: No chunk timestamps recorded - callbacks never fired?');
  }

  console.log('==========================================\n');
  return { tps, toolCalls, toolResults };
}

import { getDb } from '@/db';
import { getOpenAIConfigError } from '@/lib/ai-provider';
import { getModelCapabilities, modelSupportsPriority, normalizeModelId } from '@/lib/model-capabilities';
import { NextResponse } from 'next/server';
import { extractAndStoreFactsInBackground, loadChatMemory } from './_lib/memory';
import { extractTextFromLastUserMessage, prepareModelMessages } from './_lib/messages';
import { createOpenAIProviderOptions, normalizeReasoningEffort } from './_lib/provider-options';
import { generateSystemPrompt } from './_lib/prompt';
import { getLatestAssistantStats } from './_lib/storage';
import { streamChatCompletion } from './_lib/streaming';
import { requestContainsImages, resolveChatTools } from './_lib/tools';
import type { ChatRequestBody, LearningSubMode } from './_lib/types';

export const maxDuration = 300;

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getLatestAssistantStats(db, chatId));
  } catch (error) {
    console.error('Failed to fetch chat stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json() as ChatRequestBody;
    const {
      messages,
      model,
      reasoningEffort,
      chatId,
      responseLength,
      userName,
      userGender,
      learningMode,
      learningSubMode,
      customInstructions,
      enabledMcpServers,
      fastMode,
    } = body;

    const configError = getOpenAIConfigError();
    if (configError) {
      return jsonError('AI provider not configured', configError, 500);
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('[API] Invalid messages:', typeof messages, messages);
      return jsonError('Bad Request', 'messages must be a non-empty array', 400);
    }

    const modelId = model || 'gpt-5.4-mini';
    const effort = reasoningEffort || 'medium';
    const responseLengthValue = typeof responseLength === 'number' ? responseLength : 30;
    const userNameValue = userName || '';
    const userGenderValue = userGender || 'not-specified';
    const isLearningMode = learningMode === true;
    const subMode: LearningSubMode = (learningSubMode === 'summary' || learningSubMode === 'flashcard') ? learningSubMode : 'teaching';
    const userCustomInstructions = customInstructions || '';

    const { userMemoryFacts, memoryEnabled, userId } = await loadChatMemory(db, chatId);
    const { tools, hasTools } = resolveChatTools(enabledMcpServers);
    const { hydratedMessages, modelMessages } = await prepareModelMessages(messages);

    const effectiveModelId = normalizeModelId(modelId);
    const modelCapabilities = getModelCapabilities(effectiveModelId);
    const normalizedEffort = normalizeReasoningEffort(effort);
    const usePriorityService = fastMode === true && modelSupportsPriority(effectiveModelId);
    const providerOptions = createOpenAIProviderOptions(effort, effectiveModelId, fastMode === true);

    if (requestContainsImages(hydratedMessages) && !modelCapabilities.supportsImages) {
      return jsonError('Unsupported attachment', `${effectiveModelId} is text-only and does not support image attachments.`, 400);
    }

    console.log('[API] Model:', modelId, '-> effective:', effectiveModelId, 'priority:', usePriorityService, 'capabilities:', modelCapabilities);

    const systemPrompt = generateSystemPrompt(
      responseLengthValue,
      userNameValue,
      userGenderValue,
      isLearningMode,
      subMode,
      isLearningMode ? undefined : userCustomInstructions,
      isLearningMode ? undefined : userMemoryFacts,
    );

    debugPrompt(systemPrompt);
    debugTools(hasTools, tools);
    debugProviderOptions(modelId, effectiveModelId, providerOptions);

    const result = streamChatCompletion({
      db,
      chatId,
      modelId,
      cleanModelId: effectiveModelId,
      subMode,
      systemPrompt,
      modelMessages,
      tools,
      hasTools,
      providerOptions,
    });

    extractAndStoreFactsInBackground(
      db,
      userId,
      memoryEnabled,
      extractTextFromLastUserMessage(messages),
    );

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error) {
    console.error('API Route Error:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : String(error), 500);
  }
}

function jsonError(error: string, details: string, status: number) {
  return new Response(JSON.stringify({ error, details }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function debugPrompt(systemPrompt: string) {
  console.log('\n========== DEBUG: SYSTEM PROMPT ==========');
  console.log('System prompt length:', systemPrompt.length);
  console.log('System prompt (first 2000 chars):', systemPrompt.slice(0, 2000));
  console.log('System prompt (last 1000 chars):', systemPrompt.slice(-1000));
  console.log('==========================================\n');
}

function debugTools(hasTools: boolean, tools: Record<string, unknown>) {
  console.log('\n========== DEBUG: TOOLS ==========');
  console.log('hasTools:', hasTools);
  console.log('Tool names:', Object.keys(tools));

  if (hasTools) {
    for (const [name, toolDef] of Object.entries(tools)) {
      console.log(`\n=== Tool "${name}" FULL STRUCTURE ===`);
      try {
        const toolObj = toolDef as Record<string, unknown>;
        console.log('Keys on tool object:', Object.keys(toolObj));
        console.log('description:', toolObj.description);
        console.log('parameters:', toolObj.parameters);
        console.log('execute type:', typeof toolObj.execute);
        if (toolObj.parameters && typeof toolObj.parameters === 'object') {
          const params = toolObj.parameters as Record<string, unknown>;
          console.log('parameters._def:', (params as { _def?: unknown })._def ? 'EXISTS (Zod)' : 'NOT ZOD');
        }
      } catch (e) {
        console.log('Error inspecting tool:', e);
      }
    }
  }

  console.log('===================================\n');
}

function debugProviderOptions(modelId: string, effectiveModelId: string, providerOptions: Record<string, unknown>) {
  console.log('\n========== DEBUG: PROVIDER OPTIONS ==========');
  console.log('modelId:', modelId);
  console.log('effectiveModelId:', effectiveModelId);
  console.log('openAIProviderOpts:', JSON.stringify(providerOptions, null, 2));
  console.log('==============================================\n');
}

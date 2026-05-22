export type LearningSubMode = 'summary' | 'flashcard' | 'teaching';

import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

export type ChatRequestBody = {
  messages?: ChatInputMessage[];
  model?: string;
  reasoningEffort?: string;
  chatId?: string;
  responseLength?: number;
  userName?: string;
  userGender?: string;
  learningMode?: boolean;
  learningSubMode?: LearningSubMode;
  customInstructions?: string;
  enabledMcpServers?: string[];
  fastMode?: boolean;
  openAIAccountAuth?: OpenAIAccountAuth | null;
  useOpenAIAccount?: boolean;
};

export type ChatInputMessage = {
  id?: string;
  role: string;
  content?: unknown;
  parts?: unknown[];
};

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

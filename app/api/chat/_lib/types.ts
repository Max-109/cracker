export type LearningSubMode = 'summary' | 'flashcard' | 'teaching';

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
};

export type ChatInputMessage = {
  id?: string;
  role: string;
  content?: unknown;
  parts?: unknown[];
};

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

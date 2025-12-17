export type ChatRole = 'function' | 'data' | 'system' | 'user' | 'assistant' | 'tool';

export type TextPart = {
  type: 'text';
  text?: string;
};

export type ImagePart = {
  type: 'image';
  image?: string;
  url?: string;
  mediaType?: string;
  mimeType?: string;
  name?: string;
};

export type GeneratedImagePart = {
  type: 'generated-image';
  data: string; // base64 image data
  mediaType: string;
  width?: number;
  height?: number;
};

export type FilePart = {
  type: 'file';
  data?: string;
  url?: string;
  mediaType?: string;
  mimeType?: string;
  filename?: string;
  name?: string;
  providerOptions?: Record<string, unknown>;
};

export type ReasoningPart = {
  type: 'reasoning';
  text?: string;
  reasoning?: string;
};

export type SourcePart = {
  type: 'source';
  source: {
    sourceType: 'url';
    id: string;
    url: string;
    title?: string;
  };
};

export type ToolInvocationPart = {
  type: 'tool-invocation';
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    state: 'call' | 'result' | 'partial-call';
    args?: Record<string, unknown>;
    result?: unknown;
  };
};

export type MessagePart = TextPart | ImagePart | GeneratedImagePart | FilePart | ReasoningPart | SourcePart | ToolInvocationPart;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string | MessagePart[];
  createdAt?: Date;
  parts?: MessagePart[];
  learningSubMode?: 'summary' | 'flashcard' | 'teaching'; // Add optional mode property
}

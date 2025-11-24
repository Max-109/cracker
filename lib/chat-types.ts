export type ChatRole = 'function' | 'data' | 'system' | 'user' | 'assistant' | 'tool';

export type TextPart = {
  type: 'text';
  text?: string;
};

export type ImagePart = {
  type: 'image';
  image?: string;
  mediaType?: string;
  mimeType?: string;
  name?: string;
};

export type FilePart = {
  type: 'file';
  data?: string;
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

export type MessagePart = TextPart | ImagePart | FilePart | ReasoningPart;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string | MessagePart[];
  createdAt?: Date;
  parts?: MessagePart[];
}

// TypeScript types - copied exactly from web app

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
    learningSubMode?: 'summary' | 'flashcard' | 'teaching';
    model?: string;
    tokensPerSecond?: number;
}

export interface Chat {
    id: string;
    title: string;
    mode: 'chat' | 'image' | 'learning' | 'deep-search';
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt?: Date;
}

export type ChatMode = 'chat' | 'image' | 'learning' | 'deep-search';
export type LearningSubMode = 'summary' | 'flashcard' | 'teaching';
export type ReasoningEffort = 'low' | 'medium' | 'high';

// SSE Stream events from /api/chat
export interface StreamTextDelta {
    type: 'text-delta';
    textDelta: string;
}

export interface StreamReasoning {
    type: 'reasoning';
    textDelta: string;
}

export interface StreamToolCall {
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
}

export interface StreamToolResult {
    type: 'tool-result';
    toolCallId: string;
    result: unknown;
}

export interface StreamFinish {
    type: 'finish';
    finishReason: 'stop' | 'tool-calls' | 'length';
}

export interface StreamUsage {
    type: 'usage';
    promptTokens: number;
    completionTokens: number;
}

export type StreamEvent = StreamTextDelta | StreamReasoning | StreamToolCall | StreamToolResult | StreamFinish | StreamUsage;

// User settings
export interface UserSettings {
    currentModelId: string;
    currentModelName: string;
    reasoningEffort: ReasoningEffort;
    responseLength: number;
    learningMode: boolean;
    chatMode: ChatMode;
    learningSubMode: LearningSubMode;
    customInstructions: string;
    userName: string;
    userGender: string;
    enabledMcpServers: string[];
}

// Local settings (stored in MMKV)
export interface LocalSettings {
    accentColor: string;
    codeWrap: boolean;
    autoScroll: boolean;
}

// Auth types
export interface User {
    id: string;
    email?: string;
    name?: string;
    isAdmin?: boolean;
    isGuest: boolean;
    loginName?: string;
}

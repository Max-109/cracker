/**
 * Transforms database message format to UI message format.
 * This utility eliminates code duplication across ChatInterface.tsx
 * 
 * @param msg - Raw message from database with content as JSON or string
 * @returns Transformed message in UI format with typed parts
 */
export function transformDbMessageToUi(msg: {
    id: string;
    role: string;
    content: unknown;
    model?: string | null;
    tokensPerSecond?: string | null;
}): {
    id: string;
    role: string;
    parts: Array<{
        type: string;
        text?: string;
        url?: string;
        data?: string;
        mediaType?: string;
        filename?: string;
        title?: string;
        source?: string;
        stopType?: string;
        [key: string]: unknown;
    }>;
    model?: string | null;
    tokensPerSecond?: string | null;
    learningSubMode?: 'summary' | 'flashcard' | 'teaching'; // Add property to return type
} {
    let parts: Array<{
        type: string;
        text?: string;
        url?: string;
        data?: string;
        mediaType?: string;
        filename?: string;
        title?: string;
        source?: string;
        stopType?: string;
        [key: string]: unknown;
    }>;

    if (Array.isArray(msg.content)) {
        parts = msg.content.map((p: unknown) => {
            // Handle primitive string
            if (typeof p === 'string') {
                return { type: 'text', text: p };
            }

            // Handle null/undefined
            if (p === null || p === undefined) {
                return { type: 'text', text: '' };
            }

            // Handle object types
            if (typeof p === 'object') {
                const part = p as Record<string, unknown>;
                const type = part.type as string;

                switch (type) {
                    case 'text':
                        return { type: 'text', text: (part.text as string) || '' };

                    case 'reasoning': {
                        const reasoningText = (part.text as string) || (part.reasoning as string) || '';
                        return {
                            type: 'reasoning',
                            text: reasoningText,
                            reasoning: reasoningText  // MessageItem expects this property
                        };
                    }

                    case 'stopped':
                        return { type: 'stopped', stopType: part.stopType as string };

                    case 'generated-image':
                        return {
                            type: 'generated-image',
                            data: part.data as string,
                            mediaType: part.mediaType as string
                        };

                    case 'image':
                        return {
                            type: 'file',
                            url: (part.image as string) || (part.url as string),
                            mediaType: (part.mediaType as string) || 'image/png',
                            filename: (part.name as string) || 'image'
                        };

                    case 'file':
                        return {
                            type: 'file',
                            url: (part.data as string) || (part.url as string),
                            mediaType: (part.mediaType as string) || (part.mimeType as string) || 'application/octet-stream',
                            filename: (part.filename as string) || (part.name as string) || 'file'
                        };

                    case 'source':
                    case 'source-url':
                        return {
                            type: 'source',
                            url: part.url as string,
                            title: part.title as string,
                            source: part.source as string
                        };

                    case 'tool-invocation':
                        return part as typeof parts[number];

                    default:
                        // Fallback for unknown types with text property
                        if (part.text !== undefined) {
                            return { type: 'text', text: (part.text as string) || '' };
                        }
                        return { type: 'text', text: '' };
                }
            }

            // Fallback for any other type
            return { type: 'text', text: String(p || '') };
        });
    } else if (typeof msg.content === 'string') {
        parts = [{ type: 'text', text: msg.content }];
    } else {
        parts = [{ type: 'text', text: '' }];
    }

    return {
        id: msg.id,
        role: msg.role,
        parts,
        model: msg.model,
        tokensPerSecond: msg.tokensPerSecond,
        learningSubMode: (msg as any).learningSubMode // Cast to any because our input type definition here doesn't have it yet (it comes from DB)
    };
}

/**
 * Transforms an array of database messages to UI format
 */
export function transformMessagesToUi(messages: Array<{
    id: string;
    role: string;
    content: unknown;
    model?: string | null;
    tokensPerSecond?: string | null;
    learningSubMode?: string | null; // Add property to input type
}>): ReturnType<typeof transformDbMessageToUi>[] {
    return messages.map(transformDbMessageToUi);
}

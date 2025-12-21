import * as SecureStore from 'expo-secure-store';

// Use your deployed Next.js backend URL
const API_BASE = 'https://cracker.mom';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Get the auth token (guest JWT or Supabase session)
 */
async function getAuthToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync('guest-jwt');
    } catch {
        return null;
    }
}

/**
 * Main fetch wrapper with automatic auth header injection
 */
export async function apiFetch<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ApiError(response.status, errorText);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
}

/**
 * Streaming fetch for SSE endpoints like /api/chat
 */
export async function apiStreamFetch(
    path: string,
    body: Record<string, unknown>,
    onEvent: (event: unknown) => void,
    onError?: (error: Error) => void
): Promise<void> {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        onError?.(new ApiError(response.status, errorText));
        return;
    }

    if (!response.body) {
        onError?.(new Error('No response body'));
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const event = JSON.parse(data);
                        onEvent(event);
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
}

// API endpoint helpers

export const api = {
    // Auth
    async guestLogin(loginName: string): Promise<{ userId: string; loginName: string }> {
        const response = await fetch(`${API_BASE}/api/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginName }),
        });

        if (!response.ok) {
            throw new ApiError(response.status, 'Guest login failed');
        }

        // Extract JWT from Set-Cookie header (if exposed) or response body
        const data = await response.json();

        // The API returns the JWT in the response for mobile clients
        // Store it in SecureStore
        if (data.token) {
            await SecureStore.setItemAsync('guest-jwt', data.token);
        }

        return data;
    },

    async guestLogout(): Promise<void> {
        await apiFetch('/api/auth/guest', { method: 'DELETE' });
        await SecureStore.deleteItemAsync('guest-jwt');
    },

    async getProfile(userId: string): Promise<{ userName: string; userGender: string }> {
        return apiFetch(`/api/auth/profile?userId=${userId}`);
    },

    // Chats
    async getChats(): Promise<{ id: string; title: string; mode: string; createdAt: string }[]> {
        return apiFetch('/api/chats');
    },

    async createChat(title: string, mode: string): Promise<{ id: string }> {
        return apiFetch('/api/chats', {
            method: 'POST',
            body: JSON.stringify({ title, mode }),
        });
    },

    async getChat(id: string): Promise<{ chat: unknown; messages: unknown[] }> {
        return apiFetch(`/api/chats/${id}`);
    },

    async deleteChat(id: string): Promise<void> {
        await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
    },

    async updateChatTitle(id: string, title: string): Promise<void> {
        await apiFetch(`/api/chats/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        });
    },

    // Messages
    async saveMessage(chatId: string, role: string, content: string): Promise<{ id: string }> {
        return apiFetch('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ chatId, role, content }),
        });
    },

    // Settings
    async getSettings(): Promise<Record<string, unknown>> {
        return apiFetch('/api/settings');
    },

    async updateSettings(settings: Record<string, unknown>): Promise<void> {
        await apiFetch('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    },

    // Transcription
    async transcribe(audioUri: string, model: string): Promise<{ text: string }> {
        const formData = new FormData();
        formData.append('audio', {
            uri: audioUri,
            type: 'audio/webm',
            name: 'recording.webm',
        } as unknown as Blob);
        formData.append('model', model);

        const token = await getAuthToken();
        const response = await fetch(`${API_BASE}/api/transcribe`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            throw new ApiError(response.status, 'Transcription failed');
        }

        return response.json();
    },

    // Auto-reasoning
    async getReasoningEffort(message: string): Promise<{ effort: 'low' | 'medium' | 'high' }> {
        return apiFetch('/api/auto-reasoning', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },

    // Title generation
    async generateTitle(messages: { role: string; content: string }[]): Promise<{ title: string }> {
        return apiFetch('/api/generate-title', {
            method: 'POST',
            body: JSON.stringify({ messages }),
        });
    },

    // User facts
    async getUserFacts(): Promise<{ facts: { id: string; fact: string }[] }> {
        return apiFetch('/api/user-facts');
    },

    async deleteFact(id: string): Promise<void> {
        await apiFetch(`/api/user-facts?id=${id}`, { method: 'DELETE' });
    },

    async clearAllFacts(): Promise<void> {
        await apiFetch('/api/user-facts?clearAll=true', { method: 'DELETE' });
    },
};

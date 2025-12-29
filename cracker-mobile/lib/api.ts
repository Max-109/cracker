import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

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
 * Will attempt to refresh the session if it's expired
 */
async function getAuthToken(): Promise<string | null> {
    try {
        // 1. Check for guest JWT first
        const guestJwt = await SecureStore.getItemAsync('guest-jwt');
        if (guestJwt) {
            return guestJwt;
        }

        // 2. Try getting Supabase session
        const { data } = await supabase.auth.getSession();

        // 3. If no session, try refreshing
        if (!data.session) {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
                return null;
            }

            if (refreshed.session) {
                return refreshed.session.access_token;
            }

            return null;
        }

        // 4. Check if session is expired or about to expire (within 60 seconds)
        const expiresAt = data.session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && expiresAt - now < 60) {
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (refreshed.session) {
                return refreshed.session.access_token;
            }
        }

        return data.session.access_token;
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
 * Uses fetch with ReadableStream for real-time streaming (supported in Expo SDK 54+)
 * Falls back to XMLHttpRequest if ReadableStream is not available
 */
export async function apiStreamFetch(
    path: string,
    body: Record<string, unknown>,
    onEvent: (event: unknown) => void,
    onError?: (error: Error) => void
): Promise<void> {
    const token = await getAuthToken();

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
            // @ts-ignore - React Native specific option for streaming
            reactNative: { textStreaming: true },
        });

        if (!response.ok) {
            throw new ApiError(response.status, response.statusText || 'Request failed');
        }

        // Try to use ReadableStream (real-time streaming)
        const reader = response.body?.getReader();
        if (reader) {
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        processSSEBuffer(buffer, onEvent);
                    }
                    break;
                }

                // Decode the chunk and add to buffer
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process complete SSE events (lines ending with \n\n or \n)
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
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
        } else {
            // Fallback: parse entire response at once (no real streaming)
            const text = await response.text();
            processSSEBuffer(text, onEvent);
        }
    } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

/**
 * Helper to process remaining SSE buffer
 */
function processSSEBuffer(buffer: string, onEvent: (event: unknown) => void) {
    const lines = buffer.split('\n');
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data && data !== '[DONE]') {
                try {
                    const event = JSON.parse(data);
                    onEvent(event);
                } catch {
                    // Skip invalid JSON
                }
            }
        }
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

    // Get messages for a chat - web returns array of messages directly
    async getChat(id: string): Promise<unknown[]> {
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

    // Title generation (matches web API signature)
    async generateTitle(chatId: string, prompt: string): Promise<{ title: string }> {
        return apiFetch('/api/generate-title', {
            method: 'POST',
            body: JSON.stringify({ chatId, prompt }),
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

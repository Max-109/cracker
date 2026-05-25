import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_BASE = 'https://cracker.mom';
const API_BASE_STORAGE_KEY = 'cracker-api-base-url';
const PROVIDER_API_BASE_STORAGE_KEY = 'cracker-provider-api-base-url';
const PROVIDER_ENABLED_STORAGE_KEY = 'cracker-provider-enabled';
const API_KEY_STORAGE_KEY = 'cracker-provider-api-key';

export async function getApiBaseUrl(): Promise<string> {
    try {
        return (await SecureStore.getItemAsync(API_BASE_STORAGE_KEY)) || DEFAULT_API_BASE;
    } catch {
        return DEFAULT_API_BASE;
    }
}

export async function setApiBaseUrl(url: string): Promise<void> {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
        await SecureStore.deleteItemAsync(API_BASE_STORAGE_KEY);
        return;
    }
    await SecureStore.setItemAsync(API_BASE_STORAGE_KEY, trimmed);
}

export async function getProviderApiBaseUrl(): Promise<string> {
    try {
        return (await SecureStore.getItemAsync(PROVIDER_API_BASE_STORAGE_KEY)) || '';
    } catch {
        return '';
    }
}

export async function setProviderApiBaseUrl(url: string): Promise<void> {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
        await SecureStore.deleteItemAsync(PROVIDER_API_BASE_STORAGE_KEY);
        return;
    }
    await SecureStore.setItemAsync(PROVIDER_API_BASE_STORAGE_KEY, trimmed);
}

export async function getProviderEnabled(): Promise<boolean> {
    try {
        return (await SecureStore.getItemAsync(PROVIDER_ENABLED_STORAGE_KEY)) === 'true';
    } catch {
        return false;
    }
}

export async function setProviderEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(PROVIDER_ENABLED_STORAGE_KEY, String(enabled));
}

export async function getProviderApiKey(): Promise<string> {
    try {
        return (await SecureStore.getItemAsync(API_KEY_STORAGE_KEY)) || '';
    } catch {
        return '';
    }
}

export async function setProviderApiKey(key: string): Promise<void> {
    const trimmed = key.trim();
    if (!trimmed) {
        await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
        return;
    }
    await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, trimmed);
}

export async function getProviderConfig(): Promise<{ providerApiBaseUrl?: string; providerApiKey?: string }> {
    const [enabled, baseUrl, key] = await Promise.all([getProviderEnabled(), getProviderApiBaseUrl(), getProviderApiKey()]);
    return enabled && key && baseUrl ? { providerApiBaseUrl: baseUrl, providerApiKey: key } : {};
}

async function parseApiError(response: Response, fallback: string) {
    const text = await response.text().catch(() => '');
    if (!text) return fallback;
    try {
        const data = JSON.parse(text) as { error?: string; details?: string; message?: string };
        return data.details || data.error || data.message || text;
    } catch {
        return text;
    }
}

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Get the auth token (app JWT or guest JWT).
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const appJwt = await SecureStore.getItemAsync('app-jwt');
        if (appJwt) return appJwt;

        const guestJwt = await SecureStore.getItemAsync('guest-jwt');
        if (guestJwt) return guestJwt;

        return null;
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
    const apiBase = await getApiBaseUrl();
    const timeoutMs = 15000;
    const controller = options.signal ? null : new AbortController();
    const timeout = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers,
        signal: options.signal || controller?.signal,
    }).finally(() => {
        if (timeout) clearTimeout(timeout);
    });

    if (!response.ok) {
        throw new ApiError(response.status, await parseApiError(response, 'Unknown error'));
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
}

/**
 * Streaming fetch for SSE endpoints like /api/chat.
 * Use Expo's native fetch implementation because React Native's global fetch/XHR
 * can buffer chunked responses until completion on Android release builds.
 */
export async function apiStreamFetch(
    path: string,
    body: Record<string, unknown>,
    onEvent: (event: unknown) => void | boolean,
    onError?: (error: Error) => void,
    signal?: AbortSignal
): Promise<void> {
    const token = await getAuthToken();
    const apiBase = await getApiBaseUrl();

    try {
        const response = await expoFetch(`${apiBase}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            throw new ApiError(response.status, await parseApiError(response, response.statusText || 'Request failed'));
        }

        const reader = response.body?.getReader();
        if (!reader) {
            processSSEBuffer(`${await response.text()}\n`, onEvent, () => undefined);
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let shouldStop = false;

        while (!shouldStop) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer = processSSEBuffer(buffer + decoder.decode(value, { stream: true }), onEvent, () => {
                shouldStop = true;
            });
        }

        const trailing = decoder.decode();
        if (trailing || buffer.trim()) {
            processSSEBuffer(`${buffer}${trailing}\n`, onEvent, () => undefined);
        }

        if (shouldStop) {
            await reader.cancel().catch(() => undefined);
        }
    } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        if (signal?.aborted) normalized.name = 'AbortError';
        onError?.(normalized);
        throw normalized;
    }
}

function emitSSEData(data: string, onEvent: (event: unknown) => void | boolean, onDone: () => void) {
    if (!data || data === '[DONE]') {
        if (data === '[DONE]') onDone();
        return;
    }

    try {
        const event = JSON.parse(data);
        const eventObj = event as { type?: string; error?: unknown; message?: unknown };
        if (eventObj.type === 'error' || eventObj.error) {
            const message = typeof eventObj.error === 'string'
                ? eventObj.error
                : typeof eventObj.message === 'string'
                    ? eventObj.message
                    : 'The model request failed.';
            throw new Error(message);
        }
        if (onEvent(event) === false) onDone();
    } catch (error) {
        if (error instanceof Error && error.name !== 'SyntaxError') throw error;
        // Skip invalid/incomplete JSON chunks.
    }
}

/**
 * Processes complete SSE lines and returns any partial trailing line.
 */
function processSSEBuffer(buffer: string, onEvent: (event: unknown) => void | boolean, onDone: () => void) {
    const lines = buffer.split('\n');
    const remainder = lines.pop() || '';

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.startsWith('data: ')) continue;
        emitSSEData(line.slice(6).trim(), onEvent, onDone);
    }

    return remainder;
}

// API endpoint helpers

export const api = {
    // Auth
    async guestLogin(loginName: string): Promise<{ userId: string; loginName: string }> {
        const apiBase = await getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginName }),
        });

        if (!response.ok) {
            throw new ApiError(response.status, await parseApiError(response, 'Guest login failed'));
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
        await SecureStore.deleteItemAsync('app-jwt');
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
    async saveMessage(chatId: string, role: string, content: unknown): Promise<{ id: string }> {
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

    // Uploads
    async uploadFile(file: { uri: string; name: string; mimeType?: string }): Promise<{ url: string; contentType?: string; size?: number }> {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream',
            name: file.name,
        } as unknown as Blob);

        const token = await getAuthToken();
        const apiBase = await getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            throw new ApiError(response.status, await parseApiError(response, 'Upload failed'));
        }

        return response.json();
    },

    // Transcription
    async transcribe(audioUri: string, openAIAccountAuth?: unknown): Promise<{ text: string }> {
        if (!openAIAccountAuth) {
            throw new ApiError(401, 'Voice transcription now requires a connected OpenAI account.');
        }

        const formData = new FormData();
        formData.append('audio', {
            uri: audioUri,
            type: 'audio/webm',
            name: 'recording.webm',
        } as unknown as Blob);
        formData.append('openAIAccountAuth', JSON.stringify(openAIAccountAuth));

        const token = await getAuthToken();
        const apiBase = await getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/transcribe`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            throw new ApiError(response.status, await parseApiError(response, 'Transcription failed'));
        }

        return response.json();
    },

    // Auto-reasoning
    async getReasoningEffort(message: string, providerContext: Record<string, unknown> = {}): Promise<{ effort: 'low' | 'medium' | 'high' | 'xhigh' }> {
        return apiFetch('/api/auto-reasoning', {
            method: 'POST',
            body: JSON.stringify({ prompt: message, ...providerContext }),
        });
    },

    // Title generation (matches web API signature)
    async generateTitle(chatId: string, prompt: string, providerContext: Record<string, unknown> = {}): Promise<{ title: string }> {
        return apiFetch('/api/generate-title', {
            method: 'POST',
            body: JSON.stringify({ chatId, prompt, ...providerContext }),
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

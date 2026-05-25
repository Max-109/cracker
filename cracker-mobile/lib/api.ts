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
 * React Native fetch can expose the body only after completion on some builds, so
 * use XMLHttpRequest progress events for reliable token-by-token UI updates.
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

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let seenLength = 0;
        let buffer = '';
        let settled = false;

        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', abort);
            if (error) {
                onError?.(error);
                reject(error);
            } else {
                resolve();
            }
        };

        const abort = () => {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            xhr.abort();
            finish(error);
        };

        const safelyProcessIncomingText = () => {
            try {
                processIncomingText();
            } catch (error) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        };

        const processIncomingText = () => {
            const responseText = xhr.responseText || '';
            if (responseText.length <= seenLength) return;

            buffer += responseText.slice(seenLength);
            seenLength = responseText.length;
            buffer = processSSEBuffer(buffer, onEvent, () => finish());
        };

        try {
            xhr.open('POST', `${apiBase}${path}`);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'text/event-stream');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            signal?.addEventListener('abort', abort);

            xhr.onprogress = safelyProcessIncomingText;
            xhr.onreadystatechange = () => {
                if (xhr.readyState === XMLHttpRequest.LOADING) {
                    safelyProcessIncomingText();
                }
            };
            xhr.onload = () => {
                try {
                    processIncomingText();
                    if (xhr.status < 200 || xhr.status >= 300) {
                        const message = parseXhrError(xhr.responseText, xhr.statusText || 'Request failed');
                        finish(new ApiError(xhr.status, message));
                        return;
                    }
                    if (buffer.trim()) {
                        buffer = processSSEBuffer(`${buffer}\n`, onEvent, () => finish());
                    }
                    finish();
                } catch (error) {
                    finish(error instanceof Error ? error : new Error(String(error)));
                }
            };
            xhr.onerror = () => finish(new Error('Network request failed'));
            xhr.ontimeout = () => finish(new Error('Request timed out'));
            xhr.onabort = () => {
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                finish(error);
            };
            xhr.send(JSON.stringify(body));
        } catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
        }
    });
}

function parseXhrError(text: string, fallback: string) {
    if (!text) return fallback;
    try {
        const data = JSON.parse(text) as { error?: string; details?: string; message?: string };
        return data.details || data.error || data.message || text;
    } catch {
        return text;
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

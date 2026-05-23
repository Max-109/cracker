import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { apiFetch } from '../lib/api';

type OpenAIAccountAuth = {
    refreshToken: string;
    accessToken: string;
    expiresAtMillis: number;
    accountId: string | null;
    email: string | null;
    integrityState?: string | null;
};

type OpenAIUsageWindow = { used_percent?: number; reset_at?: number; limit_window_seconds?: number };
type OpenAIUsagePayload = {
    plan_type?: string;
    rate_limit?: {
        allowed?: boolean;
        limit_reached?: boolean;
        primary_window?: OpenAIUsageWindow;
        secondary_window?: OpenAIUsageWindow;
    };
};

type DeviceStartResponse = {
    device: {
        device_auth_id: string;
        user_code: string;
        expires_in?: number;
        interval?: number;
    };
    verificationUrl: string;
};

type OpenAIState = {
    auth: OpenAIAccountAuth | null;
    usage: OpenAIUsagePayload | null;
    enabled: boolean;
    isLoading: boolean;
    isConnecting: boolean;
    lastError: string | null;
    lastUpdatedAt: number | null;
    deviceCode: string | null;
    deviceCodeCopiedAt: number | null;
    initialize: () => Promise<void>;
    connect: () => Promise<void>;
    refreshUsage: () => Promise<void>;
    setEnabled: (enabled: boolean) => Promise<void>;
    disconnect: () => Promise<void>;
};

const AUTH_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTH';
const ENABLED_KEY = 'CRACKER_OPENAI_ACCOUNT_ENABLED';

function percentFor(usage: OpenAIUsagePayload | null) {
    if (!usage) return null;
    const values = [
        usage.rate_limit?.primary_window?.used_percent,
        usage.rate_limit?.secondary_window?.used_percent,
    ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length ? Math.max(...values) : null;
}

async function pollForAuth(device: DeviceStartResponse['device']) {
    const deadline = Date.now() + Math.min((device.expires_in || 900) * 1000, 15 * 60 * 1000);
    const intervalMs = Math.max((device.interval || 5) * 1000, 3000);

    while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        const response = await apiFetch<{ pending?: boolean; auth?: OpenAIAccountAuth }>('/api/openai-account/device/poll', {
            method: 'POST',
            body: JSON.stringify({
                device_auth_id: device.device_auth_id,
                user_code: device.user_code,
            }),
        });
        if (response.auth) return response.auth;
        if (response.pending !== true) break;
    }

    throw new Error('OpenAI login timed out. Try again after approving the device code.');
}

export const useOpenAIAccountStore = create<OpenAIState>((set, get) => ({
    auth: null,
    usage: null,
    enabled: false,
    isLoading: false,
    isConnecting: false,
    lastError: null,
    lastUpdatedAt: null,
    deviceCode: null,
    deviceCodeCopiedAt: null,

    initialize: async () => {
        set({ isLoading: true });
        try {
            const [storedAuth, storedEnabled] = await Promise.all([
                SecureStore.getItemAsync(AUTH_KEY),
                SecureStore.getItemAsync(ENABLED_KEY),
            ]);
            const auth = storedAuth ? JSON.parse(storedAuth) as OpenAIAccountAuth : null;
            const enabled = storedEnabled ? storedEnabled === 'true' : !!auth;
            set({ auth, enabled, lastError: null });
            if (auth) void get().refreshUsage();
        } catch (error) {
            set({ auth: null, enabled: false, lastError: error instanceof Error ? error.message : 'OpenAI account load failed' });
        } finally {
            set({ isLoading: false });
        }
    },

    connect: async () => {
        set({ isConnecting: true, lastError: null });
        try {
            const start = await apiFetch<DeviceStartResponse>('/api/openai-account/device/start', { method: 'POST' });
            const Clipboard = await import('expo-clipboard');
            await Clipboard.setStringAsync(start.device.user_code);
            set({ deviceCode: start.device.user_code, deviceCodeCopiedAt: Date.now() });
            await Linking.openURL(start.verificationUrl);
            const auth = await pollForAuth(start.device);
            await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
            await SecureStore.setItemAsync(ENABLED_KEY, 'true');
            set({ auth, enabled: true, lastError: null, deviceCode: null });
            await get().refreshUsage();
        } catch (error) {
            set({ lastError: error instanceof Error ? error.message : 'OpenAI account login failed' });
            throw error;
        } finally {
            set({ isConnecting: false });
        }
    },

    refreshUsage: async () => {
        const auth = get().auth;
        if (!auth) return;
        set({ isLoading: true, lastError: null });
        try {
            const response = await apiFetch<{ auth: OpenAIAccountAuth; usage: OpenAIUsagePayload }>('/api/openai-account/usage', {
                method: 'POST',
                body: JSON.stringify({ auth }),
            });
            await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(response.auth));
            set({ auth: response.auth, usage: response.usage, lastUpdatedAt: Date.now(), lastError: null });
        } catch (error) {
            set({ lastError: error instanceof Error ? error.message : 'OpenAI usage unavailable' });
        } finally {
            set({ isLoading: false });
        }
    },

    setEnabled: async (enabled: boolean) => {
        await SecureStore.setItemAsync(ENABLED_KEY, String(enabled));
        set({ enabled });
    },

    disconnect: async () => {
        await SecureStore.deleteItemAsync(AUTH_KEY);
        await SecureStore.deleteItemAsync(ENABLED_KEY);
        set({ auth: null, usage: null, enabled: false, lastError: null, lastUpdatedAt: null, deviceCode: null, deviceCodeCopiedAt: null });
    },
}));

export function getOpenAIUsagePercent(usage: OpenAIUsagePayload | null) {
    return percentFor(usage);
}

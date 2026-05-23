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

type OpenAIStoredAccount = {
    id: string;
    auth: OpenAIAccountAuth;
    enabled: boolean;
    usage?: OpenAIUsagePayload | null;
    lastError?: string | null;
    addedAt: number;
    updatedAt: number;
};

type OpenAIState = {
    accounts: OpenAIStoredAccount[];
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
    disconnect: (accountId?: string) => Promise<void>;
};

const AUTH_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTH';
const ACCOUNTS_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTHS';
const ENABLED_KEY = 'CRACKER_OPENAI_ACCOUNT_ENABLED';

function accountKey(auth: OpenAIAccountAuth) {
    return auth.accountId || auth.email || auth.refreshToken.slice(0, 16);
}

function usageScore(usage?: OpenAIUsagePayload | null) {
    if (!usage) return 50;
    if (usage.rate_limit?.limit_reached) return 999;
    const values = [usage.rate_limit?.primary_window?.used_percent, usage.rate_limit?.secondary_window?.used_percent]
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length ? Math.max(...values) : 50;
}

function selectBestAccount(accounts: OpenAIStoredAccount[]) {
    const enabled = accounts.filter(account => account.enabled);
    if (!enabled.length) return null;
    return [...enabled].sort((a, b) => usageScore(a.usage) - usageScore(b.usage))[0];
}

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
    accounts: [],
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
            const [storedAccounts, storedAuth, storedEnabled] = await Promise.all([
                SecureStore.getItemAsync(ACCOUNTS_KEY),
                SecureStore.getItemAsync(AUTH_KEY),
                SecureStore.getItemAsync(ENABLED_KEY),
            ]);
            let accounts = storedAccounts ? JSON.parse(storedAccounts) as OpenAIStoredAccount[] : [];
            const legacyAuth = storedAuth ? JSON.parse(storedAuth) as OpenAIAccountAuth : null;
            if (!accounts.length && legacyAuth) {
                accounts = [{
                    id: accountKey(legacyAuth),
                    auth: legacyAuth,
                    enabled: storedEnabled ? storedEnabled === 'true' : true,
                    usage: null,
                    addedAt: Date.now(),
                    updatedAt: Date.now(),
                }];
                await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
            }
            const best = selectBestAccount(accounts);
            set({ accounts, auth: best?.auth || null, usage: best?.usage || null, enabled: accounts.some(account => account.enabled), lastError: null });
            if (accounts.length) void get().refreshUsage();
        } catch (error) {
            set({ accounts: [], auth: null, enabled: false, lastError: error instanceof Error ? error.message : 'OpenAI account load failed' });
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
            const now = Date.now();
            const nextAccount: OpenAIStoredAccount = { id: accountKey(auth), auth, enabled: true, usage: null, addedAt: now, updatedAt: now };
            const accounts = [nextAccount, ...get().accounts.filter(account => account.id !== nextAccount.id)];
            await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
            await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
            await SecureStore.setItemAsync(ENABLED_KEY, 'true');
            set({ accounts, auth, usage: null, enabled: true, lastError: null, deviceCode: null });
            await get().refreshUsage();
        } catch (error) {
            set({ lastError: error instanceof Error ? error.message : 'OpenAI account login failed' });
            throw error;
        } finally {
            set({ isConnecting: false });
        }
    },

    refreshUsage: async () => {
        const accounts = get().accounts;
        if (!accounts.length) return;
        set({ isLoading: true, lastError: null });
        const now = Date.now();
        const nextAccounts: OpenAIStoredAccount[] = [];
        let lastError: string | null = null;

        for (const account of accounts) {
            try {
                const response = await apiFetch<{ auth: OpenAIAccountAuth; usage: OpenAIUsagePayload }>('/api/openai-account/usage', {
                    method: 'POST',
                    body: JSON.stringify({ auth: account.auth }),
                });
                nextAccounts.push({ ...account, auth: response.auth, usage: response.usage, lastError: null, updatedAt: now });
            } catch (error) {
                lastError = error instanceof Error ? error.message : 'OpenAI usage unavailable';
                nextAccounts.push({ ...account, lastError, updatedAt: now });
            }
        }

        const best = selectBestAccount(nextAccounts);
        await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
        if (best) await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(best.auth));
        set({
            accounts: nextAccounts,
            auth: best?.auth || null,
            usage: best?.usage || null,
            enabled: nextAccounts.some(account => account.enabled),
            lastUpdatedAt: now,
            lastError,
            isLoading: false,
        });
    },

    setEnabled: async (enabled: boolean) => {
        const accounts = get().accounts.map(account => ({ ...account, enabled }));
        const best = selectBestAccount(accounts);
        await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
        await SecureStore.setItemAsync(ENABLED_KEY, String(enabled));
        set({ accounts, enabled, auth: best?.auth || null, usage: best?.usage || null });
    },

    disconnect: async (accountId?: string) => {
        const accounts = accountId ? get().accounts.filter(account => account.id !== accountId) : [];
        const best = selectBestAccount(accounts);
        await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
        if (best) {
            await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(best.auth));
        } else {
            await SecureStore.deleteItemAsync(AUTH_KEY);
            await SecureStore.deleteItemAsync(ENABLED_KEY);
        }
        set({ accounts, auth: best?.auth || null, usage: best?.usage || null, enabled: accounts.some(account => account.enabled), lastError: null, lastUpdatedAt: null, deviceCode: null, deviceCodeCopiedAt: null });
    },
}));

export function getOpenAIUsagePercent(usage: OpenAIUsagePayload | null) {
    return percentFor(usage);
}

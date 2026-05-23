import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../lib/types';
import { api, apiFetch, getApiBaseUrl } from '../lib/api';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;

    initialize: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, invitationCode: string) => Promise<void>;
    loginAsGuest: (loginName: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

interface SessionResponse {
    user: {
        id: string;
        email?: string;
        name?: string | null;
        isAdmin?: boolean;
        isGuest?: boolean;
        guestLogin?: string | null;
    } | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
        set({ isLoading: true });
        try {
            const jwt = await SecureStore.getItemAsync('app-jwt') || await SecureStore.getItemAsync('guest-jwt');
            if (jwt) {
                const session = await apiFetch<SessionResponse>('/api/auth/session');
                if (session.user) {
                    set({
                        user: {
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.name || undefined,
                            isAdmin: session.user.isAdmin === true,
                            isGuest: session.user.isGuest === true,
                            loginName: session.user.guestLogin || undefined,
                        },
                    });
                }
            }
        } catch {
            await SecureStore.deleteItemAsync('app-jwt');
            await SecureStore.deleteItemAsync('guest-jwt');
            set({ user: null });
        } finally {
            set({ isLoading: false, isInitialized: true });
        }
    },

    loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const apiBase = await getApiBaseUrl();
            const response = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            if (data.access_token) {
                await SecureStore.setItemAsync('app-jwt', data.access_token);
                await SecureStore.deleteItemAsync('guest-jwt');
            }

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    isGuest: false,
                },
            });
        } finally {
            set({ isLoading: false });
        }
    },

    register: async (email: string, password: string, name: string, invitationCode: string) => {
        set({ isLoading: true });
        try {
            const apiBase = await getApiBaseUrl();
            const response = await fetch(`${apiBase}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    invitationCode: invitationCode.replace(/\s/g, ''),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
        } finally {
            set({ isLoading: false });
        }
    },

    loginAsGuest: async (loginName: string) => {
        set({ isLoading: true });
        try {
            const result = await api.guestLogin(loginName);
            await SecureStore.deleteItemAsync('app-jwt');
            set({
                user: {
                    id: result.userId,
                    isGuest: true,
                    loginName: result.loginName,
                },
            });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            const { user } = get();

            try {
                if (user?.isGuest) {
                    await api.guestLogout();
                } else {
                    await apiFetch('/api/auth/logout', { method: 'POST' });
                }
            } catch { }

            await SecureStore.deleteItemAsync('app-jwt');
            await SecureStore.deleteItemAsync('guest-jwt');
            set({ user: null });
        } catch { } finally {
            set({ isLoading: false });
        }
    },

    setUser: (user) => set({ user }),
}));

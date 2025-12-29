import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../lib/types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, invitationCode: string) => Promise<void>;
    loginAsGuest: (loginName: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
        set({ isLoading: true });
        try {
            // First check for Supabase session
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Fetch profile from API to get name and isAdmin
                let name: string | undefined;
                let isAdmin = false;
                try {
                    const profileRes = await fetch(`https://cracker.mom/api/auth/profile?userId=${session.user.id}`, {
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                    });
                    if (profileRes.ok) {
                        const profile = await profileRes.json();
                        name = profile.name || undefined;
                        isAdmin = profile.isAdmin === true;
                    }
                } catch { }

                set({
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        name,
                        isAdmin,
                        isGuest: false,
                    },
                });
                set({ isLoading: false, isInitialized: true });
                return;
            }

            // Then check for guest JWT
            const jwt = await SecureStore.getItemAsync('guest-jwt');
            if (jwt) {
                try {
                    const payloadPart = jwt.split('.')[1];
                    if (payloadPart) {
                        const decoded = decodeBase64(payloadPart);
                        const payload = JSON.parse(decoded);
                        set({
                            user: {
                                id: payload.sub,
                                isGuest: true,
                                loginName: payload.guestLogin,
                            },
                        });
                    }
                } catch {
                    await SecureStore.deleteItemAsync('guest-jwt');
                }
            }
        } catch { } finally {
            set({ isLoading: false, isInitialized: true });
        }
    },

    loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data.user) {
                set({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        isGuest: false,
                    },
                });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    register: async (email: string, password: string, name: string, invitationCode: string) => {
        set({ isLoading: true });
        try {
            const response = await fetch('https://cracker.mom/api/auth/register', {
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

            // Registration successful - user needs to login
            return;
        } finally {
            set({ isLoading: false });
        }
    },

    loginAsGuest: async (loginName: string) => {
        set({ isLoading: true });
        try {
            const result = await api.guestLogin(loginName);
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

            if (user?.isGuest) {
                try {
                    await api.guestLogout();
                } catch { }
                await SecureStore.deleteItemAsync('guest-jwt');
            } else {
                await supabase.auth.signOut();
            }

            set({ user: null });
        } catch { } finally {
            set({ isLoading: false });
        }
    },

    setUser: (user) => set({ user }),
}));

// Helper function to decode base64 (works in React Native)
function decodeBase64(str: string): string {
    const padded = str + '==='.slice(0, (4 - str.length % 4) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

    if (typeof atob !== 'undefined') {
        return atob(base64);
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;

    while (i < base64.length) {
        const enc1 = chars.indexOf(base64.charAt(i++));
        const enc2 = chars.indexOf(base64.charAt(i++));
        const enc3 = chars.indexOf(base64.charAt(i++));
        const enc4 = chars.indexOf(base64.charAt(i++));

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        output += String.fromCharCode(chr1);
        if (enc3 !== 64) output += String.fromCharCode(chr2);
        if (enc4 !== 64) output += String.fromCharCode(chr3);
    }

    return output;
}

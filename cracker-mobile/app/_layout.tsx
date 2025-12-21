import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import { supabase } from '../lib/supabase';
import '../global.css';

export default function RootLayout() {
    const { initialize: initAuth, isInitialized, setUser } = useAuthStore();
    const { initialize: initSettings, syncFromServer } = useSettingsStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Initialize settings first (MMKV)
                initSettings();

                // Then initialize auth
                await initAuth();

                // Try to sync settings from server (non-blocking)
                syncFromServer().catch(console.error);
            } catch (err) {
                console.error('Initialization error:', err);
                setError(String(err));
            }
        };

        init();

        // Subscribe to auth state changes - critical for session persistence
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[Auth] State changed:', event, session?.user?.email);

                if (event === 'SIGNED_IN' && session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        isGuest: false,
                    });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    console.log('[Auth] Token refreshed successfully');
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (error) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>
                    {error}
                </Text>
            </View>
        );
    }

    if (!isInitialized) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#af8787" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0f0f0f' },
                    animation: 'fade',
                }}
            />
        </GestureHandlerRootView>
    );
}

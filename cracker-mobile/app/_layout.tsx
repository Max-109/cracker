import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Text } from 'react-native';
import * as Font from 'expo-font';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import { supabase } from '../lib/supabase';
import '../global.css';

// JetBrains Mono fonts - EXACT match to web
const customFonts = {
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Medium': require('../assets/fonts/JetBrainsMono-Medium.ttf'),
    'JetBrainsMono-SemiBold': require('../assets/fonts/JetBrainsMono-SemiBold.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
};

export default function RootLayout() {
    const { initialize: initAuth, isInitialized, setUser } = useAuthStore();
    const { initialize: initSettings, syncFromServer } = useSettingsStore();
    const [error, setError] = useState<string | null>(null);
    const [fontsLoaded, setFontsLoaded] = useState(false);

    // Load custom fonts
    useEffect(() => {
        const loadFonts = async () => {
            try {
                await Font.loadAsync(customFonts);
                setFontsLoaded(true);
            } catch (err) {
                console.error('Failed to load fonts:', err);
                // Continue without custom fonts - fallback to system mono
                setFontsLoaded(true);
            }
        };
        loadFonts();
    }, []);

    // Initialize app and sync settings
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize settings first (MMKV)
                initSettings();

                // Then initialize auth
                await initAuth();

                // Initial sync from server - wait for it to complete
                await syncFromServer();
                console.log('[App] Initial settings sync completed');
            } catch (err) {
                console.error('Initialization error:', err);
                setError(String(err));
            }
        };

        init();

        // Poll for settings updates every 5 seconds for real-time sync
        const pollInterval = setInterval(() => {
            syncFromServer().catch(console.error);
        }, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, []);

    // Subscribe to auth state changes - critical for session persistence
    useEffect(() => {
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

    if (!isInitialized || !fontsLoaded) {
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

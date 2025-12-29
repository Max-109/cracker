import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Text } from 'react-native';
import * as Font from 'expo-font';
import type { MMKV } from 'react-native-mmkv';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import { supabase } from '../lib/supabase';
import '../global.css';

// Get cached accent color for instant loading indicator
let cachedAccentColor = '#af8787';
try {
    const m = require('react-native-mmkv');
    const storage = new m.MMKV() as MMKV;
    const color = storage.getString('accentColor');
    if (color) {
        cachedAccentColor = color;
    }
} catch { }

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
                // Initialize settings first (MMKV - instant from cache)
                initSettings();

                // Then initialize auth
                await initAuth();

                // Sync from server in background (non-blocking)
                syncFromServer().catch(() => { });
            } catch (err) {
                setError(String(err));
            }
        };

        init();
    }, []);

    // Subscribe to auth state changes - critical for session persistence
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        isGuest: false,
                    });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
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
                <ActivityIndicator size="large" color={cachedAccentColor} />
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

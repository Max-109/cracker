import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { useTheme } from '../../store/theme';
import AuthBackground from '../../components/auth/AuthBackground';
import Logo from '../../components/auth/Logo';

export default function LoginScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { loginWithEmail, isLoading } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Loading animation
    const orbitRotation = useSharedValue(0);
    useEffect(() => {
        orbitRotation.value = withRepeat(
            withTiming(360, { duration: 2000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const orbitStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${orbitRotation.value}deg` }],
    }));

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setError('');
        try {
            await loginWithEmail(email, password);
            router.replace('/(main)');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    const handleGuestLogin = () => {
        router.push('/(auth)/guest');
    };

    const getInputStyle = (field: string) => ({
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: focusedField === field ? theme.accent : theme.border,
        padding: 14,
    });

    return (
        <View style={{ flex: 1, backgroundColor: theme.bgMain }}>
            <AuthBackground />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        padding: 24,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Logo />

                    {/* Login Card */}
                    <Animated.View
                        entering={FadeInDown.delay(200).duration(500)}
                        style={{
                            backgroundColor: theme.bgSidebar,
                            borderWidth: 1,
                            borderColor: theme.border,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                            backgroundColor: '#0f0f0f',
                        }}>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderWidth: 1,
                                borderColor: `${theme.accent}50`,
                                backgroundColor: `${theme.accent}15`,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons name="log-in-outline" size={16} color={theme.accent} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: theme.textPrimary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    Sign In
                                </Text>
                                <Text style={{
                                    fontSize: 9,
                                    color: theme.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}>
                                    Access your account
                                </Text>
                            </View>
                            {/* Status indicator */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{
                                    width: 6,
                                    height: 6,
                                    backgroundColor: theme.accent,
                                }} />
                                <Text style={{ fontSize: 8, color: theme.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Ready
                                </Text>
                            </View>
                        </View>

                        {/* Form */}
                        <View style={{ padding: 20, gap: 16 }}>
                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(200)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: '#f8717130',
                                        backgroundColor: '#f8717110',
                                        gap: 12,
                                    }}
                                >
                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderWidth: 1,
                                        borderColor: '#f8717130',
                                        backgroundColor: '#f8717110',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Ionicons name="warning-outline" size={12} color="#f87171" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#f87171', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Authentication Failed
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                                            {error}
                                        </Text>
                                    </View>
                                </Animated.View>
                            ) : null}

                            {/* Email */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={10}
                                        color={focusedField === 'email' ? theme.accent : theme.textSecondary}
                                    />
                                    <Text style={{
                                        fontSize: 9,
                                        color: theme.textSecondary,
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                        fontWeight: '600',
                                    }}>
                                        Email Address
                                    </Text>
                                </View>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="your@email.com"
                                    placeholderTextColor={`${theme.textSecondary}60`}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={[getInputStyle('email'), {
                                        color: theme.textPrimary,
                                        fontSize: 14,
                                        letterSpacing: 0.5,
                                    }]}
                                />
                            </View>

                            {/* Password */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={10}
                                        color={focusedField === 'password' ? theme.accent : theme.textSecondary}
                                    />
                                    <Text style={{
                                        fontSize: 9,
                                        color: theme.textSecondary,
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                        fontWeight: '600',
                                    }}>
                                        Password
                                    </Text>
                                </View>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Enter your password"
                                    placeholderTextColor={`${theme.textSecondary}60`}
                                    secureTextEntry
                                    style={[getInputStyle('password'), {
                                        color: theme.textPrimary,
                                        fontSize: 14,
                                        letterSpacing: 0.5,
                                    }]}
                                />
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                                style={{
                                    backgroundColor: isLoading ? '#1a1a1a' : theme.accent,
                                    borderWidth: 1,
                                    borderColor: isLoading ? theme.border : theme.accent,
                                    padding: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <Animated.View style={[{
                                            width: 16,
                                            height: 16,
                                            borderWidth: 1,
                                            borderColor: `${theme.accent}50`,
                                        }, orbitStyle]}>
                                            <View style={{
                                                position: 'absolute',
                                                top: -2,
                                                left: 6,
                                                width: 4,
                                                height: 4,
                                                backgroundColor: theme.accent,
                                            }} />
                                        </Animated.View>
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: theme.textSecondary,
                                            textTransform: 'uppercase',
                                            letterSpacing: 2,
                                        }}>
                                            Authenticating
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: '#000',
                                            textTransform: 'uppercase',
                                            letterSpacing: 2,
                                        }}>
                                            Sign In
                                        </Text>
                                        <Ionicons name="arrow-forward" size={14} color="#000" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={{
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: theme.border,
                            backgroundColor: '#0f0f0f',
                            gap: 12,
                        }}>
                            {/* Guest Mode Button */}
                            <TouchableOpacity
                                onPress={handleGuestLogin}
                                activeOpacity={0.7}
                                style={{
                                    backgroundColor: '#1a1a1a',
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    padding: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                <Ionicons name="person-circle-outline" size={14} color={theme.textSecondary} />
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: theme.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    Continue as Guest
                                </Text>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                                <Text style={{ fontSize: 8, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>or</Text>
                                <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                            </View>

                            {/* Register Link */}
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/register')}
                                activeOpacity={0.7}
                                style={{ alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                    Don't have an account?{' '}
                                    <Text style={{ color: theme.accent, fontWeight: '600' }}>
                                        REGISTER →
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Footer Badge */}
                    <View style={{ alignItems: 'center', marginTop: 24, gap: 8 }}>
                        <View style={{
                            width: 24,
                            height: 24,
                            borderWidth: 1,
                            borderColor: theme.border,
                            backgroundColor: '#1a1a1a',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Ionicons name="finger-print-outline" size={12} color={theme.textSecondary} />
                        </View>
                        <Text style={{
                            fontSize: 8,
                            color: theme.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: 3,
                        }}>
                            Your AI Assistant
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

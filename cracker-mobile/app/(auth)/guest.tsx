import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { useTheme } from '../../store/theme';
import AuthBackground from '../../components/auth/AuthBackground';
import Logo from '../../components/auth/Logo';

export default function GuestScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { loginAsGuest, isLoading } = useAuthStore();

    const [loginName, setLoginName] = useState('');
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

    const handleGuestLogin = async () => {
        if (!loginName.trim()) {
            setError('Please enter a login name');
            return;
        }

        if (loginName.trim().length < 3) {
            setError('Login name must be at least 3 characters');
            return;
        }

        setError('');
        try {
            await loginAsGuest(loginName);
            router.replace('/(main)');
        } catch (err: any) {
            setError(err.message || 'Failed to login. Please try again.');
        }
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

                    {/* Guest Login Card */}
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
                                <Ionicons name="person-circle-outline" size={16} color={theme.accent} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: theme.textPrimary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    Guest Mode
                                </Text>
                                <Text style={{
                                    fontSize: 9,
                                    color: theme.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}>
                                    Quick access without registration
                                </Text>
                            </View>
                        </View>

                        {/* Form */}
                        <View style={{ padding: 20, gap: 16 }}>
                            {/* Info message */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                padding: 12,
                                borderWidth: 1,
                                borderColor: `${theme.accent}30`,
                                backgroundColor: `${theme.accent}08`,
                                gap: 12,
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24,
                                    borderWidth: 1,
                                    borderColor: `${theme.accent}30`,
                                    backgroundColor: `${theme.accent}15`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons name="information-circle-outline" size={12} color={theme.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: theme.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Guest Access
                                    </Text>
                                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, lineHeight: 16 }}>
                                        Your chats will be saved and encrypted. Use the same login name to access them later.
                                    </Text>
                                </View>
                            </View>

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
                                            Login Failed
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                                            {error}
                                        </Text>
                                    </View>
                                </Animated.View>
                            ) : null}

                            {/* Login Name */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Ionicons
                                        name="at-outline"
                                        size={10}
                                        color={focusedField === 'loginName' ? theme.accent : theme.textSecondary}
                                    />
                                    <Text style={{
                                        fontSize: 9,
                                        color: theme.textSecondary,
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                        fontWeight: '600',
                                    }}>
                                        Login Name
                                    </Text>
                                </View>
                                <TextInput
                                    value={loginName}
                                    onChangeText={setLoginName}
                                    onFocus={() => setFocusedField('loginName')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Choose a unique name"
                                    placeholderTextColor={`${theme.textSecondary}60`}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={[getInputStyle('loginName'), {
                                        color: theme.textPrimary,
                                        fontSize: 14,
                                        letterSpacing: 0.5,
                                    }]}
                                />
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                onPress={handleGuestLogin}
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
                                            Connecting
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
                                            Continue as Guest
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
                        }}>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/login')}
                                activeOpacity={0.7}
                                style={{ alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                    Have an account?{' '}
                                    <Text style={{ color: theme.accent, fontWeight: '600' }}>
                                        ← SIGN IN
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
                            <Ionicons name="lock-closed-outline" size={12} color={theme.textSecondary} />
                        </View>
                        <Text style={{
                            fontSize: 8,
                            color: theme.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: 3,
                        }}>
                            End-to-End Encrypted
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

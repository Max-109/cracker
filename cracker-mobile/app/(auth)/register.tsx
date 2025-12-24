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
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { useTheme } from '../../store/theme';
import { FONTS } from '../../lib/design';
import AuthBackground from '../../components/auth/AuthBackground';
import Logo from '../../components/auth/Logo';

export default function RegisterScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { register, isLoading } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [invitationCode, setInvitationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Success animation
    const successScale = useSharedValue(0);
    useEffect(() => {
        if (success) {
            successScale.value = withSequence(
                withTiming(1.2, { duration: 200 }),
                withTiming(1, { duration: 200 })
            );
        }
    }, [success]);

    const successStyle = useAnimatedStyle(() => ({
        transform: [{ scale: successScale.value }],
    }));

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

    const handleRegister = async () => {
        if (!email.trim() || !password.trim() || !invitationCode.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setError('');
        try {
            await register(email, password, name, invitationCode);
            setSuccess(true);
            setTimeout(() => {
                router.replace('/(auth)/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        }
    };

    const getInputStyle = (field: string, highlighted: boolean = false) => ({
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: focusedField === field
            ? theme.accent
            : highlighted
                ? `${theme.accent}50`
                : theme.border,
        padding: 14,
    });

    if (success) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.bgMain }}>
                <AuthBackground />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={{
                            backgroundColor: theme.bgSidebar,
                            borderWidth: 1,
                            borderColor: theme.accent,
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: 400,
                        }}
                    >
                        {/* Header */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: `${theme.accent}50`,
                            backgroundColor: `${theme.accent}15`,
                        }}>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderWidth: 1,
                                borderColor: theme.accent,
                                backgroundColor: theme.accent,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons name="checkmark" size={16} color="#000" />
                            </View>
                            <Text style={{
                                marginLeft: 12,
                                fontSize: 11,
                                fontWeight: '600',
                                color: theme.accent,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                            }}>
                                Registration Complete
                            </Text>
                        </View>

                        <View style={{ padding: 32, alignItems: 'center' }}>
                            <Animated.View style={[{
                                width: 80,
                                height: 80,
                                borderWidth: 2,
                                borderColor: theme.accent,
                                backgroundColor: `${theme.accent}30`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                            }, successStyle]}>
                                <Ionicons name="checkmark" size={36} color={theme.accent} />
                            </Animated.View>

                            <Text style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: theme.textPrimary,
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                                marginBottom: 8,
                            }}>
                                Account Created
                            </Text>
                            <Text style={{
                                fontSize: 11,
                                color: theme.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}>
                                Redirecting to login...
                            </Text>

                            {/* Progress bars animation */}
                            <View style={{ flexDirection: 'row', gap: 4, marginTop: 24 }}>
                                {[6, 12, 18, 24, 30].map((height, i) => (
                                    <ProgressBar key={i} height={height} delay={i * 100} color={theme.accent} />
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </View>
        );
    }

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

                    {/* Register Card */}
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
                                <Ionicons name="person-add-outline" size={16} color={theme.accent} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: theme.textPrimary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    Create Account
                                </Text>
                                <Text style={{
                                    fontSize: 9,
                                    color: theme.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}>
                                    Invitation required
                                </Text>
                            </View>
                            {/* Intensity bars */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 }}>
                                {[4, 8, 12, 16].map((h, i) => (
                                    <View key={i} style={{ width: 3, height: h, backgroundColor: theme.accent, opacity: 0.6 }} />
                                ))}
                            </View>
                        </View>

                        {/* Form */}
                        <View style={{ padding: 20, gap: 12 }}>
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
                                            Registration Failed
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                                            {error}
                                        </Text>
                                    </View>
                                </Animated.View>
                            ) : null}

                            {/* Invitation Code - Highlighted */}
                            <View style={{
                                padding: 12,
                                borderWidth: 1,
                                borderColor: `${theme.accent}50`,
                                backgroundColor: `${theme.accent}08`,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="ticket-outline" size={10} color={theme.accent} />
                                        <Text style={{
                                            fontSize: 9,
                                            color: theme.accent,
                                            textTransform: 'uppercase',
                                            letterSpacing: 2,
                                            fontWeight: '700',
                                        }}>
                                            Invitation Code
                                        </Text>
                                    </View>
                                    <View style={{
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        backgroundColor: `${theme.accent}30`,
                                        borderWidth: 1,
                                        borderColor: `${theme.accent}50`,
                                    }}>
                                        <Text style={{ fontSize: 8, color: theme.accent, fontWeight: '600' }}>REQUIRED</Text>
                                    </View>
                                </View>
                                <TextInput
                                    value={invitationCode}
                                    onChangeText={setInvitationCode}
                                    onFocus={() => setFocusedField('code')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    placeholderTextColor={`${theme.accent}30`}
                                    maxLength={32}
                                    autoCapitalize="none"
                                    style={[getInputStyle('code', true), {
                                        color: theme.accent,
                                        fontSize: 13,
                                        letterSpacing: 2,
                                        fontFamily: FONTS.mono,
                                    }]}
                                />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                    <Ionicons name="shield-outline" size={9} color={theme.textSecondary} />
                                    <Text style={{ fontSize: 9, color: theme.textSecondary }}>
                                        32-character code from administrator
                                    </Text>
                                </View>
                            </View>

                            {/* Name */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons
                                            name="person-outline"
                                            size={10}
                                            color={focusedField === 'name' ? theme.accent : theme.textSecondary}
                                        />
                                        <Text style={{
                                            fontSize: 9,
                                            color: theme.textSecondary,
                                            textTransform: 'uppercase',
                                            letterSpacing: 2,
                                            fontWeight: '600',
                                        }}>
                                            Display Name
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 8, color: theme.textSecondary, opacity: 0.5 }}>Optional</Text>
                                </View>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="How should we call you?"
                                    placeholderTextColor={`${theme.textSecondary}60`}
                                    style={[getInputStyle('name'), {
                                        color: theme.textPrimary,
                                        fontSize: 14,
                                    }]}
                                />
                            </View>

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
                                    }]}
                                />
                            </View>

                            {/* Password */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                                    <Text style={{ fontSize: 8, color: theme.textSecondary, opacity: 0.5 }}>Min 6 chars</Text>
                                </View>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Create a secure password"
                                    placeholderTextColor={`${theme.textSecondary}60`}
                                    secureTextEntry
                                    style={[getInputStyle('password'), {
                                        color: theme.textPrimary,
                                        fontSize: 14,
                                    }]}
                                />
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                onPress={handleRegister}
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
                                    marginTop: 4,
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
                                            Creating Account
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
                                            Create Account
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
                                    Already have an account?{' '}
                                    <Text style={{ color: theme.accent, fontWeight: '600' }}>
                                        ← SIGN IN
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Security Badge */}
                    <View style={{ alignItems: 'center', marginTop: 24, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{
                                width: 24,
                                height: 24,
                                borderWidth: 1,
                                borderColor: theme.border,
                                backgroundColor: '#1a1a1a',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons name="shield-checkmark-outline" size={12} color={theme.accent} />
                            </View>
                            <View style={{ width: 32, height: 1, backgroundColor: theme.border }} />
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
                        </View>
                        <Text style={{
                            fontSize: 8,
                            color: theme.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: 3,
                        }}>
                            Invitation-Only Access
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// Progress bar component for success animation
function ProgressBar({ height, delay, color }: { height: number; delay: number; color: string }) {
    const scale = useSharedValue(0.5);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: scale.value }],
    }));

    return (
        <Animated.View style={[{ width: 8, height, backgroundColor: color }, animatedStyle]} />
    );
}

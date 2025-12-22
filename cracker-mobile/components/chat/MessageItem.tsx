import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, Share, Clipboard } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';
import ThinkingIndicator from '../ui/ThinkingIndicator';

interface MessageItemProps {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    tokensPerSecond?: number;
    isStreaming?: boolean;
    isThinking?: boolean;
    createdAt?: string;
}

/**
 * MessageItem - Displays individual chat messages
 * Matches web version styling
 */
export default function MessageItem({
    id,
    role,
    content,
    model,
    tokensPerSecond,
    isStreaming = false,
    isThinking = false,
    createdAt,
}: MessageItemProps) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const isUser = role === 'user';

    const handleCopy = useCallback(async () => {
        try {
            if (Platform.OS === 'web') {
                await navigator.clipboard.writeText(content);
            } else {
                Clipboard.setString(content);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }, [content]);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({ message: content });
        } catch (error) {
            console.error('Share failed:', error);
        }
    }, [content]);

    // Get display model name
    const getModelDisplay = () => {
        if (!model) return '';
        return model
            .replace('gemini-', '')
            .replace('-preview', '')
            .toUpperCase();
    };

    return (
        <View
            style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
            }}
        >
            {/* Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                {/* Role Icon - Grid pattern for AI like web */}
                <View
                    style={{
                        width: 28,
                        height: 28,
                        backgroundColor: isUser ? 'transparent' : `${theme.accent}15`,
                        borderWidth: 1,
                        borderColor: isUser ? COLORS.border : `${theme.accent}40`,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {isUser ? (
                        <Ionicons name="person" size={12} color={COLORS.textSecondary} />
                    ) : (
                        // Grid dots like web
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 12, gap: 2 }}>
                            {[...Array(9)].map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: 2,
                                        height: 2,
                                        backgroundColor: theme.accent,
                                        opacity: 0.8,
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Role Label */}
                <Text
                    style={{
                        color: isUser ? COLORS.textSecondary : theme.accent,
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        fontFamily: FONTS.mono,
                    }}
                >
                    {isUser ? 'You' : 'Cracker'}
                </Text>

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* User actions - Edit/Copy buttons for user messages */}
                {isUser && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={handleCopy}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={{ color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.mono }}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Model + TPS for completed AI messages */}
                {!isUser && !isStreaming && model && (
                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 10,
                            fontFamily: FONTS.mono,
                        }}
                    >
                        {getModelDisplay()}
                        {tokensPerSecond != null && tokensPerSecond > 0 && ` | ${tokensPerSecond.toFixed(1)} t/s`}
                    </Text>
                )}
            </View>

            {/* ANALYZING box for thinking state - matches web exactly */}
            {!isUser && isThinking && (
                <ThinkingIndicator isThinking={true} label="ANALYZING" />
            )}

            {/* Message Content */}
            {content ? (
                <View
                    style={isUser ? {
                        // User message in pill/box like web
                        backgroundColor: '#151515',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 4,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        alignSelf: 'flex-start',
                    } : {}}
                >
                    <Text
                        style={{
                            color: COLORS.textPrimary,
                            fontSize: 15,
                            lineHeight: 24,
                        }}
                        selectable
                    >
                        {content}
                    </Text>
                </View>
            ) : null}

            {/* Action Buttons for AI messages */}
            {!isUser && content && !isStreaming && (
                <View
                    style={{
                        flexDirection: 'row',
                        gap: 16,
                        marginTop: 16,
                    }}
                >
                    {/* Copy Button */}
                    <TouchableOpacity
                        onPress={handleCopy}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Ionicons
                            name={copied ? "checkmark" : "copy-outline"}
                            size={14}
                            color={copied ? theme.accent : COLORS.textMuted}
                        />
                        <Text style={{
                            color: copied ? theme.accent : COLORS.textMuted,
                            fontSize: 11,
                            fontFamily: FONTS.mono,
                        }}>
                            {copied ? 'Copied' : 'Copy'}
                        </Text>
                    </TouchableOpacity>

                    {/* Re-run Button */}
                    <TouchableOpacity
                        onPress={() => { }}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Ionicons name="refresh-outline" size={14} color={COLORS.textMuted} />
                        <Text style={{
                            color: COLORS.textMuted,
                            fontSize: 11,
                            fontFamily: FONTS.mono,
                        }}>
                            Re-run
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

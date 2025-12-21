import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, Share, Clipboard } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';
import ThinkingIndicator from '../ui/ThinkingIndicator';
import { StreamingIndicator } from '../ui/ConnectionIndicator';

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

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
            }}
        >
            {/* Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                {/* Role Icon */}
                <View
                    style={{
                        width: 32,
                        height: 32,
                        backgroundColor: isUser ? '#1a1a1a' : theme.accent,
                        borderWidth: 1,
                        borderColor: isUser ? COLORS.border : theme.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {isUser ? (
                        <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                    ) : (
                        <Ionicons name="sparkles" size={14} color="#000" />
                    )}
                </View>

                {/* Role Label */}
                <Text
                    style={{
                        color: isUser ? COLORS.textSecondary : theme.accent,
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        fontFamily: FONTS.mono,
                    }}
                >
                    {isUser ? 'You' : 'Cracker'}
                </Text>

                {/* Streaming/Thinking Indicator */}
                {!isUser && isThinking && <ThinkingIndicator />}
                {!isUser && isStreaming && !isThinking && (
                    <StreamingIndicator tps={tokensPerSecond} />
                )}

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* Model Badge */}
                {!isUser && model && !isStreaming && (
                    <View
                        style={{
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textSecondary,
                                fontSize: 10,
                                fontFamily: FONTS.mono,
                            }}
                        >
                            {model.replace('gemini-', '').replace('-preview', '').slice(0, 10)}
                        </Text>
                    </View>
                )}

                {/* TPS Badge */}
                {!isUser && tokensPerSecond != null && tokensPerSecond > 0 && !isStreaming && (
                    <View
                        style={{
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.accent,
                                fontSize: 10,
                                fontFamily: FONTS.mono,
                                fontWeight: '600',
                            }}
                        >
                            {tokensPerSecond.toFixed(0)} t/s
                        </Text>
                    </View>
                )}
            </View>

            {/* Message Content */}
            <Text
                style={{
                    color: COLORS.textPrimary,
                    fontSize: 16,
                    lineHeight: 24,
                }}
                selectable
            >
                {content || ''}
            </Text>

            {/* Action Buttons */}
            {!isUser && content && !isStreaming && (
                <Animated.View
                    entering={FadeIn.delay(100).duration(150)}
                    style={{
                        flexDirection: 'row',
                        gap: 10,
                        marginTop: 14,
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
                            backgroundColor: copied ? `${theme.accent}20` : '#1a1a1a',
                            borderWidth: 1,
                            borderColor: copied ? theme.accent : COLORS.border,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            minWidth: 80,
                        }}
                    >
                        <Ionicons
                            name={copied ? "checkmark" : "copy-outline"}
                            size={14}
                            color={copied ? theme.accent : COLORS.textSecondary}
                        />
                        <Text style={{
                            color: copied ? theme.accent : COLORS.textSecondary,
                            fontSize: 12,
                            fontWeight: '600',
                        }}>
                            {copied ? 'Copied!' : 'Copy'}
                        </Text>
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity
                        onPress={handleShare}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            minWidth: 80,
                        }}
                    >
                        <Ionicons name="share-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                            Share
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </Animated.View>
    );
}

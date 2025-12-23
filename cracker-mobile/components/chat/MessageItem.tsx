import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, Share, StyleSheet, Clipboard } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

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

// Thinking labels - EXACT match to web
const THINKING_LABELS = [
    "COMPILING",
    "PROCESSING",
    "LINKING",
    "CALIBRATING",
    "SIMULATING",
    "ANALYZING",
    "ROUTING",
    "CRACKING"
];

// 4x4 Grid Loading Indicator - EXACT match to web LoadingIndicator.tsx
function LoadingGrid() {
    const theme = useTheme();

    // Generate 16 dots (4x4 grid) with random timing
    const dots = useMemo(() => {
        return Array.from({ length: 16 }).map(() => ({
            duration: 3 + Math.random() * 3,
            initialOpacity: Math.random() > 0.7 ? 1 : 0.15,
        }));
    }, []);

    return (
        <View style={styles.thinkingGrid}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    entering={FadeIn.delay(i * 50).duration(200)}
                    style={[
                        styles.thinkingDot,
                        {
                            backgroundColor: theme.accent,
                            opacity: dot.initialOpacity,
                        }
                    ]}
                />
            ))}
        </View>
    );
}

// AI Indicator - EXACT match to web AIIndicator with corner brackets
function AIIndicator() {
    const theme = useTheme();

    return (
        <View style={styles.aiIndicator}>
            {/* Corner brackets */}
            <View style={styles.aiIndicatorFrame}>
                {/* Top Left */}
                <View style={[styles.cornerH, styles.cornerTL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerTL, { backgroundColor: theme.accent }]} />
                {/* Top Right */}
                <View style={[styles.cornerH, styles.cornerTR, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerTR, { backgroundColor: theme.accent }]} />
                {/* Bottom Left */}
                <View style={[styles.cornerH, styles.cornerBL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerBL, { backgroundColor: theme.accent }]} />
                {/* Bottom Right */}
                <View style={[styles.cornerH, styles.cornerBR, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerBR, { backgroundColor: theme.accent }]} />
            </View>
            {/* Center pulsing dot */}
            <View style={[styles.aiIndicatorCore, { backgroundColor: theme.accent }]} />
        </View>
    );
}

/**
 * MessageItem - EXACT match to web MessageItem.tsx layout
 * 
 * Key differences from previous implementation:
 * - User messages: flex justify-end (align right), rounded pill style
 * - AI messages: flex justify-start (align left), no container background
 * - AIIndicator with corner brackets + pulsing dot
 * - Thinking state shows LoadingGrid in bordered box with random label
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
    const [randomLabel] = useState(() => THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]);

    const isUser = role === 'user';

    const handleCopy = useCallback(async () => {
        try {
            Clipboard.setString(content);
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

    // ═══════════════════════════════════════════════════════════════════════
    // USER MESSAGE - Right aligned with rounded bubble
    // ═══════════════════════════════════════════════════════════════════════
    if (isUser) {
        return (
            <Animated.View
                entering={FadeInRight.duration(200)}
                style={styles.userMessageContainer}
            >
                <View style={styles.userMessageInner}>
                    {/* Message bubble - web: rounded-2xl rounded-tr-sm */}
                    {content ? (
                        <View style={styles.userBubble}>
                            <Text style={styles.userText} selectable>
                                {content}
                            </Text>
                        </View>
                    ) : null}

                    {/* Actions row - Copy button on right */}
                    <View style={styles.userActions}>
                        <TouchableOpacity
                            onPress={handleCopy}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.actionButton}
                        >
                            <Ionicons
                                name={copied ? "checkmark" : "copy-outline"}
                                size={14}
                                color={copied ? theme.accent : COLORS.textSecondary}
                            />
                            <Text style={[styles.actionText, copied && { color: theme.accent }]}>
                                {copied ? 'Copied' : 'Copy'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ASSISTANT MESSAGE - Left aligned with AI indicator
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <Animated.View
            entering={FadeInLeft.duration(200)}
            style={styles.assistantMessageContainer}
        >
            <View style={styles.assistantMessageInner}>
                {/* AI Indicator + optional content */}
                <View style={styles.assistantHeader}>
                    <AIIndicator />
                </View>

                {/* Thinking state - bordered box with LoadingGrid */}
                {isThinking && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[styles.thinkingBox, { borderColor: `${theme.accent}40` }]}
                    >
                        <LoadingGrid />
                        <Text style={[styles.thinkingLabel, { color: theme.accent }]}>
                            {randomLabel}
                        </Text>
                    </Animated.View>
                )}

                {/* Message content */}
                {content ? (
                    <View style={styles.assistantContent}>
                        <Text style={styles.assistantText} selectable>
                            {content}
                        </Text>
                    </View>
                ) : null}

                {/* Actions row - only show when not streaming and has content */}
                {content && !isStreaming && (
                    <View style={styles.assistantActions}>
                        {/* Model + TPS */}
                        {model && (
                            <Text style={styles.modelText}>
                                {getModelDisplay()}
                                {tokensPerSecond != null && tokensPerSecond > 0 && ` | ${tokensPerSecond.toFixed(1)} t/s`}
                            </Text>
                        )}

                        <View style={{ flex: 1 }} />

                        {/* Copy button */}
                        <TouchableOpacity
                            onPress={handleCopy}
                            style={styles.actionButton}
                        >
                            <Ionicons
                                name={copied ? "checkmark" : "copy-outline"}
                                size={14}
                                color={copied ? theme.accent : COLORS.textSecondary}
                            />
                            <Text style={[styles.actionText, copied && { color: theme.accent }]}>
                                {copied ? 'Copied' : 'Copy'}
                            </Text>
                        </TouchableOpacity>

                        {/* Retry button */}
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="refresh-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.actionText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    // ═══════════════════════════════════════════════════════════════════════
    // USER MESSAGE STYLES - matches web flex justify-end
    // ═══════════════════════════════════════════════════════════════════════
    userMessageContainer: {
        width: '100%',
        marginBottom: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end', // RIGHT aligned like web
    },
    userMessageInner: {
        maxWidth: '80%',
        alignItems: 'flex-end', // Right align inner content
    },
    userBubble: {
        // Web: bg-[#1a1a1a] rounded-2xl rounded-tr-sm border
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        borderTopRightRadius: 4, // rounded-tr-sm
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    userText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    userActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
        gap: 16,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ASSISTANT MESSAGE STYLES - matches web flex justify-start
    // ═══════════════════════════════════════════════════════════════════════
    assistantMessageContainer: {
        width: '100%',
        marginBottom: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'flex-start', // LEFT aligned like web
    },
    assistantMessageInner: {
        maxWidth: '90%',
        alignItems: 'flex-start',
    },
    assistantHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    assistantContent: {
        // No background container like web
    },
    assistantText: {
        color: '#E5E5E5', // Web uses this exact color
        fontSize: 15,
        lineHeight: 24,
    },
    assistantActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 16,
    },
    modelText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: FONTS.mono,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SHARED ACTION STYLES
    // ═══════════════════════════════════════════════════════════════════════
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontFamily: FONTS.mono,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AI INDICATOR - EXACT match to web AIIndicator
    // ═══════════════════════════════════════════════════════════════════════
    aiIndicator: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiIndicatorFrame: {
        position: 'absolute',
        width: 16,
        height: 16,
    },
    aiIndicatorCore: {
        width: 4,
        height: 4,
    },
    // Corner brackets - 5px horizontal, 1px thick
    cornerH: {
        position: 'absolute',
        width: 5,
        height: 1,
        opacity: 0.6,
    },
    cornerV: {
        position: 'absolute',
        width: 1,
        height: 5,
        opacity: 0.6,
    },
    cornerTL: {
        top: 0,
        left: 0,
    },
    cornerTR: {
        top: 0,
        right: 0,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // THINKING / LOADING STATE - matches web
    // ═══════════════════════════════════════════════════════════════════════
    thinkingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#141414',
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 8,
    },
    thinkingGrid: {
        // 4x4 grid = 4 columns
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 20, // 4 dots * 4px + 3 gaps * 2px
        gap: 2,
    },
    thinkingDot: {
        width: 4,
        height: 4,
    },
    thinkingLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: FONTS.mono,
    },
});

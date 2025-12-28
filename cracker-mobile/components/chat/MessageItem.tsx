/**
 * MessageItem - Full Markdown Rendering with Animated Text
 * 
 * SOURCE-LEVEL PARITY with web: app/components/MessageItem.tsx
 * 
 * Rendering Pipeline:
 * 1. Parse content (string or MessagePart[])
 * 2. preprocessLaTeX() - convert \[...\] to $$...$$
 * 3. useAnimatedText() - word-by-word reveal during streaming
 * 4. Markdown render with syntax highlighting
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard, Share, Platform } from 'react-native';
import Animated, {
    FadeIn,
    FadeInRight,
    FadeInLeft,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';
import { useAnimatedText } from '../../hooks/useAnimatedText';
import { createMarkdownStyles, preprocessLaTeX } from '../../lib/markdown-styles';
import CodeBlock from './CodeBlock';

interface MessageItemProps {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    tokensPerSecond?: number;
    isStreaming?: boolean;
    isThinking?: boolean;
    createdAt?: string;
    reasoning?: string;
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

/**
 * LoadingGrid - EXACT match to web LoadingIndicator with thinking-flicker animation
 * 
 * Web CSS animation (thinking-flicker):
 * - 0-25%: opacity 0.1 (dim idle)
 * - 30%: opacity 0.4 (small blip)
 * - 35-70%: opacity 0.1 (long wait)
 * - 75%: opacity 1.0 (flash!)
 * - 85-100%: opacity 0.1 (fade out)
 * 
 * Each dot has random duration 1.5-3s (optimized for mobile) and starts at a random point
 */
function LoadingGrid() {
    const theme = useTheme();

    // Generate 16 dots with random timing - faster than web for better mobile UX
    const dots = React.useMemo(() => {
        return Array.from({ length: 16 }).map(() => ({
            duration: 1.5 + Math.random() * 1.5, // 1.5-3 seconds (optimized)
            delay: -(Math.random() * 2.5),       // Negative delay = starts at random point
        }));
    }, []);

    return (
        <View style={styles.loadingGrid}>
            {/* Row 1 */}
            <View style={styles.loadingRow}>
                {dots.slice(0, 4).map((dot, i) => (
                    <FlickeringDot key={`r1-${i}`} dot={dot} color={theme.accent} />
                ))}
            </View>
            {/* Row 2 */}
            <View style={styles.loadingRow}>
                {dots.slice(4, 8).map((dot, i) => (
                    <FlickeringDot key={`r2-${i}`} dot={dot} color={theme.accent} />
                ))}
            </View>
            {/* Row 3 */}
            <View style={styles.loadingRow}>
                {dots.slice(8, 12).map((dot, i) => (
                    <FlickeringDot key={`r3-${i}`} dot={dot} color={theme.accent} />
                ))}
            </View>
            {/* Row 4 */}
            <View style={styles.loadingRow}>
                {dots.slice(12, 16).map((dot, i) => (
                    <FlickeringDot key={`r4-${i}`} dot={dot} color={theme.accent} />
                ))}
            </View>
        </View>
    );
}

// Single flickering dot with the exact web animation
function FlickeringDot({ dot, color }: { dot: { duration: number; delay: number }; color: string }) {
    const opacity = useSharedValue(0.1);

    React.useEffect(() => {
        // Start animation at a random point (simulating negative delay)
        const startProgress = Math.abs(dot.delay) / dot.duration;

        // Run the animation loop
        const runAnimation = () => {
            // Calculate timing based on web keyframes
            // Total duration split: 0.25, 0.05, 0.05, 0.35, 0.05, 0.1, 0.15 = 1.0
            const dur = dot.duration * 1000;

            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.1, { duration: dur * 0.25 }),  // 0-25%: dim
                    withTiming(0.4, { duration: dur * 0.05 }),  // 25-30%: blip up
                    withTiming(0.1, { duration: dur * 0.05 }),  // 30-35%: fade down
                    withTiming(0.1, { duration: dur * 0.35 }),  // 35-70%: stay dim
                    withTiming(1.0, { duration: dur * 0.05 }),  // 70-75%: flash!
                    withTiming(0.1, { duration: dur * 0.10 }),  // 75-85%: fade down
                    withTiming(0.1, { duration: dur * 0.15 }),  // 85-100%: stay dim
                ),
                -1, // Infinite repeat
                false // No reverse
            );
        };

        // Add initial delay offset
        const timeout = setTimeout(runAnimation, Math.abs(dot.delay) * 200);
        return () => clearTimeout(timeout);
    }, [dot, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.loadingDot, { backgroundColor: color }, animatedStyle]} />
    );
}

// AI Indicator - Corner brackets + pulsing dot
function AIIndicator() {
    const theme = useTheme();

    return (
        <View style={styles.aiIndicator}>
            {/* Corner brackets */}
            <View style={styles.aiFrame}>
                <View style={[styles.cornerH, styles.cornerTL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerTL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerH, styles.cornerTR, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerTR, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerH, styles.cornerBL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerBL, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerH, styles.cornerBR, { backgroundColor: theme.accent }]} />
                <View style={[styles.cornerV, styles.cornerBR, { backgroundColor: theme.accent }]} />
            </View>
            <View style={[styles.aiCore, { backgroundColor: theme.accent }]} />
        </View>
    );
}

export default function MessageItem({
    id,
    role,
    content,
    model,
    tokensPerSecond,
    isStreaming = false,
    isThinking = false,
    createdAt,
    reasoning,
}: MessageItemProps) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const [randomLabel] = useState(() => THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]);

    const isUser = role === 'user';

    // Create themed markdown styles
    const markdownStyles = useMemo(() => createMarkdownStyles(theme.accent), [theme.accent]);

    // Preprocess content for LaTeX (matches web preprocessLaTeX)
    const processedContent = useMemo(() => {
        if (!content) return '';
        return preprocessLaTeX(content);
    }, [content]);

    // Animated text during streaming (matches web useAnimatedText)
    // Word-by-word, 4s duration, circOut easing
    const animatedContent = useAnimatedText(processedContent, {
        delimiter: ' ',
        duration: 4,
        enabled: isStreaming && !!processedContent.trim(),
    });

    // Display content: animated during streaming, full when complete
    const displayContent = isStreaming ? animatedContent : processedContent;

    // Custom markdown rules for code blocks
    const markdownRules = useMemo(() => ({
        fence: (node: any) => {
            const language = node.sourceInfo || 'text';
            const value = node.content || '';
            return <CodeBlock key={node.key} language={language} value={value} />;
        },
        code_inline: (node: any, children: any, parent: any, styles: any) => {
            return (
                <Text key={node.key} style={markdownStyles.code_inline}>
                    {node.content}
                </Text>
            );
        },
    }), [markdownStyles]);

    const handleCopy = useCallback(async () => {
        try {
            Clipboard.setString(content || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }, [content]);

    const getModelDisplay = () => {
        if (!model) return '';
        return model.replace('gemini-', '').replace('-preview', '').toUpperCase();
    };

    // ═══════════════════════════════════════════════════════════════════════
    // USER MESSAGE - Right aligned bubble
    // ═══════════════════════════════════════════════════════════════════════
    if (isUser) {
        return (
            <Animated.View
                entering={FadeInRight.duration(200)}
                style={styles.userContainer}
            >
                <View style={styles.userInner}>
                    {content ? (
                        <View style={styles.userBubble}>
                            <Text style={styles.userText} selectable>
                                {content}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.userActions}>
                        <TouchableOpacity
                            onPress={handleCopy}
                            style={styles.actionButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
    // ASSISTANT MESSAGE - Left aligned with AI indicator + Markdown
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <Animated.View
            entering={FadeInLeft.duration(200)}
            style={styles.assistantContainer}
        >
            <View style={styles.assistantInner}>
                {/* Thinking state - JUST the grid, no box, no label (matches web exactly) */}
                {isThinking && !displayContent ? (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={styles.loadingContainer}
                    >
                        <LoadingGrid />
                    </Animated.View>
                ) : (
                    <>
                        {/* AI Indicator - only show when we have content */}
                        <View style={styles.assistantHeader}>
                            <AIIndicator />
                        </View>
                    </>
                )}

                {/* Reasoning section (collapsible) */}
                {reasoning && (
                    <TouchableOpacity
                        onPress={() => setShowReasoning(!showReasoning)}
                        style={[styles.reasoningBox, { borderColor: `${theme.accent}40` }]}
                    >
                        <View style={styles.reasoningHeader}>
                            <Ionicons
                                name={showReasoning ? "chevron-down" : "chevron-forward"}
                                size={14}
                                color={COLORS.textSecondary}
                            />
                            <Text style={[styles.reasoningLabel, { color: theme.accent }]}>
                                CRACKED
                            </Text>
                        </View>
                        {showReasoning && (
                            <View style={styles.reasoningContent}>
                                <Text style={styles.reasoningText}>{reasoning}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* Message content with Markdown rendering */}
                {displayContent ? (
                    <View style={styles.assistantContent}>
                        <Markdown
                            style={markdownStyles}
                            rules={markdownRules}
                        >
                            {displayContent}
                        </Markdown>
                    </View>
                ) : null}

                {/* Actions row */}
                {content && !isStreaming && (
                    <View style={styles.assistantActions}>
                        {model && (
                            <Text style={styles.modelText}>
                                {getModelDisplay()}
                                {tokensPerSecond != null && tokensPerSecond > 0 && ` | ${tokensPerSecond.toFixed(1)} t/s`}
                            </Text>
                        )}

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                            <Ionicons
                                name={copied ? "checkmark" : "copy-outline"}
                                size={14}
                                color={copied ? theme.accent : COLORS.textSecondary}
                            />
                            <Text style={[styles.actionText, copied && { color: theme.accent }]}>
                                {copied ? 'Copied' : 'Copy'}
                            </Text>
                        </TouchableOpacity>

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
    // USER MESSAGE
    // ═══════════════════════════════════════════════════════════════════════
    userContainer: {
        width: '100%',
        marginBottom: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    userInner: {
        maxWidth: '80%',
        alignItems: 'flex-end',
    },
    userBubble: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        borderTopRightRadius: 4,
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
    // ASSISTANT MESSAGE
    // ═══════════════════════════════════════════════════════════════════════
    assistantContainer: {
        width: '100%',
        marginBottom: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    assistantInner: {
        maxWidth: '100%',  // Use full width, parent paddingHorizontal handles spacing
        alignItems: 'flex-start',
    },
    assistantHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    assistantContent: {
        width: '100%',
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
    // SHARED
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
    // AI INDICATOR
    // ═══════════════════════════════════════════════════════════════════════
    aiIndicator: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiFrame: {
        position: 'absolute',
        width: 16,
        height: 16,
    },
    aiCore: {
        width: 4,
        height: 4,
    },
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
    cornerTL: { top: 0, left: 0 },
    cornerTR: { top: 0, right: 0 },
    cornerBL: { bottom: 0, left: 0 },
    cornerBR: { bottom: 0, right: 0 },

    // ═══════════════════════════════════════════════════════════════════════
    // LOADING GRID - EXACT match to web LoadingIndicator (28x28, 3px gap)
    // ═══════════════════════════════════════════════════════════════════════
    loadingContainer: {
        marginLeft: 4, // Match web: margin-left: 4px
        marginBottom: 8,
    },
    loadingGrid: {
        width: 28,  // Web: 28px
        height: 28, // Web: 28px
        gap: 3,     // Web: 3px gap
    },
    loadingRow: {
        flexDirection: 'row',
        gap: 3, // Web: 3px gap
    },
    loadingDot: {
        width: 5,   // Web: ~5.5px per dot (28-9)/4
        height: 5,
        borderRadius: 1, // Web: border-radius: 1px
    },
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
    thinkingLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: FONTS.mono,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REASONING
    // ═══════════════════════════════════════════════════════════════════════
    reasoningBox: {
        backgroundColor: '#141414',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
    },
    reasoningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reasoningLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: FONTS.mono,
    },
    reasoningContent: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    reasoningText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
    },
});

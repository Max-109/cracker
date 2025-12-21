import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChatMessage, MessagePart, TextPart, ReasoningPart } from '../../lib/types';
import { useTheme } from '../../store/theme';
import ThinkingIndicator from '../indicators/ThinkingIndicator';

interface MessageItemProps {
    message: ChatMessage;
    streamingContent?: string;
    streamingReasoning?: string;
    isStreaming?: boolean;
}

function MessageItemComponent({ message, streamingContent, streamingReasoning, isStreaming }: MessageItemProps) {
    const theme = useTheme();
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    // Get content
    const getContent = (): string => {
        // For streaming messages
        if (isStreaming && streamingContent !== undefined) {
            return streamingContent;
        }

        // For regular messages
        if (typeof message.content === 'string') {
            return message.content;
        }

        // For array content, extract text parts
        if (Array.isArray(message.content)) {
            return message.content
                .filter((part): part is TextPart => part.type === 'text')
                .map(part => part.text || '')
                .join('');
        }

        // Check parts array
        if (message.parts) {
            return message.parts
                .filter((part): part is TextPart => part.type === 'text')
                .map(part => part.text || '')
                .join('');
        }

        return '';
    };

    // Get reasoning content
    const getReasoning = (): string => {
        if (isStreaming && streamingReasoning) {
            return streamingReasoning;
        }

        if (message.parts) {
            return message.parts
                .filter((part): part is ReasoningPart => part.type === 'reasoning')
                .map(part => part.text || part.reasoning || '')
                .join('');
        }

        return '';
    };

    const content = getContent();
    const reasoning = getReasoning();

    // Markdown styles
    const markdownStyles = StyleSheet.create({
        body: {
            color: theme.textPrimary,
            fontSize: 15,
            lineHeight: 22,
        },
        paragraph: {
            marginVertical: 4,
        },
        heading1: {
            color: theme.textPrimary,
            fontSize: 24,
            fontWeight: '700',
            marginVertical: 8,
        },
        heading2: {
            color: theme.textPrimary,
            fontSize: 20,
            fontWeight: '600',
            marginVertical: 6,
        },
        heading3: {
            color: theme.textPrimary,
            fontSize: 17,
            fontWeight: '600',
            marginVertical: 4,
        },
        code_inline: {
            backgroundColor: theme.bgCode,
            color: theme.accent,
            fontFamily: 'Menlo',
            fontSize: 13,
            paddingHorizontal: 4,
            paddingVertical: 2,
        },
        code_block: {
            backgroundColor: theme.bgCode,
            paddingVertical: 12,
            paddingHorizontal: 16,
            fontFamily: 'Menlo',
            fontSize: 13,
        },
        fence: {
            backgroundColor: theme.bgCode,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginVertical: 8,
        },
        blockquote: {
            backgroundColor: theme.accentLight,
            borderLeftColor: theme.accent,
            borderLeftWidth: 3,
            paddingLeft: 12,
            paddingVertical: 4,
            marginVertical: 8,
        },
        link: {
            color: theme.accent,
            textDecorationLine: 'underline',
        },
        list_item: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        bullet_list: {
            marginVertical: 4,
        },
        ordered_list: {
            marginVertical: 4,
        },
        strong: {
            fontWeight: '700',
        },
        em: {
            fontStyle: 'italic',
        },
        hr: {
            backgroundColor: theme.border,
            height: 1,
            marginVertical: 12,
        },
        table: {
            borderWidth: 1,
            borderColor: theme.border,
            marginVertical: 8,
        },
        thead: {
            backgroundColor: theme.bgCode,
        },
        th: {
            padding: 8,
            borderWidth: 1,
            borderColor: theme.border,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        td: {
            padding: 8,
            borderWidth: 1,
            borderColor: theme.border,
            color: theme.textPrimary,
        },
    });

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            className="mb-4"
            style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
            }}
        >
            {/* Role indicator */}
            <Text
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: isUser ? theme.accent : theme.textSecondary }}
            >
                {isUser ? 'You' : 'Cracker'}
            </Text>

            {/* Message content */}
            <View
                style={{
                    backgroundColor: isUser ? theme.accentLight : theme.bgInput,
                    borderWidth: 1,
                    borderColor: isUser ? theme.accentMedium : theme.border,
                    padding: 12,
                }}
            >
                {/* Show thinking indicator while streaming reasoning */}
                {isStreaming && streamingReasoning && (
                    <ThinkingIndicator reasoning={streamingReasoning} />
                )}

                {/* Show reasoning summary for completed messages */}
                {!isStreaming && reasoning && (
                    <View
                        className="mb-3 pb-3"
                        style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
                    >
                        <Text className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>
                            Reasoning
                        </Text>
                        <Text className="text-sm" style={{ color: theme.textSecondary }} numberOfLines={3}>
                            {reasoning}
                        </Text>
                    </View>
                )}

                {/* Main content */}
                {content ? (
                    isUser ? (
                        <Text style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 22 }}>
                            {content}
                        </Text>
                    ) : (
                        <Markdown style={markdownStyles}>
                            {content}
                        </Markdown>
                    )
                ) : isStreaming ? (
                    <View className="flex-row items-center">
                        <View
                            className="w-2 h-4 mr-1"
                            style={{ backgroundColor: theme.accent }}
                        />
                        <Text className="text-text-secondary text-sm">Generating...</Text>
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
}

export default memo(MessageItemComponent);

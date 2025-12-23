import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../store/theme';
import { useSettingsStore } from '../../../store/settings';
import { api, apiStreamFetch } from '../../../lib/api';
import { ChatMessage, StreamEvent } from '../../../lib/types';
import MessageItem from '../../../components/chat/MessageItem';
import ChatInput from '../../../components/ui/ChatInput';
import ChatBackground from '../../../components/ui/ChatBackground';
import ThinkingIndicator from '../../../components/ui/ThinkingIndicator';
import { MessageSkeleton } from '../../../components/ui/Skeleton';
import { COLORS } from '../../../lib/design';

export default function ChatScreen() {
    const { id, initialMessage } = useLocalSearchParams<{ id: string; initialMessage?: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatTitle, setChatTitle] = useState('Chat');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingReasoning, setStreamingReasoning] = useState('');
    const [currentTps, setCurrentTps] = useState<number | undefined>();
    const [hasAutoSent, setHasAutoSent] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const theme = useTheme();
    const { chatMode, reasoningEffort, enabledMcpServers, responseLength } = useSettingsStore();

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

    // Load chat messages
    useEffect(() => {
        if (!id) return;

        const loadChat = async () => {
            try {
                const data = await api.getChat(id);
                const chat = data.chat as any;
                setChatTitle(chat?.title || 'Chat');

                const formattedMessages = (data.messages as any[]).map((msg): ChatMessage => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    createdAt: new Date(msg.createdAt),
                    parts: msg.parts,
                    model: msg.model,
                    tokensPerSecond: msg.tokensPerSecond,
                }));
                setMessages(formattedMessages);
            } catch (error) {
                console.error('Failed to load chat:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadChat();
    }, [id]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, streamingContent]);

    // Stop generation
    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setIsThinking(false);
    }, []);

    // Send message function
    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isStreaming) return;

        const userMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: messageText.trim(),
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsStreaming(true);
        setIsThinking(true);
        setStreamingContent('');
        setStreamingReasoning('');
        setCurrentTps(undefined);

        const assistantMessage: ChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Get auto-reasoning
        let effort = reasoningEffort;
        try {
            const autoReasoning = await api.getReasoningEffort(messageText.trim());
            effort = autoReasoning.effort;
        } catch { }

        let accumulated = '';
        let startTime = Date.now();
        let tokenCount = 0;

        // Create abort controller
        abortControllerRef.current = new AbortController();

        await apiStreamFetch(
            '/api/chat',
            {
                chatId: id,
                messages: [...messages, userMessage].map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                modelId: 'gemini-2.5-flash',
                reasoningEffort: effort,
                enabledMcpServers,
                chatMode,
                responseLength,
            },
            (event: unknown) => {
                const e = event as StreamEvent;

                switch (e.type) {
                    case 'text-delta':
                        if (isThinking) setIsThinking(false);
                        accumulated += e.textDelta;
                        tokenCount++;

                        // Calculate TPS
                        const elapsed = (Date.now() - startTime) / 1000;
                        if (elapsed > 0) {
                            setCurrentTps(tokenCount / elapsed);
                        }

                        setStreamingContent(accumulated);
                        break;
                    case 'reasoning':
                        setStreamingReasoning(prev => prev + e.textDelta);
                        break;
                    case 'finish':
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastIndex = updated.length - 1;
                            if (updated[lastIndex]?.role === 'assistant') {
                                updated[lastIndex] = {
                                    ...updated[lastIndex],
                                    content: accumulated,
                                    tokensPerSecond: currentTps,
                                };
                            }
                            return updated;
                        });
                        setIsStreaming(false);
                        setIsThinking(false);
                        break;
                }
            },
            (error) => {
                console.error('Stream error:', error);
                setIsStreaming(false);
                setIsThinking(false);
            }
        );
    }, [id, messages, isStreaming, chatMode, reasoningEffort, enabledMcpServers, responseLength, currentTps, isThinking]);

    // Auto-send initial message if provided
    useEffect(() => {
        if (initialMessage && !hasAutoSent && !isLoading && messages.length === 0) {
            setHasAutoSent(true);
            setTimeout(() => {
                sendMessage(initialMessage);
            }, 300);
        }
    }, [initialMessage, hasAutoSent, isLoading, messages.length, sendMessage]);

    const handleSend = () => {
        sendMessage(input);
    };

    const handleBack = () => {
        router.back();
    };

    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isLastMessage = index === messages.length - 1;
        const isStreamingMessage = isLastMessage && isStreaming && item.role === 'assistant';

        // Get content text
        let contentText = '';
        if (isStreamingMessage) {
            contentText = streamingContent;
        } else if (typeof item.content === 'string') {
            contentText = item.content;
        } else if (Array.isArray(item.content)) {
            contentText = item.content
                .filter((p: any) => p.type === 'text')
                .map((p: any) => p.text)
                .join('');
        }

        return (
            <MessageItem
                id={item.id}
                role={item.role as 'user' | 'assistant'}
                content={contentText}
                model={item.model}
                tokensPerSecond={isStreamingMessage ? currentTps : item.tokensPerSecond}
                isStreaming={isStreamingMessage}
                isThinking={isStreamingMessage && isThinking}
                createdAt={item.createdAt?.toISOString()}
            />
        );
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginRight: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ height: 18, width: 100, backgroundColor: COLORS.border }} />
                </View>
                <View style={{ flex: 1, padding: 16 }}>
                    <MessageSkeleton />
                    <MessageSkeleton isUser />
                    <MessageSkeleton />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: COLORS.bgMain }}
            keyboardVerticalOffset={0}
        >
            {/* Background Grid Pattern - MUST be on every screen like web */}
            <ChatBackground />

            {/* Header */}
            <View style={[styles.header, { paddingTop: statusBarHeight + 12 }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: COLORS.bgCard,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text
                    style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: COLORS.textPrimary,
                        flex: 1,
                    }}
                    numberOfLines={1}
                >
                    {chatTitle}
                </Text>

                {/* Streaming indicator in header */}
                {isStreaming && (
                    <ThinkingIndicator isThinking={isThinking} label={isThinking ? 'Thinking' : 'Writing'} />
                )}
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={{ paddingBottom: 20 }}
                onContentSizeChange={() => {
                    if (messages.length > 0) {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }
                }}
                ListEmptyComponent={
                    <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingVertical: 60 }}>
                        <View style={{
                            width: 56,
                            height: 56,
                            backgroundColor: `${theme.accent}15`,
                            borderWidth: 1,
                            borderColor: `${theme.accent}40`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="chatbubbles-outline" size={24} color={theme.accent} />
                        </View>
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' }}>
                            Start the conversation...
                        </Text>
                    </Animated.View>
                }
            />

            {/* Input */}
            <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                onStop={handleStop}
                isLoading={false}
                isStreaming={isStreaming}
                placeholder="Let's crack..."
            />
        </KeyboardAvoidingView>
    );
}

const styles = {
    header: {
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bgMain,
    },
};

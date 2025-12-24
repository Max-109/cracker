import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
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
import { DotGridIndicator } from '../../../components/ui/ConnectionIndicator';
import { ModelSelector, AccentColorPicker } from '../../../components/ui/ModelSelector';
import { MessageSkeleton } from '../../../components/ui/Skeleton';
import Drawer from '../../../components/navigation/Drawer';
import { COLORS, FONTS } from '../../../lib/design';

interface ChatItem {
    id: string;
    title: string;
    mode: string;
    createdAt: string;
}

export default function ChatScreen() {
    const { id, initialMessage } = useLocalSearchParams<{ id: string; initialMessage?: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatTitle, setChatTitle] = useState('Chat');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [thinkingLabel, setThinkingLabel] = useState('ANALYZING');
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingReasoning, setStreamingReasoning] = useState('');
    const [currentTps, setCurrentTps] = useState<number | undefined>();
    const [hasAutoSent, setHasAutoSent] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [chats, setChats] = useState<ChatItem[]>([]);

    // Debug state
    const [debugInfo, setDebugInfo] = useState({
        lastEvent: '',
        eventCount: 0,
        error: '',
        status: 'idle',
    });

    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const theme = useTheme();
    const {
        chatMode,
        reasoningEffort,
        enabledMcpServers,
        responseLength,
        userName,
        userGender,
        customInstructions,
        learningSubMode,
        currentModelId,
    } = useSettingsStore();
    const learningMode = chatMode === 'learning';

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

    // Load chats for drawer
    const loadChats = useCallback(async () => {
        try {
            const response = await api.getChats();
            setChats(response || []);
        } catch (error) {
            console.error('[Chat] Failed to load chats:', error);
        }
    }, []);

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
                setDebugInfo(prev => ({ ...prev, error: String(error) }));
            } finally {
                setIsLoading(false);
            }
        };

        loadChat();
        loadChats();
    }, [id, loadChats]);

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
        setIsConnecting(false);
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
        setIsConnecting(true);
        setIsStreaming(true);
        setIsThinking(false);
        setStreamingContent('');
        setStreamingReasoning('');
        setCurrentTps(undefined);
        setDebugInfo({ lastEvent: '', eventCount: 0, error: '', status: 'connecting' });

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
                model: currentModelId || 'gemini-2.5-flash',
                reasoningEffort: effort,
                enabledMcpServers,
                chatMode,
                responseLength,
                userName,
                userGender,
                learningMode,
                learningSubMode,
                customInstructions,
            },
            (event: unknown) => {
                const e = event as StreamEvent;
                setDebugInfo(prev => ({
                    ...prev,
                    lastEvent: e.type,
                    eventCount: prev.eventCount + 1,
                    status: 'streaming',
                }));

                switch (e.type) {
                    // AI SDK v4 new format events
                    case 'start':
                        setIsConnecting(true);
                        break;
                    case 'start-step':
                        setIsConnecting(false);
                        setIsThinking(true);
                        setThinkingLabel('PROCESSING');
                        break;
                    case 'reasoning-start':
                        setIsThinking(true);
                        setThinkingLabel('THINKING');
                        break;
                    case 'reasoning-delta':
                        setStreamingReasoning(prev => prev + ((e as any).delta || ''));
                        break;
                    case 'reasoning-end':
                        // Reasoning complete, waiting for text
                        break;
                    case 'text-start':
                        setIsConnecting(false);
                        setIsThinking(false);
                        break;
                    case 'text-delta':
                        setIsConnecting(false);
                        setIsThinking(false);
                        // Handle both old format (textDelta) and new format (delta)
                        const textDelta = (e as any).textDelta || (e as any).delta || '';
                        accumulated += textDelta;
                        tokenCount++;

                        // Calculate TPS
                        const elapsed = (Date.now() - startTime) / 1000;
                        if (elapsed > 0) {
                            setCurrentTps(tokenCount / elapsed);
                        }

                        setStreamingContent(accumulated);
                        break;
                    case 'text-end':
                        // Text segment complete
                        break;
                    case 'finish-step':
                        // Step complete, might continue with more steps
                        break;

                    // Tool events
                    case 'tool-call':
                        setIsThinking(true);
                        setThinkingLabel(`USING ${((e as any).toolName || 'TOOL').toUpperCase()}`);
                        break;
                    case 'tool-result':
                        // Tool completed
                        break;

                    // Legacy format events
                    case 'status':
                        setIsConnecting(false);
                        setIsThinking(true);
                        setThinkingLabel((e as any).status?.toUpperCase() || 'PROCESSING');
                        break;
                    case 'reasoning':
                        setStreamingReasoning(prev => prev + ((e as any).textDelta || ''));
                        break;

                    // Finish events
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
                        setIsConnecting(false);
                        setDebugInfo(prev => ({ ...prev, status: 'done' }));
                        break;
                }
            },
            (error) => {
                console.error('Stream error:', error);
                setDebugInfo(prev => ({ ...prev, error: String(error), status: 'error' }));
                setIsStreaming(false);
                setIsThinking(false);
                setIsConnecting(false);
            }
        );
    }, [id, messages, isStreaming, chatMode, reasoningEffort, enabledMcpServers, responseLength, currentTps, currentModelId, userName, userGender, customInstructions, learningSubMode, learningMode]);

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

    const handleChatPress = (chatId: string) => {
        setIsDrawerOpen(false);
        if (chatId !== id) {
            router.push(`/(main)/chat/${chatId}`);
        }
    };

    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isStreamingMessage = isStreaming && index === messages.length - 1 && item.role === 'assistant';

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
                isThinking={isStreamingMessage && (isThinking || isConnecting)}
                createdAt={item.createdAt?.toISOString()}
            />
        );
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
                <View style={styles.header}>
                    <View style={{ width: 40, height: 40, backgroundColor: COLORS.border }} />
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
            {/* Background Grid Pattern */}
            <ChatBackground />

            {/* Drawer */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                chats={chats}
                onChatPress={handleChatPress}
                currentChatId={id}
            />

            {/* Header - MATCHING HOME SCREEN EXACTLY */}
            <View style={[styles.header, { paddingTop: statusBarHeight + 12 }]}>
                {/* Left: Back + Settings */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: COLORS.bgMain,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Settings Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/(main)/settings')}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: COLORS.bgMain,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="options-outline" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Right: Model Selector + Accent Color */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ModelSelector />
                    <AccentColorPicker />
                </View>
            </View>

            {/* Debug Panel */}
            {(debugInfo.status !== 'idle' || debugInfo.error) && (
                <View style={{
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1,
                    borderColor: debugInfo.error ? '#f87171' : COLORS.border,
                    marginHorizontal: 16,
                    marginTop: 8,
                    padding: 8,
                }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 9, fontFamily: FONTS.mono }}>
                        Status: {debugInfo.status} | Events: {debugInfo.eventCount} | Last: {debugInfo.lastEvent || 'none'}
                    </Text>
                    {debugInfo.error && (
                        <Text style={{ color: '#f87171', fontSize: 9, fontFamily: FONTS.mono, marginTop: 4 }}>
                            Error: {debugInfo.error}
                        </Text>
                    )}
                </View>
            )}

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
                ListFooterComponent={
                    // Show connection/thinking indicators
                    isStreaming && (isConnecting || isThinking) ? (
                        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                            {isConnecting ? (
                                // Connection state: 4x4 dot grid
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <DotGridIndicator />
                                </View>
                            ) : isThinking ? (
                                // Thinking state: label with animated dots
                                <ThinkingIndicator label={thinkingLabel} />
                            ) : null}
                        </View>
                    ) : null
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
        justifyContent: 'space-between' as const,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bgMain,
    },
};

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';
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
import ErrorBoundary from '../../../components/ErrorBoundary';
import { COLORS, FONTS } from '../../../lib/design';
import { useVoiceRecording } from '../../../hooks/useVoiceRecording';

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
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Voice recording
    const { isRecording, startRecording, stopRecording } = useVoiceRecording();

    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingReasoningRef = useRef('');
    const accumulatedTextRef = useRef('');
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
        } catch { }
    }, []);

    // Load chat messages
    useEffect(() => {
        if (!id) return;

        const loadChat = async () => {
            try {
                // Fetch messages from API
                let messagesData;
                try {
                    messagesData = await api.getChat(id);
                } catch (apiError: any) {
                    // Handle specific API errors
                    if (apiError?.status === 404 || apiError?.status === 401) {
                        // Chat was deleted or doesn't exist - navigate back gracefully
                        setIsLoading(false);
                        setTimeout(() => router.back(), 100);
                        return;
                    }
                    // Re-throw for outer catch to handle other errors
                    throw apiError;
                }

                // Defensive check - ensure we have an array
                if (!messagesData || !Array.isArray(messagesData)) {
                    setMessages([]);
                    setIsLoading(false);
                    return;
                }

                const formattedMessages = messagesData.map((msg: any): ChatMessage => {
                    // Safely parse createdAt - Invalid Date will cause toISOString() to crash
                    let createdAt: Date | undefined;
                    if (msg.createdAt) {
                        const parsed = new Date(msg.createdAt);
                        // Check if date is valid (Invalid Date returns NaN for getTime())
                        if (!isNaN(parsed.getTime())) {
                            createdAt = parsed;
                        }
                    }

                    // Ensure content is never undefined/null to prevent rendering crashes
                    let content = msg.content;
                    if (content === null || content === undefined) {
                        content = '';
                    }

                    // Safely parse tokensPerSecond (stored as TEXT in DB)
                    let tps: number | undefined;
                    if (msg.tokensPerSecond != null) {
                        const parsed = parseFloat(String(msg.tokensPerSecond));
                        if (!isNaN(parsed) && isFinite(parsed)) {
                            tps = parsed;
                        }
                    }

                    return {
                        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                        role: msg.role || 'user',
                        content,
                        createdAt,
                        parts: msg.parts,
                        model: msg.model || undefined,
                        tokensPerSecond: tps,
                    };
                });
                setMessages(formattedMessages);

                // Set title from first user message if available
                const firstUserMsg = formattedMessages.find(m => m.role === 'user');
                if (firstUserMsg?.content) {
                    const content = typeof firstUserMsg.content === 'string'
                        ? firstUserMsg.content
                        : '';
                    setChatTitle(content.slice(0, 40) || 'Chat');
                }
            } catch { } finally {
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

    // Voice handling
    const handleMicPress = async () => {
        if (isRecording) {
            // Stop and transcribe
            setIsTranscribing(true);
            try {
                const uri = await stopRecording();
                if (uri) {
                    const result = await api.transcribe(uri, 'gemini');
                    if (result.text) {
                        setInput(prev => prev + (prev ? ' ' : '') + result.text);
                    }
                }
            } catch {
                Alert.alert('Error', 'Failed to transcribe audio');
            } finally {
                setIsTranscribing(false);
            }
        } else {
            // Start recording
            await startRecording();
        }
    };

    // Send message function
    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isStreaming) return;

        // Check if this is the first message (for title generation)
        const isFirstMessage = messages.length === 0;

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

        // Reset refs for new message
        streamingReasoningRef.current = '';
        accumulatedTextRef.current = '';

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
                        const reasoningDelta = (e as any).delta || '';
                        streamingReasoningRef.current += reasoningDelta;
                        setStreamingReasoning(streamingReasoningRef.current);
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
                        accumulatedTextRef.current += textDelta;
                        tokenCount++;

                        // Calculate TPS
                        const elapsed = (Date.now() - startTime) / 1000;
                        if (elapsed > 0) {
                            setCurrentTps(tokenCount / elapsed);
                        }

                        setStreamingContent(accumulatedTextRef.current);
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
                        const legacyReasoningDelta = (e as any).textDelta || '';
                        streamingReasoningRef.current += legacyReasoningDelta;
                        setStreamingReasoning(streamingReasoningRef.current);
                        break;

                    // Finish events
                    case 'finish':
                        // Build content as array of parts (matches web/server format)
                        // This preserves reasoning for display after stream ends
                        const finalReasoning = streamingReasoningRef.current;
                        const finalText = accumulatedTextRef.current;

                        setMessages(prev => {
                            const updated = [...prev];
                            const lastIndex = updated.length - 1;
                            if (updated[lastIndex]?.role === 'assistant') {
                                // Store as parts array to preserve reasoning
                                const contentParts: any[] = [];
                                if (finalReasoning) {
                                    contentParts.push({ type: 'reasoning', text: finalReasoning });
                                }
                                if (finalText) {
                                    contentParts.push({ type: 'text', text: finalText });
                                }

                                updated[lastIndex] = {
                                    ...updated[lastIndex],
                                    content: contentParts.length > 0 ? contentParts : finalText,
                                    tokensPerSecond: currentTps,
                                };
                            }
                            return updated;
                        });
                        setIsStreaming(false);
                        setIsThinking(false);
                        setIsConnecting(false);

                        // Generate title for first message (matches web behavior)
                        if (isFirstMessage && id) {
                            api.generateTitle(id, messageText.trim().substring(0, 300))
                                .then(() => loadChats())
                                .catch(() => { });
                        }
                        break;
                }
            },
            () => {
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

        // Extract text content AND reasoning (matches web MessageItem.tsx parsing)
        let contentText = '';
        let reasoningText = '';

        if (isStreamingMessage) {
            contentText = streamingContent || '';
            reasoningText = streamingReasoning || '';
        } else {
            try {
                const content = item.content;
                if (content == null) {
                    // null or undefined - use empty string
                    contentText = '';
                } else if (typeof content === 'string') {
                    contentText = content;
                } else if (Array.isArray(content)) {
                    // Array of parts - parse for text AND reasoning
                    for (const part of content) {
                        if (!part || typeof part !== 'object') continue;
                        const p = part as any;
                        if (p.type === 'reasoning') {
                            reasoningText += (p.reasoning || p.text || '');
                        } else if (p.type === 'text') {
                            contentText += (p.text || '');
                        }
                    }
                } else if (typeof content === 'object') {
                    const obj = content as any;
                    if (obj.type === 'text' && obj.text) {
                        contentText = String(obj.text);
                    } else if (obj.type === 'reasoning') {
                        reasoningText = String(obj.reasoning || obj.text || '');
                    } else if (obj.text) {
                        contentText = String(obj.text);
                    }
                }
            } catch {
                contentText = '';
                reasoningText = '';
            }
        }

        // Show loading grid ONLY during initial connection (before first token arrives)
        const showThinking = isStreamingMessage && isConnecting && !contentText && !reasoningText;

        return (
            <MessageItem
                id={item.id}
                role={item.role as 'user' | 'assistant'}
                content={contentText}
                reasoning={reasoningText || undefined}
                model={item.model}
                tokensPerSecond={isStreamingMessage ? currentTps : item.tokensPerSecond}
                isStreaming={isStreamingMessage}
                isThinking={showThinking}
                createdAt={item.createdAt instanceof Date && !isNaN(item.createdAt.getTime()) ? item.createdAt.toISOString() : undefined}
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

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => item.id || `msg-${index}`}
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
                ListFooterComponent={null}
            />

            {/* Input */}
            <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                onStop={handleStop}
                onMic={handleMicPress}
                isLoading={isTranscribing}
                isRecording={isRecording}
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

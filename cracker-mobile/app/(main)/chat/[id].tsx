import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../store/theme';
import { useSettingsStore } from '../../../store/settings';
import { useOpenAIAccountStore } from '../../../store/openaiAccount';
import { api, apiFetch, apiStreamFetch, getProviderConfig } from '../../../lib/api';
import { ChatMessage, MessagePart, StreamEvent } from '../../../lib/types';
import MessageItem from '../../../components/chat/MessageItem';
import ChatInput from '../../../components/ui/ChatInput';
import ChatBackground from '../../../components/ui/ChatBackground';
import ThinkingIndicator from '../../../components/ui/ThinkingIndicator';
import { DotGridIndicator } from '../../../components/ui/ConnectionIndicator';
import { ModelSelector, AccentColorPicker } from '../../../components/ui/ModelSelector';
import PanelLeftIcon from '../../../components/ui/PanelLeftIcon';
import { MessageSkeleton } from '../../../components/ui/Skeleton';
import Drawer from '../../../components/navigation/Drawer';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { COLORS, FONTS } from '../../../lib/design';
import { showAppDialog } from '../../../components/ui/AppDialog';

interface ChatItem {
    id: string;
    title: string;
    mode: string;
    createdAt: string;
}

const MAX_REASONABLE_TOKENS_PER_SECOND = 500;

function normalizeTokensPerSecond(value: unknown): number | undefined {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_REASONABLE_TOKENS_PER_SECOND ? parsed : undefined;
}

async function fetchLatestAssistantStats(chatId: string, after?: number) {
    for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 150 * attempt));
        }

        const stats = await apiFetch<{ tokenSpeed?: number | null; tokensPerSecond?: number | string | null; modelId?: string | null }>(`/api/chat?chatId=${chatId}${after ? `&after=${after}` : ''}`);
        const tokensPerSecond = normalizeTokensPerSecond(stats.tokenSpeed ?? stats.tokensPerSecond);
        if (tokensPerSecond != null) {
            return { tokensPerSecond, modelId: stats.modelId || undefined };
        }
    }

    return null;
}

function stripThinkingBlocks(input: string) {
    let text = input || '';
    const extract = (startToken: string, endTokens: string[]) => {
        let start = text.indexOf(startToken);
        while (start !== -1) {
            const innerStart = start + startToken.length;
            const closing = endTokens
                .map((token) => ({ token, index: text.indexOf(token, innerStart) }))
                .filter((item) => item.index !== -1)
                .sort((a, b) => a.index - b.index)[0];
            text = closing
                ? `${text.slice(0, start)}${text.slice(closing.index + closing.token.length)}`
                : text.slice(0, start);
            start = text.indexOf(startToken);
        }
    };
    extract('<think>', ['</think>', '/think']);
    extract('/think', ['/think']);
    return text.trim();
}

function contentForRequest(message: ChatMessage) {
    if (typeof message.content === 'string') return message.role === 'assistant' ? stripThinkingBlocks(message.content) : message.content;
    if (!Array.isArray(message.content)) return '';

    // For assistant history, send only visible text back to the model. Sending
    // stored reasoning parts on the next turn can make providers stall/reject.
    if (message.role === 'assistant') {
        return message.content
            .map((part) => part.type === 'text' ? stripThinkingBlocks(part.text || '') : '')
            .filter(Boolean)
            .join('\n');
    }

    return message.content;
}

function messagesForRequest(messages: ChatMessage[], nextUserMessage: ChatMessage) {
    return [...messages, nextUserMessage]
        .filter((message) => message.role !== 'assistant' || String(contentForRequest(message)).trim().length > 0)
        .map((message) => ({
            role: message.role,
            content: contentForRequest(message),
        }));
}

export default function ChatScreen() {
    const { id, initialMessage, initialAttachments } = useLocalSearchParams<{ id: string; initialMessage?: string; initialAttachments?: string }>();
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
    const [chatError, setChatError] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingReasoningRef = useRef('');
    const accumulatedTextRef = useRef('');
    const currentTpsRef = useRef<number | undefined>(undefined);
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
    const { auth: openAIAccountAuth, enabled: useOpenAIAccount, refreshUsage } = useOpenAIAccountStore();

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
                    const tps = normalizeTokensPerSecond(msg.tokenSpeed ?? msg.tokensPerSecond);

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

    // Send message function
    const sendMessage = useCallback(async (messageText: string, attachmentParts: MessagePart[] = []) => {
        if ((!messageText.trim() && attachmentParts.length === 0) || isStreaming) return;

        // Check if this is the first message (for title generation)
        const isFirstMessage = messages.length === 0;

        const userContent: string | MessagePart[] = attachmentParts.length > 0
            ? [{ type: 'text', text: messageText.trim() }, ...attachmentParts]
            : messageText.trim();

        const userMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: userContent,
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setChatError(null);

        try {
            await api.saveMessage(id, 'user', userContent);
        } catch {
            showAppDialog({ title: 'Error', message: 'Failed to save your message. Please try again.', tone: 'error' });
            setMessages(prev => prev.filter(message => message.id !== userMessage.id));
            return;
        }

        setIsConnecting(true);
        setIsStreaming(true);
        setIsThinking(false);
        setStreamingContent('');
        setStreamingReasoning('');
        setCurrentTps(undefined);

        // Reset refs for new message
        streamingReasoningRef.current = '';
        accumulatedTextRef.current = '';
        currentTpsRef.current = undefined;

        const assistantMessage: ChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        const accountContext = useOpenAIAccount && openAIAccountAuth
            ? { useOpenAIAccount: true, openAIAccountAuth: [openAIAccountAuth] }
            : { useOpenAIAccount: false, ...(await getProviderConfig()) };

        // Get auto-reasoning
        let effort = reasoningEffort;
        try {
            const autoReasoning = await api.getReasoningEffort(messageText.trim(), accountContext);
            effort = autoReasoning.effort;
        } catch { }

        const requestStartedAt = Date.now();
        let firstTextTime: number | null = null;

        // Create abort controller
        abortControllerRef.current = new AbortController();

        await apiStreamFetch(
            '/api/chat',
            {
                chatId: id,
                messages: messagesForRequest(messages, userMessage),
                model: currentModelId || 'gpt-5.4-mini',
                reasoningEffort: effort,
                enabledMcpServers,
                chatMode,
                responseLength,
                userName,
                userGender,
                learningMode,
                learningSubMode,
                customInstructions,
                ...accountContext,
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
                        const reasoningDelta = (e as any).delta || (e as any).textDelta || '';
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
                        firstTextTime = firstTextTime ?? Date.now();

                        // Live preview only: estimate tokens from streamed text until server final stats arrive.
                        const elapsed = (Date.now() - firstTextTime) / 1000;
                        const estimatedTokens = Math.max(1, Math.round(accumulatedTextRef.current.length / 4));
                        const nextTps = elapsed > 0.5 ? normalizeTokensPerSecond(estimatedTokens / elapsed) : undefined;
                        currentTpsRef.current = nextTps;
                        setCurrentTps(nextTps);

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
                        const legacyReasoningDelta = (e as any).textDelta || (e as any).delta || '';
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
                                    model: currentModelId || 'gpt-5.4-mini',
                                    tokensPerSecond: undefined,
                                };
                            }
                            return updated;
                        });

                        fetchLatestAssistantStats(id, requestStartedAt)
                            .then(stats => {
                                if (!stats) return;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastIndex = updated.findLastIndex(message => message.role === 'assistant');
                                    if (lastIndex >= 0) {
                                        updated[lastIndex] = {
                                            ...updated[lastIndex],
                                            model: stats.modelId || updated[lastIndex].model || currentModelId || 'gpt-5.4-mini',
                                            tokensPerSecond: stats.tokensPerSecond ?? updated[lastIndex].tokensPerSecond,
                                        };
                                    }
                                    return updated;
                                });
                            })
                            .catch(() => { });

                        setIsStreaming(false);
                        setIsThinking(false);
                        setIsConnecting(false);

                        // Generate title for first message (matches web behavior)
                        if (useOpenAIAccount && openAIAccountAuth) {
                            refreshUsage().catch(() => { });
                        }

                        if (isFirstMessage && id) {
                            api.generateTitle(id, messageText.trim().substring(0, 300), accountContext)
                                .then(() => loadChats())
                                .catch(() => { });
                        }
                        return false;
                }
            },
            (error) => {
                const message = error.message || 'The model request failed.';
                setChatError(message);
                setMessages(prev => prev.filter(messageItem => messageItem.id !== assistantMessage.id));
                setIsStreaming(false);
                setIsThinking(false);
                setIsConnecting(false);
            },
            abortControllerRef.current.signal
        ).catch((error) => {
            const message = error instanceof Error ? error.message : 'The model request failed.';
            setChatError(message);
            setMessages(prev => prev.filter(messageItem => messageItem.id !== assistantMessage.id));
            setIsStreaming(false);
            setIsThinking(false);
            setIsConnecting(false);
            abortControllerRef.current = null;
        }).finally(() => {
            abortControllerRef.current = null;
        });
    }, [id, messages, isStreaming, chatMode, reasoningEffort, enabledMcpServers, responseLength, currentModelId, userName, userGender, customInstructions, learningSubMode, learningMode, useOpenAIAccount, openAIAccountAuth, refreshUsage]);

    // Auto-send initial message if provided
    useEffect(() => {
        if ((initialMessage || initialAttachments) && !hasAutoSent && !isLoading && messages.length === 0) {
            setHasAutoSent(true);
            setTimeout(() => {
                let attachmentParts: MessagePart[] = [];
                if (initialAttachments) {
                    try {
                        const parsed = JSON.parse(initialAttachments);
                        attachmentParts = Array.isArray(parsed) ? parsed : [];
                    } catch {
                        attachmentParts = [];
                    }
                }
                sendMessage(initialMessage || '', attachmentParts);
            }, 300);
        }
    }, [initialMessage, initialAttachments, hasAutoSent, isLoading, messages.length, sendMessage]);

    const handleSend = () => {
        sendMessage(input);
    };

    const handleChatPress = (chatId: string) => {
        setIsDrawerOpen(false);
        if (chatId !== id) {
            router.push(`/(main)/chat/${chatId}`);
        }
    };

    const handleNewChat = async () => {
        setIsDrawerOpen(false);
        try {
            const chat = await api.createChat('New Chat', 'chat');
            if (chat?.id) {
                router.push(`/(main)/chat/${chat.id}`);
                loadChats();
            }
        } catch (error: any) {
            showAppDialog({ title: 'Error', message: error?.message || 'Failed to create chat', tone: 'error' });
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

        // Match web: show loader before tokens; show animated thinking label while reasoning streams until final text arrives.
        const showThinking = isStreamingMessage && !contentText.trim();

        return (
            <MessageItem
                id={item.id}
                role={item.role as 'user' | 'assistant'}
                content={contentText}
                reasoning={reasoningText || undefined}
                model={item.model}
                tokensPerSecond={isStreamingMessage ? currentTps : normalizeTokensPerSecond(item.tokensPerSecond)}
                isStreaming={isStreamingMessage}
                isThinking={showThinking}
                createdAt={item.createdAt instanceof Date && !isNaN(item.createdAt.getTime()) ? item.createdAt.toISOString() : undefined}
            />
        );
    };

    const ErrorBanner = () => chatError ? (
        <View style={{
            marginHorizontal: 16,
            marginTop: 12,
            padding: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.35)',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
        }}>
            <Ionicons name="warning-outline" size={18} color="#ef4444" />
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#ef4444', fontSize: 10, fontFamily: FONTS.monoSemiBold, letterSpacing: 1, marginBottom: 4 }}>ERROR</Text>
                <Text style={{ color: COLORS.textPrimary, fontSize: 12, lineHeight: 18, fontFamily: FONTS.mono }}>{chatError}</Text>
            </View>
            <TouchableOpacity onPress={() => setChatError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
        </View>
    ) : null;

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
                onNewChat={handleNewChat}
                currentChatId={id}
            />

            {/* Header - MATCHING HOME SCREEN EXACTLY */}
            <View style={[styles.header, { paddingTop: statusBarHeight + 12 }]}>
                {/* Left: Sidebar + Settings */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Sidebar Toggle */}
                    <TouchableOpacity
                        onPress={() => setIsDrawerOpen(true)}
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
                        <PanelLeftIcon size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* New Chat - collapsed sidebar parity */}
                    <TouchableOpacity
                        onPress={handleNewChat}
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
                        <Ionicons name="add" size={20} color={theme.accent} />
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
                contentContainerStyle={{ paddingTop: 18, paddingBottom: 20 }}
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
                ListFooterComponent={<ErrorBanner />}
            />

            {/* Input */}
            <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                onStop={handleStop}
                isLoading={false}
                isRecording={false}
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
        backgroundColor: COLORS.bgSidebar,
    },
};

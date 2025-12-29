import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import ChatInput from '../../components/ui/ChatInput';
import SuggestionCard, { SUGGESTIONS } from '../../components/ui/SuggestionCard';
import ChatBackground from '../../components/ui/ChatBackground';
import { ModelSelector, AccentColorPicker } from '../../components/ui/ModelSelector';
import Drawer from '../../components/navigation/Drawer';
import { useVoiceRecording, formatDuration } from '../../hooks/useVoiceRecording';
import { useAttachments } from '../../hooks/useAttachments';
import { COLORS, FONTS } from '../../lib/design';

interface ChatItem {
    id: string;
    title: string;
    mode: string;
    createdAt: string;
}

export default function HomeScreen() {
    const theme = useTheme();
    const { user } = useAuthStore();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Hooks
    const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecording();
    const { attachments, pickAttachment, removeAttachment, clearAttachments } = useAttachments();

    // Load chats for drawer
    const loadChats = useCallback(async () => {
        try {
            const response = await api.getChats();
            setChats(response || []);
        } catch { }
    }, []);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

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
                        setInputValue(prev => prev + (prev ? ' ' : '') + result.text);
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

    // Create chat and navigate
    const handleStartChat = async (initialMessage?: string) => {
        const message = initialMessage || inputValue.trim();
        if (!message || isCreating) return;

        setIsCreating(true);
        try {
            const chat = await api.createChat(message.slice(0, 50), 'cracking');

            if (!chat?.id) {
                Alert.alert('Error', 'Failed to create chat: No ID returned');
                return;
            }

            router.push({
                pathname: '/(main)/chat/[id]',
                params: { id: chat.id, initialMessage: message },
            });
            setInputValue('');
            clearAttachments();
            loadChats();
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to create chat');
        } finally {
            setIsCreating(false);
        }
    };

    // Quick new chat (empty)
    const handleNewChat = async () => {
        setIsCreating(true);
        try {
            const chat = await api.createChat('New Chat', 'cracking');
            if (chat?.id) {
                router.push(`/(main)/chat/${chat.id}`);
                loadChats();
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to create chat');
        } finally {
            setIsCreating(false);
        }
    };

    const handleChatPress = (chatId: string) => {
        router.push(`/(main)/chat/${chatId}`);
    };

    const handleSuggestionPress = (suggestion: typeof SUGGESTIONS[0]) => {
        setInputValue(suggestion.subtitle);
    };

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
            {/* Background Pattern - web parity */}
            <ChatBackground />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                {/* Header - Matching Web Layout */}
                {/* Web: LEFT = sidebar toggle + settings, CENTER = empty, RIGHT = model selector + accent toggle */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingTop: statusBarHeight + 12,
                        paddingBottom: 12,
                        // Web: h-14 = 56px, bg-[var(--bg-sidebar)], border-b
                        height: 56 + statusBarHeight + 12,
                        backgroundColor: COLORS.bgSidebar,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                        zIndex: 50,
                    }}
                >
                    {/* Left: Sidebar toggle + Settings - matching web mobile */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Sidebar Toggle - web: w-10 h-10 = 40px */}
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
                            <Ionicons name="menu-outline" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        {/* Settings Button - web: w-10 h-10 */}
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

                    {/* Right: Model Selector + Accent Toggle */}
                    {/* Web: gap-2 (8px) between model selector and color picker */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Interactive Model Selector - matches web ModelSelector.tsx */}
                        <ModelSelector />

                        {/* Interactive Accent Color Picker - matches web */}
                        <AccentColorPicker />
                    </View>
                </View>

                {/* Recording Indicator */}
                {isRecording && (
                    <Animated.View
                        entering={FadeInUp.duration(200)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 12,
                            backgroundColor: COLORS.bgMain,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            marginHorizontal: 16,
                            marginTop: 8,
                        }}
                    >
                        <View style={{ width: 8, height: 8, backgroundColor: '#ef4444', marginRight: 8 }} />
                        <Text style={{ color: COLORS.textPrimary, fontSize: 14, marginRight: 12 }}>
                            Recording {formatDuration(recordingDuration)}
                        </Text>
                        <TouchableOpacity onPress={cancelRecording}>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Main Content */}
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 16,
                        paddingBottom: 20,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Welcome Icon - web: w-16 h-16 = 64px */}
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={{ alignItems: 'center', marginBottom: 24 }}
                    >
                        <View
                            style={{
                                width: 64,
                                height: 64,
                                backgroundColor: `${theme.accent}1A`, // accent/10
                                borderWidth: 1,
                                borderColor: `${theme.accent}4D`, // accent/30
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="sparkles" size={28} color={theme.accent} />
                        </View>
                    </Animated.View>

                    {/* Headline - web: text-2xl = 24px, font-semibold */}
                    <Animated.Text
                        entering={FadeInDown.delay(200).springify()}
                        style={{
                            fontSize: 24,
                            fontWeight: '600',
                            color: COLORS.textPrimary,
                            textAlign: 'center',
                            marginBottom: 8,
                            letterSpacing: -0.5,
                        }}
                    >
                        What can I help with?
                    </Animated.Text>

                    {/* Subheadline - web: text-sm text-secondary */}
                    <Animated.Text
                        entering={FadeInDown.delay(300).springify()}
                        style={{
                            fontSize: 14,
                            color: COLORS.textSecondary,
                            textAlign: 'center',
                            marginBottom: 32,
                        }}
                    >
                        Start a conversation or try one of these suggestions
                    </Animated.Text>

                    {/* Suggestion Cards Grid - web: grid-cols-2 gap-3 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        {SUGGESTIONS.map((suggestion, index) => (
                            <SuggestionCard
                                key={suggestion.title}
                                icon={suggestion.icon}
                                title={suggestion.title}
                                subtitle={suggestion.subtitle}
                                description={suggestion.description}
                                onPress={() => handleSuggestionPress(suggestion)}
                                index={index}
                            />
                        ))}
                    </View>

                    {/* Footer Hint - web: Type anything to start */}
                    <Animated.View
                        entering={FadeIn.delay(500)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginTop: 8,
                        }}
                    >
                        <View style={{ width: 6, height: 6, backgroundColor: theme.accent, opacity: 0.6 }} />
                        <Text
                            style={{
                                fontSize: 10,
                                color: COLORS.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}
                        >
                            Type anything to start
                        </Text>
                        <View style={{ width: 6, height: 6, backgroundColor: theme.accent, opacity: 0.6 }} />
                    </Animated.View>
                </ScrollView>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={{
                            flexDirection: 'row',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            gap: 8,
                        }}
                    >
                        {attachments.map(att => (
                            <View key={att.id} style={{ position: 'relative' }}>
                                {att.type === 'image' ? (
                                    <Image
                                        source={{ uri: att.uri }}
                                        style={{ width: 60, height: 60 }}
                                    />
                                ) : (
                                    <View
                                        style={{
                                            width: 60,
                                            height: 60,
                                            backgroundColor: COLORS.bgMain,
                                            borderWidth: 1,
                                            borderColor: COLORS.border,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="document" size={24} color={COLORS.textSecondary} />
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={() => removeAttachment(att.id)}
                                    style={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        width: 20,
                                        height: 20,
                                        backgroundColor: COLORS.border,
                                        borderWidth: 1,
                                        borderColor: COLORS.borderLight,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="close" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* Bottom Input */}
                <ChatInput
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSend={() => handleStartChat()}
                    onAttachment={pickAttachment}
                    onMic={handleMicPress}
                    isLoading={isCreating || isTranscribing}
                    isRecording={isRecording}
                    placeholder={isRecording ? 'Recording...' : "Let's crack..."}
                />
            </KeyboardAvoidingView>

            {/* Drawer */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                chats={chats}
                onChatPress={handleChatPress}
            />
        </SafeAreaView>
    );
}

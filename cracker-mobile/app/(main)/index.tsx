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
import Drawer from '../../components/navigation/Drawer';
import { useVoiceRecording, formatDuration } from '../../hooks/useVoiceRecording';
import { useAttachments } from '../../hooks/useAttachments';

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
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Hooks
    const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecording();
    const { attachments, pickAttachment, removeAttachment, clearAttachments } = useAttachments();

    // Load chats for drawer
    const loadChats = useCallback(async () => {
        try {
            console.log('[Home] Loading chats...');
            const response = await api.getChats();
            console.log('[Home] Chats loaded:', response?.length || 0);
            setChats(response || []);
        } catch (error: any) {
            console.error('[Home] Failed to load chats:', error);
        }
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
                    console.log('[Home] Transcribing audio...');
                    const result = await api.transcribe(uri, 'gemini');
                    if (result.text) {
                        setInputValue(prev => prev + (prev ? ' ' : '') + result.text);
                    }
                }
            } catch (error: any) {
                console.error('[Home] Transcription failed:', error);
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
            console.log('[Home] Creating chat with message:', message.slice(0, 30));
            const chat = await api.createChat(message.slice(0, 50), 'cracking');
            console.log('[Home] Chat created:', chat);

            if (!chat?.id) {
                Alert.alert('Error', 'Failed to create chat: No ID returned');
                return;
            }

            router.push({
                pathname: `/(main)/chat/${chat.id}`,
                params: { initialMessage: message },
            });
            setInputValue('');
            clearAttachments();
            loadChats();
        } catch (error: any) {
            console.error('[Home] Failed to create chat:', error);
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgMain }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingTop: statusBarHeight + 12,
                        paddingBottom: 12,
                    }}
                >
                    {/* Hamburger Menu - 48px touch target */}
                    <TouchableOpacity
                        onPress={() => setIsDrawerOpen(true)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: '#333',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="menu-outline" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>

                    {/* Center - App Name */}
                    <Text
                        style={{
                            color: theme.textPrimary,
                            fontSize: 18,
                            fontWeight: '600',
                        }}
                    >
                        Cracker
                    </Text>

                    {/* New Chat Button - 48px, prominent */}
                    <TouchableOpacity
                        onPress={handleNewChat}
                        disabled={isCreating}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{
                            width: 48,
                            height: 48,
                            backgroundColor: theme.accent,
                            borderWidth: 1,
                            borderColor: theme.accent,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isCreating ? 0.5 : 1,
                            // Subtle glow
                            shadowColor: theme.accent,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Ionicons name="add" size={26} color="#000" />
                    </TouchableOpacity>
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
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: '#333',
                            marginHorizontal: 16,
                            marginBottom: 8,
                        }}
                    >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171', marginRight: 8 }} />
                        <Text style={{ color: theme.textPrimary, fontSize: 14, marginRight: 12 }}>
                            Recording {formatDuration(recordingDuration)}
                        </Text>
                        <TouchableOpacity onPress={cancelRecording}>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Main Content */}
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 20,
                        paddingBottom: 20,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo Icon */}
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={{ alignItems: 'center', marginBottom: 20 }}
                    >
                        <View
                            style={{
                                width: 56,
                                height: 56,
                                backgroundColor: '#111',
                                borderWidth: 1,
                                borderColor: '#333',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="sparkles" size={26} color={theme.accent} />
                        </View>
                    </Animated.View>

                    {/* Headline */}
                    <Animated.Text
                        entering={FadeInDown.delay(200).springify()}
                        style={{
                            fontSize: 26,
                            fontWeight: '300',
                            color: theme.textPrimary,
                            textAlign: 'center',
                            marginBottom: 8,
                        }}
                    >
                        What can I help with?
                    </Animated.Text>

                    {/* Subheadline */}
                    <Animated.Text
                        entering={FadeInDown.delay(300).springify()}
                        style={{
                            fontSize: 14,
                            color: theme.textSecondary,
                            textAlign: 'center',
                            marginBottom: 28,
                        }}
                    >
                        Start a conversation or try a suggestion
                    </Animated.Text>

                    {/* Suggestion Cards Grid */}
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 10,
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
                                            backgroundColor: '#1a1a1a',
                                            borderWidth: 1,
                                            borderColor: '#333',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="document" size={24} color="#666" />
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
                                        backgroundColor: '#333',
                                        borderWidth: 1,
                                        borderColor: '#444',
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

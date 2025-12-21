import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { ChatListSkeleton } from '../../components/ui/Skeleton';
import ChatInput from '../../components/ui/ChatInput';

interface ChatItem {
    id: string;
    title: string;
    mode: string;
    createdAt: string;
}

// Group chats by time
function groupChatsByTime(chats: ChatItem[]) {
    const now = new Date();
    const groups: { label: string; chats: ChatItem[] }[] = [];
    const today: ChatItem[] = [];
    const yesterday: ChatItem[] = [];
    const thisWeek: ChatItem[] = [];
    const older: ChatItem[] = [];

    chats.forEach(chat => {
        const date = new Date(chat.createdAt);
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) today.push(chat);
        else if (diffDays === 1) yesterday.push(chat);
        else if (diffDays < 7) thisWeek.push(chat);
        else older.push(chat);
    });

    if (today.length) groups.push({ label: 'Today', chats: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', chats: yesterday });
    if (thisWeek.length) groups.push({ label: 'This Week', chats: thisWeek });
    if (older.length) groups.push({ label: 'Older', chats: older });

    return groups;
}

export default function ChatListScreen() {
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const theme = useTheme();
    const { user, logout } = useAuthStore();

    const loadChats = useCallback(async () => {
        try {
            const data = await api.getChats();
            setChats(data);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    const handleStartChat = async () => {
        if (!inputValue.trim() || isCreating) return;

        setIsCreating(true);
        try {
            const { id } = await api.createChat('New Chat', 'chat');
            // Navigate to chat and pass the initial message
            router.push({
                pathname: '/(main)/chat/[id]',
                params: { id, initialMessage: inputValue.trim() }
            });
            setInputValue('');
        } catch (error) {
            console.error('Failed to create chat:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleNewChat = async () => {
        try {
            const { id } = await api.createChat('New Chat', 'chat');
            router.push(`/(main)/chat/${id}`);
        } catch (error) {
            console.error('Failed to create chat:', error);
        }
    };

    const handleChatPress = (chatId: string) => {
        router.push(`/(main)/chat/${chatId}`);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadChats();
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const getUserDisplayName = () => {
        if (user?.email) return user.email.split('@')[0];
        if (user?.loginName) return user.loginName;
        return 'Guest';
    };

    const chatGroups = groupChatsByTime(chats);

    // Show skeleton while loading
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.bgMain }}>
                <View style={styles.header(theme)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.logoBox(theme)}>
                            <Ionicons name="sparkles" size={16} color={theme.accent} />
                        </View>
                        <Text style={styles.logoText(theme)}>Cracker</Text>
                    </View>
                </View>
                <ChatListSkeleton />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.bgMain }}
        >
            {/* Header - Cracker Style */}
            <View style={styles.header(theme)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.logoBox(theme)}>
                        <Ionicons name="sparkles" size={16} color={theme.accent} />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.logoText(theme)}>Cracker</Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                            {getUserDisplayName()}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(main)/settings')}
                        style={styles.headerButton(theme)}
                    >
                        <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.headerButton(theme)}>
                        <Ionicons name="log-out-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity
                onPress={handleNewChat}
                activeOpacity={0.7}
                style={{
                    marginHorizontal: 16,
                    marginTop: 12,
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <Ionicons name="add" size={18} color={theme.accent} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: 1 }}>
                    New Chat
                </Text>
            </TouchableOpacity>

            {/* Chat List or Empty State */}
            {chats.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
                        <View style={{
                            width: 64,
                            height: 64,
                            backgroundColor: `${theme.accent}15`,
                            borderWidth: 2,
                            borderColor: `${theme.accent}40`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                        }}>
                            <Ionicons name="chatbubbles-outline" size={28} color={theme.accent} />
                        </View>
                        <Text style={{ fontSize: 16, color: theme.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                            No conversations yet
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
                            Start typing below to begin
                        </Text>
                    </Animated.View>
                </View>
            ) : (
                <FlatList
                    data={chatGroups}
                    keyExtractor={(item) => item.label}
                    renderItem={({ item: group }) => (
                        <View style={{ marginTop: 16 }}>
                            <Text style={{
                                fontSize: 10,
                                fontWeight: '600',
                                color: theme.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                                paddingHorizontal: 16,
                                marginBottom: 8,
                            }}>
                                {group.label}
                            </Text>
                            {group.chats.map((chat, index) => (
                                <Animated.View key={chat.id} entering={FadeInRight.duration(200).delay(index * 30)}>
                                    <TouchableOpacity
                                        onPress={() => handleChatPress(chat.id)}
                                        activeOpacity={0.7}
                                        style={{
                                            marginHorizontal: 16,
                                            marginBottom: 4,
                                            backgroundColor: '#1a1a1a',
                                            borderWidth: 1,
                                            borderColor: theme.border,
                                            padding: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
                                        <Text
                                            style={{ flex: 1, marginLeft: 12, fontSize: 14, color: theme.textPrimary }}
                                            numberOfLines={1}
                                        >
                                            {chat.title || 'Untitled Chat'}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                            ({new Date(chat.createdAt).toLocaleDateString()})
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={theme.accent}
                        />
                    }
                />
            )}

            {/* Chat Input at Bottom */}
            <ChatInput
                value={inputValue}
                onChangeText={setInputValue}
                onSend={handleStartChat}
                isLoading={isCreating}
                placeholder="Let's crack..."
            />
        </KeyboardAvoidingView>
    );
}

const styles = {
    header: (theme: any) => ({
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    }),
    logoBox: (theme: any) => ({
        width: 36,
        height: 36,
        backgroundColor: `${theme.accent}15`,
        borderWidth: 1,
        borderColor: theme.accent,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    }),
    logoText: (theme: any) => ({
        fontSize: 18,
        fontWeight: '700' as const,
        color: theme.textPrimary,
    }),
    headerButton: (theme: any) => ({
        width: 36,
        height: 36,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: theme.border,
    }),
};

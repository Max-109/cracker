import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
    Pressable,
    RefreshControl,
    Modal,
    TextInput,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    FadeOut,
    LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import { FONTS } from '../../lib/design';
import { api } from '../../lib/api';
import { showAppDialog } from '../ui/AppDialog';
import Skeleton from '../ui/Skeleton';

// Web colors from globals.css - EXACT values
const COLORS = {
    bgMain: '#1a1a1a',
    bgSidebarSolid: '#141414',
    bgInput: '#1e1e1e',
    bgHover: '#252525',
    textPrimary: '#FFFFFF',
    textSecondary: '#555555',
    borderColor: '#333333',
    sidebarPrimary: '#1f1f1f',
};

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;
const ANIMATION_DURATION = 250;

interface ChatItem {
    id: string;
    title: string;
    createdAt: string;
    mode?: string;
}

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    chats: ChatItem[];
    onChatPress: (id: string) => void;
    onNewChat?: () => void;
    currentChatId?: string | null;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    onChatsChanged?: () => void | Promise<void>;
    onChatDeleted?: (id: string) => void;
}

// Time grouping function - EXACT copy from web Sidebar.tsx
function ChatDrawerSkeleton({ estimatedCount = 6 }: { estimatedCount?: number }) {
    return (
        <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 12 }}>
            {Array.from({ length: Math.max(2, Math.min(Math.ceil(estimatedCount / 2), 4)) }).map((_, item) => (
                <View key={item} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, paddingVertical: 8 }}>
                        <Skeleton width={12} height={12} borderRadius={0} />
                        <Skeleton width={92} height={10} borderRadius={0} />
                    </View>
                    {[0, 1].map((row) => (
                        <View
                            key={row}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 10,
                                paddingHorizontal: 2,
                                marginBottom: 2,
                                borderLeftWidth: 2,
                                borderLeftColor: COLORS.borderColor,
                            }}
                        >
                            <Skeleton width={24} height={24} borderRadius={0} style={{ marginRight: 10 }} />
                            <Skeleton width={row === 0 ? '72%' : '54%'} height={13} borderRadius={0} />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

function groupChatsByDate(chats: ChatItem[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const sorted = [...chats].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const groups: { label: string; chats: ChatItem[], order: number }[] = [];
    const groupMap = new Map<string, { label: string; chats: ChatItem[], order: number }>();

    sorted.forEach(chat => {
        const chatDate = new Date(chat.createdAt);
        let label = '';
        let order = 0;

        if (chatDate >= todayStart) {
            const diffMs = now.getTime() - chatDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins === 0) {
                label = 'Just now';
                order = 100;
            } else if (diffMins < 60) {
                label = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
                order = 90 - diffMins;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours === 1) label = '1 hour ago';
                else label = `${diffHours} hours ago`;
                order = 50 - diffHours;
            }
        } else if (chatDate >= yesterdayStart) {
            label = chatDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            order = 10;
        } else {
            label = chatDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            order = 0;
        }

        if (!groupMap.has(label)) {
            const group = { label, chats: [] as ChatItem[], order };
            groupMap.set(label, group);
            groups.push(group);
        }
        groupMap.get(label)!.chats.push(chat);
    });

    return groups;
}

export default function Drawer({
    isOpen,
    onClose,
    chats,
    onChatPress,
    onNewChat,
    currentChatId,
    isRefreshing = false,
    onRefresh,
    onChatsChanged,
    onChatDeleted,
}: DrawerProps) {
    const theme = useTheme();
    const { user, logout } = useAuthStore();
    const isAdmin = user?.isAdmin === true;

    const translateX = useSharedValue(-DRAWER_WIDTH);
    const overlayOpacity = useSharedValue(0);

    const [actionChat, setActionChat] = useState<ChatItem | null>(null);
    const [renameChat, setRenameChat] = useState<ChatItem | null>(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [animatingDeleteId, setAnimatingDeleteId] = useState<string | null>(null);
    const [animatingRenameId, setAnimatingRenameId] = useState<string | null>(null);

    // Group chats by time
    const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

    useEffect(() => {
        if (isOpen) {
            translateX.value = withTiming(0, {
                duration: ANIMATION_DURATION,
                easing: Easing.out(Easing.cubic),
            });
            overlayOpacity.value = withTiming(0.5, {
                duration: ANIMATION_DURATION,
            });
        } else {
            translateX.value = withTiming(-DRAWER_WIDTH, {
                duration: ANIMATION_DURATION,
                easing: Easing.in(Easing.cubic),
            });
            overlayOpacity.value = withTiming(0, {
                duration: ANIMATION_DURATION,
            });
        }
    }, [isOpen]);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const handleLogout = useCallback(async () => {
        onClose();
        await logout();
        router.replace('/(auth)/login');
    }, [logout, onClose]);

    const refreshAfterMutation = useCallback(async () => {
        try {
            await onChatsChanged?.();
        } catch { }
    }, [onChatsChanged]);

    const openRenameDialog = useCallback((chat: ChatItem) => {
        setActionChat(null);
        setRenameChat(chat);
        setRenameTitle(chat.title || 'New Chat');
    }, []);

    const handleRename = useCallback(async () => {
        if (!renameChat) return;
        const nextTitle = renameTitle.trim();
        if (!nextTitle) return;

        const chatId = renameChat.id;
        setRenameChat(null);
        setAnimatingRenameId(chatId);
        try {
            await api.updateChatTitle(chatId, nextTitle);
            await refreshAfterMutation();
        } catch (error: any) {
            showAppDialog({ title: 'Rename Failed', message: error?.message || 'Could not rename this chat.', tone: 'error' });
        } finally {
            setTimeout(() => setAnimatingRenameId(null), 520);
        }
    }, [renameChat, renameTitle, refreshAfterMutation]);

    const handleDelete = useCallback(async (chat: ChatItem) => {
        const chatId = chat.id;
        setActionChat(null);
        setAnimatingDeleteId(chatId);
        try {
            await new Promise(resolve => setTimeout(resolve, 260));
            await api.deleteChat(chatId);
            await refreshAfterMutation();
            onChatDeleted?.(chatId);
        } catch (error: any) {
            setAnimatingDeleteId(null);
            showAppDialog({ title: 'Delete Failed', message: error?.message || 'Could not delete this chat.', tone: 'error' });
        }
    }, [onChatDeleted, refreshAfterMutation]);

    const getUserName = () => {
        // Use name from profile API (fetched by auth store)
        if (user?.name) return user.name;
        // Fallback to email prefix
        if (user?.email) return user.email.split('@')[0];
        return 'Guest';
    };

    const getUserInitials = () => {
        const name = getUserName();
        return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    };

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47;

    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
            }}
            pointerEvents={isOpen ? 'auto' : 'none'}
        >
            {/* Overlay */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#000',
                    },
                    overlayStyle,
                ]}
            >
                <Pressable style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            {/* Drawer Panel */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: DRAWER_WIDTH,
                        backgroundColor: COLORS.bgSidebarSolid,
                        borderRightWidth: 1,
                        borderRightColor: COLORS.borderColor,
                    },
                    drawerStyle,
                ]}
            >
                {/* Top spacing for status bar */}
                <View style={{ paddingTop: statusBarHeight }} />

                <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                    <TouchableOpacity
                        onPress={() => {
                            onClose();
                            onNewChat?.();
                        }}
                        activeOpacity={0.75}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingVertical: 11,
                            paddingHorizontal: 10,
                            borderWidth: 1,
                            borderColor: COLORS.borderColor,
                            backgroundColor: COLORS.bgMain,
                        }}
                    >
                        <View style={{
                            width: 24,
                            height: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: theme.accent,
                            backgroundColor: `${theme.accent}18`,
                        }}>
                            <Ionicons name="add" size={16} color={theme.accent} />
                        </View>
                        <Text style={{
                            color: COLORS.textPrimary,
                            fontSize: 12,
                            fontFamily: FONTS.mono,
                            fontWeight: '600',
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                        }}>
                            New Chat
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scrollable Chat List with Time Groups */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={onRefresh ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.accent}
                            colors={[theme.accent]}
                            progressBackgroundColor={COLORS.bgMain}
                        />
                    ) : undefined}
                >
                    {isRefreshing && chats.length === 0 ? <ChatDrawerSkeleton estimatedCount={6} /> : null}

                    {groupedChats.map(({ label, chats: groupChats }) => (
                        groupChats.length > 0 && (
                            <View key={label} style={{ marginBottom: 12 }}>
                                {/* Group Header - web: gap-2, px-2 py-2 */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    gap: 8,
                                }}>
                                    {/* Clock icon - web: size={10}, text-[var(--text-accent)] */}
                                    <Ionicons name="time-outline" size={12} color={theme.accent} />
                                    {/* Label - web: text-[10px] font-semibold uppercase tracking-[0.14em] text-primary */}
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1.4,
                                        color: COLORS.textPrimary,
                                        fontFamily: FONTS.mono,
                                    }}>
                                        {label}
                                    </Text>
                                    {/* Count - web: text-[9px] text-accent opacity-70 */}
                                    <Text style={{
                                        fontSize: 10,
                                        color: theme.accent,
                                        opacity: 0.7,
                                        fontFamily: FONTS.mono,
                                    }}>
                                        ({groupChats.length})
                                    </Text>
                                </View>

                                {/* Chat Items in this group */}
                                {groupChats.map((chat) => {
                                    const isSelected = currentChatId === chat.id;
                                    const isDeleting = animatingDeleteId === chat.id;
                                    const isRenaming = animatingRenameId === chat.id;

                                    return (
                                        <Animated.View
                                            key={chat.id}
                                            layout={LinearTransition.duration(180)}
                                            exiting={FadeOut.duration(180)}
                                            style={{
                                                opacity: isDeleting ? 0.25 : 1,
                                                transform: [{ translateX: isDeleting ? -18 : 0 }, { scale: isRenaming ? 1.02 : 1 }],
                                            }}
                                        >
                                            <TouchableOpacity
                                                onPress={() => {
                                                    onClose();
                                                    onChatPress(chat.id);
                                                }}
                                                onLongPress={() => setActionChat(chat)}
                                                delayLongPress={320}
                                                activeOpacity={0.7}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 10,
                                                    marginHorizontal: 8,
                                                    marginBottom: 2,
                                                    // Web: border-l-2 for selected
                                                    borderLeftWidth: 2,
                                                    borderLeftColor: isSelected || isRenaming ? theme.accent : `${theme.accent}66`,
                                                    backgroundColor: isSelected ? `${theme.accent}1A` : isRenaming ? `${theme.accent}14` : 'transparent',
                                                }}
                                            >
                                                {/* Icon box - web: w-6 h-6 = 24px */}
                                                <View
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderWidth: 1,
                                                        backgroundColor: isSelected ? theme.accent : COLORS.bgMain,
                                                        borderColor: isSelected || isRenaming ? theme.accent : COLORS.borderColor,
                                                        marginRight: 10,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={
                                                            chat.mode === 'deep-search'
                                                                ? 'search'
                                                                : chat.mode === 'learning'
                                                                    ? 'school'
                                                                    : 'chatbubble-outline'
                                                        }
                                                        size={12}
                                                        color={isSelected ? '#000' : COLORS.textSecondary}
                                                    />
                                                </View>
                                                {/* Title - web: text-xs truncate */}
                                                <Text
                                                    style={{
                                                        flex: 1,
                                                        fontSize: 13,
                                                        fontFamily: FONTS.mono,
                                                        color: isSelected || isRenaming ? theme.accent : COLORS.textSecondary,
                                                        fontWeight: isSelected ? '500' : '400',
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {chat.title || 'New Chat'}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )
                    ))}

                    {!isRefreshing && chats.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textSecondary} />
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 16, fontFamily: FONTS.mono }}>
                                No conversations yet
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <Modal visible={!!actionChat} transparent animationType="fade" onRequestClose={() => setActionChat(null)}>
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 }} onPress={() => setActionChat(null)}>
                        <Pressable style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.bgSidebarSolid, borderWidth: 1, borderColor: COLORS.borderColor }}>
                            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor }}>
                                <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Chat Actions</Text>
                                <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.mono, fontSize: 12, marginTop: 8 }} numberOfLines={2}>{actionChat?.title || 'New Chat'}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => actionChat && openRenameDialog(actionChat)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor }}
                            >
                                <Ionicons name="create-outline" size={17} color={theme.accent} />
                                <Text style={{ color: theme.accent, fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Rename</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => actionChat && handleDelete(actionChat)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
                            >
                                <Ionicons name="trash-outline" size={17} color="#ef4444" />
                                <Text style={{ color: '#ef4444', fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Delete</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>

                <Modal visible={!!renameChat} transparent animationType="fade" onRequestClose={() => setRenameChat(null)}>
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 }} onPress={() => setRenameChat(null)}>
                        <Pressable style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.bgSidebarSolid, borderWidth: 1, borderColor: COLORS.borderColor }}>
                            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor }}>
                                <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Rename Chat</Text>
                            </View>
                            <View style={{ padding: 14 }}>
                                <TextInput
                                    value={renameTitle}
                                    onChangeText={setRenameTitle}
                                    autoFocus
                                    selectionColor={theme.accent}
                                    placeholder="Chat title"
                                    placeholderTextColor={COLORS.textSecondary}
                                    style={{ color: COLORS.textPrimary, fontFamily: FONTS.mono, fontSize: 13, borderWidth: 1, borderColor: COLORS.borderColor, backgroundColor: COLORS.bgMain, paddingVertical: 11, paddingHorizontal: 12 }}
                                />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.borderColor }}>
                                <TouchableOpacity onPress={() => setRenameChat(null)} style={{ borderWidth: 1, borderColor: COLORS.borderColor, paddingVertical: 9, paddingHorizontal: 12 }}>
                                    <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleRename} style={{ borderWidth: 1, borderColor: theme.accent, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: `${theme.accent}10` }}>
                                    <Text style={{ color: theme.accent, fontFamily: FONTS.mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Footer - User Info + Branding */}
                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: COLORS.borderColor,
                        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                        backgroundColor: COLORS.bgSidebarSolid,
                    }}
                >
                    {/* User Profile Section - web: px-2 py-2 */}
                    <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
                        {/* User Info Row - web: gap-2 */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            {/* Avatar - web: w-8 h-8 = 32px */}
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: COLORS.bgMain,
                                    borderWidth: 1,
                                    borderColor: COLORS.borderColor,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}
                            >
                                <Text
                                    style={{
                                        color: theme.accent,
                                        fontSize: 11,
                                        fontWeight: '600',
                                        fontFamily: FONTS.mono,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    {getUserInitials()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                {/* Name with ADMIN badge - web: text-[11px] font-semibold */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text
                                        style={{
                                            color: COLORS.textPrimary,
                                            fontSize: 12,
                                            fontWeight: '600',
                                            fontFamily: FONTS.mono,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {getUserName()}
                                    </Text>
                                    {isAdmin && (
                                        <View style={{
                                            paddingHorizontal: 4,
                                            paddingVertical: 2,
                                            backgroundColor: `${theme.accent}26`,
                                            borderWidth: 1,
                                            borderColor: `${theme.accent}4D`,
                                        }}>
                                            <Text style={{
                                                fontSize: 8,
                                                fontWeight: '700',
                                                color: theme.accent,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.8,
                                                fontFamily: FONTS.mono,
                                            }}>
                                                Admin
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {/* Email - web: text-[9px] text-secondary */}
                                <Text
                                    style={{
                                        color: COLORS.textSecondary,
                                        fontSize: 10,
                                        marginTop: 2,
                                        fontFamily: FONTS.mono,
                                    }}
                                    numberOfLines={1}
                                >
                                    {user?.email || ''}
                                </Text>
                            </View>
                        </View>

                        {/* Action Buttons - web: flex gap-1 */}
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {isAdmin && (
                                <TouchableOpacity
                                    onPress={() => {
                                        onClose();
                                        // Navigate to admin dashboard if exists
                                    }}
                                    activeOpacity={0.7}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 8,
                                        borderWidth: 1,
                                        borderColor: COLORS.borderColor,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: COLORS.textSecondary,
                                            fontSize: 10,
                                            fontWeight: '600',
                                            fontFamily: FONTS.mono,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.8,
                                        }}
                                    >
                                        Dashboard
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleLogout}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    paddingVertical: 8,
                                    borderWidth: 1,
                                    borderColor: COLORS.borderColor,
                                }}
                            >
                                <Ionicons name="log-out-outline" size={12} color={COLORS.textSecondary} />
                                <Text
                                    style={{
                                        color: COLORS.textSecondary,
                                        fontSize: 10,
                                        fontWeight: '600',
                                        fontFamily: FONTS.mono,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.8,
                                    }}
                                >
                                    Logout
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>


                </View>
            </Animated.View>
        </View>
    );
}

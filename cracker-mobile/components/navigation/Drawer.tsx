import React, { useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import { FONTS } from '../../lib/design';

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
}

// Time grouping function - EXACT copy from web Sidebar.tsx
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
}: DrawerProps) {
    const theme = useTheme();
    const { user, logout } = useAuthStore();
    const isAdmin = (user as any)?.user_metadata?.is_admin === true;

    const translateX = useSharedValue(-DRAWER_WIDTH);
    const overlayOpacity = useSharedValue(0);

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

    const handleNewChat = useCallback(() => {
        onClose();
        onNewChat?.();
    }, [onClose, onNewChat]);

    const getUserName = () => {
        const metadata = (user as any)?.user_metadata;
        if (metadata?.display_name) return metadata.display_name;
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
                {/* NEW CHAT Button - Top - web: px-2 py-2, gap-2.5 */}
                <View style={{ paddingTop: statusBarHeight, paddingHorizontal: 8, paddingBottom: 8 }}>
                    <TouchableOpacity
                        onPress={handleNewChat}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 10,
                            backgroundColor: COLORS.bgSidebarSolid,
                            borderWidth: 1,
                            borderColor: COLORS.borderColor,
                        }}
                    >
                        {/* Icon box - web: w-7 h-7 = 28px */}
                        <View
                            style={{
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: COLORS.bgMain,
                                borderWidth: 1,
                                borderColor: COLORS.borderColor,
                                marginRight: 10,
                            }}
                        >
                            <Ionicons name="sparkles" size={14} color={theme.accent} />
                        </View>
                        <Text
                            style={{
                                color: COLORS.textPrimary,
                                fontSize: 12,
                                fontWeight: '600',
                                fontFamily: FONTS.mono,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                            }}
                        >
                            New Chat
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scrollable Chat List with Time Groups */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
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

                                    return (
                                        <TouchableOpacity
                                            key={chat.id}
                                            onPress={() => {
                                                onClose();
                                                onChatPress(chat.id);
                                            }}
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
                                                borderLeftColor: isSelected ? theme.accent : 'transparent',
                                                backgroundColor: isSelected ? `${theme.accent}1A` : 'transparent',
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
                                                    borderColor: isSelected ? theme.accent : COLORS.borderColor,
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
                                                    color: isSelected ? theme.accent : COLORS.textSecondary,
                                                    fontWeight: isSelected ? '500' : '400',
                                                }}
                                                numberOfLines={1}
                                            >
                                                {chat.title || 'New Chat'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )
                    ))}

                    {chats.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textSecondary} />
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 16, fontFamily: FONTS.mono }}>
                                No conversations yet
                            </Text>
                        </View>
                    )}
                </ScrollView>

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

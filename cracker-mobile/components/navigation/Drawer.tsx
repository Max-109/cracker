import React, { useCallback, useEffect } from 'react';
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
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85;
const ANIMATION_DURATION = 250;

interface ChatItem {
    id: string;
    title: string;
    createdAt: string;
}

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    chats: ChatItem[];
    onChatPress: (id: string) => void;
}

// Group chats by relative time
function groupChatsByTime(chats: ChatItem[]) {
    const now = new Date();
    const groups: { [key: string]: ChatItem[] } = {};

    chats.forEach((chat) => {
        const date = new Date(chat.createdAt);
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let groupKey: string;
        if (minutes < 60) {
            groupKey = `${minutes}m ago`;
        } else if (hours < 24) {
            groupKey = `${hours}h ago`;
        } else if (days === 1) {
            groupKey = 'Yesterday';
        } else if (days < 7) {
            groupKey = `${days}d ago`;
        } else {
            groupKey = date.toLocaleDateString();
        }

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(chat);
    });

    return groups;
}

export default function Drawer({
    isOpen,
    onClose,
    chats,
    onChatPress,
}: DrawerProps) {
    const theme = useTheme();
    const { user, logout } = useAuthStore();

    const translateX = useSharedValue(-DRAWER_WIDTH);
    const overlayOpacity = useSharedValue(0);

    useEffect(() => {
        if (isOpen) {
            translateX.value = withTiming(0, {
                duration: ANIMATION_DURATION,
                easing: Easing.out(Easing.cubic),
            });
            overlayOpacity.value = withTiming(0.6, {
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

    const groupedChats = groupChatsByTime(chats);

    const handleLogout = useCallback(async () => {
        onClose();
        await logout();
        router.replace('/(auth)/login');
    }, [logout, onClose]);

    const getUserName = () => {
        const metadata = (user as any)?.user_metadata;
        if (metadata?.display_name) return metadata.display_name;
        if (user?.email) return user.email.split('@')[0];
        return 'Guest';
    };

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

    if (!isOpen && translateX.value === -DRAWER_WIDTH) return null;

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
                        backgroundColor: '#0a0a0a',
                        borderRightWidth: 1,
                        borderRightColor: '#222',
                    },
                    drawerStyle,
                ]}
            >
                {/* Header */}
                <View
                    style={{
                        paddingTop: statusBarHeight + 8,
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#222',
                    }}
                >
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: theme.textPrimary,
                        }}
                    >
                        Chat History
                    </Text>
                </View>

                {/* Chat List */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.entries(groupedChats).map(([timeGroup, groupChats]) => (
                        <View key={timeGroup} style={{ marginBottom: 20 }}>
                            {/* Time Group Header */}
                            <Text
                                style={{
                                    color: theme.textSecondary,
                                    fontSize: 11,
                                    fontWeight: '600',
                                    letterSpacing: 0.5,
                                    marginBottom: 8,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {timeGroup}
                            </Text>

                            {/* Chat Items */}
                            {groupChats.map((chat) => (
                                <TouchableOpacity
                                    key={chat.id}
                                    onPress={() => {
                                        onClose();
                                        onChatPress(chat.id);
                                    }}
                                    activeOpacity={0.6}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        paddingHorizontal: 12,
                                        backgroundColor: '#111',
                                        borderWidth: 1,
                                        borderColor: '#222',
                                        marginBottom: 6,
                                    }}
                                >
                                    <Ionicons
                                        name="chatbubble-outline"
                                        size={16}
                                        color="#666"
                                        style={{ marginRight: 12 }}
                                    />
                                    <Text
                                        style={{
                                            color: theme.textPrimary,
                                            fontSize: 14,
                                            flex: 1,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {chat.title || 'Untitled'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}

                    {chats.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Ionicons name="chatbubbles-outline" size={32} color="#444" />
                            <Text style={{ color: '#666', fontSize: 13, marginTop: 12 }}>
                                No chat history yet
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* User Section */}
                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: '#222',
                        padding: 16,
                        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                backgroundColor: theme.accent,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}
                        >
                            <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
                                {getUserName().charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>
                                {getUserName()}
                            </Text>
                            <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                                {user?.email || 'Guest'}
                            </Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                router.push('/(main)/settings');
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: '#1a1a1a',
                                borderWidth: 1,
                                borderColor: '#333',
                                paddingVertical: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Ionicons name="settings-outline" size={14} color="#888" />
                            <Text style={{ color: '#888', fontSize: 12, fontWeight: '500' }}>
                                Settings
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogout}
                            style={{
                                flex: 1,
                                backgroundColor: '#1a1a1a',
                                borderWidth: 1,
                                borderColor: '#333',
                                paddingVertical: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Ionicons name="log-out-outline" size={14} color="#888" />
                            <Text style={{ color: '#888', fontSize: 12, fontWeight: '500' }}>
                                Log out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

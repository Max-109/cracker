import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    style?: any;
    borderRadius?: number;
}

export default function Skeleton({ width = '100%', height = 16, style, borderRadius = 2 }: SkeletonProps) {
    const theme = useTheme();
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 0.3 + shimmer.value * 0.4,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: typeof width === 'number' ? width : undefined,
                    height,
                    backgroundColor: theme.border,
                    borderRadius,
                },
                typeof width === 'string' && { width: width as any },
                animatedStyle,
                style,
            ]}
        />
    );
}

// Chat list skeleton
export function ChatListSkeleton() {
    return (
        <View style={{ padding: 16, gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.chatItem}>
                    <View style={styles.chatContent}>
                        <Skeleton width="70%" height={18} />
                        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
                    </View>
                    <Skeleton width={50} height={24} />
                </View>
            ))}
        </View>
    );
}

// Message skeleton
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <View style={[styles.message, isUser && styles.userMessage]}>
            <Skeleton width="90%" height={16} />
            <Skeleton width="75%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
        </View>
    );
}

// Settings section skeleton
export function SettingsSkeleton() {
    return (
        <View style={{ padding: 16, gap: 16 }}>
            {[1, 2, 3].map((i) => (
                <View key={i}>
                    <Skeleton width={80} height={10} style={{ marginBottom: 12 }} />
                    <View style={styles.settingsBox}>
                        <Skeleton width="50%" height={14} />
                        <Skeleton width={48} height={28} />
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    chatItem: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatContent: {
        flex: 1,
        marginRight: 16,
    },
    message: {
        padding: 16,
        marginVertical: 4,
    },
    userMessage: {
        alignItems: 'flex-end',
    },
    settingsBox: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});

import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface ConnectionIndicatorProps {
    isOnline?: boolean;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Connection Indicator - Shows online/offline status
 * Simplified version without NetInfo dependency
 */
export default function ConnectionIndicator({
    isOnline = true,
    showLabel = true,
    size = 'md',
}: ConnectionIndicatorProps) {
    const theme = useTheme();
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        if (isOnline) {
            pulseOpacity.value = withRepeat(
                withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        }
    }, [isOnline]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: isOnline ? pulseOpacity.value : 1,
    }));

    const dotSize = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
    const fontSize = size === 'sm' ? 9 : size === 'md' ? 10 : 12;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Animated.View
                style={[
                    {
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: isOnline ? '#4ade80' : COLORS.error,
                    },
                    pulseStyle,
                ]}
            />
            {showLabel && (
                <Text
                    style={{
                        color: isOnline ? '#4ade80' : COLORS.error,
                        fontSize,
                        fontFamily: FONTS.mono,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}
                >
                    {isOnline ? 'Online' : 'Offline'}
                </Text>
            )}
        </View>
    );
}

/**
 * Streaming indicator - shows data is being received
 */
export function StreamingIndicator({ tps }: { tps?: number }) {
    const theme = useTheme();
    const barWidth = useSharedValue(0);

    useEffect(() => {
        barWidth.value = withRepeat(
            withTiming(100, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const barStyle = useAnimatedStyle(() => ({
        width: `${barWidth.value}%`,
    }));

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Streaming bar */}
            <View
                style={{
                    width: 40,
                    height: 3,
                    backgroundColor: COLORS.border,
                    overflow: 'hidden',
                }}
            >
                <Animated.View
                    style={[
                        {
                            height: '100%',
                            backgroundColor: theme.accent,
                        },
                        barStyle,
                    ]}
                />
            </View>

            {/* TPS counter */}
            {tps !== undefined && (
                <Text
                    style={{
                        color: COLORS.textSecondary,
                        fontSize: 10,
                        fontFamily: FONTS.mono,
                        letterSpacing: 0.5,
                    }}
                >
                    {tps.toFixed(1)} TPS
                </Text>
            )}
        </View>
    );
}

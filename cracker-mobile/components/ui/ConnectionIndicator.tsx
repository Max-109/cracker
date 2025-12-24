import React, { useEffect, useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
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

/**
 * AnimatedDot - Single dot with independent random blink animation
 */
function AnimatedDot({ duration, delay, color }: { duration: number; delay: number; color: string }) {
    const opacity = useSharedValue(0.15);

    useEffect(() => {
        // Start the animation after the specified delay
        const timeout = setTimeout(() => {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: duration * 500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.15, { duration: duration * 500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
        }, Math.abs(delay) * 1000);

        return () => clearTimeout(timeout);
    }, [duration, delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: 4,
                    height: 4,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
}

/**
 * DotGridIndicator - 4x4 grid of 16 dots with random blink animation
 * Matches web's LoadingIndicator exactly
 * Uses explicit rows for proper React Native layout
 */
export function DotGridIndicator() {
    const theme = useTheme();

    // Generate 16 dots with random timing (computed once)
    const dots = useMemo(() => {
        return Array.from({ length: 16 }).map(() => ({
            duration: 3 + Math.random() * 3, // 3-6 seconds
            delay: Math.random() * 3, // 0-3 seconds delay
        }));
    }, []);

    // Split dots into 4 rows of 4
    const rows = [
        dots.slice(0, 4),
        dots.slice(4, 8),
        dots.slice(8, 12),
        dots.slice(12, 16),
    ];

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: `${theme.accent}40`,
                padding: 3,
                backgroundColor: '#0a0a0a',
            }}
        >
            {rows.map((row, rowIndex) => (
                <View
                    key={rowIndex}
                    style={{
                        flexDirection: 'row',
                        marginBottom: rowIndex < 3 ? 2 : 0,
                    }}
                >
                    {row.map((dot, colIndex) => (
                        <View
                            key={colIndex}
                            style={{ marginRight: colIndex < 3 ? 2 : 0 }}
                        >
                            <AnimatedDot
                                duration={dot.duration}
                                delay={dot.delay}
                                color={theme.accent}
                            />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

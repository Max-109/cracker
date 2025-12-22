import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface ThinkingIndicatorProps {
    isThinking?: boolean;
    label?: string;
}

/**
 * ThinkingIndicator - Shows AI is processing
 * Matches web's "ANALYZING" box with animated dots
 */
export default function ThinkingIndicator({
    isThinking = true,
    label = 'ANALYZING',
}: ThinkingIndicatorProps) {
    const theme = useTheme();

    // Animation for dots
    const dot1Opacity = useSharedValue(0.3);
    const dot2Opacity = useSharedValue(0.3);
    const dot3Opacity = useSharedValue(0.3);

    useEffect(() => {
        if (!isThinking) return;

        dot1Opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        dot2Opacity.value = withDelay(
            150,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            )
        );

        dot3Opacity.value = withDelay(
            300,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            )
        );
    }, [isThinking]);

    const dot1Style = useAnimatedStyle(() => ({
        opacity: dot1Opacity.value,
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: dot2Opacity.value,
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: dot3Opacity.value,
    }));

    if (!isThinking) return null;

    // Web-matching box style indicator
    return (
        <View
            style={{
                backgroundColor: '#0d0d0d',
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
            }}
        >
            {/* Animated dots */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 10 }}>
                <Animated.View
                    style={[
                        {
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.accent,
                        },
                        dot1Style,
                    ]}
                />
                <Animated.View
                    style={[
                        {
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.accent,
                        },
                        dot2Style,
                    ]}
                />
                <Animated.View
                    style={[
                        {
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.accent,
                        },
                        dot3Style,
                    ]}
                />
            </View>

            {/* Label */}
            <Text
                style={{
                    color: COLORS.textSecondary,
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
        </View>
    );
}

/**
 * Streaming indicator showing tokens per second
 */
export function StreamingIndicator({ tps }: { tps?: number }) {
    const theme = useTheme();

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
                style={{
                    width: 6,
                    height: 6,
                    backgroundColor: theme.accent,
                    borderRadius: 3,
                }}
            />
            {tps != null && tps > 0 && (
                <Text
                    style={{
                        color: theme.accent,
                        fontSize: 10,
                        fontFamily: FONTS.mono,
                        fontWeight: '600',
                    }}
                >
                    {tps.toFixed(0)} t/s
                </Text>
            )}
        </View>
    );
}

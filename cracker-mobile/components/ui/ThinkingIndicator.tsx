import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
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
    variant?: 'dots' | 'spinner' | 'pulse';
}

/**
 * Thinking Indicator - Shows AI is processing
 * Matches the web's "thinking-flicker" animation
 */
export default function ThinkingIndicator({
    isThinking = true,
    label = 'Thinking',
    variant = 'dots',
}: ThinkingIndicatorProps) {
    const theme = useTheme();

    // Animation values for dots
    const dot1Opacity = useSharedValue(0.3);
    const dot2Opacity = useSharedValue(0.3);
    const dot3Opacity = useSharedValue(0.3);

    // Animation for pulse
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.5);

    useEffect(() => {
        if (!isThinking) return;

        // Dots animation - sequential fade
        dot1Opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 300, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        dot2Opacity.value = withDelay(
            150,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: 300, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            )
        );

        dot3Opacity.value = withDelay(
            300,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: 300, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            )
        );

        // Pulse animation
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
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

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    if (!isThinking) return null;

    if (variant === 'pulse') {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Animated.View
                    style={[
                        {
                            width: 8,
                            height: 8,
                            backgroundColor: theme.accent,
                        },
                        pulseStyle,
                    ]}
                />
                <Text
                    style={{
                        color: COLORS.textSecondary,
                        fontSize: 12,
                        fontFamily: FONTS.mono,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </Text>
            </View>
        );
    }

    // Default: dots variant
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Label */}
            <Text
                style={{
                    color: COLORS.textSecondary,
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>

            {/* Animated Dots */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Animated.View
                    style={[
                        {
                            width: 4,
                            height: 4,
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
                            backgroundColor: theme.accent,
                        },
                        dot3Style,
                    ]}
                />
            </View>
        </View>
    );
}

/**
 * ASCII-style thinking spinner (matches web)
 */
export function ThinkingSpinner({ size = 16 }: { size?: number }) {
    const theme = useTheme();
    const rotation = useSharedValue(0);

    const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frameIndex = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Text style={{ color: theme.accent, fontSize: size, fontFamily: FONTS.mono }}>
                ●
            </Text>
        </Animated.View>
    );
}

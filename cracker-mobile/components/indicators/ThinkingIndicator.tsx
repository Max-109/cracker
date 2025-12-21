import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';

interface ThinkingIndicatorProps {
    reasoning?: string;
}

export default function ThinkingIndicator({ reasoning }: ThinkingIndicatorProps) {
    const theme = useTheme();
    const pulse = useSharedValue(0.6);
    const runnerProgress = useSharedValue(0);

    useEffect(() => {
        // Pulse animation
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Runner animation
        runnerProgress.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulse.value,
    }));

    const runnerStyle = useAnimatedStyle(() => ({
        width: `${runnerProgress.value * 100}%`,
    }));

    return (
        <View className="mb-3 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
            {/* Header with animated pulse */}
            <View className="flex-row items-center mb-2">
                <Animated.View
                    style={[
                        {
                            width: 8,
                            height: 8,
                            backgroundColor: theme.accent,
                            marginRight: 8,
                        },
                        pulseStyle
                    ]}
                />
                <Text className="text-xs uppercase tracking-wider" style={{ color: theme.accent }}>
                    Thinking
                </Text>
            </View>

            {/* Animated track */}
            <View
                className="h-0.5 w-full mb-2 overflow-hidden"
                style={{ backgroundColor: theme.border }}
            >
                <Animated.View
                    style={[
                        {
                            height: '100%',
                            backgroundColor: theme.accent,
                        },
                        runnerStyle
                    ]}
                />
            </View>

            {/* Reasoning preview */}
            {reasoning && (
                <Text
                    className="text-sm italic"
                    style={{ color: theme.textSecondary }}
                    numberOfLines={2}
                >
                    {reasoning.slice(-200)}
                </Text>
            )}
        </View>
    );
}

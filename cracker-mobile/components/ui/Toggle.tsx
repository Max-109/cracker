import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}

/**
 * Custom toggle matching web design exactly:
 * - Pill-shaped: 40w x 20h, fully rounded
 * - ON: accent color background, black knob on right
 * - OFF: #2a2a2a background, #4a4a4a knob on left
 * - Enhanced with spring animation for bouncy feel
 */
export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
    const theme = useTheme();
    const progress = useSharedValue(value ? 1 : 0);
    const scale = useSharedValue(1);

    React.useEffect(() => {
        // Spring animation for bouncy movement
        progress.value = withSpring(value ? 1 : 0, {
            damping: 15,
            stiffness: 200,
            mass: 0.5,
        });
    }, [value, progress]);

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const trackStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            progress.value,
            [0, 1],
            ['#2a2a2a', theme.accent]
        ),
    }));

    const knobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: progress.value * 18 }],
        backgroundColor: interpolateColor(
            progress.value,
            [0, 1],
            ['#4a4a4a', '#000000']
        ),
    }));

    return (
        <Pressable
            onPress={() => !disabled && onValueChange(!value)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
        >
            <Animated.View style={containerStyle}>
                <Animated.View
                    style={[
                        {
                            width: 40,
                            height: 20,
                            borderRadius: 10,
                            paddingHorizontal: 2,
                            justifyContent: 'center',
                        },
                        trackStyle,
                    ]}
                >
                    <Animated.View
                        style={[
                            {
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                            },
                            knobStyle,
                        ]}
                    />
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}

import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
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
 */
export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
    const theme = useTheme();
    const progress = useSharedValue(value ? 1 : 0);

    React.useEffect(() => {
        progress.value = withTiming(value ? 1 : 0, { duration: 200 });
    }, [value, progress]);

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
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
        >
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
        </Pressable>
    );
}


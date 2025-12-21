import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}

export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
    const theme = useTheme();
    const progress = useSharedValue(value ? 1 : 0);

    React.useEffect(() => {
        progress.value = withSpring(value ? 1 : 0, {
            damping: 15,
            stiffness: 200,
        });
    }, [value]);

    const trackStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            progress.value,
            [0, 1],
            ['#3a3a3a', `${theme.accent}80`]
        ),
    }));

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: progress.value * 20 }],
        backgroundColor: interpolateColor(
            progress.value,
            [0, 1],
            ['#666', theme.accent]
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
                        width: 48,
                        height: 28,
                        borderRadius: 2,
                        padding: 4,
                        justifyContent: 'center',
                    },
                    trackStyle,
                ]}
            >
                <Animated.View
                    style={[
                        {
                            width: 20,
                            height: 20,
                            borderRadius: 2,
                        },
                        thumbStyle,
                    ]}
                />
            </Animated.View>
        </Pressable>
    );
}

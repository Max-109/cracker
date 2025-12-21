import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, GestureResponderEvent } from 'react-native';
import { useTheme } from '../../store/theme';

interface SliderProps {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    presets?: number[];
    showValue?: boolean;
    labelMin?: string;
    labelMax?: string;
}

export default function Slider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    presets,
    showValue = true,
    labelMin,
    labelMax,
}: SliderProps) {
    const theme = useTheme();
    const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const { width } = Dimensions.get('window');
    const TRACK_WIDTH = width - 80; // Account for padding

    const handleTouch = (e: GestureResponderEvent) => {
        const { locationX } = e.nativeEvent;
        const newPercentage = Math.max(0, Math.min(100, (locationX / TRACK_WIDTH) * 100));
        const newValue = Math.round((newPercentage / 100) * (max - min) + min);
        onValueChange(newValue);
    };

    const getLabel = () => {
        if (value <= 25) return labelMin || 'Brief';
        if (value >= 75) return labelMax || 'Detailed';
        return 'Balanced';
    };

    return (
        <View>
            {/* Value Display */}
            {showValue && (
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{
                        fontSize: 48,
                        fontWeight: '700',
                        color: theme.textPrimary,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {value}
                    </Text>
                    <Text style={{
                        fontSize: 10,
                        color: theme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginTop: 4,
                    }}>
                        {getLabel()}
                    </Text>
                </View>
            )}

            {/* Track */}
            <View
                style={{
                    height: 48,
                    justifyContent: 'center',
                    marginBottom: presets ? 20 : 0,
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleTouch}
                onResponderMove={handleTouch}
            >
                <View
                    style={{
                        height: 6,
                        backgroundColor: theme.border,
                        borderRadius: 3,
                    }}
                >
                    {/* Filled Track */}
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: 6,
                            width: `${percentage}%`,
                            backgroundColor: theme.accent,
                            borderRadius: 3,
                        }}
                    />
                    {/* Thumb */}
                    <View
                        style={{
                            position: 'absolute',
                            left: `${percentage}%`,
                            top: -9,
                            marginLeft: -12,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: theme.accent,
                            borderWidth: 3,
                            borderColor: '#fff',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    />
                </View>
            </View>

            {/* Presets */}
            {presets && (
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                    {presets.map((preset) => (
                        <TouchableOpacity
                            key={preset}
                            onPress={() => onValueChange(preset)}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                backgroundColor: value === preset ? theme.accent : '#1a1a1a',
                                borderWidth: 1,
                                borderColor: value === preset ? theme.accent : theme.border,
                                minWidth: 44,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: value === preset ? '#000' : theme.textSecondary,
                            }}>
                                {preset}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

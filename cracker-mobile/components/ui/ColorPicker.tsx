import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../store/theme';

interface ColorPickerProps {
    value: string;
    onValueChange: (color: string) => void;
}

// Color presets matching web
const PRESETS = [
    '#af8787', // Rose (default)
    '#87af87', // Green
    '#8787af', // Blue
    '#afaf87', // Gold
    '#87afaf', // Teal
    '#af87af', // Purple
    '#f87171', // Coral
];

export default function ColorPicker({ value, onValueChange }: ColorPickerProps) {
    const theme = useTheme();
    const { width } = Dimensions.get('window');
    const SIZE = Math.min(width - 64, 300);

    const [hexInput, setHexInput] = useState(value || '#af8787');

    useEffect(() => {
        if (value && value !== hexInput) {
            setHexInput(value);
        }
    }, [value]);

    const handleHexChange = (hex: string) => {
        setHexInput(hex);
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
            onValueChange(hex);
        }
    };

    return (
        <View>
            {/* Current Color Preview */}
            <View style={{ marginBottom: 20 }}>
                <View
                    style={{
                        width: '100%',
                        height: 80,
                        backgroundColor: value,
                        borderWidth: 1,
                        borderColor: theme.border,
                    }}
                />
            </View>

            {/* Hex Input */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    marginBottom: 8,
                }}>
                    Hex Code
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                        style={{
                            width: 44,
                            height: 44,
                            backgroundColor: value,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    />
                    <TextInput
                        value={hexInput.toUpperCase()}
                        onChangeText={handleHexChange}
                        placeholder="#AF8787"
                        placeholderTextColor={theme.textSecondary}
                        autoCapitalize="characters"
                        maxLength={7}
                        style={{
                            flex: 1,
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: theme.border,
                            padding: 12,
                            color: theme.textPrimary,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            letterSpacing: 2,
                        }}
                    />
                </View>
            </View>

            {/* Presets */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{
                    fontSize: 9,
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    marginBottom: 12,
                }}>
                    Presets
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {PRESETS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            onPress={() => {
                                setHexInput(color);
                                onValueChange(color);
                            }}
                            style={{
                                width: 40,
                                height: 40,
                                backgroundColor: color,
                                borderWidth: value.toLowerCase() === color.toLowerCase() ? 3 : 1,
                                borderColor: value.toLowerCase() === color.toLowerCase() ? '#fff' : theme.border,
                            }}
                        />
                    ))}
                </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
                onPress={() => {
                    const defaultColor = '#af8787';
                    setHexInput(defaultColor);
                    onValueChange(defaultColor);
                }}
                style={{
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 14,
                    alignItems: 'center',
                }}
            >
                <Text style={{
                    color: theme.textSecondary,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}>
                    Reset to Default
                </Text>
            </TouchableOpacity>
        </View>
    );
}

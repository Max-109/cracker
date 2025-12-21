import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

// Preset colors matching web
const PRESET_COLORS = [
    '#af8787', // Default rose
    '#87af87', // Sage green
    '#8787af', // Lavender
    '#afaf87', // Wheat
    '#87afaf', // Teal
    '#af87af', // Mauve
    '#ff6b6b', // Coral
];

/**
 * ColorPicker - Full HSL color selection with presets
 * Matches web version HexColorPicker functionality
 */
export default function ColorPicker({ value, onChange }: ColorPickerProps) {
    const theme = useTheme();
    const [hexInput, setHexInput] = useState(value);
    const [showCustom, setShowCustom] = useState(false);

    // Hue slider width
    const SLIDER_WIDTH = Dimensions.get('window').width - 80;

    // Current hue from hex
    const getCurrentHue = useCallback(() => {
        const rgb = hexToRgb(value);
        if (!rgb) return 0;
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return hsl.h;
    }, [value]);

    const [hue, setHue] = useState(getCurrentHue);
    const [saturation] = useState(50);
    const [lightness] = useState(60);

    const handlePresetSelect = (color: string) => {
        onChange(color);
        setHexInput(color);
    };

    const handleHexSubmit = () => {
        const trimmed = hexInput.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
            onChange(trimmed);
        } else if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
            const withHash = `#${trimmed}`;
            onChange(withHash);
            setHexInput(withHash);
        }
    };

    const handleHueChange = (newHue: number) => {
        setHue(newHue);
        const newColor = hslToHex(newHue, saturation, lightness);
        onChange(newColor);
        setHexInput(newColor);
    };

    return (
        <View>
            {/* Current Color Preview */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                <View
                    style={{
                        width: 48,
                        height: 48,
                        backgroundColor: value,
                        borderWidth: 2,
                        borderColor: '#333',
                    }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: FONTS.mono, marginBottom: 4 }}>
                        ACCENT COLOR
                    </Text>
                    <Text style={{ color: value, fontSize: 16, fontWeight: '600', fontFamily: FONTS.mono }}>
                        {value.toUpperCase()}
                    </Text>
                </View>
            </View>

            {/* Preset Colors */}
            <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 10, fontFamily: FONTS.mono, letterSpacing: 1 }}>
                PRESETS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        onPress={() => handlePresetSelect(color)}
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: color,
                            borderWidth: value === color ? 2 : 1,
                            borderColor: value === color ? '#fff' : '#333',
                        }}
                    />
                ))}
            </View>

            {/* Custom Color Toggle */}
            <TouchableOpacity
                onPress={() => setShowCustom(!showCustom)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 14,
                    marginBottom: showCustom ? 16 : 0,
                }}
            >
                <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                    Custom Color
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {showCustom ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>

            {/* Custom Color Section */}
            {showCustom && (
                <Animated.View entering={FadeIn.duration(200)}>
                    {/* Hex Input */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <TextInput
                            value={hexInput}
                            onChangeText={setHexInput}
                            onBlur={handleHexSubmit}
                            onSubmitEditing={handleHexSubmit}
                            placeholder="#af8787"
                            placeholderTextColor={COLORS.textDim}
                            autoCapitalize="none"
                            style={{
                                flex: 1,
                                backgroundColor: '#1a1a1a',
                                borderWidth: 1,
                                borderColor: COLORS.border,
                                color: COLORS.textPrimary,
                                fontSize: 16,
                                fontFamily: FONTS.mono,
                                padding: 12,
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleHexSubmit}
                            style={{
                                backgroundColor: theme.accent,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                            }}
                        >
                            <Text style={{ color: '#000', fontWeight: '600' }}>Apply</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hue Slider */}
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 8, fontFamily: FONTS.mono }}>
                        HUE
                    </Text>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => {
                            const x = e.nativeEvent.locationX;
                            const newHue = Math.round((x / SLIDER_WIDTH) * 360);
                            handleHueChange(Math.max(0, Math.min(360, newHue)));
                        }}
                        style={{
                            width: SLIDER_WIDTH,
                            height: 32,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            marginBottom: 16,
                        }}
                    >
                        {/* Hue gradient background - simplified */}
                        <View
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                            }}
                        >
                            {[0, 60, 120, 180, 240, 300].map((h) => (
                                <View
                                    key={h}
                                    style={{
                                        flex: 1,
                                        backgroundColor: `hsl(${h}, 70%, 50%)`,
                                    }}
                                />
                            ))}
                        </View>
                        {/* Indicator */}
                        <View
                            style={{
                                position: 'absolute',
                                left: (hue / 360) * SLIDER_WIDTH - 2,
                                top: 0,
                                bottom: 0,
                                width: 4,
                                backgroundColor: '#fff',
                                borderWidth: 1,
                                borderColor: '#000',
                            }}
                        />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { COLORS, FONTS, ACCENT_PRESETS } from '../../lib/design';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

const PICKER_SIZE = 200; // Compact fixed size for mobile
const HUE_HEIGHT = 32;
const THUMB_SIZE = 24;

// ═══════════════════════════════════════════════════════════════════════════
// COLOR CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function hexToHsv(hex: string): { h: number; s: number; v: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, v: 100 };

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (d !== 0) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToHex(h: number, s: number, v: number): string {
    const sNorm = s / 100;
    const vNorm = v / 100;

    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = vNorm - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hueToColor(hue: number): string {
    return hsvToHex(hue, 100, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// HSV COLOR PICKER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface HSVColorPickerProps {
    onColorChange?: (color: string) => void;
}

export function HSVColorPicker({ onColorChange }: HSVColorPickerProps) {
    const theme = useTheme();
    const { setAccentColor } = useSettingsStore();

    // Parse initial color
    const initialHsv = hexToHsv(theme.accent);
    const [hue, setHue] = useState(initialHsv.h);
    const [saturation, setSaturation] = useState(initialHsv.s);
    const [brightness, setBrightness] = useState(initialHsv.v);

    // Track if user has interacted - prevent overwriting on mount
    const [hasInteracted, setHasInteracted] = useState(false);

    // Current color derived from HSV
    const currentColor = hsvToHex(hue, saturation, brightness);
    const hueColor = hueToColor(hue);

    // Only apply color when user has actually interacted with the picker
    useEffect(() => {
        if (hasInteracted) {
            setAccentColor(currentColor);
            onColorChange?.(currentColor);
        }
    }, [currentColor, hasInteracted, setAccentColor, onColorChange]);

    // SV picker position - clamped within bounds
    const svX = Math.max(THUMB_SIZE / 2, Math.min(PICKER_SIZE - THUMB_SIZE / 2, (saturation / 100) * PICKER_SIZE));
    const svY = Math.max(THUMB_SIZE / 2, Math.min(PICKER_SIZE - THUMB_SIZE / 2, ((100 - brightness) / 100) * PICKER_SIZE));

    // Hue slider position - clamped within bounds
    const hueX = Math.max(THUMB_SIZE / 2, Math.min(PICKER_SIZE - THUMB_SIZE / 2, (hue / 360) * PICKER_SIZE));

    // Handle SV picker touch
    const handleSVTouch = useCallback((x: number, y: number) => {
        setHasInteracted(true); // Mark user interaction
        const clampedX = Math.max(0, Math.min(PICKER_SIZE, x));
        const clampedY = Math.max(0, Math.min(PICKER_SIZE, y));

        const newSat = (clampedX / PICKER_SIZE) * 100;
        const newBri = 100 - (clampedY / PICKER_SIZE) * 100;

        setSaturation(newSat);
        setBrightness(newBri);
    }, []);

    // Handle Hue slider touch  
    const handleHueTouch = useCallback((x: number) => {
        setHasInteracted(true); // Mark user interaction
        const clampedX = Math.max(0, Math.min(PICKER_SIZE, x));
        const newHue = (clampedX / PICKER_SIZE) * 360;
        setHue(newHue);
    }, []);

    // Select preset - also auto-applies via useEffect
    const handlePresetSelect = useCallback((color: string) => {
        setHasInteracted(true); // Mark user interaction
        const hsv = hexToHsv(color);
        setHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);
    }, []);

    // Reset to default
    const handleReset = useCallback(() => {
        handlePresetSelect('#af8787');
    }, [handlePresetSelect]);

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerDot, { backgroundColor: currentColor }]} />
                <Text style={styles.headerText}>ACCENT COLOR</Text>
            </View>

            {/* Saturation/Brightness Square - using SVG for proper gradients */}
            <View
                style={styles.svPicker}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => handleSVTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
                onResponderMove={(e) => handleSVTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            >
                <Svg width={PICKER_SIZE} height={PICKER_SIZE} style={StyleSheet.absoluteFill}>
                    <Defs>
                        {/* Saturation gradient: white to hue color (left to right) */}
                        <LinearGradient id="satGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="#ffffff" />
                            <Stop offset="100%" stopColor={hueColor} />
                        </LinearGradient>
                        {/* Brightness gradient: transparent to black (top to bottom) */}
                        <LinearGradient id="briGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                            <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    {/* Base layer: saturation gradient */}
                    <Rect x="0" y="0" width={PICKER_SIZE} height={PICKER_SIZE} fill="url(#satGrad)" />
                    {/* Top layer: brightness gradient */}
                    <Rect x="0" y="0" width={PICKER_SIZE} height={PICKER_SIZE} fill="url(#briGrad)" />
                </Svg>

                {/* Picker thumb */}
                <View
                    style={[
                        styles.svThumb,
                        {
                            left: svX - THUMB_SIZE / 2,
                            top: svY - THUMB_SIZE / 2,
                            borderColor: brightness > 50 ? '#000' : '#fff',
                        }
                    ]}
                />
            </View>

            {/* Hue Slider */}
            <View
                style={styles.hueSlider}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => handleHueTouch(e.nativeEvent.locationX)}
                onResponderMove={(e) => handleHueTouch(e.nativeEvent.locationX)}
            >
                {/* Hue gradient background */}
                <Svg width={PICKER_SIZE} height={HUE_HEIGHT} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="hueGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="#ff0000" />
                            <Stop offset="16.67%" stopColor="#ffff00" />
                            <Stop offset="33.33%" stopColor="#00ff00" />
                            <Stop offset="50%" stopColor="#00ffff" />
                            <Stop offset="66.67%" stopColor="#0000ff" />
                            <Stop offset="83.33%" stopColor="#ff00ff" />
                            <Stop offset="100%" stopColor="#ff0000" />
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width={PICKER_SIZE} height={HUE_HEIGHT} fill="url(#hueGrad)" />
                </Svg>

                {/* Hue thumb */}
                <View
                    style={[
                        styles.hueThumb,
                        {
                            left: hueX - THUMB_SIZE / 2,
                            backgroundColor: hueColor,
                        }
                    ]}
                />
            </View>

            {/* Presets */}
            <View style={styles.presetsSection}>
                <Text style={styles.presetsLabel}>PRESETS</Text>
                <View style={styles.presetsRow}>
                    {ACCENT_PRESETS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.presetButton,
                                { backgroundColor: color },
                                currentColor.toLowerCase() === color.toLowerCase() && styles.presetSelected,
                            ]}
                            onPress={() => handlePresetSelect(color)}
                        />
                    ))}
                </View>
            </View>

            {/* Hex Display */}
            <View style={styles.hexSection}>
                <View style={[styles.hexPreview, { backgroundColor: currentColor }]} />
                <View style={styles.hexInputContainer}>
                    <Text style={styles.hexLabel}>HEX CODE</Text>
                    <View style={styles.hexDisplay}>
                        <Text style={styles.hexText}>{currentColor}</Text>
                    </View>
                </View>
            </View>

            {/* Reset to Default Button */}
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetText}>RESET TO DEFAULT</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#141414',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: '#0f0f0f',
    },
    headerDot: {
        width: 14,
        height: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        color: COLORS.textSecondary,
        fontFamily: FONTS.mono,
    },

    // SV Picker
    svPicker: {
        width: PICKER_SIZE,
        height: PICKER_SIZE,
        marginHorizontal: 16,
        marginTop: 16,
        position: 'relative',
    },
    whiteGradient: {
        // Left to right: white to transparent
        backgroundColor: 'transparent',
        // Using a view with gradient simulation - in practice you'd use LinearGradient
    },
    blackGradient: {
        // Top to bottom: transparent to black
        backgroundColor: 'transparent',
    },
    svThumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        borderWidth: 3,
        backgroundColor: 'transparent',
    },

    // Hue Slider
    hueSlider: {
        width: PICKER_SIZE,
        height: HUE_HEIGHT,
        marginHorizontal: 16,
        marginTop: 12,
        position: 'relative',
        borderRadius: 4,
        overflow: 'hidden',
    },
    hueThumb: {
        position: 'absolute',
        top: (HUE_HEIGHT - THUMB_SIZE) / 2,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        borderWidth: 3,
        borderColor: '#fff',
    },

    // Presets
    presetsSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    presetsLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 10,
        fontFamily: FONTS.mono,
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    presetButton: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    presetSelected: {
        borderColor: '#fff',
        borderWidth: 2,
    },

    // Hex
    hexSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginTop: 8,
    },
    hexPreview: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    hexInputContainer: {
        flex: 1,
    },
    hexLabel: {
        fontSize: 9,
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 4,
        fontFamily: FONTS.mono,
    },
    hexDisplay: {
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    hexText: {
        fontSize: 13,
        color: COLORS.textPrimary,
        fontFamily: FONTS.mono,
    },

    // Buttons
    resetButton: {
        marginHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#0f0f0f',
    },
    resetText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
        fontFamily: FONTS.mono,
    },
    applyButton: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    applyText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: FONTS.mono,
    },
});

export default HSVColorPicker;

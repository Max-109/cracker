import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { COLORS, FONTS, ACCENT_PRESETS } from '../../lib/design';

// Model options - EXACT match to web ModelSelector.tsx
type ModelOption = {
    id: string;
    name: string;
    description: string;
    tier: 'expert' | 'balanced' | 'fast';
    icon: keyof typeof Ionicons.glyphMap;
};

const MODEL_OPTIONS: ModelOption[] = [
    { id: "gemini-3-pro-preview", name: "Expert", description: "Gemini 3 Pro", tier: 'expert', icon: 'brain-outline' as any },
    { id: "gemini-3-flash-preview", name: "Balanced", description: "Gemini 3 Flash", tier: 'balanced', icon: 'sparkles' },
    { id: "gemini-2.5-flash-lite-preview-09-2025", name: "Ultra Fast", description: "Gemini 2.5 Flash Lite", tier: 'fast', icon: 'flash' },
];

const TIER_CONFIG = {
    expert: { badge: 'PRO', level: 3 },
    balanced: { badge: 'STD', level: 2 },
    fast: { badge: 'LITE', level: 1 },
};

interface ModelSelectorProps {
    onModelChange?: (id: string, name: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
    const theme = useTheme();
    const { currentModelId, setCurrentModelId } = useSettingsStore();
    const [isOpen, setIsOpen] = useState(false);

    const currentModel = MODEL_OPTIONS.find(m => m.id === currentModelId) || MODEL_OPTIONS[0];

    const handleSelect = (model: ModelOption) => {
        setCurrentModelId(model.id);
        onModelChange?.(model.id, model.name);
        setIsOpen(false);
    };

    return (
        <>
            {/* Trigger Button - EXACT match to web */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(true)}
                style={styles.trigger}
            >
                <Text style={styles.triggerText}>
                    {currentModel.name}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Modal Dropdown */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <Animated.View
                        entering={ZoomIn.duration(150)}
                        style={styles.dropdown}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Ionicons name="hardware-chip-outline" size={12} color={theme.accent} />
                            <Text style={styles.headerText}>SELECT MODEL</Text>
                        </View>

                        {/* Options */}
                        <View style={styles.optionsContainer}>
                            {MODEL_OPTIONS.map((model) => {
                                const isSelected = currentModel.id === model.id;
                                const tierConfig = TIER_CONFIG[model.tier];

                                return (
                                    <TouchableOpacity
                                        key={model.id}
                                        style={[
                                            styles.option,
                                            isSelected && {
                                                backgroundColor: `${theme.accent}15`,
                                                borderLeftWidth: 2,
                                                borderLeftColor: theme.accent,
                                            }
                                        ]}
                                        onPress={() => handleSelect(model)}
                                    >
                                        {/* Icon box */}
                                        <View style={[
                                            styles.iconBox,
                                            isSelected && {
                                                backgroundColor: theme.accent,
                                                borderColor: theme.accent,
                                            }
                                        ]}>
                                            <Ionicons
                                                name={model.icon}
                                                size={16}
                                                color={isSelected ? '#000' : theme.accent}
                                            />
                                        </View>

                                        {/* Text */}
                                        <View style={styles.optionText}>
                                            <View style={styles.optionHeader}>
                                                <Text style={[
                                                    styles.modelName,
                                                    isSelected && { color: theme.accent }
                                                ]}>
                                                    {model.name}
                                                </Text>
                                                <View style={[
                                                    styles.badge,
                                                    { borderColor: theme.accent },
                                                    tierConfig.level === 3 && { backgroundColor: `${theme.accent}33` },
                                                ]}>
                                                    <Text style={[styles.badgeText, { color: theme.accent }]}>
                                                        {tierConfig.badge}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.modelDesc}>{model.description}</Text>
                                        </View>

                                        {/* Power bars */}
                                        <View style={styles.powerBars}>
                                            {[1, 2, 3].map((bar) => (
                                                <View
                                                    key={bar}
                                                    style={[
                                                        styles.powerBar,
                                                        {
                                                            height: bar === 1 ? 6 : bar === 2 ? 10 : 16,
                                                            backgroundColor: theme.accent,
                                                            opacity: bar <= tierConfig.level ? (isSelected ? 1 : 0.6) : 0.1,
                                                        }
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

interface AccentColorPickerProps { }

export function AccentColorPicker({ }: AccentColorPickerProps) {
    const theme = useTheme();
    const { setAccentColor } = useSettingsStore();
    const [isOpen, setIsOpen] = useState(false);
    const [localColor, setLocalColor] = useState(theme.accent);
    const [hexInput, setHexInput] = useState(theme.accent);

    // Sync local color when opening
    useEffect(() => {
        if (isOpen) {
            setLocalColor(theme.accent);
            setHexInput(theme.accent);
        }
    }, [isOpen, theme.accent]);

    const handlePresetSelect = (color: string) => {
        setLocalColor(color);
        setHexInput(color);
    };

    const handleSave = () => {
        setAccentColor(localColor);
        setIsOpen(false);
    };

    const handleHexChange = (text: string) => {
        setHexInput(text);
        // Validate and apply if valid hex
        if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
            setLocalColor(text);
        }
    };

    return (
        <>
            {/* Trigger Button - EXACT match to web */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(true)}
                style={styles.colorTrigger}
            >
                <View style={[styles.colorDot, { backgroundColor: theme.accent }]} />
            </TouchableOpacity>

            {/* Modal Picker */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <Animated.View
                        entering={ZoomIn.duration(150)}
                        style={styles.colorDropdown}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.headerDot, { backgroundColor: localColor }]} />
                            <Text style={styles.headerText}>ACCENT COLOR</Text>
                        </View>

                        {/* Preset Colors - EXACT match to web */}
                        <View style={styles.presetsSection}>
                            <Text style={styles.presetsLabel}>PRESETS</Text>
                            <View style={styles.presetsGrid}>
                                {ACCENT_PRESETS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.presetButton,
                                            { backgroundColor: color },
                                            localColor.toLowerCase() === color.toLowerCase() && styles.presetSelected,
                                        ]}
                                        onPress={() => handlePresetSelect(color)}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Hex Input */}
                        <View style={styles.hexSection}>
                            <View style={[styles.hexPreview, { backgroundColor: localColor }]} />
                            <View style={styles.hexInputContainer}>
                                <Text style={styles.hexLabel}>HEX CODE</Text>
                                <TextInput
                                    style={styles.hexInput}
                                    value={hexInput}
                                    onChangeText={handleHexChange}
                                    autoCapitalize="characters"
                                    maxLength={7}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Footer */}
                        <View style={styles.colorFooter}>
                            <TouchableOpacity
                                style={styles.resetButton}
                                onPress={() => handlePresetSelect('#af8787')}
                            >
                                <Text style={styles.resetText}>RESET TO DEFAULT</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Apply Button */}
                        <TouchableOpacity
                            style={[styles.applyButton, { backgroundColor: localColor }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.applyText}>APPLY</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    // ═══════════════════════════════════════════════════════════════════════
    // MODEL SELECTOR STYLES
    // ═══════════════════════════════════════════════════════════════════════
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    triggerText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FONTS.mono,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dropdown: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#141414',
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: '#0f0f0f',
    },
    headerText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        color: COLORS.textSecondary,
        fontFamily: FONTS.mono,
    },
    optionsContainer: {
        padding: 6,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modelName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: FONTS.mono,
    },
    modelDesc: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        fontFamily: FONTS.mono,
    },
    powerBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height: 16,
    },
    powerBar: {
        width: 4,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // COLOR PICKER STYLES
    // ═══════════════════════════════════════════════════════════════════════
    colorTrigger: {
        width: 36,
        height: 36,
        backgroundColor: '#141414',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    colorDropdown: {
        width: '100%',
        maxWidth: 280,
        backgroundColor: '#141414',
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    headerDot: {
        width: 12,
        height: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    presetsSection: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    presetsLabel: {
        fontSize: 9,
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
        fontFamily: FONTS.mono,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    presetButton: {
        width: 24,
        height: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    presetSelected: {
        borderColor: '#fff',
        borderWidth: 2,
        transform: [{ scale: 1.1 }],
    },
    hexSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    hexPreview: {
        width: 32,
        height: 32,
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
    hexInput: {
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 11,
        color: COLORS.textPrimary,
        fontFamily: FONTS.mono,
        textTransform: 'uppercase',
    },
    colorFooter: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: '#0f0f0f',
    },
    resetButton: {
        paddingVertical: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    resetText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        letterSpacing: 1,
        fontFamily: FONTS.mono,
    },
    applyButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    applyText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 1,
        fontFamily: FONTS.mono,
    },
});

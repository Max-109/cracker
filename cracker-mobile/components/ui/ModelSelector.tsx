import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { COLORS, FONTS, ACCENT_PRESETS } from '../../lib/design';
import HSVColorPicker from './HSVColorPicker';

// Model options - EXACT match to web ModelSelector.tsx
type ModelOption = {
    id: string;
    name: string;
    description: string;
    tier: 'expert' | 'balanced' | 'fast' | 'custom';
    icon: keyof typeof Ionicons.glyphMap;
};

const CUSTOM_MODEL_OPTION_ID = '__custom-model__';

const MODEL_OPTIONS: ModelOption[] = [
    { id: "gpt-5.5", name: "Expert", description: "GPT-5.5", tier: 'expert', icon: 'terminal-outline' },
    { id: "gpt-5.4-mini", name: "Balanced", description: "GPT-5.4 Mini", tier: 'balanced', icon: 'radio-outline' },
    { id: "gpt-5.3-codex-spark", name: "Ultra Fast", description: "GPT-5.3 Codex Spark", tier: 'fast', icon: 'flash' },
    { id: CUSTOM_MODEL_OPTION_ID, name: "Custom", description: "Enter a model name", tier: 'custom', icon: 'code-slash' },
];

const TIER_CONFIG = {
    expert: { badge: 'PRO', level: 3 },
    balanced: { badge: 'STD', level: 2 },
    fast: { badge: 'LITE', level: 1 },
    custom: { badge: 'USER', level: 2 },
};

interface ModelSelectorProps {
    onModelChange?: (id: string, name: string) => void;
    small?: boolean;
}

export function ModelSelector({ onModelChange, small = false }: ModelSelectorProps) {
    const theme = useTheme();
    const { currentModelId, setCurrentModelId } = useSettingsStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomModelOpen, setIsCustomModelOpen] = useState(false);
    const [customModelInput, setCustomModelInput] = useState('');

    const presetModel = MODEL_OPTIONS.find(m => m.id === currentModelId && m.id !== CUSTOM_MODEL_OPTION_ID);
    const isCustomModel = !presetModel;
    const currentModel = presetModel || { ...MODEL_OPTIONS[MODEL_OPTIONS.length - 1], description: currentModelId };

    const openCustomModelDialog = () => {
        setCustomModelInput(isCustomModel ? currentModelId : '');
        setIsOpen(false);
        setIsCustomModelOpen(true);
    };

    const handleSelect = (model: ModelOption) => {
        if (model.id === CUSTOM_MODEL_OPTION_ID) {
            openCustomModelDialog();
            return;
        }
        setCurrentModelId(model.id, model.name);
        onModelChange?.(model.id, model.name);
        setIsOpen(false);
    };

    const handleUseCustomModel = () => {
        const modelId = customModelInput.trim();
        if (!modelId) return;
        setCurrentModelId(modelId, 'Custom');
        onModelChange?.(modelId, 'Custom');
        setIsCustomModelOpen(false);
    };

    return (
        <>
            {/* Trigger Button - EXACT match to web */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(true)}
                style={[
                    styles.trigger,
                    small && {
                        height: 40,
                        backgroundColor: COLORS.bgCard,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        paddingHorizontal: 12
                    }
                ]}
            >
                <Text style={[styles.triggerText, small && { fontSize: 13 }]}>
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
                                const isCustomOption = model.id === CUSTOM_MODEL_OPTION_ID;
                                const isSelected = isCustomOption ? isCustomModel : currentModel.id === model.id;
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
                                            <Text style={styles.modelDesc}>{isCustomOption && isCustomModel ? currentModelId : model.description}</Text>
                                        </View>

                                        {/* Power bars */}
                                        {!isCustomOption && (
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
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={isCustomModelOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsCustomModelOpen(false)}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setIsCustomModelOpen(false)}
                >
                    <Animated.View
                        entering={ZoomIn.duration(150)}
                        style={styles.dropdown}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.header}>
                            <Ionicons name="code-slash" size={12} color={theme.accent} />
                            <Text style={styles.headerText}>CUSTOM MODEL</Text>
                        </View>
                        <View style={styles.customBody}>
                            <Text style={styles.customLabel}>MODEL NAME</Text>
                            <TextInput
                                value={customModelInput}
                                onChangeText={setCustomModelInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                placeholder="claude-opus-4-8, gpt-5.5, etc."
                                placeholderTextColor={COLORS.textMuted}
                                style={[styles.customInput, { borderColor: theme.accent }]}
                            />
                            <Text style={styles.customHint}>This is sent as the model id to your active OpenAI-compatible provider.</Text>
                        </View>
                        <View style={styles.customFooter}>
                            <TouchableOpacity
                                onPress={() => setIsCustomModelOpen(false)}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleUseCustomModel}
                                disabled={!customModelInput.trim()}
                                style={[styles.primaryButton, { borderColor: theme.accent, backgroundColor: theme.accent }, !customModelInput.trim() && styles.disabledButton]}
                            >
                                <Text style={styles.primaryButtonText}>USE MODEL</Text>
                            </TouchableOpacity>
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
    const [isOpen, setIsOpen] = useState(false);

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

            {/* Modal Picker with full HSVColorPicker */}
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
                        {/* 
                            Pass empty handler since HSVColorPicker handles store updates internally 
                            We just need to close the modal when done, but user might want to try multiple colors
                            so we leave it open until they tap outside
                        */}
                        <HSVColorPicker />
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
    customBody: {
        padding: 18,
        gap: 12,
    },
    customLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        letterSpacing: 2,
        fontFamily: FONTS.mono,
    },
    customInput: {
        backgroundColor: '#141414',
        borderWidth: 1,
        color: COLORS.textPrimary,
        fontSize: 14,
        fontFamily: FONTS.mono,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    customHint: {
        color: COLORS.textSecondary,
        fontSize: 10,
        lineHeight: 16,
        fontFamily: FONTS.mono,
    },
    customFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: '#0f0f0f',
    },
    secondaryButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        fontFamily: FONTS.mono,
    },
    primaryButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
    },
    primaryButtonText: {
        color: '#000',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: FONTS.mono,
    },
    disabledButton: {
        opacity: 0.4,
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

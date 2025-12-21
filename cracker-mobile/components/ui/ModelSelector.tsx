import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Platform, StatusBar } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS, MODEL_TIERS, REASONING_LEVELS } from '../../lib/design';

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    selectedReasoning?: 'low' | 'medium' | 'high';
    onReasoningChange?: (level: 'low' | 'medium' | 'high') => void;
}

/**
 * ModelSelector - AI model and reasoning effort picker
 * Matches web design with tier badges and intensity bars
 */
export default function ModelSelector({
    selectedModel,
    onModelChange,
    selectedReasoning = 'medium',
    onReasoningChange,
}: ModelSelectorProps) {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const selectedModelInfo = MODEL_TIERS.find(m => m.id === selectedModel) || MODEL_TIERS[0];

    const renderIntensityBars = (level: number, isSelected: boolean) => (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
            {[1, 2, 3, 4].map((bar) => (
                <View
                    key={bar}
                    style={{
                        width: 3,
                        height: bar === 1 ? 4 : bar === 2 ? 8 : bar === 3 ? 12 : 16,
                        backgroundColor: bar <= level
                            ? isSelected ? theme.accent : `${theme.accent}60`
                            : COLORS.border,
                    }}
                />
            ))}
        </View>
    );

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

    return (
        <>
            {/* Trigger Button */}
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: COLORS.bgCard,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <Ionicons
                    name={selectedModelInfo.icon as any}
                    size={14}
                    color={theme.accent}
                />
                <Text
                    style={{
                        color: COLORS.textPrimary,
                        fontSize: 12,
                        fontWeight: '600',
                        letterSpacing: 0.5,
                    }}
                >
                    {selectedModelInfo.name}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        justifyContent: 'flex-end',
                    }}
                    onPress={() => setIsOpen(false)}
                >
                    <Animated.View
                        entering={SlideInDown.duration(250)}
                        style={{
                            backgroundColor: COLORS.bgSidebar,
                            borderTopWidth: 1,
                            borderTopColor: COLORS.border,
                            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                        }}
                    >
                        {/* Header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: COLORS.border,
                                backgroundColor: COLORS.bgMain,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="sparkles" size={14} color={theme.accent} />
                                <Text
                                    style={{
                                        color: COLORS.textSecondary,
                                        fontSize: 10,
                                        fontWeight: '600',
                                        letterSpacing: 1.5,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Select Model
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Model Options */}
                        <View style={{ padding: 8 }}>
                            {MODEL_TIERS.map((model) => {
                                const isSelected = selectedModel === model.id;
                                return (
                                    <TouchableOpacity
                                        key={model.id}
                                        onPress={() => {
                                            onModelChange(model.id);
                                            setIsOpen(false);
                                        }}
                                        activeOpacity={0.7}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            backgroundColor: isSelected ? `${theme.accent}15` : 'transparent',
                                            borderLeftWidth: 2,
                                            borderLeftColor: isSelected ? theme.accent : 'transparent',
                                        }}
                                    >
                                        {/* Icon Box */}
                                        <View
                                            style={{
                                                width: 32,
                                                height: 32,
                                                backgroundColor: isSelected ? theme.accent : COLORS.bgCard,
                                                borderWidth: 1,
                                                borderColor: isSelected ? theme.accent : COLORS.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons
                                                name={model.icon as any}
                                                size={16}
                                                color={isSelected ? '#000' : COLORS.textSecondary}
                                            />
                                        </View>

                                        {/* Info */}
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    color: isSelected ? theme.accent : COLORS.textPrimary,
                                                    fontSize: 13,
                                                    fontWeight: '600',
                                                    letterSpacing: 0.5,
                                                }}
                                            >
                                                {model.name}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textSecondary,
                                                    fontSize: 11,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {model.description}
                                            </Text>
                                        </View>

                                        {/* Tier Bars */}
                                        {renderIntensityBars(model.tier, isSelected)}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Reasoning Effort Section */}
                        {onReasoningChange && (
                            <>
                                <View
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderTopWidth: 1,
                                        borderTopColor: COLORS.border,
                                        backgroundColor: COLORS.bgMain,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="bulb" size={14} color={theme.accent} />
                                        <Text
                                            style={{
                                                color: COLORS.textSecondary,
                                                fontSize: 10,
                                                fontWeight: '600',
                                                letterSpacing: 1.5,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Reasoning Effort
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ padding: 8 }}>
                                    {REASONING_LEVELS.map((level) => {
                                        const isSelected = selectedReasoning === level.level;
                                        return (
                                            <TouchableOpacity
                                                key={level.level}
                                                onPress={() => onReasoningChange(level.level as any)}
                                                activeOpacity={0.7}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: 12,
                                                    backgroundColor: isSelected ? `${theme.accent}15` : 'transparent',
                                                    borderLeftWidth: 2,
                                                    borderLeftColor: isSelected ? theme.accent : 'transparent',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        backgroundColor: isSelected ? theme.accent : COLORS.bgCard,
                                                        borderWidth: 1,
                                                        borderColor: isSelected ? theme.accent : COLORS.border,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={level.icon as any}
                                                        size={16}
                                                        color={isSelected ? '#000' : COLORS.textSecondary}
                                                    />
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={{
                                                            color: isSelected ? theme.accent : COLORS.textPrimary,
                                                            fontSize: 13,
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {level.label}
                                                    </Text>
                                                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                                                        {level.description}
                                                    </Text>
                                                </View>

                                                {/* Reasoning Bars */}
                                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                                    {[1, 2, 3].map((bar) => (
                                                        <View
                                                            key={bar}
                                                            style={{
                                                                width: 3,
                                                                height: bar === 1 ? 6 : bar === 2 ? 10 : 14,
                                                                backgroundColor: bar <= level.bars
                                                                    ? isSelected ? theme.accent : `${theme.accent}60`
                                                                    : COLORS.border,
                                                            }}
                                                        />
                                                    ))}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </Animated.View>
                </Pressable>
            </Modal>
        </>
    );
}

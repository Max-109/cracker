import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface SuggestionCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    description: string;
    onPress: () => void;
    index?: number;
}

/**
 * SuggestionCard - EXACT match to web MessageList.tsx SUGGESTIONS styling
 * 
 * Web specs:
 * - p-4 (16px padding)
 * - border border-[var(--border-color)] bg-[#1a1a1a]
 * - Icon box: w-10 h-10 (40px), bg-[#141414], border-[var(--border-color)]
 * - Label: text-xs font-semibold uppercase tracking-[0.1em] text-accent
 * - Text: text-sm text-primary
 * - Description: text-[11px] text-secondary
 * - Arrow: ArrowRight on hover (show always on mobile for clarity)
 */
export default function SuggestionCard({
    icon,
    title,
    subtitle,
    description,
    onPress,
    index = 0,
}: SuggestionCardProps) {
    const theme = useTheme();

    return (
        <Animated.View
            entering={FadeInUp.delay(index * 80).springify()}
            style={{ flex: 1, minWidth: '45%' }}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                    // Web: p-4 = 16px
                    padding: 16,
                    // Web: bg-[#1a1a1a] border-[var(--border-color)]
                    backgroundColor: COLORS.bgMain,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    // Ensure comfortable touch target
                    minHeight: 110,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                }}
            >
                {/* Icon Box - Web: w-10 h-10 = 40px, bg-[#141414] */}
                <View
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: COLORS.bgSidebar, // #141414
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
                </View>

                {/* Text Content */}
                <View style={{ flex: 1, minWidth: 0 }}>
                    {/* Label - Web: text-xs font-semibold uppercase tracking-[0.1em] text-accent */}
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 12,
                            fontWeight: '600',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                            fontFamily: FONTS.mono,
                        }}
                    >
                        {title}
                    </Text>

                    {/* Text - Web: text-sm text-primary */}
                    <Text
                        style={{
                            color: COLORS.textPrimary,
                            fontSize: 14,
                            lineHeight: 20,
                        }}
                        numberOfLines={2}
                    >
                        {subtitle}
                    </Text>

                    {/* Description - Web: text-[11px] text-secondary */}
                    <Text
                        style={{
                            color: COLORS.textSecondary,
                            fontSize: 11,
                            marginTop: 4,
                        }}
                        numberOfLines={1}
                    >
                        {description}
                    </Text>
                </View>

                {/* Arrow - Web shows on hover, mobile shows always but subtle */}
                <View style={{ alignSelf: 'center', opacity: 0.5 }}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// Predefined suggestion data matching web MessageList.tsx SUGGESTIONS
export const SUGGESTIONS = [
    {
        icon: 'code-slash' as const,
        title: 'CODE',
        subtitle: 'Help me write a Python script',
        description: 'Get coding assistance',
    },
    {
        icon: 'bulb-outline' as const,
        title: 'IDEAS',
        subtitle: 'Brainstorm ideas for my project',
        description: 'Creative thinking',
    },
    {
        icon: 'pencil-outline' as const,
        title: 'WRITE',
        subtitle: 'Write a professional email',
        description: 'Content creation',
    },
    {
        icon: 'flash-outline' as const,
        title: 'EXPLAIN',
        subtitle: 'Explain quantum computing simply',
        description: 'Learn anything',
    },
];

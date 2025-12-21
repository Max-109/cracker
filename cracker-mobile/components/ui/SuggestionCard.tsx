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
 * Premium SuggestionCard - Large, finger-friendly touch targets
 * - Minimum 120px height for easy tapping
 * - Animated entrance
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
                    backgroundColor: '#0d0d0d',
                    borderWidth: 1.5,
                    borderColor: '#252525',
                    padding: 18,
                    minHeight: 120,
                }}
            >
                {/* Icon Box */}
                <View
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: `${theme.accent}15`,
                        borderWidth: 1,
                        borderColor: `${theme.accent}30`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                    }}
                >
                    <Ionicons name={icon} size={16} color={theme.accent} />
                </View>

                {/* Title */}
                <Text
                    style={{
                        color: theme.accent,
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        marginBottom: 6,
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    }}
                >
                    {title}
                </Text>

                {/* Subtitle */}
                <Text
                    style={{
                        color: COLORS.textSecondary,
                        fontSize: 14,
                        lineHeight: 20,
                    }}
                    numberOfLines={2}
                >
                    {subtitle}
                </Text>

                {/* Description */}
                <Text
                    style={{
                        color: COLORS.textMuted,
                        fontSize: 11,
                        marginTop: 6,
                    }}
                    numberOfLines={1}
                >
                    {description}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// Predefined suggestion data matching web
export const SUGGESTIONS = [
    {
        icon: 'code-slash' as const,
        title: 'CODE',
        subtitle: 'Help me write Python code',
        description: 'Get coding assistance',
    },
    {
        icon: 'bulb-outline' as const,
        title: 'IDEAS',
        subtitle: 'Brainstorm creative ideas',
        description: 'Creative thinking',
    },
    {
        icon: 'pencil-outline' as const,
        title: 'WRITE',
        subtitle: 'Write professional content',
        description: 'Content creation',
    },
    {
        icon: 'school-outline' as const,
        title: 'EXPLAIN',
        subtitle: 'Explain complex topics',
        description: 'Learn anything',
    },
];

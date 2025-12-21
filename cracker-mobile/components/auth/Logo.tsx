import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';

interface LogoProps {
    size?: 'small' | 'large';
}

export default function Logo({ size = 'large' }: LogoProps) {
    const theme = useTheme();
    const isLarge = size === 'large';
    const iconSize = isLarge ? 64 : 48;
    const sparkleSize = isLarge ? 26 : 20;

    return (
        <Animated.View
            entering={FadeIn.duration(600)}
            style={{ alignItems: 'center', marginBottom: isLarge ? 32 : 20 }}
        >
            {/* Outer glow rings - matching web exactly */}
            <View style={{ position: 'relative' }}>
                {/* Outermost ring */}
                <View
                    style={{
                        position: 'absolute',
                        top: -24,
                        left: -24,
                        right: -24,
                        bottom: -24,
                        borderWidth: 1,
                        borderColor: `${theme.accent}08`,
                    }}
                />
                {/* Middle ring */}
                <View
                    style={{
                        position: 'absolute',
                        top: -16,
                        left: -16,
                        right: -16,
                        bottom: -16,
                        borderWidth: 1,
                        borderColor: `${theme.accent}15`,
                    }}
                />

                {/* Main logo box - matching web: solid border, subtle bg, no animation */}
                <View
                    style={{
                        width: iconSize,
                        height: iconSize,
                        borderWidth: 2,
                        borderColor: theme.accent,
                        backgroundColor: `${theme.accent}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons
                        name="sparkles"
                        size={sparkleSize}
                        color={theme.accent}
                    />
                </View>
            </View>

            {/* Title */}
            <Text
                style={{
                    fontSize: isLarge ? 28 : 22,
                    fontWeight: '700',
                    color: theme.textPrimary,
                    marginTop: isLarge ? 24 : 16,
                    letterSpacing: 1,
                }}
            >
                Cracker
            </Text>

            {/* Subtitle */}
            <Text
                style={{
                    fontSize: 10,
                    color: theme.textSecondary,
                    marginTop: 8,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                }}
            >
                AI Chat Interface
            </Text>
        </Animated.View>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface TimelineItemProps {
    id: string;
    title: string;
    timestamp: string;
    isLast: boolean;
    onPress: () => void;
    index: number;
}

export default function TimelineItem({ id, title, timestamp, isLast, onPress, index }: TimelineItemProps) {
    const theme = useTheme();

    return (
        <Animated.View
            entering={FadeInUp.delay(index * 50).springify()}
            style={{ flexDirection: 'row', paddingHorizontal: 20 }}
        >
            {/* Timeline Line & Icon */}
            <View style={{ alignItems: 'center', marginRight: 16 }}>
                {/* Icon Box */}
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: '#333',
                        backgroundColor: '#111',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}
                >
                    <Ionicons name="chatbubble-outline" size={14} color="#666" />
                </View>

                {/* Vertical Line */}
                {!isLast && (
                    <View
                        style={{
                            width: 1,
                            flex: 1,
                            backgroundColor: '#333',
                            marginVertical: 4,
                        }}
                    />
                )}
            </View>

            {/* Content */}
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                    flex: 1,
                    paddingTop: 8,
                    paddingBottom: isLast ? 20 : 32
                }}
            >
                <Text
                    numberOfLines={1}
                    style={{
                        color: theme.textSecondary,
                        fontSize: 15,
                        fontFamily: 'Menlo', // Matching the code aesthetic
                        marginBottom: 4,
                    }}
                >
                    {title || "New Chat"}
                </Text>
                <Text style={{ color: '#444', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {timestamp}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

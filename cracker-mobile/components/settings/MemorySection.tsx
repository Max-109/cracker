import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';
import { api } from '../../lib/api';

interface UserFact {
    id: string;
    fact: string;
    category?: string;
    createdAt?: string;
}

/**
 * MemorySection - Displays and manages user facts (memory)
 * Matches web version functionality
 */
export default function MemorySection() {
    const theme = useTheme();
    const [facts, setFacts] = useState<UserFact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchFacts = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.getUserFacts();
            setFacts(response.facts || []);
        } catch { } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFacts();
    }, [fetchFacts]);

    const handleDeleteFact = async (factId: string) => {
        Alert.alert(
            'Delete Memory',
            'Are you sure you want to delete this memory?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsDeleting(factId);
                            await api.deleteFact(factId);
                            setFacts(prev => prev.filter(f => f.id !== factId));
                        } catch {
                            Alert.alert('Error', 'Failed to delete memory');
                        } finally {
                            setIsDeleting(null);
                        }
                    },
                },
            ]
        );
    };

    const handleClearAll = () => {
        if (facts.length === 0) return;

        Alert.alert(
            'Clear All Memories',
            'This will permanently delete all your saved memories. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await api.clearAllFacts();
                            setFacts([]);
                        } catch {
                            Alert.alert('Error', 'Failed to clear memories');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderFact = ({ item, index }: { item: UserFact; index: number }) => (
        <Animated.View
            entering={SlideInRight.delay(index * 50).duration(200)}
            exiting={FadeOut.duration(150)}
            style={{
                backgroundColor: '#1a1a1a',
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
            }}
        >
            <View
                style={{
                    width: 28,
                    height: 28,
                    backgroundColor: `${theme.accent}15`,
                    borderWidth: 1,
                    borderColor: `${theme.accent}30`,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Ionicons name="sparkles" size={12} color={theme.accent} />
            </View>
            <Text
                style={{
                    flex: 1,
                    color: COLORS.textPrimary,
                    fontSize: 14,
                    lineHeight: 20,
                }}
            >
                {item.fact}
            </Text>
            <TouchableOpacity
                onPress={() => handleDeleteFact(item.id)}
                disabled={isDeleting === item.id}
                style={{
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {isDeleting === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.textMuted} />
                ) : (
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    if (isLoading && facts.length === 0) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}>
                    Loading memories...
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={16} color={theme.accent} />
                    <Text
                        style={{
                            color: COLORS.textSecondary,
                            fontSize: 11,
                            fontWeight: '600',
                            letterSpacing: 1.5,
                            textTransform: 'uppercase',
                            fontFamily: FONTS.mono,
                        }}
                    >
                        {facts.length} {facts.length === 1 ? 'Memory' : 'Memories'}
                    </Text>
                </View>

                {facts.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClearAll}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: '#ef4444',
                        }}
                    >
                        <Ionicons name="trash-outline" size={12} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600' }}>
                            Clear All
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Info Box */}
            <View
                style={{
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                }}
            >
                <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
                <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 12, lineHeight: 18 }}>
                    Cracker automatically learns about you from your conversations. These memories help personalize responses.
                </Text>
            </View>

            {/* Facts List */}
            {facts.length === 0 ? (
                <View
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 40,
                    }}
                >
                    <View
                        style={{
                            width: 56,
                            height: 56,
                            backgroundColor: '#1a1a1a',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Ionicons name="sparkles-outline" size={24} color={COLORS.textMuted} />
                    </View>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 }}>
                        No memories yet
                    </Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center' }}>
                        Start chatting and I'll remember important things about you
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={facts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFact}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Platform, Keyboard, Text } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, BORDER_RADIUS, FONTS } from '../../lib/design';

interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onStop?: () => void;
    onAttachment?: () => void;
    onMic?: () => void;
    isLoading?: boolean;
    isRecording?: boolean;
    isStreaming?: boolean;
    placeholder?: string;
}

/**
 * ChatInput - Optimized for mobile ergonomics
 * - 48px touch targets
 * - Comfortable spacing for iPhone home bar
 */
export default function ChatInput({
    value,
    onChangeText,
    onSend,
    onStop,
    onAttachment,
    onMic,
    isLoading = false,
    isRecording = false,
    isStreaming = false,
    placeholder = "Let's crack...",
}: ChatInputProps) {
    const theme = useTheme();
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    const hasText = value.trim().length > 0;
    const BUTTON_SIZE = 44;

    const handleSendPress = () => {
        if (hasText && !isLoading) {
            Keyboard.dismiss();
            onSend();
        }
    };

    const handleMicPress = () => {
        if (onMic) {
            onMic();
        }
    };

    const handleStopPress = () => {
        if (onStop) {
            onStop();
        }
    };

    return (
        <View
            style={{
                backgroundColor: COLORS.bgMain,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
            }}
        >
            {/* Recording indicator */}
            {isRecording && (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginBottom: 12,
                        paddingVertical: 8,
                        backgroundColor: `${theme.accent}15`,
                        borderWidth: 1,
                        borderColor: `${theme.accent}40`,
                    }}
                >
                    <View
                        style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#ef4444',
                        }}
                    />
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 12,
                            fontFamily: FONTS.mono,
                            letterSpacing: 1,
                        }}
                    >
                        RECORDING
                    </Text>
                </View>
            )}

            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    backgroundColor: COLORS.bgCard,
                    borderWidth: 1,
                    borderColor: isFocused ? `${theme.accent}80` : COLORS.border, // web: 50% opacity on focus
                    borderRadius: BORDER_RADIUS,
                    minHeight: 56,
                    paddingHorizontal: 10, // web: p-2.5 = 10px
                    paddingVertical: 10,
                    gap: 8, // web: gap-2 = 8px
                }}
            >
                {/* Attachment Button - matches web Paperclip button */}
                <TouchableOpacity
                    onPress={onAttachment}
                    activeOpacity={0.7}
                    style={{
                        width: 40, // web: w-10 = 40px
                        height: 40, // web: h-10 = 40px
                        backgroundColor: COLORS.bgCard,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: BORDER_RADIUS,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="attach" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {/* Input Field */}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textDim}
                    multiline
                    editable={!isRecording}
                    style={{
                        flex: 1,
                        fontSize: 16,
                        color: COLORS.textPrimary,
                        maxHeight: 120,
                        paddingHorizontal: 12,
                        paddingTop: Platform.OS === 'ios' ? 12 : 10,
                        paddingBottom: Platform.OS === 'ios' ? 12 : 10,
                        minHeight: BUTTON_SIZE,
                    }}
                />

                {/* Right Side Button - all 40x40 to match web */}
                {isStreaming ? (
                    // Stop button - web: Square icon with accent border
                    <TouchableOpacity
                        onPress={handleStopPress}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: COLORS.bgCard,
                            borderWidth: 1,
                            borderColor: theme.accent,
                            borderRadius: BORDER_RADIUS,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="stop" size={14} color={theme.accent} />
                    </TouchableOpacity>
                ) : isLoading ? (
                    // Loading spinner
                    <View
                        style={{
                            width: 40,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ActivityIndicator size="small" color={theme.accent} />
                    </View>
                ) : hasText ? (
                    // Send button - web: accent bg with ArrowUp
                    <Animated.View entering={ZoomIn.duration(100)} exiting={ZoomOut.duration(100)}>
                        <TouchableOpacity
                            onPress={handleSendPress}
                            activeOpacity={0.8}
                            style={{
                                width: 40,
                                height: 40,
                                backgroundColor: theme.accent,
                                borderRadius: BORDER_RADIUS,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="arrow-up" size={18} color="#000" />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    // Mic button - web: Mic icon
                    <TouchableOpacity
                        onPress={handleMicPress}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: isRecording ? theme.accent : COLORS.bgCard,
                            borderWidth: 1,
                            borderColor: isRecording ? theme.accent : COLORS.border,
                            borderRadius: BORDER_RADIUS,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons
                            name={isRecording ? "stop" : "mic-outline"}
                            size={18}
                            color={isRecording ? "#000" : COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

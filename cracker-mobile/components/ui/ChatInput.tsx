import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';

interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onAttachment?: () => void;
    onMic?: () => void;
    isLoading?: boolean;
    placeholder?: string;
}

export default function ChatInput({
    value,
    onChangeText,
    onSend,
    onAttachment,
    onMic,
    isLoading = false,
    placeholder = "Let's crack...",
}: ChatInputProps) {
    const theme = useTheme();
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    const hasText = value.trim().length > 0;

    return (
        <View
            style={{
                borderTopWidth: 1,
                borderTopColor: theme.border,
                backgroundColor: theme.bgMain,
                paddingHorizontal: 12,
                paddingVertical: 10,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                }}
            >
                {/* Attachment Button */}
                {onAttachment && !hasText && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                        <TouchableOpacity
                            onPress={onAttachment}
                            style={{
                                width: 40,
                                height: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#1a1a1a',
                                borderWidth: 1,
                                borderColor: theme.border,
                            }}
                        >
                            <Ionicons name="attach" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Input Field */}
                <View
                    style={{
                        flex: 1,
                        backgroundColor: '#1a1a1a',
                        borderWidth: 1,
                        borderColor: isFocused ? theme.accent : theme.border,
                        minHeight: 44,
                        maxHeight: 120,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        justifyContent: 'center',
                    }}
                >
                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        placeholderTextColor={`${theme.textSecondary}60`}
                        multiline
                        style={{
                            fontSize: 15,
                            color: theme.textPrimary,
                            maxHeight: 100,
                            lineHeight: 20,
                        }}
                    />
                </View>

                {/* Mic Button - show when no text */}
                {onMic && !hasText && !isLoading && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                        <TouchableOpacity
                            onPress={onMic}
                            style={{
                                width: 44,
                                height: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#1a1a1a',
                                borderWidth: 1,
                                borderColor: theme.border,
                            }}
                        >
                            <Ionicons name="mic" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Send Button - show when has text */}
                {hasText && (
                    <Animated.View
                        entering={SlideInRight.duration(200).springify()}
                        exiting={SlideOutRight.duration(150)}
                    >
                        <TouchableOpacity
                            onPress={onSend}
                            disabled={isLoading}
                            style={{
                                width: 44,
                                height: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isLoading ? theme.border : theme.accent,
                            }}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={theme.textPrimary} />
                            ) : (
                                <Ionicons name="arrow-up" size={22} color="#000" />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

/**
 * CodeBlock - Syntax highlighted code blocks
 * 
 * EXACT PORT from web: app/components/CodeBlock.tsx
 * Uses react-syntax-highlighter with Prism for React Native
 * 
 * Features:
 * - Prism tokenizer (same as web)
 * - Language label header
 * - Copy functionality
 * - Dark theme matching web
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Clipboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface CodeBlockProps {
    language: string;
    value: string;
}

/**
 * Custom dark theme matching web CodeBlock styles
 * Web uses: color: '#c9d1d9', background: transparent
 */
const customTheme = {
    ...atomOneDark,
    'hljs': {
        ...atomOneDark['hljs'],
        background: 'transparent',
        color: '#c9d1d9',
    },
};

export default function CodeBlock({ language, value }: CodeBlockProps) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            Clipboard.setString(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }, [value]);

    return (
        <View style={styles.container}>
            {/* Header - matches web: bg-[var(--bg-sidebar)] */}
            <View style={styles.header}>
                <Text style={[styles.languageLabel, { color: theme.accent }]}>
                    {language?.toUpperCase() || 'CODE'}
                </Text>

                <TouchableOpacity
                    onPress={handleCopy}
                    style={styles.copyButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={copied ? "checkmark" : "copy-outline"}
                        size={14}
                        color={copied ? theme.accent : COLORS.textSecondary}
                    />
                    <Text style={[
                        styles.copyText,
                        copied && { color: theme.accent }
                    ]}>
                        {copied ? 'Copied' : 'Copy'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Code Content - scrollable horizontally */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.codeScroll}
                contentContainerStyle={styles.codeContent}
            >
                <SyntaxHighlighter
                    language={language || 'text'}
                    style={customTheme}
                    customStyle={styles.highlighter}
                    codeTagProps={{ style: styles.code }}
                >
                    {value}
                </SyntaxHighlighter>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#1e1e1e',
        overflow: 'hidden',
    },

    // Header - matches web styling
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#161616',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    languageLabel: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: FONTS.mono,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    copyText: {
        fontSize: 11,
        fontFamily: FONTS.mono,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: COLORS.textSecondary,
    },

    // Code area
    codeScroll: {
        backgroundColor: '#1e1e1e',
    },
    codeContent: {
        padding: 16,
    },
    highlighter: {
        margin: 0,
        padding: 0,
        backgroundColor: 'transparent',
    },
    code: {
        fontFamily: FONTS.mono,
        fontSize: 14,
        lineHeight: 22,
    },
});

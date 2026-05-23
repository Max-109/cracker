/**
 * CodeBlock - mobile parity with web code blocks.
 *
 * Uses refractor directly instead of react-native-syntax-highlighter.
 * That keeps broad Prism language support without the old RN adapter crash path.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Clipboard, StyleSheet, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as refractor from 'refractor';
import { useTheme, type ThemeColors } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

interface CodeBlockProps {
    language: string;
    value: string;
}

type RefractorNode = refractor.RefractorNode;

const normalizeLanguage = (language?: string) => {
    const normalized = (language || 'text').trim().toLowerCase();

    // Common aliases Prism users type in fenced blocks.
    switch (normalized) {
        case 'js':
        case 'mjs':
        case 'cjs':
            return 'javascript';
        case 'ts':
            return 'typescript';
        case 'rs':
            return 'rust';
        case 'sh':
        case 'shell':
        case 'zsh':
            return 'bash';
        case 'py':
            return 'python';
        case 'rb':
            return 'ruby';
        case 'yml':
            return 'yaml';
        case 'md':
            return 'markdown';
        case 'docker':
            return 'dockerfile';
        case 'c++':
            return 'cpp';
        case 'c#':
        case 'cs':
            return 'csharp';
        default:
            return normalized || 'text';
    }
};

const getSafePrismLanguage = (language?: string) => {
    const normalized = normalizeLanguage(language);

    if (normalized === 'text' || normalized === 'plain' || normalized === 'plaintext') return null;

    try {
        return refractor.registered(normalized) ? normalized : null;
    } catch {
        return null;
    }
};

const getTokenStyle = (classNames: string[] = [], theme: ThemeColors): TextStyle | undefined => {
    const classes = classNames.filter((name) => name !== 'token');
    const has = (...names: string[]) => classes.some((name) => names.includes(name));

    if (has('comment', 'prolog', 'doctype', 'cdata')) {
        return { color: theme.syntaxComment, fontStyle: 'italic' };
    }

    if (has('property', 'tag', 'symbol', 'inserted', 'variable', 'regex', 'constant')) {
        return { color: theme.syntaxPrimary };
    }

    if (has('function', 'function-variable', 'method', 'atrule')) {
        return { color: theme.syntaxFunction };
    }

    if (has('keyword', 'important', 'deleted')) {
        return { color: theme.syntaxKeyword };
    }

    if (has('operator', 'entity')) {
        return { color: theme.syntaxOperator };
    }

    if (has('string', 'char', 'url', 'attr-value')) {
        return { color: theme.syntaxString };
    }

    if (has('number', 'boolean')) {
        return { color: theme.syntaxNumber };
    }

    if (has('selector', 'attr-name', 'builtin', 'class-name', 'maybe-class-name', 'type')) {
        return { color: theme.syntaxClass };
    }

    if (has('punctuation')) {
        return { color: theme.syntaxPunctuation };
    }

    return undefined;
};

const renderNode = (node: RefractorNode, theme: ThemeColors, key: string): React.ReactNode => {
    if (node.type === 'text') return node.value || '';

    const children = (node.children || []).map((child, index) => renderNode(child, theme, `${key}-${index}`));
    const tokenStyle = getTokenStyle(node.properties?.className, theme);

    if (!tokenStyle) return <React.Fragment key={key}>{children}</React.Fragment>;

    return (
        <Text key={key} style={tokenStyle}>
            {children}
        </Text>
    );
};

const highlightCode = (code: string, language: string | null, theme: ThemeColors) => {
    if (!language) return code;

    try {
        const tree = refractor.highlight(code, language);
        const nodes = Array.isArray(tree) ? tree : tree.children || [];
        return nodes.map((node, index) => renderNode(node, theme, `code-${index}`));
    } catch {
        return code;
    }
};

export default function CodeBlock({ language, value }: CodeBlockProps) {
    const theme = useTheme();
    const [copied, setCopied] = useState(false);

    const code = useMemo(() => value.replace(/\n$/, ''), [value]);
    const prismLanguage = useMemo(() => getSafePrismLanguage(language), [language]);
    const highlightedCode = useMemo(
        () => highlightCode(code, prismLanguage, theme),
        [
            code,
            prismLanguage,
            theme.syntaxPrimary,
            theme.syntaxFunction,
            theme.syntaxKeyword,
            theme.syntaxString,
            theme.syntaxNumber,
            theme.syntaxClass,
            theme.syntaxComment,
            theme.syntaxOperator,
            theme.syntaxPunctuation,
        ],
    );

    const handleCopy = useCallback(async () => {
        try {
            Clipboard.setString(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    }, [value]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.languageLabel, { color: theme.accent }]}>
                    {language || 'code'}
                </Text>

                <TouchableOpacity
                    onPress={handleCopy}
                    style={styles.copyButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={copied ? theme.accent : COLORS.textSecondary}
                    />
                    <Text style={[styles.copyText, copied && { color: theme.accent }]}>
                        {copied ? 'Copied' : 'Copy'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.codeScroll}
                contentContainerStyle={styles.codeContent}
            >
                <Text style={styles.codeText} selectable>
                    {highlightedCode}
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCode,
        overflow: 'hidden',
        borderRadius: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.bgSidebar,
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
        letterSpacing: 1.8,
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
        letterSpacing: 1.8,
        color: COLORS.textSecondary,
    },
    codeScroll: {
        backgroundColor: COLORS.bgCode,
    },
    codeContent: {
        padding: 20,
    },
    codeText: {
        fontFamily: FONTS.mono,
        fontSize: 14,
        lineHeight: 22,
        color: '#c9d1d9',
    },
});

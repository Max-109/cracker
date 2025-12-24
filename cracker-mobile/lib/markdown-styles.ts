/**
 * Markdown Styles - EXACT match to web MessageItem.tsx markdownComponents
 * 
 * Source: app/components/MessageItem.tsx lines 502-557
 * 
 * These styles are used by react-native-markdown-display to render
 * markdown content with the same visual appearance as the web version.
 */

import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS } from './design';

// Get accent color from theme (will be overridden at runtime)
const ACCENT_COLOR = '#a855f7'; // Default purple, overridden by theme

/**
 * Creates markdown styles with the current accent color
 * Call this function with the theme accent to get themed styles
 */
export const createMarkdownStyles = (accent: string = ACCENT_COLOR) => StyleSheet.create({
    // Root container
    body: {
        color: '#E5E5E5',
        fontSize: 15,
        lineHeight: 24,
    },

    // Paragraphs - web: "mb-3 last:mb-0 leading-relaxed text-[#E5E5E5]"
    paragraph: {
        marginBottom: 12,
        color: '#E5E5E5',
        lineHeight: 24,
    },

    // Headers - web uses font-bold, tracking-tight
    heading1: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        marginTop: 24,
        color: '#E5E5E5',
        letterSpacing: -0.5,
    },
    heading2: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        marginTop: 20,
        color: '#E5E5E5',
        letterSpacing: -0.3,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 16,
        color: '#E5E5E5',
        letterSpacing: -0.2,
    },
    heading4: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
        color: '#E5E5E5',
    },
    heading5: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
        color: '#E5E5E5',
    },
    heading6: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
        color: '#E5E5E5',
    },

    // Strong/Bold - web: "font-semibold text-[var(--text-accent)]"
    strong: {
        fontWeight: '600',
        color: accent,
    },

    // Emphasis/Italic
    em: {
        fontStyle: 'italic',
        color: '#E5E5E5',
    },

    // Delete/Strikethrough
    s: {
        textDecorationLine: 'line-through',
        color: COLORS.textSecondary,
    },

    // Lists - web: "list-disc pl-4 mb-4 space-y-1 marker:text-[var(--text-accent)]"
    bullet_list: {
        marginBottom: 16,
        paddingLeft: 16,
    },
    ordered_list: {
        marginBottom: 16,
        paddingLeft: 16,
    },
    list_item: {
        marginBottom: 4,
        flexDirection: 'row',
    },
    bullet_list_icon: {
        color: accent,
        marginRight: 8,
        fontSize: 8,
        lineHeight: 24,
    },
    ordered_list_icon: {
        color: accent,
        marginRight: 8,
        fontSize: 14,
        lineHeight: 24,
        fontFamily: FONTS.mono,
    },

    // Blockquote - web: "border-l-2 border-[var(--text-accent)]/70 pl-4 py-2 bg-[#141414]"
    blockquote: {
        borderLeftWidth: 2,
        borderLeftColor: `${accent}B3`, // 70% opacity
        paddingLeft: 16,
        paddingVertical: 8,
        backgroundColor: '#141414',
        marginVertical: 16,
    },

    // Inline code - web: "bg-[var(--bg-code)] border px-1.5 py-[2px] text-sm font-mono text-[var(--text-accent)]"
    code_inline: {
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontFamily: FONTS.mono,
        fontSize: 13,
        color: accent,
        borderRadius: 2,
    },

    // Code blocks - will be replaced by CodeBlock component
    fence: {
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginVertical: 16,
        borderRadius: 0,
    },
    code_block: {
        backgroundColor: '#1e1e1e',
        fontFamily: FONTS.mono,
        fontSize: 14,
        color: '#c9d1d9',
        lineHeight: 22,
    },

    // Links - web uses accent color with external icon
    link: {
        color: accent,
        textDecorationLine: 'none',
    },

    // Tables - web: bordered, striped, scrollable
    table: {
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#141414',
        marginVertical: 16,
    },
    thead: {
        backgroundColor: '#222222',
    },
    tbody: {},
    th: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontWeight: '500',
        color: COLORS.textSecondary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tr: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    td: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#E5E5E5',
    },

    // Horizontal rule
    hr: {
        backgroundColor: COLORS.border,
        height: 1,
        marginVertical: 16,
    },

    // Images
    image: {
        marginVertical: 8,
        borderRadius: 4,
    },
});

/**
 * LaTeX preprocessing - EXACT match to web preprocessLaTeX function
 * Source: app/components/MessageItem.tsx lines 270-278
 * 
 * Converts LaTeX delimiters:
 * - \[ ... \] → $$ ... $$ (Block Math)
 * - \( ... \) → $ ... $ (Inline Math)
 */
export const preprocessLaTeX = (content: string): string => {
    if (!content) return content;

    // 1. Replace \[ ... \] with $$ ... $$ (Block Math)
    let processed = content.replace(/\\\[([\\s\\S]*?)\\\]/g, '\n$$$1$$\n');

    // 2. Replace \( ... \) with $ ... $ (Inline Math)
    processed = processed.replace(/\\\(([\\s\\S]*?)\\\)/g, '$$$1$$');

    return processed;
};

export default createMarkdownStyles;

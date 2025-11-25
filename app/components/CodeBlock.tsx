'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cn } from '@/lib/utils';

// Base theme - accent colors will be overridden by CSS variables in globals.css
const baseTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
        color: '#c9d1d9',
        background: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        lineHeight: '1.5',
        tabSize: 4,
        hyphens: 'none',
    },
    'pre[class*="language-"]': {
        color: '#c9d1d9',
        background: 'transparent',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        lineHeight: '1.5',
        tabSize: 4,
        hyphens: 'none',
        padding: '1.25rem',
        margin: 0,
        overflow: 'auto',
    },
    'comment': { color: '#484f58', fontStyle: 'italic' },
    'prolog': { color: '#484f58' },
    'doctype': { color: '#484f58' },
    'cdata': { color: '#484f58' },
    'punctuation': { color: '#6e7681' },
    'property': { color: 'inherit' },
    'tag': { color: 'inherit' },
    'symbol': { color: 'inherit' },
    'deleted': { color: '#ff7b72' },
    'important': { color: '#ff7b72' },
    'boolean': { color: '#79c0ff' },
    'number': { color: '#79c0ff' },
    'constant': { color: '#79c0ff' },
    'selector': { color: '#ffa657' },
    'attr-name': { color: '#ffa657' },
    'string': { color: '#a5d6ff' },
    'char': { color: '#a5d6ff' },
    'builtin': { color: '#ffa657' },
    'inserted': { color: 'inherit' },
    'operator': { color: '#ff7b72' },
    'entity': { color: '#c9d1d9' },
    'url': { color: '#a5d6ff' },
    'variable': { color: 'inherit' },
    'atrule': { color: '#d2a8ff' },
    'attr-value': { color: '#a5d6ff' },
    'function': { color: '#d2a8ff' },
    'class-name': { color: '#ffa657' },
    'keyword': { color: '#ff7b72' },
    'regex': { color: 'inherit' },
    'parameter': { color: '#c9d1d9' },
    'maybe-class-name': { color: '#ffa657' },
    'script': { color: '#c9d1d9' },
    'plain': { color: '#c9d1d9' },
    'bold': { fontWeight: 'bold' },
    'italic': { fontStyle: 'italic' },
    'namespace': { opacity: 0.7 },
};

interface CodeBlockProps {
    language: string;
    value: string;
    className?: string;
}

export const CodeBlock = React.memo(function CodeBlock({ language, value, className }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className={cn("relative w-full overflow-hidden my-4 border border-[var(--border-color)] bg-[var(--bg-code)]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between bg-[var(--bg-sidebar)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] select-none text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <span className="font-semibold text-[var(--text-accent)]">{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors duration-150 focus:outline-none"
                    aria-label={isCopied ? "Copied" : "Copy code"}
                >
                    <div className="relative w-3.5 h-3.5">
                        <Copy
                            size={14}
                            className={cn(
                                "absolute top-0 left-0 transition-all duration-150",
                                isCopied ? "opacity-0 scale-0 rotate-90" : "opacity-100 scale-100 rotate-0"
                            )}
                        />
                        <Check
                            size={14}
                            className={cn(
                                "absolute top-0 left-0 transition-all duration-150 text-[var(--text-accent)]",
                                isCopied ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 -rotate-90"
                            )}
                        />
                    </div>
                    <span className={cn("transition-all duration-150", isCopied ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                        Copy
                    </span>
                </button>
            </div>

            {/* Code Content */}
            <div className="relative bg-[var(--bg-code)] syntax-highlight">
                <SyntaxHighlighter
                    language={language}
                    style={baseTheme}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        padding: '1.25rem',
                        background: 'transparent',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        borderRadius: 0,
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'inherit',
                        }
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
});

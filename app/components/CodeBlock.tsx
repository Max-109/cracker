'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

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
        <div className={cn("relative w-full overflow-hidden my-4 border border-[var(--border-color)] bg-[#141414]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2 text-[11px] uppercase tracking-[0.16em] select-none text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-accent)]">{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 focus:outline-none"
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
                                "absolute top-0 left-0 transition-all duration-150",
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
            <div className="relative bg-[#141414]">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        padding: '1.25rem',
                        background: 'transparent',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        borderRadius: 0,
                        color: '#E5E5E5',
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

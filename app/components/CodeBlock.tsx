'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    language: string;
    value: string;
    className?: string;
}

export const CodeBlock = React.memo(function CodeBlock({ language, value, className }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [showStickyButton, setShowStickyButton] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        const header = headerRef.current;
        const container = containerRef.current;
        if (!header || !container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show sticky button when header is not visible AND code block is partially visible
                setShowStickyButton(!entry.isIntersecting);
            },
            {
                root: null,
                rootMargin: '-56px 0px 0px 0px', // Account for top bar height
                threshold: 0,
            }
        );

        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    const CopyButton = ({ sticky = false }: { sticky?: boolean }) => (
        <button
            onClick={handleCopy}
            className={cn(
                "flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all duration-150 focus:outline-none",
                sticky && "bg-[var(--bg-sidebar)] border border-[var(--border-color)] px-2 py-1.5 hover:border-[var(--border-active)]"
            )}
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
            <span className={cn(
                "text-[11px] uppercase tracking-[0.16em] transition-all duration-150",
                isCopied ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
            )}>
                Copy
            </span>
        </button>
    );

    return (
        <div ref={containerRef} className={cn("relative w-full overflow-hidden my-4 border border-[var(--border-color)] bg-[var(--bg-code)]", className)}>
            {/* Sticky Copy Button - appears when header scrolls out of view */}
            <div
                className={cn(
                    "fixed top-16 right-4 z-40 transition-all duration-200",
                    showStickyButton ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                )}
            >
                <CopyButton sticky />
            </div>

            {/* Header */}
            <div ref={headerRef} className="flex items-center justify-between bg-[var(--bg-sidebar)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] select-none text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <span className="font-semibold text-[var(--text-accent)]">{language || 'code'}</span>
                <CopyButton />
            </div>

            {/* Code Content */}
            <div className="relative bg-[var(--bg-code)] syntax-highlight">
                <SyntaxHighlighter
                    language={language}
                    useInlineStyles={false}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        padding: '1.25rem',
                        background: 'transparent',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        borderRadius: 0,
                        fontFamily: 'var(--font-mono)',
                        color: '#c9d1d9',
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

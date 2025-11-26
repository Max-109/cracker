'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, Copy, WrapText, AlignLeft } from 'lucide-react';
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
    const [isWrapped, setIsWrapped] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const toggleWrap = () => setIsWrapped(!isWrapped);

    useEffect(() => {
        const header = headerRef.current;
        const container = containerRef.current;
        if (!header || !container) return;

        const checkVisibility = () => {
            const headerRect = header.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const topBarHeight = 56;
            
            // Show sticky buttons only when:
            // 1. Header is scrolled above the top bar (not visible)
            // 2. AND the code block is still partially visible on screen
            const headerIsAboveViewport = headerRect.bottom < topBarHeight;
            const containerIsVisible = containerRect.bottom > topBarHeight && containerRect.top < window.innerHeight;
            
            setShowStickyButton(headerIsAboveViewport && containerIsVisible);
        };

        // Use both IntersectionObserver and scroll listener for accuracy
        const observer = new IntersectionObserver(
            () => checkVisibility(),
            {
                root: null,
                rootMargin: '-56px 0px 0px 0px',
                threshold: [0, 0.1, 0.5, 1],
            }
        );

        observer.observe(header);
        observer.observe(container);
        
        // Also listen to scroll for more responsive updates
        window.addEventListener('scroll', checkVisibility, { passive: true });
        
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', checkVisibility);
        };
    }, []);

    return (
        <div ref={containerRef} className={cn("relative w-full overflow-hidden my-4 border border-[var(--border-color)] bg-[var(--bg-code)]", className)}>
            {/* Sticky Buttons - appears when header scrolls out of view but code is still visible */}
            <div
                className={cn(
                    "fixed top-16 right-4 z-40 transition-all duration-200 flex gap-2",
                    showStickyButton ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                )}
            >
                <button
                    onClick={toggleWrap}
                    className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] px-2 py-1.5 hover:border-[var(--border-active)] flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all duration-150"
                    title={isWrapped ? "Unwrap code" : "Wrap code"}
                >
                    {isWrapped ? <AlignLeft size={14} /> : <WrapText size={14} />}
                    <span className="text-[11px] uppercase tracking-[0.16em]">
                        {isWrapped ? 'Unwrap' : 'Wrap'}
                    </span>
                </button>
                <button
                    onClick={handleCopy}
                    className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] px-2 py-1.5 hover:border-[var(--border-active)] flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all duration-150 focus:outline-none"
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
            </div>

            {/* Header */}
            <div ref={headerRef} className="flex items-center justify-between bg-[var(--bg-sidebar)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] select-none text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <span className="font-semibold text-[var(--text-accent)]">{language || 'code'}</span>
                <div className="flex items-center gap-4">
                    {/* Wrap Button */}
                    <button
                        onClick={toggleWrap}
                        className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all duration-150 focus:outline-none"
                        aria-label={isWrapped ? "Unwrap code" : "Wrap code"}
                        title={isWrapped ? "Unwrap code" : "Wrap code"}
                    >
                        {isWrapped ? <AlignLeft size={14} /> : <WrapText size={14} />}
                        <span className="text-[11px] uppercase tracking-[0.16em]">
                            {isWrapped ? 'Unwrap' : 'Wrap'}
                        </span>
                    </button>
                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all duration-150 focus:outline-none"
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
                </div>
            </div>

            {/* Code Content */}
            <div 
                className={cn(
                    "relative bg-[var(--bg-code)] syntax-highlight",
                    isWrapped ? "code-wrap-enabled" : "overflow-x-auto scrollbar-custom"
                )}
            >
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

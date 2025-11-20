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
        <div className={cn("relative w-full rounded-lg overflow-hidden my-4 border border-[#424242]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between bg-[#2d2d2d] px-4 py-2 text-xs text-gray-400 select-none">
                <span className="lowercase font-sans">{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 hover:text-white transition-all duration-200 focus:outline-none"
                    aria-label={isCopied ? "Copied" : "Copy code"}
                >
                    <div className="relative w-3.5 h-3.5">
                        <Copy
                            size={14}
                            className={cn(
                                "absolute top-0 left-0 transition-all duration-200",
                                isCopied ? "opacity-0 scale-0 rotate-90" : "opacity-100 scale-100 rotate-0"
                            )}
                        />
                        <Check
                            size={14}
                            className={cn(
                                "absolute top-0 left-0 transition-all duration-200",
                                isCopied ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 -rotate-90"
                            )}
                        />
                    </div>
                    <span className={cn("transition-all duration-200", isCopied ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                        Copy
                    </span>
                </button>
            </div>

            {/* Code Content */}
            <div className="relative bg-[#1e1e1e]">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
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

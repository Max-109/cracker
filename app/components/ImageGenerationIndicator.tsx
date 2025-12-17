'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGenerationIndicatorProps {
    isGenerating?: boolean;
    className?: string;
}

// Animated labels for generating state
const GENERATION_LABELS = [
    "Rendering",
    "Composing",
    "Painting",
    "Imaging",
    "Creating",
    "Crafting",
    "Generating",
    "Visualizing"
];

export function ImageGenerationIndicator({ isGenerating = true, className }: ImageGenerationIndicatorProps) {
    const [labelIndex, setLabelIndex] = React.useState(0);

    // Cycle through labels while generating
    React.useEffect(() => {
        if (!isGenerating) return;

        const interval = setInterval(() => {
            setLabelIndex(prev => (prev + 1) % GENERATION_LABELS.length);
        }, 1200);

        return () => clearInterval(interval);
    }, [isGenerating]);

    if (!isGenerating) return null;

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {/* Icon container with pulse animation */}
            <div className="relative">
                <div className="w-8 h-8 border border-[var(--text-accent)] bg-[var(--text-accent)]/10 flex items-center justify-center">
                    <ImageIcon size={16} className="text-[var(--text-accent)]" />
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 border border-[var(--text-accent)] animate-ping opacity-30" />
            </div>

            {/* Label with fade transition */}
            <div className="flex flex-col gap-0.5">
                <span
                    key={labelIndex}
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-accent)] animate-in fade-in duration-300"
                >
                    {GENERATION_LABELS[labelIndex]}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                    Creating image...
                </span>
            </div>

            {/* Progress bars animation */}
            <div className="flex items-end gap-0.5 h-4 ml-auto">
                {[1, 2, 3, 4].map((bar) => (
                    <div
                        key={bar}
                        className="w-1 bg-[var(--text-accent)] animate-pulse"
                        style={{
                            height: `${bar * 4}px`,
                            animationDelay: `${bar * 150}ms`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default ImageGenerationIndicator;

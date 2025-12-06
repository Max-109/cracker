'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    const [scale, setScale] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setRotation(0);
        }
    }, [isOpen]);

    // Handle escape key and body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.25, 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    }, []);

    const handleRotate = useCallback(() => {
        setRotation(prev => (prev + 90) % 360);
    }, []);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        // Only close if clicking the backdrop, not the image container
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden backdrop-blur-[2px] animate-in fade-in duration-200"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
            onClick={handleBackdropClick}
        >
            {/* Image container with close button positioned relative to it */}
            <div
                ref={imageContainerRef}
                className="relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button - top right of the image */}
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-[#1a1a1a] hover:bg-[var(--text-accent)] border border-[var(--border-color)] hover:border-[var(--text-accent)] text-[var(--text-secondary)] hover:text-black flex items-center justify-center transition-all duration-150 z-10 rounded-full shadow-lg"
                    aria-label="Close"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>

                {/* The image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt || 'Preview'}
                    className="rounded-lg shadow-2xl select-none border border-white/10"
                    style={{
                        maxWidth: '70vw',
                        maxHeight: '70vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-out',
                    }}
                    draggable={false}
                />

                {/* Filename label - below the image */}
                {alt && alt !== 'Preview' && (
                    <div className="absolute -bottom-8 left-0 right-0 text-center">
                        <span className="text-xs text-white/50 truncate max-w-full inline-block">
                            {alt}
                        </span>
                    </div>
                )}
            </div>

            {/* Controls - bottom center */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1a1a1a]/90 border border-[var(--border-color)] px-4 py-2 backdrop-blur-sm z-[10000] rounded-full">
                <button
                    onClick={handleZoomOut}
                    disabled={scale <= 0.5}
                    className={cn(
                        "w-8 h-8 flex items-center justify-center transition-all duration-150 rounded-full",
                        scale <= 0.5
                            ? "text-[var(--text-secondary)]/30 cursor-not-allowed"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-accent)] hover:bg-white/5"
                    )}
                    aria-label="Zoom out"
                >
                    <ZoomOut size={18} />
                </button>

                <span className="text-xs text-[var(--text-secondary)] font-mono min-w-[45px] text-center select-none">
                    {Math.round(scale * 100)}%
                </span>

                <button
                    onClick={handleZoomIn}
                    disabled={scale >= 3}
                    className={cn(
                        "w-8 h-8 flex items-center justify-center transition-all duration-150 rounded-full",
                        scale >= 3
                            ? "text-[var(--text-secondary)]/30 cursor-not-allowed"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-accent)] hover:bg-white/5"
                    )}
                    aria-label="Zoom in"
                >
                    <ZoomIn size={18} />
                </button>

                <div className="w-px h-4 bg-[var(--border-color)] mx-1" />

                <button
                    onClick={handleRotate}
                    className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-accent)] hover:bg-white/5 transition-all duration-150 rounded-full"
                    aria-label="Rotate"
                >
                    <RotateCw size={18} />
                </button>
            </div>
        </div>
    );
}

// Hook to manage lightbox state
export function useLightbox() {
    const [lightboxState, setLightboxState] = React.useState<{
        isOpen: boolean;
        src: string;
        alt?: string;
    }>({
        isOpen: false,
        src: '',
        alt: undefined,
    });

    const openLightbox = useCallback((src: string, alt?: string) => {
        setLightboxState({ isOpen: true, src, alt });
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        ...lightboxState,
        openLightbox,
        closeLightbox,
    };
}

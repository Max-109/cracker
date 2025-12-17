'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false); // true = visible state, false = hidden state
    const [isClosing, setIsClosing] = useState(false);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Handle open with animation
    useEffect(() => {
        if (isOpen && !isVisible) {
            // Mount the component first
            setIsVisible(true);
            setIsClosing(false);
            setScale(1);
            setRotation(0);
            // Then trigger animation on next frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        }
    }, [isOpen, isVisible]);

    // Handle escape key and body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isVisible]);

    const handleClose = useCallback(() => {
        setIsAnimating(false); // Trigger exit animation
        // Wait for animation to complete before actually closing
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 150);
    }, [onClose]);

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
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }, [handleClose]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden backdrop-blur-[2px] transition-opacity duration-150",
                isAnimating ? "opacity-100" : "opacity-0"
            )}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
            onClick={handleBackdropClick}
        >
            {/* Image container with close button */}
            <div
                ref={imageContainerRef}
                className={cn(
                    "relative transition-all duration-150",
                    isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button - top right of the image */}
                <button
                    onClick={handleClose}
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
                    style={{
                        maxWidth: '70vw',
                        maxHeight: '70vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-out',
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
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
            <div
                className={cn(
                    "fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1a1a1a]/90 border border-[var(--border-color)] px-4 py-2 backdrop-blur-sm z-[10000] rounded-full transition-all duration-150",
                    isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
            >
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
    const [lightboxState, setLightboxState] = useState<{
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

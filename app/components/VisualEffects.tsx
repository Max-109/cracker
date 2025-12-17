'use client';

// import { useSettings } from '../hooks/usePersistedSettings';
import { useEffect, useState } from 'react';

export function VisualEffects() {
    // Only show effects if not disabled (could be a setting later, for now always on)
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
            {/* Noise Texture */}
            <div
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    transform: 'translateZ(0)', // Force hardware acceleration
                }}
            />

            {/* Vignette */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
                    pointerEvents: 'none'
                }}
            />

            {/* Scanner Line */}
            <div
                className="absolute top-0 left-0 right-0 h-[1px] bg-[var(--text-accent)] opacity-20 shadow-[0_0_10px_var(--text-accent)] animate-[scan_8s_ease-in-out_infinite]"
                style={{ pointerEvents: 'none' }}
            />
        </div>
    );
}

// Hook stub if we want to add settings control later
// function useSettings() {
//     return { visualEffects: true };
// }

import { create } from 'zustand';
import { useSettingsStore } from './settings';

// Utility to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : { r: 175, g: 135, b: 135 }; // Default to accent color
}

// Check if color is light
function isLightColor(hex: string): boolean {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

export interface ThemeColors {
    // Accent color variants
    accent: string;
    accentRgb: string;
    accentLight: string;
    accentMedium: string;
    textOnAccent: string;

    // Background colors
    bgMain: string;
    bgSidebar: string;
    bgInput: string;
    bgCode: string;

    // Border colors
    border: string;
    borderActive: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
}

interface ThemeState {
    colors: ThemeColors;
    computeColors: (accentColor: string) => ThemeColors;
}

const computeColors = (accent: string): ThemeColors => {
    const { r, g, b } = hexToRgb(accent);

    return {
        // Accent variants
        accent,
        accentRgb: `${r}, ${g}, ${b}`,
        accentLight: `rgba(${r}, ${g}, ${b}, 0.125)`,
        accentMedium: `rgba(${r}, ${g}, ${b}, 0.5)`,
        textOnAccent: isLightColor(accent) ? '#000000' : '#ffffff',

        // Backgrounds (dark mode only)
        bgMain: '#0f0f0f',
        bgSidebar: '#141414',
        bgInput: '#1a1a1a',
        bgCode: '#0d0d0d',

        // Borders
        border: '#2a2a2a',
        borderActive: accent,

        // Text
        textPrimary: '#e5e5e5',
        textSecondary: '#888888',
    };
};

export const useThemeStore = create<ThemeState>(() => ({
    colors: computeColors('#af8787'),
    computeColors,
}));

// Hook to get theme colors (recomputes when accent changes)
export const useTheme = () => {
    const accentColor = useSettingsStore((s) => s.accentColor);
    const { computeColors } = useThemeStore();
    return computeColors(accentColor);
};

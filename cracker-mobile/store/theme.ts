import { create } from 'zustand';
import type { MMKV } from 'react-native-mmkv';
import { useSettingsStore } from './settings';

// Get cached accent color at module load for instant theme
let initialAccentColor = '#af8787';
try {
    const m = require('react-native-mmkv');
    const storage = new m.MMKV() as MMKV;
    const cachedColor = storage.getString('accentColor');
    if (cachedColor) {
        initialAccentColor = cachedColor;
    }
} catch {
    // Silent fail - use default
}

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

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function adjustColor(hex: string, hueShift: number, satMult: number): string {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    hsl.h = (hsl.h + hueShift + 360) % 360;
    hsl.s = Math.min(100, Math.max(0, hsl.s * satMult));

    return hslToHex(hsl.h, hsl.s, hsl.l);
}

export interface ThemeColors {
    // Accent color variants
    accent: string;
    accentRgb: string;
    accentLight: string;
    accentMedium: string;
    textOnAccent: string;

    // Syntax colors - matches web SettingsContext/globals.css derivation
    syntaxPrimary: string;
    syntaxFunction: string;
    syntaxKeyword: string;
    syntaxString: string;
    syntaxNumber: string;
    syntaxClass: string;
    syntaxComment: string;
    syntaxOperator: string;
    syntaxPunctuation: string;

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

        // Syntax highlighting derived colors (same shifts as web)
        syntaxPrimary: accent,
        syntaxFunction: adjustColor(accent, 30, 1.2),
        syntaxKeyword: adjustColor(accent, -30, 1.1),
        syntaxString: adjustColor(accent, 180, 0.9),
        syntaxNumber: adjustColor(accent, 200, 1.0),
        syntaxClass: adjustColor(accent, 40, 1.15),
        syntaxComment: '#484f58',
        syntaxOperator: '#ff7b72',
        syntaxPunctuation: '#6e7681',

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
    colors: computeColors(initialAccentColor),
    computeColors,
}));

// Hook to get theme colors (recomputes when accent changes)
export const useTheme = () => {
    const accentColor = useSettingsStore((s) => s.accentColor);
    const { computeColors } = useThemeStore();
    return computeColors(accentColor);
};

/**
 * Icon Matcher Utility
 * Maps user-selected accent colors to the closest preset icon
 * 
 * Since Android requires icons to be pre-bundled at build time,
 * we have 7 preset icons matching the accent color presets.
 * When a custom color is selected, we find the closest preset.
 */

// Preset accent colors matching the icons we generated
export const ACCENT_TO_ICON: Record<string, string> = {
    '#af8787': 'icon_rose',
    '#87af87': 'icon_sage',
    '#8787af': 'icon_lavender',
    '#afaf87': 'icon_wheat',
    '#87afaf': 'icon_teal',
    '#af87af': 'icon_mauve',
    '#f87171': 'icon_coral',
};

// Default icon to use
export const DEFAULT_ICON = 'icon_rose';

// All available icon names (for validation)
export const ICON_NAMES = Object.values(ACCENT_TO_ICON);

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16),
    };
}

/**
 * Calculate Euclidean distance between two colors in RGB space
 */
function colorDistance(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number }
): number {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Find the closest preset icon for a given accent color
 * Uses Euclidean distance in RGB color space
 * 
 * @param accentColor - Hex color string (e.g., "#87af87")
 * @returns The icon name for the closest preset (e.g., "icon_sage")
 */
export function getClosestIconName(accentColor: string): string {
    // Check if it's an exact match first
    const exactMatch = ACCENT_TO_ICON[accentColor.toLowerCase()];
    if (exactMatch) {
        return exactMatch;
    }

    // Find closest by color distance
    const targetRgb = hexToRgb(accentColor);
    let closestIcon = DEFAULT_ICON;
    let minDistance = Infinity;

    for (const [presetColor, iconName] of Object.entries(ACCENT_TO_ICON)) {
        const presetRgb = hexToRgb(presetColor);
        const distance = colorDistance(targetRgb, presetRgb);

        if (distance < minDistance) {
            minDistance = distance;
            closestIcon = iconName;
        }
    }

    return closestIcon;
}

/**
 * Try to set the app icon using @variant-systems/expo-dynamic-app-icon
 * Falls back silently if the package is not available
 */
export async function setAppIconSafe(iconName: string): Promise<boolean> {
    try {
        // Default export from the package
        const ExpoDynamicAppIcon = require('@variant-systems/expo-dynamic-app-icon').default;

        console.log('[IconMatcher] Setting app icon to:', iconName);
        ExpoDynamicAppIcon.setAppIcon(iconName);
        return true;
    } catch (error) {
        // Package not available
        console.log('[IconMatcher] Dynamic icon not available:', error);
        return false;
    }
}

/**
 * Update app icon based on accent color
 * Finds closest preset and sets the icon
 */
export async function updateAppIconForColor(accentColor: string): Promise<boolean> {
    const iconName = getClosestIconName(accentColor);
    return setAppIconSafe(iconName);
}

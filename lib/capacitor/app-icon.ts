// Capacitor plugin wrapper for dynamic app icon switching
// This only works in the Android app, not in the browser

declare global {
    interface Window {
        Capacitor?: {
            isNativePlatform: () => boolean;
            Plugins: {
                AppIcon?: {
                    setIcon: (options: { color: string }) => Promise<{ success: boolean; icon: string }>;
                    getCurrentIcon: () => Promise<{ icon: string }>;
                };
            };
        };
    }
}

/**
 * Check if we're running in a Capacitor native app
 */
export function isCapacitorApp(): boolean {
    return typeof window !== 'undefined' &&
        window.Capacitor?.isNativePlatform?.() === true;
}

/**
 * Set the app icon based on the accent color
 * On Android, this will switch between pre-built icon variants
 * The closest preset color will be used
 * 
 * @param color - Hex color string (e.g., "#af8787")
 */
export async function setAppIcon(color: string): Promise<boolean> {
    if (!isCapacitorApp()) {
        console.log('[AppIcon] Not running in Capacitor, skipping icon change');
        return false;
    }

    const AppIcon = window.Capacitor?.Plugins?.AppIcon;
    if (!AppIcon) {
        console.warn('[AppIcon] Plugin not available');
        return false;
    }

    try {
        const result = await AppIcon.setIcon({ color });
        console.log('[AppIcon] Icon changed to:', result.icon);
        return result.success;
    } catch (error) {
        console.error('[AppIcon] Failed to change icon:', error);
        return false;
    }
}

/**
 * Get the current app icon name
 */
export async function getCurrentAppIcon(): Promise<string | null> {
    if (!isCapacitorApp()) {
        return null;
    }

    const AppIcon = window.Capacitor?.Plugins?.AppIcon;
    if (!AppIcon) {
        return null;
    }

    try {
        const result = await AppIcon.getCurrentIcon();
        return result.icon;
    } catch (error) {
        console.error('[AppIcon] Failed to get current icon:', error);
        return null;
    }
}

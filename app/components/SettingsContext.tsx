'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface Settings {
  currentModelId: string;
  currentModelName: string;
  reasoningEffort: string;
  responseLength: number;
  learningMode: boolean;
  userName: string | null;
  userGender: string;
  accentColor: string;
}

const DEFAULT_SETTINGS: Settings = {
  currentModelId: 'google/gemini-3-pro-preview',
  currentModelName: 'Expert',
  reasoningEffort: 'medium',
  responseLength: 50,
  learningMode: false,
  userName: null,
  userGender: 'not-specified',
  accentColor: '#af8787',
};

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  isHydrated: boolean;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isHydrated: false,
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          currentModelId: data.currentModelId || DEFAULT_SETTINGS.currentModelId,
          currentModelName: data.currentModelName || DEFAULT_SETTINGS.currentModelName,
          reasoningEffort: data.reasoningEffort || DEFAULT_SETTINGS.reasoningEffort,
          responseLength: data.responseLength ?? DEFAULT_SETTINGS.responseLength,
          learningMode: data.learningMode ?? DEFAULT_SETTINGS.learningMode,
          userName: data.userName,
          userGender: data.userGender || DEFAULT_SETTINGS.userGender,
          accentColor: data.accentColor || DEFAULT_SETTINGS.accentColor,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [user]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    if (!user) return;

    // Optimistically update local state
    setSettings(prev => ({ ...prev, ...updates }));

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        // Revert on failure
        await fetchSettings();
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Revert on failure
      await fetchSettings();
    }
  }, [user, fetchSettings]);

  useEffect(() => {
    if (!authLoading) {
      fetchSettings();
    }
  }, [authLoading, fetchSettings]);

  // Apply accent color to CSS variables
  useEffect(() => {
    if (isHydrated && settings.accentColor) {
      document.documentElement.style.setProperty('--text-accent', settings.accentColor);
      document.documentElement.style.setProperty('--border-active', settings.accentColor);
      
      // Update syntax highlighting colors based on accent
      const hex = settings.accentColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const hsl = rgbToHsl(r, g, b);
      
      document.documentElement.style.setProperty('--accent-h', String(hsl.h));
      document.documentElement.style.setProperty('--accent-s', `${hsl.s}%`);
      document.documentElement.style.setProperty('--accent-l', `${hsl.l}%`);
      
      // Syntax highlighting derived colors
      document.documentElement.style.setProperty('--syntax-primary', settings.accentColor);
      document.documentElement.style.setProperty('--syntax-function', adjustColor(settings.accentColor, 30, 1.2));
      document.documentElement.style.setProperty('--syntax-keyword', adjustColor(settings.accentColor, -30, 1.1));
      document.documentElement.style.setProperty('--syntax-string', adjustColor(settings.accentColor, 180, 0.9));
      document.documentElement.style.setProperty('--syntax-number', adjustColor(settings.accentColor, 200, 1.0));
      document.documentElement.style.setProperty('--syntax-class', adjustColor(settings.accentColor, 40, 1.15));
    }
  }, [isHydrated, settings.accentColor]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, isHydrated, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

// Helper functions for color manipulation
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

function adjustColor(hex: string, hueShift: number, satMult: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  
  const hsl = rgbToHsl(r, g, b);
  hsl.h = (hsl.h + hueShift + 360) % 360;
  hsl.s = Math.min(100, Math.max(0, hsl.s * satMult));
  
  return hslToHex(hsl.h, hsl.s, hsl.l);
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

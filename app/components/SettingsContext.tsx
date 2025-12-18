'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { setAppIcon } from '@/lib/capacitor/app-icon';

// Chat mode type
export type ChatMode = 'chat' | 'image' | 'learning' | 'deep-search';

// Learning sub-mode type (used when chatMode === 'learning')
export type LearningSubMode = 'summary' | 'flashcard' | 'teaching';

// Account settings (saved to database)
interface AccountSettings {
  currentModelId: string;
  currentModelName: string;
  reasoningEffort: string;
  responseLength: number;
  learningMode: boolean;
  chatMode: ChatMode;
  learningSubMode: LearningSubMode;
  customInstructions: string | null;
  userName: string | null;
  userGender: string;
  enabledMcpServers: string[]; // MCP servers enabled for tool calling
  codeWrap: boolean; // Enable word wrap in code blocks
  autoScroll: boolean; // Enable auto-scroll during streaming
}

// Combined settings (account + browser-only)
interface Settings extends AccountSettings {
  accentColor: string; // Browser-only, stored in localStorage
}

const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  currentModelId: 'gemini-3-flash-preview',
  currentModelName: 'Expert',
  reasoningEffort: 'medium',
  responseLength: 30,
  learningMode: false,
  chatMode: 'chat',
  learningSubMode: 'teaching',
  customInstructions: null,
  userName: null,
  userGender: 'not-specified',
  enabledMcpServers: ['brave-search'], // Brave Search enabled by default
  codeWrap: true, // Code wrap enabled by default
  autoScroll: true, // Auto-scroll enabled by default
};

const DEFAULT_ACCENT_COLOR = '#af8787';
const ACCENT_COLOR_KEY = 'CRACKER_ACCENT_COLOR'; // Must match the inline script in layout.tsx
const LEARNING_MODE_KEY = 'CRACKER_LEARNING_MODE';
const LEARNING_SUB_MODE_KEY = 'CRACKER_LEARNING_SUB_MODE';

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  isHydrated: boolean;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

// Get accent color from localStorage (browser-only, exported for use in other components)
export function getAccentColorFromStorage(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCENT_COLOR;
  return localStorage.getItem(ACCENT_COLOR_KEY) || DEFAULT_ACCENT_COLOR;
}

// Get learning mode from localStorage (browser-only)
function getLearningModeFromStorage(): boolean {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_SETTINGS.learningMode;
  const stored = localStorage.getItem(LEARNING_MODE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_ACCOUNT_SETTINGS.learningMode;
}

// Get learning sub-mode from localStorage (browser-only)
function getLearningSubModeFromStorage(): LearningSubMode {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_SETTINGS.learningSubMode;
  return (localStorage.getItem(LEARNING_SUB_MODE_KEY) as LearningSubMode) || DEFAULT_ACCOUNT_SETTINGS.learningSubMode;
}

// Save accent color to localStorage and apply CSS vars
function saveAccentColor(color: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCENT_COLOR_KEY, color);
  applyAccentColorCSS(color);
}

// Save learning settings to localStorage
function saveLearningSettings(mode: boolean, subMode: LearningSubMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEARNING_MODE_KEY, JSON.stringify(mode));
  localStorage.setItem(LEARNING_SUB_MODE_KEY, subMode);
}

// Update favicon with accent color (exported for use in other components)
export function updateFavicon(color: string) {
  if (typeof window === 'undefined') return;

  const svg = `<svg width="32" height="32" viewBox="0 0 291 291" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.252" y="3.252" width="283.465" height="283.465" rx="60" ry="60" fill="#262626" stroke="#7c7c7c" stroke-width="6.5"/>
    <circle cx="144.985" cy="144.985" r="70.866" fill="${color}" stroke="#7c7c7c" stroke-width="6.5"/>
  </svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  // Remove ALL existing favicon links to prevent conflicts
  const existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
  existingLinks.forEach(link => link.remove());

  // Create a fresh favicon link
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = url;
  document.head.appendChild(link);
}

// Apply accent color CSS variables
function applyAccentColorCSS(color: string) {
  const root = document.documentElement;
  root.style.setProperty('--text-accent', color);
  root.style.setProperty('--border-active', color);

  // Update favicon with new accent color
  updateFavicon(color);

  // Update Android app icon (if running in Capacitor)
  setAppIcon(color).catch(() => {
    // Silently fail if not in Capacitor or plugin not available
  });

  // Parse hex to RGB then to HSL for derived colors
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Set RGB values for rgba() usage in CSS
  root.style.setProperty('--text-accent-rgb', `${r}, ${g}, ${b}`);

  const hsl = rgbToHsl(r, g, b);

  root.style.setProperty('--accent-h', String(hsl.h));
  root.style.setProperty('--accent-s', `${hsl.s}%`);
  root.style.setProperty('--accent-l', `${hsl.l}%`);

  // Syntax highlighting derived colors
  root.style.setProperty('--syntax-primary', color);
  root.style.setProperty('--syntax-function', adjustColor(color, 30, 1.2));
  root.style.setProperty('--syntax-keyword', adjustColor(color, -30, 1.1));
  root.style.setProperty('--syntax-string', adjustColor(color, 180, 0.9));
  root.style.setProperty('--syntax-number', adjustColor(color, 200, 1.0));
  root.style.setProperty('--syntax-class', adjustColor(color, 40, 1.15));
}

const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_ACCOUNT_SETTINGS,
  accentColor: DEFAULT_ACCENT_COLOR,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isHydrated: false,
  updateSettings: async () => { },
  refreshSettings: async () => { },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_ACCOUNT_SETTINGS,
    accentColor: typeof window !== 'undefined' ? getAccentColorFromStorage() : DEFAULT_ACCENT_COLOR,
    learningMode: typeof window !== 'undefined' ? getLearningModeFromStorage() : DEFAULT_ACCOUNT_SETTINGS.learningMode,
    learningSubMode: typeof window !== 'undefined' ? getLearningSubModeFromStorage() : DEFAULT_ACCOUNT_SETTINGS.learningSubMode,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load accent color from localStorage on mount (browser-only)
  useEffect(() => {
    const storedColor = getAccentColorFromStorage();
    const storedLearningMode = getLearningModeFromStorage();
    const storedSubMode = getLearningSubModeFromStorage();
    setSettings(prev => ({
      ...prev,
      accentColor: storedColor,
      learningMode: storedLearningMode,
      learningSubMode: storedSubMode
    }));
  }, []);

  const fetchSettings = useCallback(async () => {
    // Always keep the current accent color from localStorage
    const currentAccentColor = getAccentColorFromStorage();

    if (!user) {
      setSettings({
        ...DEFAULT_ACCOUNT_SETTINGS,
        accentColor: getAccentColorFromStorage(),
      });
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        // Derive chatMode from learningMode if not explicitly set (backward compatibility)
        let chatMode: ChatMode = data.chatMode || DEFAULT_ACCOUNT_SETTINGS.chatMode;
        if (!data.chatMode && data.learningMode) {
          chatMode = 'learning';
        }
        setSettings({
          currentModelId: data.currentModelId || DEFAULT_ACCOUNT_SETTINGS.currentModelId,
          currentModelName: data.currentModelName || DEFAULT_ACCOUNT_SETTINGS.currentModelName,
          reasoningEffort: data.reasoningEffort || DEFAULT_ACCOUNT_SETTINGS.reasoningEffort,
          responseLength: data.responseLength ?? DEFAULT_ACCOUNT_SETTINGS.responseLength,
          learningMode: chatMode === 'learning', // Sync with chatMode
          chatMode,
          learningSubMode: data.learningSubMode || DEFAULT_ACCOUNT_SETTINGS.learningSubMode,
          customInstructions: data.customInstructions || null,
          userName: data.userName,
          userGender: data.userGender || DEFAULT_ACCOUNT_SETTINGS.userGender,
          enabledMcpServers: Array.isArray(data.enabledMcpServers) ? data.enabledMcpServers : DEFAULT_ACCOUNT_SETTINGS.enabledMcpServers,
          codeWrap: data.codeWrap ?? DEFAULT_ACCOUNT_SETTINGS.codeWrap,
          autoScroll: data.autoScroll ?? DEFAULT_ACCOUNT_SETTINGS.autoScroll,
          accentColor: getAccentColorFromStorage(), // Always use fresh localStorage value
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      // Use functional update to ensure we get the latest accent color from storage
      // This prevents a race condition where accent color changes during the fetch
      setSettings(prev => ({
        ...prev,
        accentColor: getAccentColorFromStorage(),
      }));
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [user]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    // Handle accent color separately (localStorage only)
    if (updates.accentColor !== undefined) {
      saveAccentColor(updates.accentColor);
      setSettings(prev => ({ ...prev, accentColor: updates.accentColor! }));
      // Don't send accentColor to the API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accentColor: _accentColor, ...accountUpdates } = updates;
      updates = accountUpdates;
    }

    // Handle learning modes persistence (localStorage + DB)
    if (updates.learningMode !== undefined || updates.learningSubMode !== undefined) {
      const newMode = updates.learningMode ?? settings.learningMode;
      const newSubMode = updates.learningSubMode ?? settings.learningSubMode;
      saveLearningSettings(newMode, newSubMode);
      // We still want to send these to the API, so we don't remove them from updates
    }

    // If there are no account settings to update, we're done
    if (Object.keys(updates).length === 0) return;

    // For account settings, require authentication
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
  }, [authLoading, user, fetchSettings]);

  // Apply accent color to CSS variables when it changes
  useEffect(() => {
    if (isHydrated && settings.accentColor) {
      applyAccentColorCSS(settings.accentColor);
    }
  }, [isHydrated, settings.accentColor]);

  // Re-apply favicon on mount to handle client-side navigation
  // This ensures the favicon persists when switching between chats
  useEffect(() => {
    const storedColor = getAccentColorFromStorage();
    updateFavicon(storedColor);
  }, []);

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

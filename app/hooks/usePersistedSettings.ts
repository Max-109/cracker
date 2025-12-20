'use client';

import { useCallback } from 'react';
import { useSettings, ChatMode, LearningSubMode } from '@/app/components/SettingsContext';

export type ReasoningEffortLevel = 'low' | 'medium' | 'high';
export type { ChatMode, LearningSubMode } from '@/app/components/SettingsContext';

// Model settings hook - now uses SettingsContext
export function usePersistedSetting(key: string, fallback: string) {
  const { settings, updateSettings, isHydrated } = useSettings();

  // Map localStorage keys to settings fields
  const keyMap: Record<string, keyof typeof settings> = {
    'MODEL_ID': 'currentModelId',
    'MODEL_NAME': 'currentModelName',
    'REASONING_EFFORT': 'reasoningEffort',
    'ACCENT_COLOR': 'accentColor',
  };

  const settingsKey = keyMap[key];
  const value = settingsKey ? (settings[settingsKey] as string) ?? fallback : fallback;

  const updateValue = useCallback((nextValue: React.SetStateAction<string>) => {
    if (!settingsKey) return;
    const resolved = typeof nextValue === 'function'
      ? (nextValue as (val: string) => string)(value)
      : nextValue;
    updateSettings({ [settingsKey]: resolved });
  }, [settingsKey, value, updateSettings]);

  return [value, updateValue, isHydrated] as const;
}

// Response length settings hook
export function useResponseLength() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    responseLength: settings.responseLength,
    setResponseLength: (value: number) => {
      updateSettings({ responseLength: value });
    },
    isHydrated,
  };
}

// User profile settings
export function useUserProfile() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    userName: settings.userName || '',
    setUserName: (value: string) => updateSettings({ userName: value }),
    userGender: settings.userGender,
    setUserGender: (value: string) => updateSettings({ userGender: value }),
    isHydrated,
  };
}

// Learning mode setting (deprecated - use useChatMode instead)
export function useLearningMode() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    learningMode: settings.learningMode,
    setLearningMode: (value: boolean) => updateSettings({
      learningMode: value,
      chatMode: value ? 'learning' : 'chat',
    }),
    isHydrated,
  };
}

// Chat mode setting (replaces learningMode)
export function useChatMode() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    chatMode: settings.chatMode,
    setChatMode: (mode: ChatMode) => updateSettings({
      chatMode: mode,
      learningMode: mode === 'learning', // Keep learningMode in sync
    }),
    isHydrated,
  };
}

// Learning sub-mode setting (used when chatMode === 'learning')
export function useLearningSubMode() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    learningSubMode: settings.learningSubMode,
    setLearningSubMode: (mode: LearningSubMode) => updateSettings({ learningSubMode: mode }),
    isHydrated,
  };
}
// Custom instructions hook
export function useCustomInstructions() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    customInstructions: settings.customInstructions || '',
    setCustomInstructions: (value: string) => updateSettings({ customInstructions: value || null }),
    isHydrated,
  };
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  } else {
    return null;
  }

  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;
  let h = 0,
    s = 0,
    l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

// Accent color hook - uses SettingsContext (CSS vars applied in SettingsContext)
export function useAccentColor() {
  const { settings, updateSettings, isHydrated } = useSettings();

  const setAccentColor = useCallback((color: string) => {
    updateSettings({ accentColor: color });
  }, [updateSettings]);

  return { accentColor: settings.accentColor, setAccentColor, isHydrated };
}

// MCP servers hook - manages which MCP servers are enabled for tool calling
export function useEnabledMcpServers() {
  const { settings, updateSettings, isHydrated } = useSettings();

  const setEnabledMcpServers = useCallback((servers: string[]) => {
    updateSettings({ enabledMcpServers: servers });
  }, [updateSettings]);

  const toggleMcpServer = useCallback((serverSlug: string, enabled: boolean) => {
    const current = settings.enabledMcpServers || [];
    console.log('[Tools] Toggle:', serverSlug, enabled, 'current:', current);
    if (enabled && !current.includes(serverSlug)) {
      const updated = [...current, serverSlug];
      console.log('[Tools] Adding, new list:', updated);
      updateSettings({ enabledMcpServers: updated });
    } else if (!enabled && current.includes(serverSlug)) {
      const updated = current.filter(s => s !== serverSlug);
      console.log('[Tools] Removing, new list:', updated);
      updateSettings({ enabledMcpServers: updated });
    }
  }, [settings.enabledMcpServers, updateSettings]);

  return {
    enabledMcpServers: settings.enabledMcpServers || [],
    setEnabledMcpServers,
    toggleMcpServer,
    isHydrated
  };
}

// Code wrap setting - enables word wrap in code blocks
export function useCodeWrap() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    codeWrap: settings.codeWrap,
    setCodeWrap: (value: boolean) => updateSettings({ codeWrap: value }),
    isHydrated,
  };
}

// Auto-scroll setting - enables auto-scroll during streaming
export function useAutoScroll() {
  const { settings, updateSettings, isHydrated } = useSettings();

  return {
    autoScroll: settings.autoScroll,
    setAutoScroll: (value: boolean) => updateSettings({ autoScroll: value }),
    isHydrated,
  };
}

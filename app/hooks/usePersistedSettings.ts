'use client';

import { useState, useEffect, useCallback } from 'react';

const isBrowser = typeof window !== 'undefined';

export function usePersistedSetting(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      setValue(stored);
    }
    setIsHydrated(true);
  }, [key]);

  const updateValue = useCallback((nextValue: React.SetStateAction<string>) => {
    setValue(prev => {
      const resolved = typeof nextValue === 'function'
        ? (nextValue as (val: string) => string)(prev)
        : nextValue;
      if (isBrowser) {
        window.localStorage.setItem(key, resolved);
      }
      return resolved;
    });
  }, [key]);

  return [value, updateValue, isHydrated] as const;
}

export type ReasoningEffortLevel = 'low' | 'medium' | 'high';

// Response length settings hook
export function useResponseLength() {
  const [responseLength, setResponseLength, isHydrated] = usePersistedSetting('CHATGPT_RESPONSE_LENGTH', '50');
  
  const parsed = parseInt(responseLength);
  const parsedValue = isNaN(parsed) ? 50 : parsed;
  
  // Debug logging
  if (typeof window !== 'undefined') {
    const storedValue = window.localStorage.getItem('CHATGPT_RESPONSE_LENGTH');
    console.log('[useResponseLength] State:', responseLength, '| localStorage:', storedValue, '| parsed:', parsedValue, '| hydrated:', isHydrated);
  }
  
  return {
    responseLength: parsedValue,
    setResponseLength: (value: number) => {
      console.log('[useResponseLength] Setting to:', value);
      setResponseLength(String(value));
      // Verify it was saved
      setTimeout(() => {
        const saved = window.localStorage.getItem('CHATGPT_RESPONSE_LENGTH');
        console.log('[useResponseLength] After save, localStorage has:', saved);
      }, 100);
    },
    isHydrated,
  };
}

// User profile settings
export function useUserProfile() {
  const [userName, setUserName, isNameHydrated] = usePersistedSetting('CHATGPT_USER_NAME', '');
  const [userGender, setUserGender, isGenderHydrated] = usePersistedSetting('CHATGPT_USER_GENDER', 'not-specified');
  
  return {
    userName,
    setUserName,
    userGender,
    setUserGender,
    isHydrated: isNameHydrated && isGenderHydrated,
  };
}

// Learning mode setting
export function useLearningMode() {
  const [learningMode, setLearningMode, isHydrated] = usePersistedSetting('CHATGPT_LEARNING_MODE', 'false');
  
  return {
    learningMode: learningMode === 'true',
    setLearningMode: (value: boolean) => setLearningMode(value ? 'true' : 'false'),
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

export function useAccentColor() {
  const [accentColor, setAccentColor, isHydrated] = usePersistedSetting('CHATGPT_ACCENT_COLOR', '#af8787');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-accent', accentColor);
    root.style.setProperty('--border-active', accentColor);
    root.style.setProperty('--primary', accentColor);
    root.style.setProperty('--accent-foreground', accentColor);
    root.style.setProperty('--ring', accentColor);
    root.style.setProperty('--chart-1', accentColor);
    
    const hsl = hexToHSL(accentColor);
    if (hsl) {
      root.style.setProperty('--accent-h', hsl.h.toString());
      root.style.setProperty('--accent-s', `${hsl.s}%`);
      root.style.setProperty('--accent-l', `${hsl.l}%`);
      
      const contrastText = hsl.l < 50 ? '#ffffff' : '#000000';
      root.style.setProperty('--accent-contrast', contrastText);
      
      const h = hsl.h;
      const s = Math.min(hsl.s, 70);
      const l = hsl.l;
      
      root.style.setProperty('--syntax-primary', `hsl(${h}, ${s}%, ${Math.min(l + 10, 70)}%)`);
      root.style.setProperty('--syntax-function', `hsl(${(h + 270) % 360}, ${s}%, ${Math.min(l + 15, 75)}%)`);
      root.style.setProperty('--syntax-keyword', `hsl(${(h + 340) % 360}, ${Math.min(s + 10, 70)}%, ${Math.min(l + 5, 65)}%)`);
      root.style.setProperty('--syntax-string', `hsl(${(h + 180) % 360}, ${s * 0.7}%, ${Math.min(l + 20, 75)}%)`);
      root.style.setProperty('--syntax-number', `hsl(${(h + 200) % 360}, ${s}%, ${Math.min(l + 15, 70)}%)`);
      root.style.setProperty('--syntax-class', `hsl(${(h + 30) % 360}, ${s}%, ${Math.min(l + 10, 70)}%)`);
      root.style.setProperty('--syntax-comment', `hsl(${h}, ${s * 0.3}%, 35%)`);
      root.style.setProperty('--syntax-operator', `hsl(${(h + 340) % 360}, ${s * 0.8}%, ${Math.min(l + 5, 60)}%)`);
    }

    // Update favicon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291 291">
      <rect x="3.252" y="3.252" width="283.465" height="283.465" rx="60" ry="60" 
        style="fill:#262626;stroke:#7c7c7c;stroke-width:6.5px;"/>
      <circle cx="144.985" cy="144.985" r="70.866" 
        style="fill:${accentColor};stroke:#7c7c7c;stroke-width:6.5px;"/>
    </svg>`;
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    
    document.querySelectorAll("link[rel*='icon']").forEach(link => link.remove());
    
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = dataUrl;
    document.head.appendChild(link);
  }, [accentColor]);

  return { accentColor, setAccentColor, isHydrated };
}

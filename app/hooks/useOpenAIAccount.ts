'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OPENAI_ACCOUNT_ENABLED_KEY, OPENAI_ACCOUNT_STORAGE_KEY, type OpenAIAccountAuth } from '@/lib/openai-account-shared';

type UsageWindow = { used_percent?: number; reset_at?: number; limit_window_seconds?: number };
type UsagePayload = {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: UsageWindow;
    secondary_window?: UsageWindow;
  };
};

function usageSignature(usage: UsagePayload | null) {
  if (!usage) return 'none';
  return JSON.stringify({
    plan: usage.plan_type || null,
    limited: usage.rate_limit?.limit_reached ?? null,
    primaryUsed: usage.rate_limit?.primary_window?.used_percent ?? null,
    primaryReset: usage.rate_limit?.primary_window?.reset_at ?? null,
    weeklyUsed: usage.rate_limit?.secondary_window?.used_percent ?? null,
    weeklyReset: usage.rate_limit?.secondary_window?.reset_at ?? null,
  });
}

function readAuth(): OpenAIAccountAuth | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(OPENAI_ACCOUNT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OpenAIAccountAuth;
    return parsed.accessToken && parsed.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

function readEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(OPENAI_ACCOUNT_ENABLED_KEY) === 'true';
}

function writeAuth(auth: OpenAIAccountAuth | null) {
  if (typeof window === 'undefined') return;
  if (auth) localStorage.setItem(OPENAI_ACCOUNT_STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(OPENAI_ACCOUNT_STORAGE_KEY);
  window.dispatchEvent(new Event('cracker-openai-account-change'));
}

function writeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPENAI_ACCOUNT_ENABLED_KEY, String(enabled));
  window.dispatchEvent(new Event('cracker-openai-account-change'));
}

export function useOpenAIAccount() {
  const [auth, setAuthState] = useState<OpenAIAccountAuth | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [usageChangedAt, setUsageChangedAt] = useState<number | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setAuthState(readAuth());
    setEnabledState(readEnabled());
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('storage', onChange);
    window.addEventListener('message', onChange);
    window.addEventListener('cracker-openai-connected', onChange as EventListener);
    window.addEventListener('cracker-openai-account-change', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('message', onChange);
      window.removeEventListener('cracker-openai-connected', onChange as EventListener);
      window.removeEventListener('cracker-openai-account-change', onChange);
    };
  }, [reload]);

  const setEnabled = useCallback((next: boolean) => {
    writeEnabled(next);
    setEnabledState(next);
  }, []);

  const unlink = useCallback(() => {
    writeAuth(null);
    writeEnabled(false);
    setAuthState(null);
    setEnabledState(false);
    setUsage(null);
  }, []);

  const connect = useCallback(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--text-accent').trim()
      || localStorage.getItem('CRACKER_ACCENT_COLOR')
      || '#af8787';
    window.open(`/api/openai-account/connect?accent=${encodeURIComponent(accent)}`, '_blank', 'noopener,noreferrer,width=520,height=720');
  }, []);

  const refresh = useCallback(async () => {
    const current = readAuth();
    if (!current) return null;
    const res = await fetch('/api/openai-account/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth: current }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    writeAuth(data.auth);
    setAuthState(data.auth);
    return data.auth as OpenAIAccountAuth;
  }, []);

  const refreshIfNeeded = useCallback(async () => {
    const current = readAuth();
    if (!current) return null;
    if (current.expiresAtMillis > Date.now() + 60_000) return current;
    return refresh();
  }, [refresh]);

  const syncUsage = useCallback(async () => {
    const current = await refreshIfNeeded();
    if (!current) return null;
    setIsLoadingUsage(true);
    setError(null);
    try {
      const res = await fetch('/api/openai-account/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: current }),
      });
      if (!res.ok) throw new Error('Usage unavailable');
      const data = await res.json();
      if (data.auth) {
        writeAuth(data.auth);
        setAuthState(data.auth);
      }
      const nextUsage = (data.usage || null) as UsagePayload | null;
      setUsage(prevUsage => {
        const changed = usageSignature(prevUsage) !== usageSignature(nextUsage);
        if (changed) setUsageChangedAt(Date.now());
        return nextUsage;
      });
      return nextUsage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usage unavailable');
      return null;
    } finally {
      setIsLoadingUsage(false);
    }
  }, [refreshIfNeeded]);

  useEffect(() => {
    if (auth && enabled) void syncUsage();
  }, [auth?.accountId, enabled, syncUsage]);

  const requestAuth = useMemo(() => enabled ? auth : null, [auth, enabled]);

  return {
    auth,
    requestAuth,
    connected: !!auth,
    enabled,
    usage,
    usageChangedAt,
    isLoadingUsage,
    error,
    connect,
    unlink,
    setEnabled,
    refresh,
    refreshIfNeeded,
    syncUsage,
  };
}

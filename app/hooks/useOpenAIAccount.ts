'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OPENAI_ACCOUNT_ENABLED_KEY,
  OPENAI_ACCOUNT_STORAGE_KEY,
  OPENAI_ACCOUNTS_STORAGE_KEY,
  getOpenAIAccountKey,
  getOpenAIUsageScore,
  isOpenAIAccountLimited,
  type OpenAIAccountAuth,
  type OpenAIStoredAccount,
  type OpenAIUsagePayload,
} from '@/lib/openai-account-shared';

function usageSignature(usage: OpenAIUsagePayload | null | undefined) {
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

function accountFromAuth(auth: OpenAIAccountAuth, existing?: Partial<OpenAIStoredAccount>): OpenAIStoredAccount {
  const now = Date.now();
  return {
    id: getOpenAIAccountKey(auth),
    auth,
    enabled: existing?.enabled ?? true,
    usage: existing?.usage ?? null,
    usageChangedAt: existing?.usageChangedAt ?? null,
    lastError: existing?.lastError ?? null,
    exhaustedUntil: existing?.exhaustedUntil ?? null,
    exhaustedReason: existing?.exhaustedReason ?? null,
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
}

function readAccounts(): OpenAIStoredAccount[] {
  if (typeof window === 'undefined') return [];

  const rawList = localStorage.getItem(OPENAI_ACCOUNTS_STORAGE_KEY);
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList) as OpenAIStoredAccount[];
      if (Array.isArray(parsed)) return parsed.filter(a => a?.auth?.accessToken && a?.auth?.refreshToken);
    } catch {
      // Fall through to single-account migration.
    }
  }

  const rawSingle = localStorage.getItem(OPENAI_ACCOUNT_STORAGE_KEY);
  if (!rawSingle) return [];
  try {
    const auth = JSON.parse(rawSingle) as OpenAIAccountAuth;
    if (!auth.accessToken || !auth.refreshToken) return [];
    const account = accountFromAuth(auth, { enabled: localStorage.getItem(OPENAI_ACCOUNT_ENABLED_KEY) !== 'false' });
    writeAccounts([account]);
    return [account];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: OpenAIStoredAccount[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPENAI_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  const best = pickBestAccount(accounts);
  if (best) localStorage.setItem(OPENAI_ACCOUNT_STORAGE_KEY, JSON.stringify(best.auth));
  else localStorage.removeItem(OPENAI_ACCOUNT_STORAGE_KEY);
  localStorage.setItem(OPENAI_ACCOUNT_ENABLED_KEY, String(accounts.some(a => a.enabled)));
  window.dispatchEvent(new Event('cracker-openai-account-change'));
}

function pickBestAccount(accounts: OpenAIStoredAccount[]) {
  const enabled = accounts.filter(a => a.enabled && !isOpenAIAccountLimited(a));
  const candidates = enabled.length ? enabled : accounts.filter(a => a.enabled);
  return [...candidates].sort((a, b) => getOpenAIUsageScore(a.usage) - getOpenAIUsageScore(b.usage))[0] || null;
}

export function useOpenAIAccount() {
  const [accounts, setAccounts] = useState<OpenAIStoredAccount[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => setAccounts(readAccounts()), []);

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

  const persist = useCallback((next: OpenAIStoredAccount[]) => {
    writeAccounts(next);
    setAccounts(next);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    persist(accounts.map(a => ({ ...a, enabled: next, updatedAt: Date.now() })));
  }, [accounts, persist]);

  const setAccountEnabled = useCallback((id: string, enabled: boolean) => {
    persist(accounts.map(a => a.id === id ? { ...a, enabled, updatedAt: Date.now() } : a));
  }, [accounts, persist]);

  const unlink = useCallback((id?: string) => {
    const next = id ? accounts.filter(a => a.id !== id) : [];
    persist(next);
  }, [accounts, persist]);

  const connect = useCallback(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--text-accent').trim()
      || localStorage.getItem('CRACKER_ACCENT_COLOR')
      || '#af8787';
    window.open(`/api/openai-account/connect?accent=${encodeURIComponent(accent)}`, '_blank', 'noopener,noreferrer,width=520,height=720');
  }, []);

  const refreshAccount = useCallback(async (account: OpenAIStoredAccount) => {
    if (account.auth.expiresAtMillis > Date.now() + 60_000 && account.auth.integrityState) return account;
    const res = await fetch('/api/openai-account/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth: account.auth }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    return accountFromAuth(data.auth, account);
  }, []);

  const refresh = useCallback(async () => {
    const best = pickBestAccount(accounts);
    if (!best) return null;
    const refreshed = await refreshAccount(best);
    persist(accounts.map(a => a.id === best.id ? refreshed : a));
    return refreshed.auth;
  }, [accounts, persist, refreshAccount]);

  const refreshIfNeeded = useCallback(async () => refresh(), [refresh]);

  const syncUsageForAccount = useCallback(async (account: OpenAIStoredAccount) => {
    const refreshed = await refreshAccount(account);
    const res = await fetch('/api/openai-account/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth: refreshed.auth }),
    });
    if (!res.ok) throw new Error('Usage unavailable');
    const data = await res.json();
    const nextAuth = data.auth || refreshed.auth;
    const nextUsage = (data.usage || null) as OpenAIUsagePayload | null;
    const changed = usageSignature(account.usage) !== usageSignature(nextUsage);
    return accountFromAuth(nextAuth, {
      ...refreshed,
      usage: nextUsage,
      usageChangedAt: changed ? Date.now() : account.usageChangedAt,
      lastError: null,
      exhaustedUntil: nextUsage?.rate_limit?.limit_reached ? Math.max(
        nextUsage.rate_limit.primary_window?.reset_at || 0,
        nextUsage.rate_limit.secondary_window?.reset_at || 0,
      ) * 1000 || null : null,
      exhaustedReason: nextUsage?.rate_limit?.limit_reached ? 'usage_limit_reached' : null,
    });
  }, [refreshAccount]);

  const syncUsage = useCallback(async () => {
    if (accounts.length === 0) return null;
    setIsLoadingUsage(true);
    setError(null);
    try {
      const results = await Promise.allSettled(accounts.map(syncUsageForAccount));
      const next = accounts.map((account, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') return result.value;
        return { ...account, lastError: result.reason instanceof Error ? result.reason.message : 'Usage unavailable' };
      });
      persist(next);
      return pickBestAccount(next)?.usage || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usage unavailable');
      return null;
    } finally {
      setIsLoadingUsage(false);
    }
  }, [accounts, persist, syncUsageForAccount]);

  useEffect(() => {
    if (accounts.some(a => a.enabled)) void syncUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  const enabledAccounts = useMemo(() => accounts.filter(a => a.enabled), [accounts]);
  const bestAccount = useMemo(() => pickBestAccount(accounts), [accounts]);
  const requestAuths = useMemo(() => [...enabledAccounts].sort((a, b) => getOpenAIUsageScore(a.usage) - getOpenAIUsageScore(b.usage)).map(a => a.auth), [enabledAccounts]);

  return {
    accounts,
    activeAccount: bestAccount,
    auth: bestAccount?.auth || null,
    requestAuth: bestAccount?.auth || null,
    requestAuths,
    connected: accounts.length > 0,
    enabled: enabledAccounts.length > 0,
    usage: bestAccount?.usage || null,
    usageChangedAt: bestAccount?.usageChangedAt || null,
    isLoadingUsage,
    error,
    connect,
    unlink,
    setEnabled,
    setAccountEnabled,
    refresh,
    refreshIfNeeded,
    syncUsage,
  };
}

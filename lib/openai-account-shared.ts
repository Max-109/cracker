export const OPENAI_ACCOUNT_STORAGE_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTH';
export const OPENAI_ACCOUNTS_STORAGE_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTHS';
export const OPENAI_ACCOUNT_ENABLED_KEY = 'CRACKER_OPENAI_ACCOUNT_ENABLED';

export type OpenAIAccountAuth = {
  refreshToken: string;
  accessToken: string;
  expiresAtMillis: number;
  accountId: string | null;
  email: string | null;
  integrityState?: string | null;
};

export type OpenAIUsageWindow = { used_percent?: number; reset_at?: number; limit_window_seconds?: number };
export type OpenAIUsagePayload = {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: OpenAIUsageWindow;
    secondary_window?: OpenAIUsageWindow;
  };
};

export type OpenAIStoredAccount = {
  id: string;
  auth: OpenAIAccountAuth;
  enabled: boolean;
  usage?: OpenAIUsagePayload | null;
  usageChangedAt?: number | null;
  lastError?: string | null;
  exhaustedUntil?: number | null;
  exhaustedReason?: string | null;
  addedAt: number;
  updatedAt: number;
};

export function getOpenAIAccountKey(auth: Pick<OpenAIAccountAuth, 'accountId' | 'email' | 'refreshToken'>) {
  return auth.accountId || auth.email || auth.refreshToken.slice(0, 16);
}

export function getOpenAIUsageScore(usage?: OpenAIUsagePayload | null) {
  if (!usage) return 50;
  if (usage.rate_limit?.limit_reached) return 999;
  const primary = usage.rate_limit?.primary_window?.used_percent;
  const secondary = usage.rate_limit?.secondary_window?.used_percent;
  const values = [primary, secondary].filter((v): v is number => typeof v === 'number');
  return values.length ? Math.max(...values) : 50;
}

export function isOpenAIAccountLimited(account: Pick<OpenAIStoredAccount, 'usage' | 'exhaustedUntil'>) {
  if (account.exhaustedUntil && account.exhaustedUntil > Date.now()) return true;
  return account.usage?.rate_limit?.limit_reached === true;
}

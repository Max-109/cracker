export const PROVIDER_API_BASE_STORAGE_KEY = 'cracker-provider-api-base-url';
export const PROVIDER_ENABLED_STORAGE_KEY = 'cracker-provider-enabled';
export const PROVIDER_API_KEY_STORAGE_KEY = 'cracker-provider-api-key';
export const PROVIDER_CONFIG_CHANGE_EVENT = 'cracker-provider-config-change';

export type ProviderConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
};

export type ProviderRequestContext = {
  providerApiBaseUrl?: string;
  providerApiKey?: string;
};

function trimBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

export function readProviderConfig(): ProviderConfig {
  if (typeof window === 'undefined') return { enabled: false, baseUrl: '', apiKey: '' };

  try {
    return {
      enabled: localStorage.getItem(PROVIDER_ENABLED_STORAGE_KEY) === 'true',
      baseUrl: localStorage.getItem(PROVIDER_API_BASE_STORAGE_KEY) || '',
      apiKey: localStorage.getItem(PROVIDER_API_KEY_STORAGE_KEY) || '',
    };
  } catch {
    return { enabled: false, baseUrl: '', apiKey: '' };
  }
}

export function writeProviderConfig(config: ProviderConfig) {
  if (typeof window === 'undefined') return;

  const baseUrl = trimBaseUrl(config.baseUrl);
  const apiKey = config.apiKey.trim();

  if (baseUrl) localStorage.setItem(PROVIDER_API_BASE_STORAGE_KEY, baseUrl);
  else localStorage.removeItem(PROVIDER_API_BASE_STORAGE_KEY);

  if (apiKey) localStorage.setItem(PROVIDER_API_KEY_STORAGE_KEY, apiKey);
  else localStorage.removeItem(PROVIDER_API_KEY_STORAGE_KEY);

  localStorage.setItem(PROVIDER_ENABLED_STORAGE_KEY, String(config.enabled));
  window.dispatchEvent(new Event(PROVIDER_CONFIG_CHANGE_EVENT));
}

export function getProviderRequestContext(config: ProviderConfig): ProviderRequestContext {
  const baseUrl = trimBaseUrl(config.baseUrl);
  const apiKey = config.apiKey.trim();
  return config.enabled && baseUrl && apiKey
    ? { providerApiBaseUrl: baseUrl, providerApiKey: apiKey }
    : {};
}

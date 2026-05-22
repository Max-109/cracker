export const OPENAI_ACCOUNT_STORAGE_KEY = 'CRACKER_OPENAI_ACCOUNT_AUTH';
export const OPENAI_ACCOUNT_ENABLED_KEY = 'CRACKER_OPENAI_ACCOUNT_ENABLED';

export type OpenAIAccountAuth = {
  refreshToken: string;
  accessToken: string;
  expiresAtMillis: number;
  accountId: string | null;
  email: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomBytes } from 'crypto';
import { createOpenAI } from '@ai-sdk/openai';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

const CHATGPT_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CHATGPT_OAUTH_ISSUER = 'https://auth.openai.com';
const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';

type TokenResponse = {
  refresh_token?: string;
  access_token: string;
  id_token?: string;
  expires_in?: number;
};

export type OpenAIDeviceCode = {
  device_auth_id: string;
  user_code: string;
  interval: string;
};

export type OpenAIDeviceToken = {
  authorization_code: string;
  code_verifier: string;
};

type TokenClaims = {
  email?: string;
  name?: string;
  chatgpt_account_id?: string;
  organizations?: Array<{ id?: string }>;
  'https://api.openai.com/auth'?: { chatgpt_account_id?: string };
};

export function generatePkceCodes() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function generateOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function buildOpenAIConnectUrl(origin: string, state: string, challenge: string) {
  const redirectUri = `${origin}/api/openai-account/callback`;
  const url = new URL(`${CHATGPT_OAUTH_ISSUER}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CHATGPT_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid profile email offline_access');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  url.searchParams.set('state', state);
  url.searchParams.set('originator', 'opencode');
  return url.toString();
}

export async function exchangeAuthorizationCode(args: { code: string; redirectUri: string; verifier: string }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: CHATGPT_OAUTH_CLIENT_ID,
    code_verifier: args.verifier,
  });
  const response = await fetch(`${CHATGPT_OAUTH_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`OpenAI auth failed with status ${response.status}`);
  return response.json() as Promise<TokenResponse>;
}

export async function requestOpenAIDeviceCode() {
  const response = await fetch(`${CHATGPT_OAUTH_ISSUER}/api/accounts/deviceauth/usercode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CHATGPT_OAUTH_CLIENT_ID }),
  });
  if (!response.ok) throw new Error(`OpenAI device login failed with status ${response.status}`);
  return response.json() as Promise<OpenAIDeviceCode>;
}

export async function pollOpenAIDeviceCode(device: Pick<OpenAIDeviceCode, 'device_auth_id' | 'user_code'>) {
  const response = await fetch(`${CHATGPT_OAUTH_ISSUER}/api/accounts/deviceauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_auth_id: device.device_auth_id, user_code: device.user_code }),
  });
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`OpenAI device poll failed with status ${response.status}`);
  return response.json() as Promise<OpenAIDeviceToken>;
}

export async function exchangeDeviceToken(deviceToken: OpenAIDeviceToken) {
  return exchangeAuthorizationCode({
    code: deviceToken.authorization_code,
    redirectUri: `${CHATGPT_OAUTH_ISSUER}/deviceauth/callback`,
    verifier: deviceToken.code_verifier,
  });
}

export async function refreshOpenAIAccountAuth(auth: OpenAIAccountAuth): Promise<OpenAIAccountAuth> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
    client_id: CHATGPT_OAUTH_CLIENT_ID,
  });
  const response = await fetch(`${CHATGPT_OAUTH_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`OpenAI refresh failed with status ${response.status}`);
  return authFromTokenResponse(await response.json() as TokenResponse, auth);
}

export function authFromTokenResponse(tokenResponse: TokenResponse, previous?: OpenAIAccountAuth): OpenAIAccountAuth {
  const idClaims = parseJwtClaims(tokenResponse.id_token);
  const accessClaims = parseJwtClaims(tokenResponse.access_token);
  const refreshToken = tokenResponse.refresh_token || previous?.refreshToken;
  if (!refreshToken) throw new Error('OpenAI did not return a refresh token.');
  return {
    refreshToken,
    accessToken: tokenResponse.access_token,
    expiresAtMillis: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    accountId: accountIdFromClaims(idClaims) || accountIdFromClaims(accessClaims) || previous?.accountId || null,
    email: emailFromClaims(idClaims) || emailFromClaims(accessClaims) || previous?.email || null,
  };
}

export async function fetchOpenAIUsageWithAuth(auth: OpenAIAccountAuth) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    'User-Agent': 'codex-cli',
  };
  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;
  const response = await fetch(CODEX_USAGE_URL, { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`usage request failed with status ${response.status}`);
  return response.json();
}

export function createOpenAIAccountProvider(auth: OpenAIAccountAuth) {
  return createOpenAI({
    name: 'openai-account',
    apiKey: 'local-openai-account',
    fetch: (input, init) => codexFetch(auth, input, init),
  });
}

async function codexFetch(auth: OpenAIAccountAuth, input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.endsWith('/chat/completions')) return fetch(input, init);

  const body = JSON.parse(String(init?.body || '{}'));
  const conversationId = `cracker-${randomBytes(18).toString('base64url')}`;
  const codexBody = openAIChatBodyToCodex(body, conversationId);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    'x-client-request-id': conversationId,
    session_id: conversationId,
  };
  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;

  const upstream = await fetch(CODEX_RESPONSES_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(codexBody),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: { message: `OpenAI account request failed with status ${upstream.status}` } }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(openAIStreamFromCodex(upstream.body, body.model || codexBody.model), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function openAIChatBodyToCodex(body: any, conversationId: string) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const instructions = messages
    .filter((message: any) => message.role === 'system')
    .map((message: any) => messageText(message))
    .filter(Boolean)
    .join('\n\n') || 'You are Codex.';
  return {
    model: body.model === 'gpt-5.5-fast' ? 'gpt-5.5' : body.model,
    instructions,
    input: messages.filter((message: any) => message.role !== 'system').map(chatMessageToCodexInput),
    reasoning: { effort: body.reasoning_effort || body.reasoning?.effort || 'medium' },
    stream: true,
    store: false,
    service_tier: body.service_tier,
    prompt_cache_key: conversationId,
  };
}

function messageText(message: any) {
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content.map((part: any) => part?.text || '').filter(Boolean).join('\n');
}

function chatMessageToCodexInput(message: any) {
  const content = typeof message.content === 'string'
    ? [{ type: 'input_text', text: message.content }]
    : (Array.isArray(message.content) ? message.content.map(codexContentPart).filter(Boolean) : []);
  return { type: 'message', role: message.role, content };
}

function codexContentPart(part: any) {
  if (part?.type === 'text') return { type: 'input_text', text: part.text || '' };
  const imageUrl = part?.image_url?.url || part?.imageUrl?.url || part?.url;
  if ((part?.type === 'image_url' || part?.type === 'file') && imageUrl) return { type: 'input_image', image_url: imageUrl };
  return null;
}

function openAIStreamFromCodex(body: ReadableStream<Uint8Array>, model: string) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let sentRole = false;
  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      const sendText = (text: string) => {
        if (!sentRole) {
          send({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
          sentRole = true;
        }
        send({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] });
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) for (const text of extractTextDeltas(event)) sendText(text);
        }
        for (const text of extractTextDeltas(buffer)) sendText(text);
        if (!sentRole) sendText('');
        send({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function extractTextDeltas(eventBlock: string) {
  const output: string[] = [];
  const eventType = eventBlock.split('\n').find(line => line.startsWith('event: '))?.slice(7).trim();
  for (const line of eventBlock.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const json = JSON.parse(data);
      const text = json?.delta || json?.text || json?.output_text || json?.content?.[0]?.text;
      if (typeof text === 'string' && (!eventType || eventType.endsWith('.delta') || eventType.includes('delta'))) output.push(text);
    } catch {
      // Ignore non-JSON SSE payloads.
    }
  }
  return output;
}

function parseJwtClaims(token?: string): TokenClaims | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
  } catch {
    return null;
  }
}

function accountIdFromClaims(claims: TokenClaims | null) {
  return claims?.chatgpt_account_id
    || claims?.['https://api.openai.com/auth']?.chatgpt_account_id
    || claims?.organizations?.find(org => org.id)?.id
    || null;
}

function emailFromClaims(claims: TokenClaims | null) {
  return claims?.email || claims?.name || null;
}

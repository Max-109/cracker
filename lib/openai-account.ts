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
  integrity_state?: string | null;
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
  const tokenResponse = await response.json() as TokenResponse;
  tokenResponse.integrity_state = integrityStateFromHeaders(response.headers);
  return tokenResponse;
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
  const tokenResponse = await response.json() as TokenResponse;
  tokenResponse.integrity_state = integrityStateFromHeaders(response.headers);
  return authFromTokenResponse(tokenResponse, auth, tokenResponse.integrity_state || auth.integrityState || null);
}

function integrityStateFromHeaders(headers: Headers) {
  return headers.get('x-oai-is-update') || headers.get('x-oai-is');
}

export function authFromTokenResponse(tokenResponse: TokenResponse, previous?: OpenAIAccountAuth, integrityState?: string | null): OpenAIAccountAuth {
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
    integrityState: integrityState || tokenResponse.integrity_state || previous?.integrityState || null,
  };
}

export async function fetchOpenAIUsageWithAuth(auth: OpenAIAccountAuth) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    'User-Agent': 'codex-cli',
  };
  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;
  if (auth.integrityState) headers['X-OAI-IS'] = auth.integrityState;
  const response = await fetch(CODEX_USAGE_URL, { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`usage request failed with status ${response.status}`);
  return response.json();
}

export function createOpenAIAccountProvider(auth: OpenAIAccountAuth) {
  return createOpenAI({
    // Avoid inheriting OPENAI_BASE_URL from the environment. All account traffic
    // is intercepted by codexFetch and forwarded with the user's local token.
    baseURL: 'https://chatgpt.com/backend-api',
    apiKey: 'local-openai-account',
    fetch: (input, init) => codexFetch(auth, input, init),
  });
}

async function codexFetch(auth: OpenAIAccountAuth, input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : input.toString();
  if (url.endsWith('/responses')) return codexResponsesFetch(auth, init);
  if (!url.endsWith('/chat/completions')) return fetch(input, init);

  const body = JSON.parse(String(init?.body || '{}'));
  const conversationId = `cracker-${randomBytes(18).toString('base64url')}`;
  const codexBody = openAIChatBodyToCodex(body, conversationId);
  const upstream = await fetch(CODEX_RESPONSES_URL, {
    method: 'POST',
    headers: codexHeaders(auth, conversationId),
    body: JSON.stringify(codexBody),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: { message: `OpenAI account request failed with status ${upstream.status}` } }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const wantsStream = body.stream === true;

  if (!wantsStream) {
    const text = await collectOpenAITextFromCodexStream(upstream.body);
    return Response.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || codexBody.model,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
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

async function codexResponsesFetch(auth: OpenAIAccountAuth, init?: RequestInit) {
  const body = JSON.parse(String(init?.body || '{}'));
  const conversationId = `cracker-${randomBytes(18).toString('base64url')}`;
  const upstreamBody = openAIResponsesBodyToCodex(body, conversationId);

  const upstream = await fetch(CODEX_RESPONSES_URL, {
    method: 'POST',
    headers: codexHeaders(auth, conversationId),
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: { message: `OpenAI account request failed with status ${upstream.status}` } }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function codexHeaders(auth: OpenAIAccountAuth, conversationId: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    'x-client-request-id': conversationId,
    session_id: conversationId,
  };
  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;
  if (auth.integrityState) headers['X-OAI-IS'] = auth.integrityState;
  return headers;
}

function openAIResponsesBodyToCodex(body: any, conversationId: string) {
  return {
    model: body.model === 'gpt-5.5-fast' ? 'gpt-5.5' : body.model,
    instructions: body.instructions || 'You are Codex.',
    input: normalizeResponsesInput(body.input),
    reasoning: {
      effort: body.reasoning?.effort || 'medium',
      summary: body.reasoning?.summary || 'auto',
    },
    stream: true,
    store: false,
    service_tier: body.service_tier,
    prompt_cache_key: body.prompt_cache_key || conversationId,
  };
}

function normalizeResponsesInput(input: any) {
  if (typeof input === 'string') {
    return [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: input }] }];
  }

  if (!Array.isArray(input)) return [];

  return input
    .filter((item: any) => item && item.type !== 'reasoning')
    .map((item: any) => {
      if (item.type === 'message' || item.role) {
        return {
          type: 'message',
          role: item.role || 'user',
          content: normalizeResponsesContent(item.content),
        };
      }
      return item;
    });
}

function normalizeResponsesContent(content: any) {
  if (typeof content === 'string') return [{ type: 'input_text', text: content }];
  if (!Array.isArray(content)) return [];

  return content.map((part: any) => {
    if (typeof part === 'string') return { type: 'input_text', text: part };
    if (part?.type === 'output_text') return { type: 'input_text', text: part.text || '' };
    if (part?.type === 'text') return { type: 'input_text', text: part.text || '' };
    if (part?.type === 'input_text') return part;
    if (part?.type === 'input_image') return part;
    return part;
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
    reasoning: {
      effort: body.reasoning_effort || body.reasoning?.effort || 'medium',
      summary: body.reasoning?.summary || 'auto',
    },
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

  const imageUrl = part?.image_url?.url || part?.imageUrl?.url;
  if (part?.type === 'image_url' && imageUrl) return { type: 'input_image', image_url: imageUrl };

  if (part?.type === 'file') {
    const fileData = part?.file?.file_data || (isPdfDataUrl(part?.url) ? part.url : null);
    if (fileData) {
      return {
        type: 'input_file',
        filename: part?.file?.filename || part?.filename || 'attachment.pdf',
        file_data: fileData,
      };
    }

    const fileUrl = part?.file?.url || part?.url;
    if (fileUrl && isImageUrl(fileUrl)) return { type: 'input_image', image_url: fileUrl };
  }

  return null;
}

function isPdfDataUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('data:application/pdf');
}

function isImageUrl(value: unknown) {
  return typeof value === 'string' && (value.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value));
}

async function collectOpenAITextFromCodexStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  let text = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      for (const delta of extractStreamDeltas(event)) {
        if (delta.kind === 'text') text += delta.text;
      }
    }
  }

  for (const delta of extractStreamDeltas(buffer)) {
    if (delta.kind === 'text') text += delta.text;
  }

  return text;
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
      let sentThinkingOpen = false;
      let closedThinking = false;
      const sendText = (text: string) => {
        if (!sentRole) {
          send({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
          sentRole = true;
        }
        send({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] });
      };
      const sendReasoning = (text: string) => {
        if (!sentThinkingOpen) {
          sendText('<think>');
          sentThinkingOpen = true;
        }
        sendText(text);
      };
      const closeThinkingIfNeeded = () => {
        if (sentThinkingOpen && !closedThinking) {
          sendText('</think>\n\n');
          closedThinking = true;
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            for (const delta of extractStreamDeltas(event)) {
              if (delta.kind === 'reasoning') sendReasoning(delta.text);
              else {
                closeThinkingIfNeeded();
                sendText(delta.text);
              }
            }
          }
        }
        for (const delta of extractStreamDeltas(buffer)) {
          if (delta.kind === 'reasoning') sendReasoning(delta.text);
          else {
            closeThinkingIfNeeded();
            sendText(delta.text);
          }
        }
        closeThinkingIfNeeded();
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

function extractStreamDeltas(eventBlock: string) {
  const output: Array<{ kind: 'reasoning' | 'text'; text: string }> = [];
  const sseEventType = eventBlock.split('\n').find(line => line.startsWith('event: '))?.slice(7).trim();
  for (const line of eventBlock.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const json = JSON.parse(data);
      const eventType = sseEventType || json?.type || '';
      const text = typeof json?.delta === 'string'
        ? json.delta
        : typeof json?.text === 'string'
          ? json.text
          : typeof json?.output_text === 'string'
            ? json.output_text
            : typeof json?.choices?.[0]?.delta?.content === 'string'
              ? json.choices[0].delta.content
              : typeof json?.choices?.[0]?.message?.content === 'string'
                ? json.choices[0].message.content
                : typeof json?.content?.[0]?.text === 'string'
                  ? json.content[0].text
                  : '';
      if (!text) continue;

      if (eventType.includes('reasoning') && eventType.includes('delta')) {
        output.push({ kind: 'reasoning', text });
      } else if (!eventType || eventType === 'response.output_text.delta' || eventType === 'response.text.delta') {
        output.push({ kind: 'text', text });
      }
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

import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { OpenAIAccountAuth } from '@/lib/openai-account-shared';

const CHATGPT_TRANSCRIBE_URL = 'https://chatgpt.com/backend-api/transcribe';

function parseOpenAIAccountAuth(value: FormDataEntryValue | null): OpenAIAccountAuth | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const auth = JSON.parse(value) as OpenAIAccountAuth;
    return auth.accessToken ? auth : null;
  } catch {
    return null;
  }
}

function chatGPTTranscribeHeaders(auth: OpenAIAccountAuth) {
  const requestId = `cracker-transcribe-${randomBytes(12).toString('base64url')}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://chatgpt.com',
    Referer: 'https://chatgpt.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'x-client-request-id': requestId,
    session_id: requestId,
  };

  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;
  if (auth.integrityState) headers['X-OAI-IS'] = auth.integrityState;
  return headers;
}

function extractTranscriptionText(payload: unknown) {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';

  const data = payload as Record<string, unknown>;
  for (const key of ['text', 'transcript', 'transcription']) {
    if (typeof data[key] === 'string') return data[key].trim();
  }

  return '';
}

function normalizeAudioFile(audioFile: File) {
  const mimeType = (audioFile.type || 'audio/webm').split(';')[0] || 'audio/webm';
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
  return new File([audioFile], `recording.${extension}`, { type: mimeType });
}

async function transcribeWithChatGPTBackend(auth: OpenAIAccountAuth, audioFile: File) {
  const normalizedAudio = normalizeAudioFile(audioFile);
  const body = new FormData();

  // Codex/ChatGPT backend transcription accepts multipart `file` and optional `prompt`.
  // Do not send a public OpenAI model parameter here; this is not /v1/audio/transcriptions.
  body.append('file', normalizedAudio, normalizedAudio.name);

  const response = await fetch(CHATGPT_TRANSCRIBE_URL, {
    method: 'POST',
    headers: chatGPTTranscribeHeaders(auth),
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (!response.ok) {
    const isCloudflareChallenge = response.status === 403 && /cf-mitigated|challenge|cloudflare/i.test(raw + response.headers.get('cf-mitigated'));
    const message = isCloudflareChallenge
      ? 'ChatGPT backend transcription was blocked by Cloudflare challenge.'
      : `ChatGPT backend transcription failed ${response.status}.`;
    throw new Error(`${message} ${raw.slice(0, 300)}`);
  }

  const payload = contentType.includes('application/json') ? JSON.parse(raw) : raw;
  const text = extractTranscriptionText(payload);
  if (!text) throw new Error('ChatGPT backend transcription returned no text');
  return {
    text,
    integrityState: response.headers.get('x-oai-is-update') || response.headers.get('x-oai-is') || auth.integrityState || null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openAIAccountAuth = parseOpenAIAccountAuth(formData.get('openAIAccountAuth'));
    if (!openAIAccountAuth) {
      return NextResponse.json(
        { error: 'OpenAI account is required for ChatGPT backend transcription' },
        { status: 401 },
      );
    }

    console.log(`[Transcribe] ChatGPT backend input: ${audioFile.size} bytes, type: ${audioFile.type || 'audio/webm'}`);

    const result = await transcribeWithChatGPTBackend(openAIAccountAuth, audioFile);
    console.log(`[Transcribe] ChatGPT backend success, transcription length: ${result.text.length}`);

    return NextResponse.json({
      text: result.text,
      provider: 'chatgpt-backend',
      auth: result.integrityState && result.integrityState !== openAIAccountAuth.integrityState
        ? { ...openAIAccountAuth, integrityState: result.integrityState }
        : undefined,
    });
  } catch (error) {
    console.error('[Transcribe] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio with ChatGPT backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 },
    );
  }
}

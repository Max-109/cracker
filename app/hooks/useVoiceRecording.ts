'use client';

import { useState, useRef, useCallback } from 'react';
import { OPENAI_ACCOUNT_ENABLED_KEY, OPENAI_ACCOUNT_STORAGE_KEY, type OpenAIAccountAuth } from '@/lib/openai-account-shared';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'transcribing';

interface UseVoiceRecordingOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

// Calculate estimated transcription time based on audio duration
// The model processes longer audio more efficiently (sub-linear scaling)
// Formula: baseOverhead + coefficient * sqrt(audioDuration)
// This gives: 3s audio ≈ 2.5s wait, 6s ≈ 3.2s, 15s ≈ 4.7s, 30s ≈ 6.3s
export function calculateEstimatedTime(audioDurationMs: number, model: 'fast' | 'expert' = 'fast'): number {
  const audioDurationSec = audioDurationMs / 1000;

  // Base overhead for API call/network latency (in seconds)
  const baseOverhead = model === 'expert' ? 2.0 : 0.8;

  // Square root scaling - longer audio has proportionally less wait time
  // Expert model is significantly slower
  const coefficient = model === 'expert' ? 3.5 : 1.0;
  const estimated = baseOverhead + coefficient * Math.sqrt(audioDurationSec);

  // Minimum 1.5s (4s for expert), cap at reasonable max
  const minTime = model === 'expert' ? 4.0 : 1.5;
  const maxTime = model === 'expert' ? 45 : 15;

  const clamped = Math.max(minTime, Math.min(estimated, maxTime));

  return clamped * 1000; // Return in ms
}

function readOpenAIAccountAuth(): OpenAIAccountAuth | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(OPENAI_ACCOUNT_ENABLED_KEY) !== 'true') return null;

  const raw = localStorage.getItem(OPENAI_ACCOUNT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const auth = JSON.parse(raw) as OpenAIAccountAuth;
    return auth.accessToken ? auth : null;
  } catch {
    return null;
  }
}

async function refreshOpenAIAccountAuthIfNeeded(auth: OpenAIAccountAuth | null) {
  if (!auth) return null;
  if (auth.integrityState && auth.expiresAtMillis > Date.now() + 60_000) return auth;

  const response = await fetch('/api/openai-account/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth }),
  });

  if (!response.ok) return auth;

  const data = await response.json();
  if (data.auth?.accessToken) {
    localStorage.setItem(OPENAI_ACCOUNT_STORAGE_KEY, JSON.stringify(data.auth));
    window.dispatchEvent(new Event('cracker-openai-account-change'));
    return data.auth as OpenAIAccountAuth;
  }

  return auth;
}

function transcribeTextFromPayload(payload: unknown) {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  for (const key of ['text', 'transcript', 'transcription']) {
    if (typeof data[key] === 'string') return data[key].trim();
  }
  return '';
}

function normalizeAudioForChatGPT(audioBlob: Blob, mimeType: string) {
  const normalizedMimeType = (mimeType || 'audio/webm').split(';')[0] || 'audio/webm';
  const extension = normalizedMimeType.includes('mp4') ? 'mp4' : normalizedMimeType.includes('mpeg') ? 'mp3' : 'webm';
  return new File([audioBlob], `recording.${extension}`, { type: normalizedMimeType });
}

async function transcribeWithChatGPTBackendInBrowser(audioBlob: Blob, mimeType: string, auth: OpenAIAccountAuth) {
  const requestId = `cracker-transcribe-${crypto.randomUUID?.() || Date.now()}`;
  const formData = new FormData();
  formData.append('file', normalizeAudioForChatGPT(audioBlob, mimeType));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: 'application/json, text/plain, */*',
    'x-client-request-id': requestId,
    session_id: requestId,
  };
  if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;
  if (auth.integrityState) headers['X-OAI-IS'] = auth.integrityState;

  const response = await fetch('https://chatgpt.com/backend-api/transcribe', {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`ChatGPT browser transcription failed ${response.status}: ${raw.slice(0, 300)}`);
  }

  const payload = contentType.includes('application/json') ? JSON.parse(raw) : raw;
  const text = transcribeTextFromPayload(payload);
  if (!text) throw new Error('ChatGPT browser transcription returned no text');

  const integrityState = response.headers.get('x-oai-is-update') || response.headers.get('x-oai-is') || auth.integrityState || null;
  if (integrityState && integrityState !== auth.integrityState) {
    localStorage.setItem(OPENAI_ACCOUNT_STORAGE_KEY, JSON.stringify({ ...auth, integrityState }));
    window.dispatchEvent(new Event('cracker-openai-account-change'));
  }

  return text;
}

export function useVoiceRecording({ onTranscription, onError }: UseVoiceRecordingOptions = {}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [transcribeStartTime, setTranscribeStartTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const selectedModelRef = useRef<'fast' | 'expert'>('fast');

  const startRecording = useCallback(async (model: 'fast' | 'expert' = 'fast') => {
    // Reset permission denied state
    setPermissionDenied(false);
    selectedModelRef.current = model;
    setState('requesting');

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (chunksRef.current.length === 0) {
          setState('idle');
          onError?.('No audio recorded');
          return;
        }

        // Calculate recording duration and estimated transcription time
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        const estimated = calculateEstimatedTime(recordingDuration, selectedModelRef.current);
        setEstimatedDuration(estimated);
        setTranscribeStartTime(Date.now());
        setState('transcribing');

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        try {
          const openAIAccountAuth = await refreshOpenAIAccountAuthIfNeeded(readOpenAIAccountAuth());
          if (!openAIAccountAuth) {
            throw new Error('OpenAI account is required for ChatGPT backend transcription');
          }

          try {
            const text = await transcribeWithChatGPTBackendInBrowser(audioBlob, mimeType, openAIAccountAuth);
            onTranscription?.(text);
            return;
          } catch (browserError) {
            console.warn('Browser ChatGPT transcription failed, trying server proxy:', browserError);
          }

          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${mimeType.includes('webm') ? 'webm' : 'mp4'}`);
          formData.append('openAIAccountAuth', JSON.stringify(openAIAccountAuth));

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.details || data?.error || 'Transcription failed');
          }

          if (data.auth?.accessToken) {
            localStorage.setItem(OPENAI_ACCOUNT_STORAGE_KEY, JSON.stringify(data.auth));
            window.dispatchEvent(new Event('cracker-openai-account-change'));
          }

          if (data.text) {
            onTranscription?.(data.text);
          } else {
            onError?.('No transcription received');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          onError?.(error instanceof Error ? error.message : 'Transcription failed');
        } finally {
          setState('idle');
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      recordingStartTimeRef.current = Date.now();
      setState('recording');
    } catch (error) {
      console.error('Recording error:', error);
      setState('idle');

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setPermissionDenied(true);
        onError?.('Microphone permission denied');
      } else {
        onError?.(error instanceof Error ? error.message : 'Failed to start recording');
      }
    }
  }, [onTranscription, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      // Stop recording without triggering transcription
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    chunksRef.current = [];
    setState('idle');
  }, [state]);

  return {
    state,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    isRequesting: state === 'requesting',
    estimatedDuration,
    transcribeStartTime,
  };
}

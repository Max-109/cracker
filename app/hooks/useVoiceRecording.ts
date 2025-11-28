'use client';

import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'transcribing';

interface UseVoiceRecordingOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

// Calculate estimated transcription time based on audio duration
// Formula: ~0.6-0.7x of audio duration (3s audio ≈ 2s wait)
// With a minimum of 1.5s and a slight logarithmic curve for longer audio
export function calculateEstimatedTime(audioDurationMs: number): number {
  const audioDurationSec = audioDurationMs / 1000;
  // Base ratio of 0.65, with slight reduction for longer audio (model batches efficiently)
  const ratio = 0.65 - Math.min(0.15, audioDurationSec / 100);
  const estimated = Math.max(1.5, audioDurationSec * ratio);
  return estimated * 1000; // Return in ms
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

  const startRecording = useCallback(async () => {
    // Reset permission denied state
    setPermissionDenied(false);
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
        const estimated = calculateEstimatedTime(recordingDuration);
        setEstimatedDuration(estimated);
        setTranscribeStartTime(Date.now());
        setState('transcribing');

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        try {
          // Send to transcription API
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${mimeType.includes('webm') ? 'webm' : 'mp4'}`);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
          }

          const data = await response.json();
          
          if (data.transcription) {
            onTranscription?.(data.transcription);
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

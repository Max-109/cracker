import { useState, useRef, useCallback, useEffect } from 'react';
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { showAppDialog } from '../components/ui/AppDialog';

interface UseVoiceRecordingReturn {
    isRecording: boolean;
    isProcessing: boolean;
    recordingDuration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<string | null>;
    cancelRecording: () => Promise<void>;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            if (recorder.isRecording) {
                recorder.stop().catch(() => { });
            }
        };
    }, [recorder]);

    const startRecording = useCallback(async () => {
        try {
            // Request permissions
            const { status } = await requestRecordingPermissionsAsync();
            if (status !== 'granted') {
                showAppDialog({ title: 'Permission Required', message: 'Microphone permission is needed to record audio.', tone: 'warning' });
                return;
            }

            // Configure audio mode
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
            });

            await recorder.prepareToRecordAsync();
            recorder.record();

            setIsRecording(true);
            setRecordingDuration(0);

            // Start duration timer
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch {
            showAppDialog({ title: 'Error', message: 'Failed to start recording', tone: 'error' });
        }
    }, [recorder]);

    const stopRecording = useCallback(async (): Promise<string | null> => {
        if (!recorder.isRecording) return null;

        try {
            setIsProcessing(true);

            // Stop duration timer
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }

            // Stop and save recording
            await recorder.stop();
            const uri = recorder.uri;

            // Reset audio mode
            await setAudioModeAsync({
                allowsRecording: false,
            });

            setIsRecording(false);
            setRecordingDuration(0);
            setIsProcessing(false);

            return uri;
        } catch {
            setIsRecording(false);
            setIsProcessing(false);
            return null;
        }
    }, [recorder]);

    const cancelRecording = useCallback(async () => {
        if (!recorder.isRecording) return;

        try {
            // Stop duration timer
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }

            await recorder.stop();

            // Delete the temp file
            const uri = recorder.uri;
            if (uri) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            }

            // Reset audio mode
            await setAudioModeAsync({
                allowsRecording: false,
            });

            setIsRecording(false);
            setRecordingDuration(0);
        } catch {
            setIsRecording(false);
        }
    }, [recorder]);

    return {
        isRecording,
        isProcessing,
        recordingDuration,
        startRecording,
        stopRecording,
        cancelRecording,
    };
}

// Format seconds to MM:SS
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

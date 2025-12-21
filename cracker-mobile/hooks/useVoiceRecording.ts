import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

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
    const recordingRef = useRef<Audio.Recording | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        try {
            // Request permissions
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
                return;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });

            // Create and start recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            setIsRecording(true);
            setRecordingDuration(0);

            // Start duration timer
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            console.log('[Voice] Recording started');
        } catch (error) {
            console.error('[Voice] Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording');
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<string | null> => {
        if (!recordingRef.current) return null;

        try {
            setIsProcessing(true);

            // Stop duration timer
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }

            // Stop and save recording
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();

            console.log('[Voice] Recording stopped, URI:', uri);

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            recordingRef.current = null;
            setIsRecording(false);
            setRecordingDuration(0);
            setIsProcessing(false);

            return uri;
        } catch (error) {
            console.error('[Voice] Failed to stop recording:', error);
            setIsRecording(false);
            setIsProcessing(false);
            return null;
        }
    }, []);

    const cancelRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            // Stop duration timer
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }

            await recordingRef.current.stopAndUnloadAsync();

            // Delete the temp file
            const uri = recordingRef.current.getURI();
            if (uri) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            }

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            recordingRef.current = null;
            setIsRecording(false);
            setRecordingDuration(0);

            console.log('[Voice] Recording cancelled');
        } catch (error) {
            console.error('[Voice] Failed to cancel recording:', error);
            setIsRecording(false);
        }
    }, []);

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

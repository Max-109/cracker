import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSettingsStore } from '../store/settings';

const BASE_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 120_000;

export function useSettingsSync(enabled: boolean) {
    const syncFromServer = useSettingsStore((state) => state.syncFromServer);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const retryDelayRef = useRef(BASE_INTERVAL_MS);

    useEffect(() => {
        if (!enabled) return;

        let disposed = false;

        const clearPoll = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        const runSync = async () => {
            if (disposed || appStateRef.current !== 'active') return;
            try {
                await syncFromServer();
                retryDelayRef.current = BASE_INTERVAL_MS;
            } catch {
                retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_INTERVAL_MS);
            }
        };

        const startPoll = () => {
            clearPoll();
            intervalRef.current = setInterval(runSync, retryDelayRef.current);
        };

        if (appStateRef.current === 'active') {
            runSync().catch(() => { });
            startPoll();
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            const wasActive = appStateRef.current === 'active';
            appStateRef.current = nextState;

            if (nextState === 'active') {
                runSync().catch(() => { });
                startPoll();
            } else if (wasActive) {
                clearPoll();
            }
        });

        return () => {
            disposed = true;
            clearPoll();
            subscription.remove();
        };
    }, [enabled, syncFromServer]);
}

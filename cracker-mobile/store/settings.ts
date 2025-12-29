import { create } from 'zustand';
import type { MMKV } from 'react-native-mmkv';
import { UserSettings, LocalSettings, ChatMode, LearningSubMode, ReasoningEffort } from '../lib/types';
import { api } from '../lib/api';

// Lazy initialize MMKV storage - cached for performance
let storage: MMKV | null = null;
let storageInitialized = false;

function getStorage(): MMKV {
    if (!storageInitialized) {
        storageInitialized = true;
        try {
            const m = require('react-native-mmkv');
            storage = new m.MMKV() as MMKV;
        } catch {
            // Return mock storage
            storage = {
                getString: () => undefined,
                getBoolean: () => undefined,
                getNumber: () => undefined,
                set: () => { },
                delete: () => { },
                contains: () => false,
            } as unknown as MMKV;
        }
    }
    return storage as MMKV;
}

// Pre-load cached values - called once at module load for instant startup
function getCachedValues() {
    const s = getStorage();
    return {
        accentColor: s.getString('accentColor') || '#af8787',
        codeWrap: s.getBoolean('codeWrap') ?? false,
        autoScroll: s.getBoolean('autoScroll') ?? true,
        modelId: s.getString('currentModelId') || 'gemini-2.5-flash',
        modelName: s.getString('currentModelName') || 'Gemini 2.5 Flash',
        reasoningEffort: (s.getString('reasoningEffort') as ReasoningEffort) || 'medium',
        responseLength: s.getNumber('responseLength') ?? 50,
        chatMode: (s.getString('chatMode') as ChatMode) || 'chat',
        learningSubMode: (s.getString('learningSubMode') as LearningSubMode) || 'summary',
    };
}

const cached = getCachedValues();

// Default settings (use cached values for instant display)
const defaultLocalSettings: LocalSettings = {
    accentColor: cached.accentColor,
    codeWrap: cached.codeWrap,
    autoScroll: cached.autoScroll,
};

const defaultUserSettings: Partial<UserSettings> = {
    currentModelId: cached.modelId,
    currentModelName: cached.modelName,
    reasoningEffort: cached.reasoningEffort,
    responseLength: cached.responseLength,
    learningMode: false,
    chatMode: cached.chatMode,
    learningSubMode: cached.learningSubMode,
    customInstructions: '',
    userName: '',
    userGender: 'he',
    enabledMcpServers: ['brave-search'],
};

interface SettingsState {
    // Local settings (MMKV)
    accentColor: string;
    codeWrap: boolean;
    autoScroll: boolean;

    // Remote settings (API)
    currentModelId: string;
    currentModelName: string;
    reasoningEffort: ReasoningEffort;
    responseLength: number;
    chatMode: ChatMode;
    learningSubMode: LearningSubMode;
    customInstructions: string;
    userName: string;
    userGender: string;
    enabledMcpServers: string[];

    // Status
    isLoading: boolean;
    isSynced: boolean;

    // Actions
    initialize: () => void;
    syncFromServer: () => Promise<void>;

    // Local setters
    setAccentColor: (color: string) => void;
    setCodeWrap: (wrap: boolean) => void;
    setAutoScroll: (scroll: boolean) => void;

    // Remote setters (auto-sync to server)
    setResponseLength: (length: number) => Promise<void>;
    setChatMode: (mode: ChatMode) => Promise<void>;
    setLearningSubMode: (mode: LearningSubMode) => Promise<void>;
    setCustomInstructions: (instructions: string) => Promise<void>;
    setUserName: (name: string) => void;
    setUserGender: (gender: string) => void;
    setEnabledMcpServers: (servers: string[]) => Promise<void>;
    setReasoningEffort: (effort: ReasoningEffort) => Promise<void>;
    setCurrentModelId: (modelId: string) => Promise<void>;
    toggleMcpServer: (serverSlug: string, enabled: boolean) => void;
    saveToServer: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    // Initial values
    ...defaultLocalSettings,
    ...defaultUserSettings as Required<UserSettings>,
    isLoading: false,
    isSynced: false,

    initialize: () => {
        // Settings are already loaded from MMKV cache at module load
        // This is kept for API compatibility but does minimal work
        try {
            const mmkv = getStorage();
            const accentColor = mmkv.getString('accentColor') || cached.accentColor;
            const codeWrap = mmkv.getBoolean('codeWrap') ?? cached.codeWrap;
            const autoScroll = mmkv.getBoolean('autoScroll') ?? cached.autoScroll;
            set({ accentColor, codeWrap, autoScroll });
        } catch {
            // Silent fail - cached values are already in use
        }
    },

    syncFromServer: async () => {
        set({ isLoading: true });
        try {
            const settings = await api.getSettings();

            // Apply accent color from server if present (always sync from server)
            const serverAccentColor = settings.accentColor as string | undefined;
            if (serverAccentColor) {
                const currentAccent = useSettingsStore.getState().accentColor;
                // Only update if different to avoid unnecessary re-renders
                if (serverAccentColor !== currentAccent) {
                    set({ accentColor: serverAccentColor });
                    try {
                        getStorage().set('accentColor', serverAccentColor);
                    } catch { }

                    // Update app icon to match synced color (non-blocking)
                    import('../lib/iconMatcher').then(({ updateAppIconForColor }) => {
                        updateAppIconForColor(serverAccentColor);
                    }).catch(() => { });
                }
            }

            // Cache critical settings locally for instant startup
            const mmkv = getStorage();
            const modelId = String(settings.currentModelId || cached.modelId);
            const modelName = String(settings.currentModelName || cached.modelName);
            const effort = (settings.reasoningEffort as ReasoningEffort) || cached.reasoningEffort;
            const length = Number(settings.responseLength) || cached.responseLength;
            const mode = (settings.chatMode as ChatMode) || cached.chatMode;
            const subMode = (settings.learningSubMode as LearningSubMode) || cached.learningSubMode;

            // Persist to MMKV for instant next startup
            try {
                mmkv.set('currentModelId', modelId);
                mmkv.set('currentModelName', modelName);
                mmkv.set('reasoningEffort', effort as string);
                mmkv.set('responseLength', length);
                mmkv.set('chatMode', mode as string);
                mmkv.set('learningSubMode', subMode as string);
            } catch { }

            set({
                currentModelId: modelId,
                currentModelName: modelName,
                reasoningEffort: effort,
                responseLength: length,
                chatMode: mode,
                learningSubMode: subMode,
                customInstructions: String(settings.customInstructions || ''),
                userName: String(settings.userName || ''),
                userGender: String(settings.userGender || ''),
                enabledMcpServers: (settings.enabledMcpServers as string[]) || defaultUserSettings.enabledMcpServers,
                isSynced: true,
            });
        } catch {
            // Silent fail - cached values are already in use
        } finally {
            set({ isLoading: false });
        }
    },

    // Local setters - also save to server for cross-device sync
    setAccentColor: (color) => {
        try {
            getStorage().set('accentColor', color);
        } catch { }
        set({ accentColor: color });

        // Update app icon to match accent color (non-blocking)
        import('../lib/iconMatcher').then(({ updateAppIconForColor }) => {
            updateAppIconForColor(color);
        }).catch(() => { });

        // Save to server for cross-device sync (non-blocking)
        api.updateSettings({ accentColor: color }).catch(() => { });
    },

    setCodeWrap: (wrap) => {
        try {
            getStorage().set('codeWrap', wrap);
        } catch { }
        set({ codeWrap: wrap });
    },

    setAutoScroll: (scroll) => {
        try {
            getStorage().set('autoScroll', scroll);
        } catch { }
        set({ autoScroll: scroll });
    },

    // Remote setters
    setResponseLength: async (length) => {
        set({ responseLength: length });
        try {
            await api.updateSettings({ responseLength: length });
        } catch { }
    },

    setChatMode: async (mode) => {
        set({ chatMode: mode });
        try {
            await api.updateSettings({ chatMode: mode });
        } catch { }
    },

    setLearningSubMode: async (mode) => {
        set({ learningSubMode: mode });
        try {
            await api.updateSettings({ learningSubMode: mode });
        } catch { }
    },

    setCustomInstructions: async (instructions) => {
        set({ customInstructions: instructions });
        try {
            await api.updateSettings({ customInstructions: instructions });
        } catch { }
    },

    setUserName: (name) => {
        set({ userName: name });
    },

    setUserGender: (gender) => {
        set({ userGender: gender });
    },

    setEnabledMcpServers: async (servers) => {
        set({ enabledMcpServers: servers });
        try {
            await api.updateSettings({ enabledMcpServers: servers });
        } catch { }
    },

    setReasoningEffort: async (effort) => {
        set({ reasoningEffort: effort });
        try {
            await api.updateSettings({ reasoningEffort: effort });
        } catch { }
    },

    setCurrentModelId: async (modelId) => {
        set({ currentModelId: modelId });
        try {
            await api.updateSettings({ currentModelId: modelId });
        } catch { }
    },

    toggleMcpServer: (serverSlug, enabled) => {
        set((state) => {
            const servers = state.enabledMcpServers;
            if (enabled) {
                return { enabledMcpServers: [...servers, serverSlug] };
            } else {
                return { enabledMcpServers: servers.filter(s => s !== serverSlug) };
            }
        });
    },

    saveToServer: async () => {
        const state = useSettingsStore.getState();
        try {
            await api.updateSettings({
                userName: state.userName,
                userGender: state.userGender,
                enabledMcpServers: state.enabledMcpServers,
                codeWrap: state.codeWrap,
                autoScroll: state.autoScroll,
            });
        } catch {
            // Silent fail - will retry on next sync
        }
    },
}));

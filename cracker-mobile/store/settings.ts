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
const MODEL_NAMES: Record<string, string> = {
    'gpt-5.5': 'Expert',
    'gpt-5.4-mini': 'Balanced',
    'gpt-5.3-codex-spark': 'Ultra Fast',
    'gemini-3-pro-preview': 'Expert',
    'gemini-3-flash-preview': 'Balanced',
    'gemini-2.5-flash-lite-preview-09-2025': 'Ultra Fast',
};

function normalizeModelName(modelId: string, modelName?: string | null) {
    if (!modelName || /gemini/i.test(modelName)) {
        return MODEL_NAMES[modelId] || modelName || 'Balanced';
    }
    return modelName;
}

function getCachedValues() {
    const s = getStorage();
    const modelId = s.getString('currentModelId') || 'gpt-5.4-mini';
    const modelName = normalizeModelName(modelId, s.getString('currentModelName'));

    return {
        accentColor: s.getString('accentColor') || '#af8787',
        codeWrap: s.getBoolean('codeWrap') ?? true,
        autoScroll: s.getBoolean('autoScroll') ?? true,
        fastMode: s.getBoolean('fastMode') ?? false,
        modelId,
        modelName,
        reasoningEffort: (s.getString('reasoningEffort') as ReasoningEffort) || 'medium',
        responseLength: s.getNumber('responseLength') ?? 50,
        chatMode: (s.getString('chatMode') as ChatMode) || 'chat',
        learningSubMode: (s.getString('learningSubMode') as LearningSubMode) || 'summary',
        customInstructions: s.getString('customInstructions') || '',
        userName: s.getString('userName') || '',
        userGender: s.getString('userGender') || 'he',
        enabledMcpServers: (() => {
            try {
                const stored = s.getString('enabledMcpServers');
                const parsed = stored ? JSON.parse(stored) : null;
                return Array.isArray(parsed) ? parsed : ['brave-search'];
            } catch {
                return ['brave-search'];
            }
        })(),
    };
}

const cached = getCachedValues();

// Default settings (use cached values for instant display)
const defaultLocalSettings: LocalSettings = {
    accentColor: cached.accentColor,
    codeWrap: cached.codeWrap,
    autoScroll: cached.autoScroll,
    fastMode: cached.fastMode,
};

const defaultUserSettings: Partial<UserSettings> = {
    currentModelId: cached.modelId,
    currentModelName: cached.modelName,
    reasoningEffort: cached.reasoningEffort,
    responseLength: cached.responseLength,
    learningMode: false,
    chatMode: cached.chatMode,
    learningSubMode: cached.learningSubMode,
    customInstructions: cached.customInstructions,
    userName: cached.userName,
    userGender: cached.userGender,
    enabledMcpServers: cached.enabledMcpServers,
};

interface SettingsState {
    // Local settings (MMKV)
    accentColor: string;
    codeWrap: boolean;
    autoScroll: boolean;
    fastMode: boolean;

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
    setFastMode: (enabled: boolean) => void;

    // Remote setters (auto-sync to server)
    setResponseLength: (length: number) => Promise<void>;
    setChatMode: (mode: ChatMode) => Promise<void>;
    setLearningSubMode: (mode: LearningSubMode) => Promise<void>;
    setCustomInstructions: (instructions: string) => Promise<void>;
    setUserName: (name: string) => void;
    setUserGender: (gender: string) => void;
    setEnabledMcpServers: (servers: string[]) => Promise<void>;
    setReasoningEffort: (effort: ReasoningEffort) => Promise<void>;
    setCurrentModelId: (modelId: string, modelName?: string) => Promise<void>;
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
            const fastMode = mmkv.getBoolean('fastMode') ?? cached.fastMode;
            set({ accentColor, codeWrap, autoScroll, fastMode });
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
            const modelName = normalizeModelName(modelId, String(settings.currentModelName || cached.modelName));
            const effort = (settings.reasoningEffort as ReasoningEffort) || cached.reasoningEffort;
            const length = Number(settings.responseLength) || cached.responseLength;
            const mode = (settings.chatMode as ChatMode) || cached.chatMode;
            const subMode = (settings.learningSubMode as LearningSubMode) || cached.learningSubMode;
            const customInstructions = String(settings.customInstructions || '');
            const userName = String(settings.userName || '');
            const userGender = String(settings.userGender || cached.userGender);
            const enabledMcpServers = (settings.enabledMcpServers as string[]) || defaultUserSettings.enabledMcpServers;
            const codeWrap = typeof settings.codeWrap === 'boolean' ? settings.codeWrap : cached.codeWrap;
            const autoScroll = typeof settings.autoScroll === 'boolean' ? settings.autoScroll : cached.autoScroll;
            const localFastMode = mmkv.getBoolean('fastMode') ?? cached.fastMode;
            const fastMode = typeof settings.fastMode === 'boolean' ? settings.fastMode : localFastMode;

            // Persist to MMKV for instant next startup
            try {
                mmkv.set('currentModelId', modelId);
                mmkv.set('currentModelName', modelName);
                mmkv.set('reasoningEffort', effort as string);
                mmkv.set('responseLength', length);
                mmkv.set('chatMode', mode as string);
                mmkv.set('learningSubMode', subMode as string);
                mmkv.set('customInstructions', customInstructions);
                mmkv.set('userName', userName);
                mmkv.set('userGender', userGender);
                mmkv.set('enabledMcpServers', JSON.stringify(enabledMcpServers));
                mmkv.set('codeWrap', codeWrap);
                mmkv.set('autoScroll', autoScroll);
                mmkv.set('fastMode', fastMode);
            } catch { }

            set({
                currentModelId: modelId,
                currentModelName: modelName,
                reasoningEffort: effort,
                responseLength: length,
                chatMode: mode,
                learningSubMode: subMode,
                customInstructions,
                userName,
                userGender,
                codeWrap,
                autoScroll,
                fastMode,
                enabledMcpServers,
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
        api.updateSettings({ codeWrap: wrap }).catch(() => { });
    },


    setAutoScroll: (scroll) => {
        try {
            getStorage().set('autoScroll', scroll);
        } catch { }
        set({ autoScroll: scroll });
        api.updateSettings({ autoScroll: scroll }).catch(() => { });
    },

    setFastMode: (enabled) => {
        try {
            getStorage().set('fastMode', enabled);
        } catch { }
        set({ fastMode: enabled });
        api.updateSettings({ fastMode: enabled }).catch(() => { });
    },


    // Remote setters
    setResponseLength: async (length) => {
        try { getStorage().set('responseLength', length); } catch { }
        set({ responseLength: length });
        try {
            await api.updateSettings({ responseLength: length });
        } catch { }
    },

    setChatMode: async (mode) => {
        try { getStorage().set('chatMode', mode as string); } catch { }
        set({ chatMode: mode });
        try {
            await api.updateSettings({ chatMode: mode });
        } catch { }
    },

    setLearningSubMode: async (mode) => {
        try { getStorage().set('learningSubMode', mode as string); } catch { }
        set({ learningSubMode: mode });
        try {
            await api.updateSettings({ learningSubMode: mode });
        } catch { }
    },

    setCustomInstructions: async (instructions) => {
        try { getStorage().set('customInstructions', instructions); } catch { }
        set({ customInstructions: instructions });
        try {
            await api.updateSettings({ customInstructions: instructions });
        } catch { }
    },

    setUserName: (name) => {
        try { getStorage().set('userName', name); } catch { }
        set({ userName: name });
        api.updateSettings({ userName: name }).catch(() => { });
    },

    setUserGender: (gender) => {
        try { getStorage().set('userGender', gender); } catch { }
        set({ userGender: gender });
        api.updateSettings({ userGender: gender }).catch(() => { });
    },

    setEnabledMcpServers: async (servers) => {
        try { getStorage().set('enabledMcpServers', JSON.stringify(servers)); } catch { }
        set({ enabledMcpServers: servers });
        try {
            await api.updateSettings({ enabledMcpServers: servers });
        } catch { }
    },

    setReasoningEffort: async (effort) => {
        try { getStorage().set('reasoningEffort', effort as string); } catch { }
        set({ reasoningEffort: effort });
        try {
            await api.updateSettings({ reasoningEffort: effort });
        } catch { }
    },

    setCurrentModelId: async (modelId, modelName) => {
        const nextModelName = normalizeModelName(modelId, modelName || MODEL_NAMES[modelId]);
        set({ currentModelId: modelId, currentModelName: nextModelName });
        try {
            const mmkv = getStorage();
            mmkv.set('currentModelId', modelId);
            mmkv.set('currentModelName', nextModelName);
        } catch { }
        try {
            await api.updateSettings({ currentModelId: modelId, currentModelName: nextModelName });
        } catch { }
    },

    toggleMcpServer: (serverSlug, enabled) => {
        set((state) => {
            const servers = state.enabledMcpServers;
            const nextServers = enabled ? [...servers, serverSlug] : servers.filter(s => s !== serverSlug);
            try { getStorage().set('enabledMcpServers', JSON.stringify(nextServers)); } catch { }
            api.updateSettings({ enabledMcpServers: nextServers }).catch(() => { });
            return { enabledMcpServers: nextServers };
        });
    },

    saveToServer: async () => {
        const state = useSettingsStore.getState();
        try {
            await api.updateSettings({
                userName: state.userName,
                userGender: state.userGender,
                customInstructions: state.customInstructions,
                enabledMcpServers: state.enabledMcpServers,
                codeWrap: state.codeWrap,
                autoScroll: state.autoScroll,
                fastMode: state.fastMode,
            });
        } catch {
            // Silent fail - will retry on next sync
        }
    },
}));

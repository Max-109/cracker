import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { UserSettings, LocalSettings, ChatMode, LearningSubMode, ReasoningEffort } from '../lib/types';
import { api } from '../lib/api';

// Lazy initialize MMKV storage to avoid crash on app start
let storage: MMKV | null = null;

function getStorage(): MMKV {
    if (!storage) {
        try {
            const m = require('react-native-mmkv');
            storage = new m.MMKV() as MMKV;
        } catch (error) {
            console.error('Failed to initialize MMKV:', error);
            // Return a mock storage that does nothing
            return {
                getString: () => undefined,
                getBoolean: () => undefined,
                set: () => { },
            } as unknown as MMKV;
        }
    }
    return storage as MMKV;
}

// Default settings
const defaultLocalSettings: LocalSettings = {
    accentColor: '#af8787',
    codeWrap: false,
    autoScroll: true,
};

const defaultUserSettings: Partial<UserSettings> = {
    currentModelId: 'gemini-2.5-flash',
    currentModelName: 'Gemini 2.5 Flash',
    reasoningEffort: 'medium',
    responseLength: 50,
    learningMode: false,
    chatMode: 'chat',
    learningSubMode: 'summary',
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
        try {
            const mmkv = getStorage();
            // Load local settings from MMKV
            const accentColor = mmkv.getString('accentColor') || defaultLocalSettings.accentColor;
            const codeWrap = mmkv.getBoolean('codeWrap') ?? defaultLocalSettings.codeWrap;
            const autoScroll = mmkv.getBoolean('autoScroll') ?? defaultLocalSettings.autoScroll;
            set({ accentColor, codeWrap, autoScroll });
        } catch (error) {
            console.error('Failed to initialize settings:', error);
        }
    },

    syncFromServer: async () => {
        set({ isLoading: true });
        try {
            const settings = await api.getSettings();
            set({
                currentModelId: String(settings.currentModelId || defaultUserSettings.currentModelId),
                currentModelName: String(settings.currentModelName || defaultUserSettings.currentModelName),
                reasoningEffort: (settings.reasoningEffort as ReasoningEffort) || defaultUserSettings.reasoningEffort,
                responseLength: Number(settings.responseLength) || defaultUserSettings.responseLength,
                chatMode: (settings.chatMode as ChatMode) || defaultUserSettings.chatMode,
                learningSubMode: (settings.learningSubMode as LearningSubMode) || defaultUserSettings.learningSubMode,
                customInstructions: String(settings.customInstructions || ''),
                userName: String(settings.userName || ''),
                userGender: String(settings.userGender || ''),
                enabledMcpServers: (settings.enabledMcpServers as string[]) || defaultUserSettings.enabledMcpServers,
                isSynced: true,
            });
        } catch (error) {
            console.error('Failed to sync settings:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    // Local setters
    setAccentColor: (color) => {
        try {
            getStorage().set('accentColor', color);
        } catch { }
        set({ accentColor: color });
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
        } catch (error) {
            console.error('Failed to save settings to server:', error);
        }
    },
}));

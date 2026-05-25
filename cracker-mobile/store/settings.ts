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
        settingsVersion: s.getNumber('settingsVersion') ?? null,
        settingsEtag: s.getString('settingsEtag') || null,
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

type SettingsField =
    | 'accentColor'
    | 'codeWrap'
    | 'autoScroll'
    | 'fastMode'
    | 'currentModelId'
    | 'currentModelName'
    | 'reasoningEffort'
    | 'responseLength'
    | 'chatMode'
    | 'learningSubMode'
    | 'customInstructions'
    | 'userName'
    | 'userGender'
    | 'enabledMcpServers';

const LOCAL_WRITE_GRACE_MS = 10_000;
const localEditedAt = new Map<SettingsField, number>();
const pendingFields = new Set<SettingsField>();
const editingFields = new Set<SettingsField>();
let syncPromise: Promise<void> | null = null;
let accentSaveTimer: ReturnType<typeof setTimeout> | null = null;

function markLocalWrite(fields: SettingsField[]) {
    const now = Date.now();
    fields.forEach((field) => {
        localEditedAt.set(field, now);
        pendingFields.add(field);
    });
}

function clearPending(fields: SettingsField[]) {
    fields.forEach((field) => pendingFields.delete(field));
}

function shouldAcceptServerField(field: SettingsField, requestStartedAt: number) {
    if (editingFields.has(field) || pendingFields.has(field)) return false;
    const editedAt = localEditedAt.get(field);
    if (editedAt && (requestStartedAt - editedAt) < LOCAL_WRITE_GRACE_MS) return false;
    return true;
}

function persistServerMetadata(settings: Record<string, unknown>) {
    const version = typeof settings._version === 'number' ? settings._version : null;
    const etag = typeof settings._etag === 'string' ? settings._etag : null;

    try {
        if (version) getStorage().set('settingsVersion', version);
        if (etag) getStorage().set('settingsEtag', etag);
    } catch { }

    useSettingsStore.setState({
        settingsVersion: version ?? useSettingsStore.getState().settingsVersion,
        settingsEtag: etag ?? useSettingsStore.getState().settingsEtag,
        lastSyncedAt: Date.now(),
        lastSyncError: null,
    });
}

async function persistRemote(updates: Record<string, unknown>, fields: SettingsField[]) {
    markLocalWrite(fields);
    try {
        const settings = await api.updateSettings(updates);
        persistServerMetadata(settings);
        clearPending(fields);
    } catch {
        // Keep the fields protected briefly. A later foreground/interval sync can reconcile.
        setTimeout(() => clearPending(fields), LOCAL_WRITE_GRACE_MS);
    }
}

function persistSetting(field: SettingsField, value: string | number | boolean | string[]) {
    try {
        if (Array.isArray(value)) {
            getStorage().set(field, JSON.stringify(value));
        } else {
            getStorage().set(field, value);
        }
    } catch { }
}

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
    isSyncing: boolean;
    lastSyncedAt: number | null;
    lastSyncError: string | null;
    settingsVersion: number | null;
    settingsEtag: string | null;

    // Actions
    initialize: () => void;
    syncFromServer: () => Promise<void>;
    beginEditingField: (field: SettingsField) => void;
    endEditingField: (field: SettingsField) => void;

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
    isSyncing: false,
    lastSyncedAt: null,
    lastSyncError: null,
    settingsVersion: cached.settingsVersion,
    settingsEtag: cached.settingsEtag,

    initialize: () => {
        // Settings are already loaded from MMKV cache at module load
        // This is kept for API compatibility but does minimal work
        try {
            const mmkv = getStorage();
            const accentColor = mmkv.getString('accentColor') || cached.accentColor;
            const codeWrap = mmkv.getBoolean('codeWrap') ?? cached.codeWrap;
            const autoScroll = mmkv.getBoolean('autoScroll') ?? cached.autoScroll;
            const fastMode = mmkv.getBoolean('fastMode') ?? cached.fastMode;
            const settingsVersion = mmkv.getNumber('settingsVersion') ?? cached.settingsVersion;
            const settingsEtag = mmkv.getString('settingsEtag') || cached.settingsEtag;
            set({ accentColor, codeWrap, autoScroll, fastMode, settingsVersion, settingsEtag });
        } catch {
            // Silent fail - cached values are already in use
        }
    },

    syncFromServer: async () => {
        if (syncPromise) return syncPromise;

        const requestStartedAt = Date.now();
        syncPromise = (async () => {
            set({ isLoading: true, isSyncing: true });
            try {
                const state = useSettingsStore.getState();
                const settings = await api.getSettings({
                    etag: state.settingsEtag || undefined,
                    since: state.settingsVersion || undefined,
                });

                if (settings._notModified) {
                    persistServerMetadata(settings);
                    set({ isSynced: true, lastSyncedAt: Date.now(), lastSyncError: null });
                    return;
                }

                const modelId = String(settings.currentModelId || state.currentModelId || cached.modelId);
                const modelName = normalizeModelName(modelId, String(settings.currentModelName || state.currentModelName || cached.modelName));
                const effort = (settings.reasoningEffort as ReasoningEffort) || state.reasoningEffort || cached.reasoningEffort;
                const length = Number(settings.responseLength) || state.responseLength || cached.responseLength;
                const mode = (settings.chatMode as ChatMode) || state.chatMode || cached.chatMode;
                const subMode = (settings.learningSubMode as LearningSubMode) || state.learningSubMode || cached.learningSubMode;
                const customInstructions = String(settings.customInstructions || '');
                const userName = String(settings.userName || '');
                const userGender = String(settings.userGender || state.userGender || cached.userGender);
                const enabledMcpServers = Array.isArray(settings.enabledMcpServers)
                    ? settings.enabledMcpServers as string[]
                    : state.enabledMcpServers;
                const codeWrap = typeof settings.codeWrap === 'boolean' ? settings.codeWrap : state.codeWrap;
                const autoScroll = typeof settings.autoScroll === 'boolean' ? settings.autoScroll : state.autoScroll;
                const fastMode = typeof settings.fastMode === 'boolean' ? settings.fastMode : state.fastMode;
                const accentColor = typeof settings.accentColor === 'string' ? settings.accentColor : state.accentColor;

                persistServerMetadata(settings);

                const next: Partial<SettingsState> = {
                    isSynced: true,
                    lastSyncedAt: Date.now(),
                    lastSyncError: null,
                    settingsVersion: typeof settings._version === 'number' ? settings._version : state.settingsVersion,
                    settingsEtag: typeof settings._etag === 'string' ? settings._etag : state.settingsEtag,
                };

                const apply = <K extends keyof SettingsState>(field: SettingsField, key: K, value: SettingsState[K], persistValue?: string | number | boolean | string[]) => {
                    if (!shouldAcceptServerField(field, requestStartedAt)) return;
                    next[key] = value;
                    persistSetting(field, persistValue ?? value as string | number | boolean | string[]);
                };

                apply('accentColor', 'accentColor', accentColor);
                apply('currentModelId', 'currentModelId', modelId);
                apply('currentModelName', 'currentModelName', modelName);
                apply('reasoningEffort', 'reasoningEffort', effort);
                apply('responseLength', 'responseLength', length);
                apply('chatMode', 'chatMode', mode);
                apply('learningSubMode', 'learningSubMode', subMode);
                apply('customInstructions', 'customInstructions', customInstructions);
                apply('userName', 'userName', userName);
                apply('userGender', 'userGender', userGender);
                apply('enabledMcpServers', 'enabledMcpServers', enabledMcpServers, enabledMcpServers);
                apply('codeWrap', 'codeWrap', codeWrap);
                apply('autoScroll', 'autoScroll', autoScroll);
                apply('fastMode', 'fastMode', fastMode);

                if (typeof next.accentColor === 'string' && next.accentColor !== state.accentColor) {
                    import('../lib/iconMatcher').then(({ updateAppIconForColor }) => {
                        updateAppIconForColor(next.accentColor as string);
                    }).catch(() => { });
                }

                set(next);
            } catch (error) {
                set({ lastSyncError: error instanceof Error ? error.message : 'Failed to sync settings' });
            } finally {
                set({ isLoading: false, isSyncing: false });
                syncPromise = null;
            }
        })();

        return syncPromise;
    },

    beginEditingField: (field) => {
        editingFields.add(field);
    },

    endEditingField: (field) => {
        editingFields.delete(field);
        localEditedAt.set(field, Date.now());
    },

    // Local setters - also save to server for cross-device sync
    setAccentColor: (color) => {
        persistSetting('accentColor', color);
        markLocalWrite(['accentColor']);
        set({ accentColor: color });

        // Update app icon to match accent color (non-blocking)
        import('../lib/iconMatcher').then(({ updateAppIconForColor }) => {
            updateAppIconForColor(color);
        }).catch(() => { });

        if (accentSaveTimer) clearTimeout(accentSaveTimer);
        accentSaveTimer = setTimeout(() => {
            persistRemote({ accentColor: color }, ['accentColor']).catch(() => { });
            accentSaveTimer = null;
        }, 450);
    },

    setCodeWrap: (wrap) => {
        persistSetting('codeWrap', wrap);
        set({ codeWrap: wrap });
        persistRemote({ codeWrap: wrap }, ['codeWrap']).catch(() => { });
    },

    setAutoScroll: (scroll) => {
        persistSetting('autoScroll', scroll);
        set({ autoScroll: scroll });
        persistRemote({ autoScroll: scroll }, ['autoScroll']).catch(() => { });
    },

    setFastMode: (enabled) => {
        persistSetting('fastMode', enabled);
        set({ fastMode: enabled });
        persistRemote({ fastMode: enabled }, ['fastMode']).catch(() => { });
    },

    // Remote setters
    setResponseLength: async (length) => {
        persistSetting('responseLength', length);
        set({ responseLength: length });
        await persistRemote({ responseLength: length }, ['responseLength']);
    },

    setChatMode: async (mode) => {
        persistSetting('chatMode', mode as string);
        set({ chatMode: mode });
        await persistRemote({ chatMode: mode }, ['chatMode']);
    },

    setLearningSubMode: async (mode) => {
        persistSetting('learningSubMode', mode as string);
        set({ learningSubMode: mode });
        await persistRemote({ learningSubMode: mode }, ['learningSubMode']);
    },

    setCustomInstructions: async (instructions) => {
        persistSetting('customInstructions', instructions);
        set({ customInstructions: instructions });
        await persistRemote({ customInstructions: instructions }, ['customInstructions']);
    },

    setUserName: (name) => {
        persistSetting('userName', name);
        set({ userName: name });
        persistRemote({ userName: name }, ['userName']).catch(() => { });
    },

    setUserGender: (gender) => {
        persistSetting('userGender', gender);
        set({ userGender: gender });
        persistRemote({ userGender: gender }, ['userGender']).catch(() => { });
    },

    setEnabledMcpServers: async (servers) => {
        persistSetting('enabledMcpServers', servers);
        set({ enabledMcpServers: servers });
        await persistRemote({ enabledMcpServers: servers }, ['enabledMcpServers']);
    },

    setReasoningEffort: async (effort) => {
        persistSetting('reasoningEffort', effort as string);
        set({ reasoningEffort: effort });
        await persistRemote({ reasoningEffort: effort }, ['reasoningEffort']);
    },

    setCurrentModelId: async (modelId, modelName) => {
        const nextModelName = normalizeModelName(modelId, modelName || MODEL_NAMES[modelId]);
        set({ currentModelId: modelId, currentModelName: nextModelName });
        persistSetting('currentModelId', modelId);
        persistSetting('currentModelName', nextModelName);
        await persistRemote({ currentModelId: modelId, currentModelName: nextModelName }, ['currentModelId', 'currentModelName']);
    },

    toggleMcpServer: (serverSlug, enabled) => {
        const state = useSettingsStore.getState();
        const servers = state.enabledMcpServers;
        const nextServers = enabled ? [...servers, serverSlug] : servers.filter(s => s !== serverSlug);
        persistSetting('enabledMcpServers', nextServers);
        set({ enabledMcpServers: nextServers });
        persistRemote({ enabledMcpServers: nextServers }, ['enabledMcpServers']).catch(() => { });
    },

    saveToServer: async () => {
        const state = useSettingsStore.getState();
        await persistRemote({
            userName: state.userName,
            userGender: state.userGender,
            customInstructions: state.customInstructions,
            enabledMcpServers: state.enabledMcpServers,
            codeWrap: state.codeWrap,
            autoScroll: state.autoScroll,
            fastMode: state.fastMode,
        }, ['userName', 'userGender', 'customInstructions', 'enabledMcpServers', 'codeWrap', 'autoScroll', 'fastMode']);
    },
}));

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { useAuthStore } from '../../store/auth';
import HSVColorPicker from '../../components/ui/HSVColorPicker';
import Toggle from '../../components/ui/Toggle';
import ArcDial from '../../components/ui/ArcDial';
import { COLORS, FONTS } from '../../lib/design';
import { api, getProviderApiBaseUrl, getProviderApiKey, getProviderEnabled, setProviderApiBaseUrl, setProviderApiKey, setProviderEnabled } from '../../lib/api';
import { useOpenAIAccountStore } from '../../store/openaiAccount';
import { showAppConfirm, showAppDialog } from '../../components/ui/AppDialog';

// Pronoun options - same as web
const GENDER_OPTIONS = [
    { value: 'he', label: 'He' },
    { value: 'she', label: 'She' },
    { value: 'they', label: 'They' },
    { value: 'other', label: 'Other' },
];

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuthStore();
    const {
        accentColor,
        setAccentColor,
        userName,
        setUserName,
        userGender,
        setUserGender,
        codeWrap,
        setCodeWrap,
        autoScroll,
        setAutoScroll,
        enabledMcpServers,
        toggleMcpServer,
        syncFromServer,
        saveToServer,
        responseLength,
        setResponseLength,
        customInstructions,
        setCustomInstructions,
    } = useSettingsStore();

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [localName, setLocalName] = useState(userName);
    const [localInstructions, setLocalInstructions] = useState(customInstructions);
    const [isSaving, setIsSaving] = useState(false);
    const [facts, setFacts] = useState<Array<{ id: string, fact: string }>>([]);
    const [loadingFacts, setLoadingFacts] = useState(true);
    const [apiBaseUrl, setApiBaseUrlState] = useState('');
    const [providerKey, setProviderKey] = useState('');
    const [isSavingProvider, setIsSavingProvider] = useState(false);
    const [isAlternativeApiOpen, setIsAlternativeApiOpen] = useState(false);
    const [alternativeApiEnabled, setAlternativeApiEnabled] = useState(false);
    const {
        accounts: openAIAccounts,
        auth: openAIAuth,
        usage: openAIUsage,
        enabled: openAIEnabled,
        isConnecting: isOpenAIConnecting,
        isLoading: isOpenAILoading,
        lastError: openAIError,
        deviceCode,
        deviceCodeCopiedAt,
        connect: connectOpenAI,
        refreshUsage: refreshOpenAIUsage,
        setEnabled: setOpenAIEnabled,
        disconnect: disconnectOpenAI,
    } = useOpenAIAccountStore();

    useEffect(() => {
        syncFromServer().catch(() => { });
        getProviderApiBaseUrl().then(setApiBaseUrlState).catch(() => { });
        getProviderApiKey().then(setProviderKey).catch(() => { });
        getProviderEnabled().then((enabled) => {
            setAlternativeApiEnabled(enabled);
            setIsAlternativeApiOpen(enabled);
        }).catch(() => { });
        // Fetch memory facts
        api.getUserFacts().then(data => {
            setFacts(data.facts || []);
            setLoadingFacts(false);
        }).catch(() => setLoadingFacts(false));
    }, []);

    useEffect(() => {
        setLocalName(userName);
    }, [userName]);

    useEffect(() => {
        setLocalInstructions(customInstructions);
    }, [customInstructions]);

    const handleBack = () => {
        router.back();
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const handleSaveName = async () => {
        if (localName.trim() !== userName) {
            setUserName(localName.trim());
            setIsSaving(true);
            try {
                await saveToServer();
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSaveInstructions = async () => {
        if (localInstructions !== customInstructions) {
            setCustomInstructions(localInstructions);
            setIsSaving(true);
            try {
                await saveToServer();
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDeleteFact = async (factId: string) => {
        try {
            await api.deleteFact(factId);
            setFacts(prev => prev.filter(f => f.id !== factId));
        } catch (e) {
            showAppDialog({ title: 'Error', message: 'Failed to delete fact', tone: 'error' });
        }
    };

    const handleClearMemory = () => {
        showAppConfirm({
            title: 'Clear Memory',
            message: `This will delete all ${facts.length} stored facts. This action cannot be undone.`,
            confirmLabel: 'Clear All',
            destructive: true,
            onConfirm: async () => {
                try {
                    await api.clearAllFacts();
                    setFacts([]);
                    showAppDialog({ title: 'Memory Cleared', message: 'All facts have been deleted.', tone: 'success' });
                } catch (error) {
                    showAppDialog({ title: 'Error', message: 'Failed to clear memory.', tone: 'error' });
                }
            },
        });
    };

    const handleSaveProvider = async () => {
        if (providerKey.trim() && !apiBaseUrl.trim()) {
            showAppDialog({ title: 'API URL Required', message: 'Paste your API URL before saving an API key.', tone: 'warning' });
            return;
        }
        setIsSavingProvider(true);
        try {
            await setProviderApiBaseUrl(apiBaseUrl);
            await setProviderApiKey(providerKey);
            await setProviderEnabled(alternativeApiEnabled);
            setApiBaseUrlState(await getProviderApiBaseUrl());
            setProviderKey(await getProviderApiKey());
            showAppDialog({ title: 'Saved', message: 'Alternative API settings were saved securely on this device.', tone: 'success' });
        } catch (error) {
            showAppDialog({ title: 'Error', message: error instanceof Error ? error.message : 'Failed to save API settings.', tone: 'error' });
        } finally {
            setIsSavingProvider(false);
        }
    };

    const handleConnectOpenAI = async () => {
        try {
            await connectOpenAI();
            showAppDialog({ title: 'Connected', message: 'OpenAI account linked successfully.', tone: 'success' });
        } catch (error) {
            showAppDialog({ title: 'OpenAI Login', message: error instanceof Error ? error.message : 'OpenAI account login failed.', tone: 'error' });
        }
    };

    const primaryUsed = openAIUsage?.rate_limit?.primary_window?.used_percent;
    const weeklyUsed = openAIUsage?.rate_limit?.secondary_window?.used_percent;
    const primaryLeft = typeof primaryUsed === 'number' ? Math.max(0, 100 - Math.round(primaryUsed)) : null;
    const weeklyLeft = typeof weeklyUsed === 'number' ? Math.max(0, 100 - Math.round(weeklyUsed)) : null;
    const openAIStatus = openAIError ? 'ACTION NEEDED' : openAIAuth ? (openAIEnabled ? 'LINKED' : 'PAUSED') : 'NOT LINKED';

    const SectionHeader = ({ icon, title }: { icon: keyof typeof Ionicons.glyphMap, title: string }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 20 }}>
            <Ionicons name={icon} size={14} color={theme.accent} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    const ToggleRow = ({
        icon,
        label,
        description,
        value,
        onValueChange,
    }: {
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        description?: string,
        value: boolean,
        onValueChange: (value: boolean) => void,
    }) => (
        <View style={styles.toggleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Ionicons name={icon} size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.labelText}>{label}</Text>
                    {description && (
                        <Text style={styles.descText}>{description}</Text>
                    )}
                </View>
            </View>
            <Toggle value={value} onValueChange={onValueChange} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 20,
                        backgroundColor: '#222',
                    }}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Profile Section */}
                <View style={styles.section}>
                    <SectionHeader icon="person-outline" title="PROFILE" />

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Your Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={localName}
                            onChangeText={setLocalName}
                            onBlur={handleSaveName}
                            placeholder="Enter your name"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Pronouns</Text>
                        <View style={styles.pronounRow}>
                            {GENDER_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.pronounButton,
                                        userGender === option.value && {
                                            backgroundColor: `${theme.accent}26`,
                                            borderColor: theme.accent,
                                        }
                                    ]}
                                    onPress={() => {
                                        setUserGender(option.value);
                                        saveToServer().catch(() => { });
                                    }}
                                >
                                    <Text style={[
                                        styles.pronounText,
                                        userGender === option.value && { color: theme.accent }
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <SectionHeader icon="color-palette-outline" title="APPEARANCE" />

                    <TouchableOpacity
                        style={styles.colorRow}
                        onPress={() => setIsColorPickerOpen(!isColorPickerOpen)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Accent Color</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                backgroundColor: accentColor,
                                borderWidth: 2,
                                borderColor: COLORS.borderColor,
                            }} />
                            <Ionicons
                                name={isColorPickerOpen ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={COLORS.textMuted}
                            />
                        </View>
                    </TouchableOpacity>

                    {isColorPickerOpen && (
                        <Animated.View
                            entering={FadeInDown.duration(200)}
                            style={{
                                marginTop: 8,
                                marginBottom: 16,
                                marginHorizontal: 20,
                                borderRadius: 0,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: COLORS.borderColor
                            }}
                        >
                            <HSVColorPicker />
                        </Animated.View>
                    )}
                </View>

                {/* Response Length Section */}
                <View style={styles.section}>
                    <SectionHeader icon="resize-outline" title="RESPONSE LENGTH" />
                    <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                        <ArcDial
                            value={responseLength}
                            onChange={(val) => {
                                setResponseLength(val);
                                saveToServer().catch(() => { });
                            }}
                        />
                        <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 8, fontFamily: FONTS.mono }}>
                            {responseLength <= 25 ? 'BRIEF' : responseLength <= 50 ? 'MODERATE' : responseLength <= 75 ? 'DETAILED' : 'COMPREHENSIVE'}
                        </Text>
                    </View>
                </View>

                {/* Custom Instructions Section */}
                <View style={styles.section}>
                    <SectionHeader icon="create-outline" title="CUSTOM INSTRUCTIONS" />
                    <View style={{ paddingHorizontal: 20 }}>
                        <TextInput
                            style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
                            value={localInstructions}
                            onChangeText={setLocalInstructions}
                            onBlur={handleSaveInstructions}
                            placeholder="Add any custom instructions for the AI..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                        <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 6, fontFamily: FONTS.mono }}>
                            These instructions will be included in every conversation.
                        </Text>
                    </View>
                </View>

                {/* Connections Section */}
                <View style={styles.section}>
                    <SectionHeader icon="link-outline" title="CONNECTIONS" />

                    <View style={styles.connectionCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.labelText}>OpenAI Account</Text>
                                <Text style={styles.descText}>{openAIAuth?.email || 'Use your Codex/OpenAI account for chat responses'}</Text>
                            </View>
                            <Text style={[styles.statusPill, { color: openAIError ? '#ef4444' : openAIAuth && openAIEnabled ? theme.accent : COLORS.textMuted, borderColor: openAIError ? '#ef4444' : openAIAuth && openAIEnabled ? theme.accent : COLORS.borderColor }]}>
                                {openAIStatus}
                            </Text>
                        </View>

                        {(primaryLeft !== null || weeklyLeft !== null) && (
                            <View style={{ marginTop: 12, gap: 10 }}>
                                {[
                                    { label: '5H', value: primaryLeft, used: primaryUsed },
                                    { label: 'Week', value: weeklyLeft, used: weeklyUsed },
                                ].map((item) => item.value !== null && (
                                    <View key={item.label}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text style={styles.descText}>Codex {item.label}</Text>
                                            <Text style={[styles.descText, { color: theme.accent }]}>{item.value}% left</Text>
                                        </View>
                                        <View style={styles.usageTrack}>
                                            <View style={[styles.usageFill, { width: `${Math.min(100, Number(item.used) || 0)}%`, backgroundColor: Number(item.used) >= 90 ? '#ef4444' : theme.accent }]} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {deviceCode && (
                            <View style={styles.codeNotice}>
                                <Ionicons name="copy-outline" size={14} color={theme.accent} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.descText, { color: theme.accent }]}>Device code copied to clipboard</Text>
                                    <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontFamily: FONTS.monoSemiBold, letterSpacing: 2, marginTop: 2 }}>{deviceCode}</Text>
                                </View>
                            </View>
                        )}

                        {openAIError && <Text style={[styles.descText, { color: '#ef4444', marginTop: 10 }]}>{openAIError}</Text>}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                            {openAIAuth ? (
                                <>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={() => refreshOpenAIUsage()} disabled={isOpenAILoading}>
                                        <Text style={styles.secondaryButtonText}>{isOpenAILoading ? 'SYNCING' : 'SYNC'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={handleConnectOpenAI} disabled={isOpenAIConnecting}>
                                        <Text style={styles.secondaryButtonText}>{isOpenAIConnecting ? 'ADDING...' : 'ADD ACCOUNT'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={() => disconnectOpenAI()}>
                                        <Text style={[styles.secondaryButtonText, { color: '#ef4444' }]}>UNLINK ALL</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity style={[styles.primaryButton, { borderColor: theme.accent }]} onPress={handleConnectOpenAI} disabled={isOpenAIConnecting}>
                                    <Text style={[styles.primaryButtonText, { color: theme.accent }]}>{isOpenAIConnecting ? 'WAITING FOR LOGIN...' : 'CONNECT OPENAI'}</Text>
                                </TouchableOpacity>
                            )}
                            {openAIAuth && (
                                <View style={{ marginLeft: 'auto' }}>
                                    <Toggle value={openAIEnabled} onValueChange={setOpenAIEnabled} />
                                </View>
                            )}
                        </View>
                    </View>

                    {openAIAccounts.length > 1 && (
                        <Text style={[styles.descText, { marginHorizontal: 20, marginTop: 8 }]}>{openAIAccounts.length} accounts linked. The least-used enabled account is selected automatically.</Text>
                    )}

                    <View style={[styles.connectionCard, { marginTop: 10 }]}>
                        <TouchableOpacity
                            onPress={() => setIsAlternativeApiOpen(!isAlternativeApiOpen)}
                            activeOpacity={0.75}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.labelText}>Alternative API</Text>
                                <Text style={[styles.descText, { marginTop: 3 }]}>Use your own API URL and API key when OpenAI account is paused.</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Toggle value={alternativeApiEnabled} onValueChange={(value) => { setAlternativeApiEnabled(value); setIsAlternativeApiOpen(value || isAlternativeApiOpen); }} />
                                <Ionicons name={isAlternativeApiOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                            </View>
                        </TouchableOpacity>

                        {isAlternativeApiOpen && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.inputLabel}>API URL</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={apiBaseUrl}
                                    onChangeText={setApiBaseUrlState}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="Paste your API URL"
                                    placeholderTextColor={COLORS.textMuted}
                                />
                                <Text style={[styles.inputLabel, { marginTop: 12 }]}>API Key</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={providerKey}
                                    onChangeText={setProviderKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry
                                    placeholder="API key"
                                    placeholderTextColor={COLORS.textMuted}
                                />
                                <TouchableOpacity style={[styles.primaryButton, { marginTop: 12, borderColor: theme.accent }]} onPress={handleSaveProvider} disabled={isSavingProvider}>
                                    <Text style={[styles.primaryButtonText, { color: theme.accent }]}>{isSavingProvider ? 'SAVING...' : 'SAVE API'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Behavior Section */}
                <View style={styles.section}>
                    <SectionHeader icon="settings-outline" title="BEHAVIOR" />

                    <ToggleRow
                        icon="code-outline"
                        label="Code Wrapping"
                        description="Wrap long lines in code blocks"
                        value={codeWrap}
                        onValueChange={(value) => {
                            setCodeWrap(value);
                            saveToServer().catch(() => { });
                        }}
                    />
                    <ToggleRow
                        icon="arrow-down-outline"
                        label="Auto-scroll"
                        description="Scroll to new messages automatically"
                        value={autoScroll}
                        onValueChange={(value) => {
                            setAutoScroll(value);
                            saveToServer().catch(() => { });
                        }}
                    />
                </View>

                {/* Tools Section */}
                <View style={styles.section}>
                    <SectionHeader icon="globe-outline" title="AI TOOLS" />

                    <ToggleRow
                        icon="search-outline"
                        label="Web Search"
                        description="Search the web for current information"
                        value={enabledMcpServers.includes('brave-search')}
                        onValueChange={(value) => {
                            toggleMcpServer('brave-search', value);
                            saveToServer().catch(() => { });
                        }}
                    />
                    <ToggleRow
                        icon="logo-youtube"
                        label="YouTube"
                        description="Search videos and get transcripts"
                        value={enabledMcpServers.includes('youtube')}
                        onValueChange={(value) => {
                            toggleMcpServer('youtube', value);
                            saveToServer().catch(() => { });
                        }}
                    />
                </View>

                {/* Memory Section */}
                <View style={styles.section}>
                    <SectionHeader icon="bulb-outline" title="MEMORY" />

                    {loadingFacts ? (
                        <Text style={{ color: COLORS.textMuted, paddingHorizontal: 20, fontSize: 13 }}>Loading...</Text>
                    ) : facts.length === 0 ? (
                        <View style={{ paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' }}>
                            <Ionicons name="bulb-outline" size={32} color={COLORS.textMuted} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>No facts yet</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4, opacity: 0.6 }}>Start chatting and I'll learn about you</Text>
                        </View>
                    ) : (
                        <>
                            <View style={{ paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${theme.accent}10`, borderLeftWidth: 2, borderLeftColor: theme.accent, marginHorizontal: 20 }}>
                                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{facts.length} FACT{facts.length !== 1 ? 'S' : ''}</Text>
                                <TouchableOpacity onPress={handleClearMemory}>
                                    <Text style={{ color: '#ef4444', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Clear All</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 200, marginHorizontal: 20, marginTop: 8 }} nestedScrollEnabled>
                                {facts.map(fact => (
                                    <View key={fact.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#131313', borderLeftWidth: 2, borderLeftColor: `${theme.accent}40`, marginBottom: 6 }}>
                                        <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: 13, lineHeight: 18 }}>{fact.fact}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteFact(fact.id)} style={{ marginLeft: 8, padding: 4 }}>
                                            <Ionicons name="close" size={14} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <SectionHeader icon="information-circle-outline" title="ABOUT" />

                    <View style={styles.menuItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="phone-portrait-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontFamily: FONTS.mono }}>Cracker Mobile</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.mono }}>v1.0.0</Text>
                    </View>
                </View>

                {/* Logout Button */}
                <View style={[styles.section, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text style={{ fontSize: 15, color: "#ef4444", fontWeight: '600' }}>Log out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = {
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600' as const,
        color: COLORS.textPrimary,
        fontFamily: FONTS.monoSemiBold,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: COLORS.textMuted,
        fontFamily: FONTS.monoMedium,
        textTransform: 'uppercase' as const,
        letterSpacing: 1.5,
    },
    menuItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    toggleRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    colorRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    inputRow: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    inputLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
        fontFamily: FONTS.mono,
    },
    textInput: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 0,
        paddingVertical: 12,
        paddingHorizontal: 14,
        color: COLORS.textPrimary,
        fontSize: 15,
        fontFamily: FONTS.mono,
    },
    pronounRow: {
        flexDirection: 'row' as const,
        gap: 8,
    },
    pronounButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 0,
    },
    pronounText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontFamily: FONTS.mono,
    },
    labelText: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontFamily: FONTS.mono,
    },
    descText: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
        fontFamily: FONTS.mono,
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginHorizontal: 20,
        marginVertical: 4,
    },
    connectionCard: {
        marginHorizontal: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 0,
        backgroundColor: '#141414',
    },
    statusPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        fontSize: 9,
        fontFamily: FONTS.monoSemiBold,
        letterSpacing: 1,
    },
    usageTrack: {
        height: 4,
        backgroundColor: '#252525',
        overflow: 'hidden' as const,
    },
    usageFill: {
        height: 4,
    },
    codeNotice: {
        marginTop: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        backgroundColor: '#1a1a1a',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    primaryButton: {
        borderWidth: 1,
        borderRadius: 0,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    primaryButtonText: {
        fontSize: 11,
        fontFamily: FONTS.monoSemiBold,
        letterSpacing: 1,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 0,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    secondaryButtonText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontFamily: FONTS.monoSemiBold,
        letterSpacing: 1,
    },
    logoutButton: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 0,
        marginHorizontal: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    }
};

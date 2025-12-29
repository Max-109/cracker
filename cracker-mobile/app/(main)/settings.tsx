import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert, StyleSheet } from 'react-native';
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
import { api } from '../../lib/api';

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

    useEffect(() => {
        syncFromServer().catch(() => { });
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
            Alert.alert('Error', 'Failed to delete fact');
        }
    };

    const handleClearMemory = () => {
        Alert.alert(
            'Clear Memory',
            `This will delete all ${facts.length} stored facts. This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All', style: 'destructive', onPress: async () => {
                        try {
                            await api.clearAllFacts();
                            setFacts([]);
                            Alert.alert('Memory Cleared', 'All facts have been deleted.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear memory.');
                        }
                    }
                },
            ]
        );
    };

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

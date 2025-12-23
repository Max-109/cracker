import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Linking, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { useAuthStore } from '../../store/auth';
import HSVColorPicker from '../../components/ui/HSVColorPicker';
import { COLORS, FONTS } from '../../lib/design';

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
    } = useSettingsStore();

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [localName, setLocalName] = useState(userName);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        syncFromServer().catch(console.error);
    }, []);

    useEffect(() => {
        setLocalName(userName);
    }, [userName]);

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

    const handleClearMemory = () => {
        Alert.alert(
            'Clear Memory',
            'This will delete all stored facts and preferences. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear', style: 'destructive', onPress: async () => {
                        try {
                            const response = await fetch('https://cracker.mom/api/user-facts', {
                                method: 'DELETE',
                            });
                            if (response.ok) {
                                Alert.alert('Memory Cleared', 'Your memory has been cleared.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear memory.');
                        }
                    }
                },
            ]
        );
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
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
                    <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>{label}</Text>
                    {description && (
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{description}</Text>
                    )}
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#333', true: theme.accent }}
                thumbColor={value ? '#fff' : '#888'}
            />
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
                    <SectionHeader title="Profile" />

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
                                        saveToServer().catch(console.error);
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
                    <SectionHeader title="Appearance" />

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

                {/* Behavior Section */}
                <View style={styles.section}>
                    <SectionHeader title="Behavior" />

                    <ToggleRow
                        icon="code-outline"
                        label="Code Wrapping"
                        description="Wrap long lines in code blocks"
                        value={codeWrap}
                        onValueChange={(value) => {
                            setCodeWrap(value);
                            saveToServer().catch(console.error);
                        }}
                    />
                    <ToggleRow
                        icon="arrow-down-outline"
                        label="Auto-scroll"
                        description="Scroll to new messages automatically"
                        value={autoScroll}
                        onValueChange={(value) => {
                            setAutoScroll(value);
                            saveToServer().catch(console.error);
                        }}
                    />
                </View>

                {/* Tools Section */}
                <View style={styles.section}>
                    <SectionHeader title="Tools" />

                    <ToggleRow
                        icon="search-outline"
                        label="Web Search"
                        description="Search the web for current information"
                        value={enabledMcpServers.includes('brave-search')}
                        onValueChange={(value) => {
                            toggleMcpServer('brave-search', value);
                            saveToServer().catch(console.error);
                        }}
                    />
                    <ToggleRow
                        icon="logo-youtube"
                        label="YouTube"
                        description="Search videos and get transcripts"
                        value={enabledMcpServers.includes('youtube')}
                        onValueChange={(value) => {
                            toggleMcpServer('youtube', value);
                            saveToServer().catch(console.error);
                        }}
                    />
                </View>

                {/* Memory Section */}
                <View style={styles.section}>
                    <SectionHeader title="Memory" />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleClearMemory}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            <View>
                                <Text style={{ fontSize: 15, color: '#ef4444', fontWeight: '500' }}>
                                    Clear Memory
                                </Text>
                                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                                    Delete all stored facts and preferences
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <SectionHeader title="About" />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => Linking.openURL('https://cracker.mom/terms')}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="document-text-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => Linking.openURL('https://cracker.mom/privacy')}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    <View style={styles.menuItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Cracker Mobile</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: COLORS.textMuted }}>v1.0.0</Text>
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
        marginBottom: 12,
        marginLeft: 20,
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

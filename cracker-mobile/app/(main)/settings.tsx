import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { useAuthStore } from '../../store/auth';
import Toggle from '../../components/ui/Toggle';
import Slider from '../../components/ui/Slider';
import ColorPicker from '../../components/ui/ColorPicker';
import MemorySection from '../../components/settings/MemorySection';
import { COLORS, FONTS } from '../../lib/design';

type SettingsTab = 'profile' | 'tools' | 'appearance' | 'memory';

const TABS: { id: SettingsTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { id: 'profile', icon: 'person-outline', label: 'Profile' },
    { id: 'tools', icon: 'construct-outline', label: 'Tools' },
    { id: 'appearance', icon: 'color-palette-outline', label: 'Theme' },
    { id: 'memory', icon: 'sparkles-outline', label: 'Memory' },
];

export default function SettingsScreen() {
    const theme = useTheme();
    const { user } = useAuthStore();
    const {
        accentColor,
        codeWrap,
        autoScroll,
        userName,
        customInstructions,
        enabledMcpServers,
        responseLength,
        setAccentColor,
        setCodeWrap,
        setAutoScroll,
        setUserName,
        setCustomInstructions,
        setEnabledMcpServers,
        setResponseLength,
        syncFromServer,
    } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        syncFromServer().finally(() => setIsInitializing(false));
    }, []);

    const handleBack = () => {
        router.back();
    };

    const toggleMcpServer = async (server: string) => {
        const newServers = enabledMcpServers.includes(server)
            ? enabledMcpServers.filter(s => s !== server)
            : [...enabledMcpServers, server];
        await setEnabledMcpServers(newServers);
    };

    const getUserDisplayName = () => {
        if (user?.email) return user.email;
        if (user?.loginName) return user.loginName;
        return 'Guest';
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        {/* Display Name */}
                        <Text style={styles.sectionTitle}>DISPLAY NAME</Text>
                        <View style={styles.card}>
                            <TextInput
                                value={userName}
                                onChangeText={setUserName}
                                placeholder="Your name"
                                placeholderTextColor={COLORS.textDim}
                                style={{
                                    fontSize: 16,
                                    color: COLORS.textPrimary,
                                    padding: 0,
                                }}
                            />
                        </View>

                        {/* Response Length */}
                        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>RESPONSE LENGTH</Text>
                        <View style={styles.card}>
                            <Slider
                                value={responseLength || 50}
                                onValueChange={setResponseLength}
                                min={0}
                                max={100}
                                presets={[15, 25, 50, 75, 100]}
                                labelMin="Brief"
                                labelMax="Detailed"
                            />
                        </View>

                        {/* Custom Instructions */}
                        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>CUSTOM INSTRUCTIONS</Text>
                        <View style={styles.card}>
                            <TextInput
                                value={customInstructions}
                                onChangeText={setCustomInstructions}
                                placeholder="Add custom instructions for the AI..."
                                placeholderTextColor={COLORS.textDim}
                                multiline
                                numberOfLines={5}
                                style={{
                                    fontSize: 14,
                                    color: COLORS.textPrimary,
                                    minHeight: 100,
                                    textAlignVertical: 'top',
                                    lineHeight: 20,
                                }}
                            />
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 12, lineHeight: 16 }}>
                                These instructions have the highest priority and will be followed above all other guidelines.
                            </Text>
                        </View>

                        {/* Account Info */}
                        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>ACCOUNT</Text>
                        <View style={styles.card}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: `${theme.accent}15`,
                                    borderWidth: 1,
                                    borderColor: `${theme.accent}30`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 16 }}>
                                        {getUserDisplayName().charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                                        {getUserDisplayName()}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                        {user?.isGuest ? 'Guest Account' : 'Registered User'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                );

            case 'tools':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle}>AVAILABLE TOOLS</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 }}>
                            Enable tools to extend Cracker's capabilities. The AI will automatically use enabled tools when helpful.
                        </Text>

                        <View style={styles.card}>
                            <View style={styles.settingsRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        backgroundColor: '#1a1a1a',
                                        borderWidth: 1,
                                        borderColor: COLORS.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>Web Search</Text>
                                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                            Search the web for current information
                                        </Text>
                                    </View>
                                </View>
                                <Toggle
                                    value={enabledMcpServers.includes('brave-search')}
                                    onValueChange={() => toggleMcpServer('brave-search')}
                                />
                            </View>

                            <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        backgroundColor: '#1a1a1a',
                                        borderWidth: 1,
                                        borderColor: COLORS.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Ionicons name="logo-youtube" size={16} color="#ff0000" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>YouTube</Text>
                                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                            Search videos and get transcripts
                                        </Text>
                                    </View>
                                </View>
                                <Toggle
                                    value={enabledMcpServers.includes('youtube')}
                                    onValueChange={() => toggleMcpServer('youtube')}
                                />
                            </View>
                        </View>

                        {/* Behavior Settings */}
                        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>BEHAVIOR</Text>
                        <View style={styles.card}>
                            <View style={styles.settingsRow}>
                                <View>
                                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>Wrap Code</Text>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                        Wrap long lines in code blocks
                                    </Text>
                                </View>
                                <Toggle value={codeWrap} onValueChange={setCodeWrap} />
                            </View>
                            <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                                <View>
                                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>Auto-scroll</Text>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                                        Scroll to bottom on new messages
                                    </Text>
                                </View>
                                <Toggle value={autoScroll} onValueChange={setAutoScroll} />
                            </View>
                        </View>
                    </Animated.View>
                );

            case 'appearance':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle}>ACCENT COLOR</Text>
                        <View style={styles.card}>
                            <ColorPicker
                                value={accentColor}
                                onChange={setAccentColor}
                            />
                        </View>
                    </Animated.View>
                );

            case 'memory':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20, flex: 1 }}>
                        <MemorySection />
                    </Animated.View>
                );
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={{
                    width: 32,
                    height: 32,
                    backgroundColor: `${theme.accent}15`,
                    borderWidth: 1,
                    borderColor: `${theme.accent}30`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                }}>
                    <Ionicons name="settings-outline" size={14} color={theme.accent} />
                </View>
                <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: COLORS.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontFamily: FONTS.mono,
                }}>
                    Settings
                </Text>
            </View>

            {/* Tab Bar */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                style={{
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                    maxHeight: 52,
                }}
            >
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            borderBottomWidth: 2,
                            borderBottomColor: activeTab === tab.id ? theme.accent : 'transparent',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                                name={tab.icon}
                                size={15}
                                color={activeTab === tab.id ? theme.accent : COLORS.textSecondary}
                            />
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: activeTab === tab.id ? theme.accent : COLORS.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}>
                                {tab.label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {renderTabContent()}
            </ScrollView>
        </View>
    );
}

const styles = {
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bgMain,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700' as const,
        color: COLORS.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: 1.5,
        marginBottom: 12,
        fontFamily: FONTS.mono,
    },
    card: {
        backgroundColor: '#0d0d0d',
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
    },
    settingsRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
};

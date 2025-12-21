import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { useAuthStore } from '../../store/auth';
import Toggle from '../../components/ui/Toggle';
import Slider from '../../components/ui/Slider';
import ColorPicker from '../../components/ui/ColorPicker';
import { SettingsSkeleton } from '../../components/ui/Skeleton';

type SettingsTab = 'response' | 'profile' | 'tools' | 'appearance' | 'behavior';

const TABS: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'response', icon: 'speedometer-outline', label: 'Response' },
    { id: 'profile', icon: 'person-outline', label: 'Profile' },
    { id: 'tools', icon: 'globe-outline', label: 'Tools' },
    { id: 'appearance', icon: 'color-palette-outline', label: 'Appearance' },
    { id: 'behavior', icon: 'options-outline', label: 'Behavior' },
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
        isLoading,
        syncFromServer,
    } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<SettingsTab>('response');
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
            case 'response':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle(theme)}>Response Length</Text>
                        <View style={styles.card(theme)}>
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
                    </Animated.View>
                );

            case 'profile':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle(theme)}>Display Name</Text>
                        <View style={styles.card(theme)}>
                            <TextInput
                                value={userName}
                                onChangeText={setUserName}
                                placeholder="Your name"
                                placeholderTextColor={`${theme.textSecondary}60`}
                                style={{
                                    fontSize: 15,
                                    color: theme.textPrimary,
                                    padding: 0,
                                }}
                            />
                        </View>

                        <Text style={[styles.sectionTitle(theme), { marginTop: 24 }]}>Custom Instructions</Text>
                        <View style={styles.card(theme)}>
                            <TextInput
                                value={customInstructions}
                                onChangeText={setCustomInstructions}
                                placeholder="Add custom instructions for the AI..."
                                placeholderTextColor={`${theme.textSecondary}60`}
                                multiline
                                numberOfLines={6}
                                style={{
                                    fontSize: 14,
                                    color: theme.textPrimary,
                                    minHeight: 120,
                                    textAlignVertical: 'top',
                                }}
                            />
                            <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 12, lineHeight: 16 }}>
                                These instructions have the highest priority.{'\n'}
                                The AI will follow them above all other guidelines.
                            </Text>
                        </View>

                        <Text style={[styles.sectionTitle(theme), { marginTop: 24 }]}>Account</Text>
                        <View style={styles.card(theme)}>
                            <Text style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Logged in as
                            </Text>
                            <Text style={{ fontSize: 15, color: theme.textPrimary, marginTop: 4 }}>
                                {getUserDisplayName()}
                            </Text>
                        </View>
                    </Animated.View>
                );

            case 'tools':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle(theme)}>Available Tools</Text>
                        <View style={styles.card(theme)}>
                            <View style={styles.settingsRow(theme)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="search" size={18} color={theme.textSecondary} />
                                    <View>
                                        <Text style={{ fontSize: 14, color: theme.textPrimary }}>Web Search</Text>
                                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                            Search the web for information
                                        </Text>
                                    </View>
                                </View>
                                <Toggle
                                    value={enabledMcpServers.includes('brave-search')}
                                    onValueChange={() => toggleMcpServer('brave-search')}
                                />
                            </View>
                            <View style={[styles.settingsRow(theme), { borderBottomWidth: 0 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="logo-youtube" size={18} color={theme.textSecondary} />
                                    <View>
                                        <Text style={{ fontSize: 14, color: theme.textPrimary }}>YouTube</Text>
                                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                            Search and analyze videos
                                        </Text>
                                    </View>
                                </View>
                                <Toggle
                                    value={enabledMcpServers.includes('youtube')}
                                    onValueChange={() => toggleMcpServer('youtube')}
                                />
                            </View>
                        </View>
                    </Animated.View>
                );

            case 'appearance':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle(theme)}>Accent Color</Text>
                        <View style={styles.card(theme)}>
                            <ColorPicker
                                value={accentColor}
                                onValueChange={setAccentColor}
                            />
                        </View>
                    </Animated.View>
                );

            case 'behavior':
                return (
                    <Animated.View entering={FadeIn.duration(200)} style={{ padding: 20 }}>
                        <Text style={styles.sectionTitle(theme)}>Code Display</Text>
                        <View style={styles.card(theme)}>
                            <View style={[styles.settingsRow(theme), { borderBottomWidth: 0 }]}>
                                <View>
                                    <Text style={{ fontSize: 14, color: theme.textPrimary }}>Wrap Code</Text>
                                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                        Wrap long lines in code blocks
                                    </Text>
                                </View>
                                <Toggle
                                    value={codeWrap}
                                    onValueChange={setCodeWrap}
                                />
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle(theme), { marginTop: 24 }]}>Chat Behavior</Text>
                        <View style={styles.card(theme)}>
                            <View style={[styles.settingsRow(theme), { borderBottomWidth: 0 }]}>
                                <View>
                                    <Text style={{ fontSize: 14, color: theme.textPrimary }}>Auto-scroll</Text>
                                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                        Scroll to bottom on new messages
                                    </Text>
                                </View>
                                <Toggle
                                    value={autoScroll}
                                    onValueChange={setAutoScroll}
                                />
                            </View>
                        </View>
                    </Animated.View>
                );
        }
    };

    if (isInitializing) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.bgMain }}>
                <View style={styles.header(theme)}>
                    <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginRight: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: theme.textPrimary }}>Settings</Text>
                </View>
                <SettingsSkeleton />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.bgMain }}>
            {/* Header */}
            <View style={styles.header(theme)}>
                <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginRight: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{
                    width: 32,
                    height: 32,
                    backgroundColor: `${theme.accent}20`,
                    borderWidth: 1,
                    borderColor: `${theme.accent}50`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                }}>
                    <Ionicons name="settings-outline" size={16} color={theme.accent} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: 2 }}>
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
                    borderBottomColor: theme.border,
                    maxHeight: 56,
                }}
            >
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 16,
                            borderBottomWidth: 2,
                            borderBottomColor: activeTab === tab.id ? theme.accent : 'transparent',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                                name={tab.icon as any}
                                size={16}
                                color={activeTab === tab.id ? theme.accent : theme.textSecondary}
                            />
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: activeTab === tab.id ? theme.accent : theme.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
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
    header: (theme: any) => ({
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    }),
    sectionTitle: (theme: any) => ({
        fontSize: 9,
        fontWeight: '600' as const,
        color: theme.textSecondary,
        textTransform: 'uppercase' as const,
        letterSpacing: 2,
        marginBottom: 12,
    }),
    card: (theme: any) => ({
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
    }),
    settingsRow: (theme: any) => ({
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    }),
};

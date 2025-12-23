import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Linking, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../store/theme';
import { useSettingsStore } from '../../store/settings';
import { useAuthStore } from '../../store/auth';
import HSVColorPicker from '../../components/ui/HSVColorPicker';
import { COLORS, FONTS } from '../../lib/design';

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuthStore();
    const {
        accentColor,
        setAccentColor,
        syncFromServer,
    } = useSettingsStore();

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    useEffect(() => {
        syncFromServer().catch(console.error);
    }, []);

    const handleBack = () => {
        router.back();
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const getUserDisplayName = () => {
        if (user?.email) return user.email;
        if (user?.loginName) return user.loginName;
        return 'Guest';
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    const MenuItem = ({
        icon,
        label,
        value,
        onPress,
        showChevron = true,
        textColor = COLORS.textPrimary,
        isDestructive = false
    }: {
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        value?: string,
        onPress?: () => void,
        showChevron?: boolean,
        textColor?: string,
        isDestructive?: boolean
    }) => (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={isDestructive ? '#ef4444' : theme.accent}
                />
                <Text style={{
                    fontSize: 15,
                    color: isDestructive ? '#ef4444' : textColor,
                    fontWeight: isDestructive ? '600' : '400'
                }}>
                    {label}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {value && (
                    <Text style={{ fontSize: 14, color: COLORS.textMuted }}>{value}</Text>
                )}
                {showChevron && (
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                )}
            </View>
        </TouchableOpacity>
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
                {/* Account Section */}
                <View style={styles.section}>
                    <SectionHeader title="Account" />

                    <MenuItem
                        icon="mail-outline"
                        label="Email"
                        value={getUserDisplayName()}
                        showChevron={false}
                    />
                    <MenuItem
                        icon="business-outline"
                        label="Organization"
                        value="Cracker Corp"
                        showChevron={false}
                    />
                    <MenuItem
                        icon="rocket-outline"
                        label="Subscription"
                        value="Free Plan"
                        showChevron={false}
                    />

                    <View style={styles.divider} />

                    <MenuItem
                        icon="arrow-up-circle-outline"
                        label="Upgrade now"
                        textColor={theme.accent}
                    />
                    <MenuItem
                        icon="shield-checkmark-outline"
                        label="Data & Account Control"
                    />
                </View>

                {/* App Section */}
                <View style={styles.section}>
                    <SectionHeader title="App" />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setIsColorPickerOpen(!isColorPickerOpen)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
                            <Text style={{ fontSize: 15, color: COLORS.textPrimary }}>Color Scheme</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: accentColor,
                                borderWidth: 1,
                                borderColor: '#fff'
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
                                marginTop: 0,
                                marginBottom: 16,
                                marginHorizontal: 16,
                                borderRadius: 12,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: COLORS.border
                            }}
                        >
                            <HSVColorPicker />
                        </Animated.View>
                    )}

                    <MenuItem
                        icon="finger-print-outline"
                        label="Haptic feedback"
                        showChevron={false}
                        // Placeholder for toggle switch visual
                        value="On"
                    />
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <SectionHeader title="About" />

                    <MenuItem
                        icon="help-circle-outline"
                        label="Help Center"
                    />
                    <MenuItem
                        icon="document-text-outline"
                        label="Terms of Service"
                    />
                    <MenuItem
                        icon="lock-closed-outline"
                        label="Privacy Policy"
                    />
                    <MenuItem
                        icon="information-circle-outline"
                        label="Cracker Mobile"
                        value="v1.0.0"
                        showChevron={false}
                    />
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
        fontSize: 13,
        fontWeight: '600' as const,
        color: COLORS.textMuted,
        marginBottom: 8,
        marginLeft: 20,
        fontFamily: FONTS.monoMedium,
    },
    menuItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 16,
        paddingHorizontal: 20,
        // Using transparent background for clean look
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
        borderColor: '#222',
        borderRadius: 12,
        marginHorizontal: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    }
};

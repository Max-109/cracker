import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { getOpenAIUsagePercent, useOpenAIAccountStore } from '../../store/openaiAccount';
import { COLORS, FONTS } from '../../lib/design';

export default function OpenAIUsageIndicator() {
    const theme = useTheme();
    const { auth, enabled, usage, refreshUsage } = useOpenAIAccountStore();

    if (!auth || !enabled) return null;

    const primaryUsed = usage?.rate_limit?.primary_window?.used_percent;
    const weeklyUsed = usage?.rate_limit?.secondary_window?.used_percent;
    const used = getOpenAIUsagePercent(usage);
    const left = typeof used === 'number' ? Math.max(0, 100 - Math.round(used)) : null;

    return (
        <TouchableOpacity
            onPress={() => refreshUsage().catch(() => { })}
            activeOpacity={0.75}
            style={{
                height: 40,
                minWidth: 58,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderLeftColor: theme.accent,
                backgroundColor: COLORS.bgSidebar,
            }}
        >
            <View style={{
                width: 26,
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                borderRightWidth: 1,
                borderRightColor: COLORS.border,
                backgroundColor: `${theme.accent}12`,
            }}>
                <Ionicons name="speedometer-outline" size={13} color={theme.accent} />
            </View>
            <View style={{ paddingHorizontal: 7, gap: 1 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 8, fontFamily: FONTS.monoSemiBold, letterSpacing: 0.8 }}>
                    USE
                </Text>
                <Text style={{ color: theme.accent, fontSize: 10, fontFamily: FONTS.monoSemiBold }}>
                    {left === null ? '--' : left}%
                </Text>
            </View>
        </TouchableOpacity>
    );
}

import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';
import { COLORS, FONTS } from '../../lib/design';

type DialogTone = 'default' | 'success' | 'error' | 'warning';
type DialogAction = { label: string; destructive?: boolean; onPress?: () => void | Promise<void> };
type DialogConfig = {
    title: string;
    message: string;
    tone?: DialogTone;
    actions?: DialogAction[];
};

let pushDialog: ((dialog: DialogConfig) => void) | null = null;

export function showAppDialog(dialog: DialogConfig) {
    pushDialog?.(dialog);
}

export function showAppConfirm(dialog: Omit<DialogConfig, 'actions'> & { confirmLabel?: string; cancelLabel?: string; destructive?: boolean; onConfirm?: () => void | Promise<void> }) {
    pushDialog?.({
        title: dialog.title,
        message: dialog.message,
        tone: dialog.tone || (dialog.destructive ? 'warning' : 'default'),
        actions: [
            { label: dialog.cancelLabel || 'Cancel' },
            { label: dialog.confirmLabel || 'Confirm', destructive: dialog.destructive, onPress: dialog.onConfirm },
        ],
    });
}

export function AppDialogProvider() {
    const theme = useTheme();
    const [dialog, setDialog] = useState<DialogConfig | null>(null);

    useEffect(() => {
        pushDialog = setDialog;
        return () => {
            pushDialog = null;
        };
    }, []);

    const tone = dialog?.tone || 'default';
    const toneColor = tone === 'error' ? '#ef4444' : tone === 'warning' ? '#f59e0b' : tone === 'success' ? '#87af87' : theme.accent;
    const icon = tone === 'error' ? 'warning-outline' : tone === 'warning' ? 'alert-circle-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline';
    const actions = dialog?.actions?.length ? dialog.actions : [{ label: 'OK' }];

    return (
        <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
                {dialog && (
                    <View style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.bgSidebar, borderWidth: 1, borderColor: COLORS.borderColor }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor }}>
                            <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: toneColor, backgroundColor: `${toneColor}16` }}>
                                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={17} color={toneColor} />
                            </View>
                            <Text style={{ flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.monoSemiBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>{dialog.title}</Text>
                        </View>
                        <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.mono, fontSize: 13, lineHeight: 20, padding: 14 }}>{dialog.message}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.borderColor }}>
                            {actions.map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    onPress={async () => {
                                        setDialog(null);
                                        await action.onPress?.();
                                    }}
                                    style={{ borderWidth: 1, borderColor: action.destructive ? '#ef4444' : toneColor, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: action.destructive ? 'rgba(239,68,68,0.08)' : `${toneColor}10` }}
                                >
                                    <Text style={{ color: action.destructive ? '#ef4444' : toneColor, fontFamily: FONTS.monoSemiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

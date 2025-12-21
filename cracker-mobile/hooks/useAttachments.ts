import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export interface Attachment {
    id: string;
    type: 'image' | 'document';
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
}

interface UseAttachmentsReturn {
    attachments: Attachment[];
    pickAttachment: () => Promise<void>;
    removeAttachment: (id: string) => void;
    clearAttachments: () => void;
}

/**
 * useAttachments - Unified attachment picker
 * Opens document picker directly (can select any file including images)
 * No longer asks user what type - just lets them pick
 */
export function useAttachments(): UseAttachmentsReturn {
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const pickAttachment = useCallback(async () => {
        try {
            // Use document picker which supports all file types including images
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf', 'text/*', 'application/json', '*/*'],
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                const newAttachments: Attachment[] = result.assets.map((asset, index) => {
                    const isImage = asset.mimeType?.startsWith('image/') ||
                        /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(asset.name);

                    return {
                        id: `att-${Date.now()}-${index}`,
                        type: isImage ? 'image' : 'document',
                        uri: asset.uri,
                        name: asset.name,
                        mimeType: asset.mimeType,
                        size: asset.size,
                    };
                });

                setAttachments(prev => [...prev, ...newAttachments]);
                console.log('[Attachments] Added:', newAttachments.length, 'files');
            }
        } catch (error) {
            console.error('[Attachments] Failed to pick:', error);
            Alert.alert('Error', 'Failed to pick file');
        }
    }, []);

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
    }, []);

    return {
        attachments,
        pickAttachment,
        removeAttachment,
        clearAttachments,
    };
}

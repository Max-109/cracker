'use client';

import { useState, useCallback } from 'react';
import { convertFile, isSupportedMimeType, isConvertibleMimeType, createTextDataUrl } from '@/lib/file-converter';
import { upload } from '@vercel/blob/client';

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export type AttachmentItem = {
  id: string;
  file: File;
  name: string;
  mediaType: string;
  dataUrl?: string;
  url?: string;
  previewUrl?: string;
  progress: number;
  isUploading: boolean;
  error?: string;
  // Conversion tracking
  originalMediaType?: string;
  wasConverted?: boolean;
};

const MEDIA_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  jsx: 'text/jsx',
  py: 'text/x-python',
  java: 'text/x-java-source',
  c: 'text/x-c',
  cpp: 'text/x-c++',
  sql: 'application/sql',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  // Office types
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  htm: 'text/html',
};

function inferMediaType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && MEDIA_TYPE_MAP[extension]) {
    return MEDIA_TYPE_MAP[extension];
  }
  return 'application/octet-stream';
}

function readFileWithProgress(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Process a file - read directly if supported, convert to text if not
 */
async function processFile(
  file: File,
  mediaType: string,
  onProgress: (percent: number) => void
): Promise<{
  dataUrl: string;
  finalMediaType: string;
  wasConverted: boolean;
}> {
  // Check if the file type is directly supported by Gemini
  if (isSupportedMimeType(mediaType)) {
    const dataUrl = await readFileWithProgress(file, onProgress);
    return {
      dataUrl,
      finalMediaType: mediaType,
      wasConverted: false,
    };
  }

  // Check if we can convert this file type
  if (isConvertibleMimeType(mediaType)) {
    onProgress(20);

    try {
      const converted = await convertFile(file);
      onProgress(80);

      if (converted.wasConverted && converted.content) {
        const dataUrl = createTextDataUrl(converted.content);
        onProgress(100);

        return {
          dataUrl,
          finalMediaType: 'text/plain',
          wasConverted: true,
        };
      }

      // If not converted, just read the file
      const dataUrl = await readFileWithProgress(file, onProgress);
      return {
        dataUrl,
        finalMediaType: mediaType,
        wasConverted: false,
      };
    } catch (error) {
      console.error('File conversion failed:', error);
      throw new Error(`Failed to convert ${file.name}`);
    }
  }

  // Fallback: try to read as text
  try {
    onProgress(50);
    const content = await file.text();
    const dataUrl = createTextDataUrl(`[Content from: ${file.name}]\n\n${content}`);
    onProgress(100);
    return {
      dataUrl,
      finalMediaType: 'text/plain',
      wasConverted: true,
    };
  } catch {
    throw new Error(`Unsupported file type: ${mediaType}`);
  }
}

export function useAttachments() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const updateAttachment = useCallback((id: string, updater: (prev: AttachmentItem) => AttachmentItem) => {
    setAttachments(prev => prev.map(att => att.id === id ? updater(att) : att));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newAttachments = files.map((file) => {
      const mediaType = inferMediaType(file);
      return {
        id: generateId(),
        file,
        name: file.name,
        mediaType,
        originalMediaType: mediaType,
        progress: 0,
        isUploading: true,
        wasConverted: false,
      } satisfies AttachmentItem;
    });

    setAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach((attachment) => {
      // Check file size - if > 4MB, use Vercel Blob
      if (attachment.file.size > 4 * 1024 * 1024) {
        // Generate unique filename to avoid "Blob already exists" error
        // @vercel/blob/client types might not support addRandomSuffix, so we do it manually
        const uniqueFilename = `${Date.now()}-${attachment.file.name}`;

        // Upload to Vercel Blob
        upload(uniqueFilename, attachment.file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          onUploadProgress: (progressEvent) => {
            updateAttachment(attachment.id, (prev) => ({
              ...prev,
              progress: progressEvent.percentage
            }));
          },
        })
          .then((blob) => {
            updateAttachment(attachment.id, (prev) => ({
              ...prev,
              url: blob.url,
              // For images and videos, we can use the blob URL as preview
              previewUrl: (prev.originalMediaType?.startsWith('image/') || prev.originalMediaType?.startsWith('video/')) ? blob.url : prev.previewUrl,
              // We set dataUrl to blob.url as well so consumers using dataUrl might still work if they just put it in src
              // But we should prefer 'url' property in consumers
              isUploading: false,
              progress: 100,
            }));
          })
          .catch((error) => {
            console.error('Blob upload error:', error);
            updateAttachment(attachment.id, (prev) => ({
              ...prev,
              isUploading: false,
              error: error instanceof Error ? error.message : 'Upload failed'
            }));
          });
      } else {
        // Small file - use existing local processing
        processFile(
          attachment.file,
          attachment.mediaType,
          (percent) => {
            updateAttachment(attachment.id, (prev) => ({ ...prev, progress: percent }));
          }
        ).then((result) => {
          updateAttachment(attachment.id, (prev) => ({
            ...prev,
            dataUrl: result.dataUrl,
            mediaType: result.finalMediaType,
            wasConverted: result.wasConverted,
            previewUrl: (prev.originalMediaType?.startsWith('image/') || prev.originalMediaType?.startsWith('video/')) ? result.dataUrl : prev.previewUrl,
            isUploading: false,
            progress: 100,
          }));
        }).catch((error) => {
          updateAttachment(attachment.id, (prev) => ({
            ...prev,
            isUploading: false,
            error: error instanceof Error ? error.message : 'Failed to process file'
          }));
        });
      }
    });
  }, [updateAttachment]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  }, [addFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const namedFile = new File(
            [file],
            `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`,
            { type: file.type || 'image/png' }
          );
          imageFiles.push(namedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }, [addFiles]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const hasPendingAttachments = attachments.some(att => !att.error && (att.isUploading || (!att.dataUrl && !att.url)));

  // Debug log for pending state
  if (hasPendingAttachments) {
    const pending = attachments.filter(att => !att.error && (att.isUploading || (!att.dataUrl && !att.url)));
    console.log('Pending attachments:', pending.map(a => ({ name: a.name, uploading: a.isUploading, hasUrl: !!a.url, hasData: !!a.dataUrl })));
  }

  return {
    attachments,
    hasPendingAttachments,
    handleFileSelect,
    handlePaste,
    removeAttachment,
    clearAttachments,
  };
}

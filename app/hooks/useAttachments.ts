'use client';

import { useState, useCallback } from 'react';

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
  previewUrl?: string;
  progress: number;
  isUploading: boolean;
  error?: string;
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
  svg: 'image/svg+xml'
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

export function useAttachments() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const updateAttachment = useCallback((id: string, updater: (prev: AttachmentItem) => AttachmentItem) => {
    setAttachments(prev => prev.map(att => att.id === id ? updater(att) : att));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newAttachments = files.map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      mediaType: inferMediaType(file),
      progress: 0,
      isUploading: true
    } satisfies AttachmentItem));

    setAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach((attachment) => {
      readFileWithProgress(attachment.file, (percent) => {
        updateAttachment(attachment.id, (prev) => ({ ...prev, progress: percent }));
      }).then((dataUrl) => {
        updateAttachment(attachment.id, (prev) => ({
          ...prev,
          dataUrl,
          previewUrl: prev.mediaType.startsWith('image/') ? dataUrl : prev.previewUrl,
          isUploading: false,
          progress: 100,
        }));
      }).catch(() => {
        updateAttachment(attachment.id, (prev) => ({
          ...prev,
          isUploading: false,
          error: 'Failed to load file'
        }));
      });
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

  const hasPendingAttachments = attachments.some(att => att.isUploading || !att.dataUrl);

  return {
    attachments,
    hasPendingAttachments,
    handleFileSelect,
    handlePaste,
    removeAttachment,
    clearAttachments,
  };
}

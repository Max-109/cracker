'use client';

import React, { memo } from 'react'; // Added memo
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useMemo, useRef
import { Copy, RefreshCw, Check, Plus, Minus, Pencil, File as FileIcon, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';
import type { MessagePart } from '@/lib/chat-types';
import 'katex/dist/katex.min.css';
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

// Type for edit attachments
type EditAttachment = {
  id: string;
  url: string;
  name: string;
  mediaType: string;
  isNew?: boolean;
  file?: File;
  isUploading?: boolean;
  progress?: number;
};

interface MessageItemProps {
  role: string;
  content: string | MessagePart[];
  isThinking?: boolean;
  onEdit?: (newContent: string, attachments?: EditAttachment[]) => void;
  onRetry?: () => void;
  modelName?: string;
  fullModelName?: string;
  tokensPerSecond?: number;
}

const THINKING_LABELS = [
  "Compiling",
  "Processing",
  "Linking",
  "Calibrating",
  "Simulating",
  "Analyzing",
  "Routing",
  "Cracking"
];

// Animated "Thinking" Icon - ASCII Spinner
function ThinkingIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center w-4 h-4 text-[var(--text-secondary)]", className)}>
      <div className="flex space-x-[2px]">
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_400ms]"></div>
      </div>
    </div>
  );
}

// Custom collapsed/expanded indicator (Simple Plus/Minus)
function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex items-center justify-center text-[var(--text-secondary)]">
      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
    </div>
  );
}

// Utility to preprocess LaTeX for better compatibility with remark-math
const preprocessLaTeX = (content: string) => {
  // 1. Replace \[ ... \] with $$ ... $$ (Block Math)
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$$1$$\n');

  // 2. Replace \( ... \) with $ ... $ (Inline Math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  return processed;
};

// Helper to format MIME types
const formatMimeType = (mime?: string) => {
  if (!mime) return 'FILE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1].toUpperCase();
  if (mime.includes('text/')) return 'TXT';
  if (mime.includes('word')) return 'DOC';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLS';
  return mime.split('/')[1]?.toUpperCase() || 'FILE';
};

const generateId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function ModelBadge({ name, fullName, tokensPerSecond }: { name: string; fullName: string; tokensPerSecond?: number }) {
  const [copied, setCopied] = useState(false);
  
  const handleClick = () => {
    navigator.clipboard.writeText(fullName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  
  return (
    <button
      onClick={handleClick}
      className="transition-all duration-200 cursor-pointer flex items-center gap-1 text-[9px]"
      title={`Click to copy: ${fullName}`}
    >
      {copied ? (
        <span className="flex items-center gap-1 text-[var(--text-accent)] scale-105">
          <Check size={10} />
          <span>Copied!</span>
        </span>
      ) : (
        <>
          <span className="text-[var(--text-accent)] hover:opacity-80">{name.toUpperCase()}</span>
          {tokensPerSecond !== undefined && tokensPerSecond > 0 && (
            <>
              <span className="opacity-30">|</span>
              <span><span className="text-[var(--text-accent)]">{tokensPerSecond.toFixed(1)}</span> t/s</span>
            </>
          )}
        </>
      )}
    </button>
  );
}

export const MessageItem = memo(function MessageItem({ role, content, isThinking, onEdit, onRetry, modelName, fullModelName, tokensPerSecond }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [randomLabel] = useState(() => THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editAttachments, setEditAttachments] = useState<EditAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // File reading with progress for edit mode
  const readFileWithProgress = useCallback((file: File, onProgress: (percent: number) => void): Promise<string> => {
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
  }, []);

  const inferMediaType = (file: File): string => {
    if (file.type) return file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fallbackMap: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      csv: 'text/csv',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return extension && fallbackMap[extension] ? fallbackMap[extension] : 'application/octet-stream';
  };

  const handleEditFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const newAttachments: EditAttachment[] = selectedFiles.map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      mediaType: inferMediaType(file),
      url: '',
      isNew: true,
      isUploading: true,
      progress: 0,
    }));

    setEditAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach((attachment) => {
      readFileWithProgress(attachment.file!, (percent) => {
        setEditAttachments(prev => prev.map(att => 
          att.id === attachment.id ? { ...att, progress: percent } : att
        ));
      }).then((dataUrl) => {
        setEditAttachments(prev => prev.map(att => 
          att.id === attachment.id ? { ...att, url: dataUrl, isUploading: false, progress: 100 } : att
        ));
      }).catch(() => {
        setEditAttachments(prev => prev.filter(att => att.id !== attachment.id));
      });
    });

    e.target.value = '';
  }, [readFileWithProgress]);

  const removeEditAttachment = useCallback((id: string) => {
    setEditAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  const handleEditPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageItems.push(items[i]);
      }
    }

    if (imageItems.length === 0) return;

    e.preventDefault();

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;

      const attachment: EditAttachment = {
        id: generateId(),
        file,
        name: `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`,
        mediaType: file.type || 'image/png',
        url: '',
        isNew: true,
        isUploading: true,
        progress: 0,
      };

      setEditAttachments(prev => [...prev, attachment]);

      readFileWithProgress(file, (percent) => {
        setEditAttachments(prev => prev.map(att =>
          att.id === attachment.id ? { ...att, progress: percent } : att
        ));
      }).then((dataUrl) => {
        setEditAttachments(prev => prev.map(att =>
          att.id === attachment.id ? { ...att, url: dataUrl, isUploading: false, progress: 100 } : att
        ));
      }).catch(() => {
        setEditAttachments(prev => prev.filter(att => att.id !== attachment.id));
      });
    });
  }, [readFileWithProgress]);

  // Memoize markdown components
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, '')}
          className="my-4"
        />
      ) : (
        <code className={cn("bg-[var(--bg-code)] border border-[var(--border-color)] px-1.5 py-[2px] text-sm font-mono text-[var(--text-accent)]", className)} {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ children }: any) => <div className="mb-3 last:mb-0 leading-relaxed text-[#E5E5E5]">{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-1 text-[#E5E5E5]">{children}</ul>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-1 text-[#E5E5E5]">{children}</ol>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-3 mt-6 text-[#E5E5E5] tracking-tight">{children}</h1>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5 text-[#E5E5E5] tracking-tight">{children}</h2>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4 text-[#E5E5E5] tracking-tight">{children}</h3>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-[var(--text-accent)]/70 pl-4 py-2 bg-[#141414] my-4 text-[var(--text-secondary)]">{children}</blockquote>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: ({ children }: any) => (
      <div className="my-4 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#2f2f2f] scrollbar-track-transparent border border-[var(--border-color)] bg-[#141414]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thead: ({ children }: any) => <thead className="bg-[#222222] text-left text-[var(--text-secondary)]">{children}</thead>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tbody: ({ children }: any) => <tbody className="divide-y divide-[var(--border-color)] bg-transparent">{children}</tbody>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tr: ({ children }: any) => <tr className="transition-colors hover:bg-[#1e1e1e]">{children}</tr>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th: ({ children }: any) => <th className="px-4 py-3 font-medium">{children}</th>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td: ({ children }: any) => <td className="px-4 py-3 align-top">{children}</td>,
  }), []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);


  const handleCopy = () => {
    if (!finalContent) return;
    navigator.clipboard.writeText(finalContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const [isCopied, setIsCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);

  const safeContent = content || '';

  if (role === 'user') {
    let userText = '';
    const userImages: { url: string; name?: string }[] = [];
    const userFiles: { url: string; mimeType: string; name: string }[] = [];

    if (typeof safeContent === 'string') {
      userText = safeContent;
    } else if (Array.isArray(safeContent)) {
      safeContent.forEach(part => {
        if (part.type === 'text' && part.text) {
          userText += part.text;
        } else if (part.type === 'image') {
          // Handle both 'image' and 'url' properties (AI SDK v5 uses 'url')
          const imageUrl = part.image || (part as { url?: string }).url;
          if (imageUrl) {
            userImages.push({ url: imageUrl, name: part.name });
          }
        } else if (part.type === 'file') {
          // Handle both 'data' and 'url' properties (AI SDK v5 uses 'url')
          const fileUrl = part.data || part.url;
          if (fileUrl) {
            const fileName = (part.filename || part.name || 'File Attachment') as string;
            const mime = part.mediaType || part.mimeType || 'application/octet-stream';
            // Check if it's an image file
            if (mime.startsWith('image/')) {
              userImages.push({ url: fileUrl, name: fileName });
            } else {
              userFiles.push({ url: fileUrl, mimeType: mime, name: fileName });
            }
          }
        }
      });
    }

    const hasPendingEditAttachments = editAttachments.some(att => att.isUploading);

    if (isEditing) {
      return (
        <div className="w-full mb-6 flex justify-end animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="w-full max-w-[80%]">
            <div className="flex items-start gap-3 flex-row-reverse">
              <span className="text-[var(--text-accent)] font-semibold text-lg leading-none mt-[2px] sr-only">{'>'}</span>
              <div className="flex-1 space-y-3">
                {/* Edit Attachments Preview */}
                {editAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {editAttachments.map((attachment) => (
                      <div key={attachment.id} className="relative group bg-[#1a1a1a] border border-[var(--border-color)] overflow-hidden">
                        {attachment.mediaType.startsWith('image/') ? (
                          <div className="w-20 h-20 relative">
                            {attachment.url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#141414] flex items-center justify-center">
                                <FileIcon className="text-[var(--text-secondary)]" size={20} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1.5 min-w-[140px]">
                            <div className="w-8 h-8 bg-[#141414] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                              <FileIcon className="text-[var(--text-secondary)]" size={14} />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[100px]">{attachment.name}</span>
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {attachment.mediaType.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={() => removeEditAttachment(attachment.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-[var(--text-accent)] border border-[var(--border-color)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--text-accent)] hover:text-black"
                        >
                          <X size={10} />
                        </button>

                        {/* Upload Progress Overlay */}
                        {attachment.isUploading && (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 backdrop-blur-sm">
                            <div className="relative w-10 h-10">
                              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 48 48">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                <circle
                                  cx="24" cy="24" r="20" fill="none" stroke="var(--text-accent)" strokeWidth="3" strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - (attachment.progress || 0) / 100)}`}
                                  className="transition-all duration-150"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">{attachment.progress || 0}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onPaste={handleEditPaste}
                  className="w-full bg-[#141414] border border-[var(--border-active)] text-[var(--text-primary)] resize-none focus:outline-none p-3 min-h-[96px]"
                  rows={3}
                />

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditFileSelect}
                  className="hidden"
                  multiple
                />

                <div className="flex justify-between items-center">
                  {/* Add attachment button */}
                  <button
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border-color)] hover-glow"
                  >
                    <Paperclip size={14} />
                    <span>Attach</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditAttachments([]);
                      }}
                      className="px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] border border-[var(--border-color)] hover-glow"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!hasPendingEditAttachments) {
                          onEdit?.(editContent, editAttachments.length > 0 ? editAttachments : undefined);
                          setIsEditing(false);
                          setEditAttachments([]);
                        }
                      }}
                      disabled={hasPendingEditAttachments}
                      className={cn(
                        "px-3 py-1.5 text-xs uppercase tracking-[0.12em] border hover-glow",
                        hasPendingEditAttachments
                          ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                          : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)]"
                      )}
                    >
                      {hasPendingEditAttachments ? 'Uploading...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full mb-6 group flex justify-end">
        <div className="w-full max-w-[80%]">
          <div className="flex items-start gap-3 flex-row-reverse">
            <span className="text-[var(--text-accent)] font-semibold text-lg leading-none mt-[2px] sr-only">{'>'}</span>
            <div className="flex-1 space-y-3 flex flex-col items-end">
              {/* Render Images if any */}
              {userImages.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userImages.map((img, idx) => (
                    <div key={idx} className="relative border border-[var(--border-color)] bg-[#141414] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name || `Attachment ${idx + 1}`} className="max-w-[200px] max-h-[200px] object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Render Files if any */}
              {userFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#1e1e1e] border border-[var(--border-color)] px-3 py-2 min-w-[220px]">
                      <div className="w-10 h-10 bg-[#141414] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                        <FileIcon className="text-[var(--text-secondary)]" size={18} />
                      </div>
                      <div className="flex flex-col overflow-hidden text-right">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</span>
                        <span className="text-xs text-[var(--text-secondary)] truncate">{formatMimeType(file.mimeType)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Text if there is text */}
              {userText && (
                <div className="bg-[#1a1a1a] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed break-words px-4 py-2.5 rounded-2xl rounded-tr-sm border border-[var(--border-color)]">
                  {userText}
                </div>
              )}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity select-none justify-end w-full">
                <button
                  onClick={() => {
                    setEditContent(userText);
                    // Initialize edit attachments from existing images and files
                    const existingAttachments: EditAttachment[] = [
                      ...userImages.map((img, idx) => ({
                        id: `existing-img-${idx}`,
                        url: img.url,
                        name: img.name || `Image ${idx + 1}`,
                        mediaType: 'image/png', // Default, actual type is in the URL
                      })),
                      ...userFiles.map((file, idx) => ({
                        id: `existing-file-${idx}`,
                        url: file.url,
                        name: file.name,
                        mediaType: file.mimeType,
                      })),
                    ];
                    setEditAttachments(existingAttachments);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userText).then(() => {
                      setUserCopied(true);
                      setTimeout(() => setUserCopied(false), 2000);
                    });
                  }}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                  aria-label="Copy"
                >
                  {userCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Logic
  let thinkContent = '';
  let finalContent = '';

  if (typeof safeContent !== 'string' && Array.isArray(safeContent)) {
    safeContent.forEach((part: MessagePart) => {
      if (part.type === 'reasoning') {
        thinkContent += (part.reasoning || part.text || '');
      } else if (part.type === 'text') {
        finalContent += (part.text || '');
      }
    });
  } else if (typeof safeContent === 'string') {
    finalContent = safeContent;
  }

  if (!thinkContent) {
    const thinkStart = finalContent.indexOf('<think>');
    if (thinkStart !== -1) {
      const thinkEnd = finalContent.indexOf('</think>');
      if (thinkEnd !== -1) {
        thinkContent = finalContent.substring(thinkStart + 7, thinkEnd).trim();
        finalContent = (finalContent.substring(0, thinkStart) + finalContent.substring(thinkEnd + 8)).trim();
      } else {
        thinkContent = finalContent.substring(thinkStart + 7).trim();
        finalContent = finalContent.substring(0, thinkStart).trim();
      }
    }
  }

  finalContent = preprocessLaTeX(finalContent);
  thinkContent = preprocessLaTeX(thinkContent);

  // If we have finalContent, we're done thinking regardless of what isThinking prop says
  // This handles fast models where SDK status lags behind actual content
  const actuallyThinking = isThinking && !finalContent.trim();
  
  // Derive thinking label from actuallyThinking for immediate updates
  const thinkingLabel = actuallyThinking ? randomLabel : "Cracked";

  // Don't show thinking section if it only contains [REDACTED]
  const isRedactedOnly = thinkContent.trim() === '[REDACTED]' || thinkContent.trim() === '';
  const hasThinking = (!!thinkContent || actuallyThinking) && thinkContent.length > 0 && !isRedactedOnly;

  return (
    <div className="w-full mb-6 group">
      <div className="flex items-start gap-3">
        <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.18em] leading-none pt-[2px]">[AI]:</span>

        <div className="flex-1 text-[#E5E5E5] leading-relaxed space-y-3 overflow-hidden max-w-full">
          {/* Thinking Accordion */}
          {hasThinking && (
            <div className="border border-[var(--border-color)] bg-[#141414] p-3">
              <button
                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
              >
                {actuallyThinking ? <ThinkingIcon /> : <ToggleIcon isOpen={isThinkingOpen} />}
                <span className={cn("font-semibold", actuallyThinking && "animate-thinking-glow")}>{thinkingLabel}</span>
              </button>

              {isThinkingOpen && (
                <div className="mt-2 text-[var(--text-secondary)] text-sm whitespace-pre-wrap">
                  <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                    <ReactMarkdown
                      remarkPlugins={REMARK_PLUGINS}
                      rehypePlugins={REHYPE_PLUGINS}
                      components={markdownComponents}
                    >
                      {thinkContent}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Content */}
          {finalContent ? (
            <div className="min-h-[20px] space-y-3">
              <div className="prose dark:prose-invert max-w-none break-words prose-pre:bg-transparent prose-pre:p-0">
                <ReactMarkdown
                  remarkPlugins={REMARK_PLUGINS}
                  rehypePlugins={REHYPE_PLUGINS}
                  components={markdownComponents}
                >
                  {finalContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            (actuallyThinking && !hasThinking) ? (
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <ThinkingIcon />
              </div>
            ) : null
          )}

          {/* Action Buttons (Copy, Regenerate) + Model Info */}
          {!isThinking && finalContent && (
            <div className="flex items-center justify-between mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] select-none opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Left: Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                  aria-label="Copy"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>Copy</span>
                </button>
                <button 
                  onClick={onRetry}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]" 
                  aria-label="Regenerate"
                >
                  <RefreshCw size={14} />
                  <span>Re-run</span>
                </button>
              </div>

              {/* Right: Model info + speed */}
              <div className="flex items-center gap-2">
                {modelName && (
                  <ModelBadge 
                    name={modelName} 
                    fullName={fullModelName || modelName} 
                    tokensPerSecond={tokensPerSecond}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

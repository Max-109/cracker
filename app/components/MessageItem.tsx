'use client';

import React, { memo } from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Copy, RefreshCw, Check, Plus, Minus, Pencil, File as FileIcon, Paperclip, X, Globe, ExternalLink, Microscope, MessageSquareQuote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';
import type { MessagePart } from '@/lib/chat-types';
import { DeepResearchProgress, SourcesDisplay, type ResearchProgress } from './DeepResearchProgress';
import { LearningModeIndicator, LearningModeBadge } from './LearningModeIndicator';
import { LoadingIndicator } from './LoadingIndicator';
import { ImageLightbox, useLightbox } from './ImageLightbox';
import { ToolCallIndicator, type ToolInvocation } from './ToolCallIndicator';
import type { ChatMode, LearningSubMode } from '@/app/hooks/usePersistedSettings';
import { useQuoteContext } from './QuoteContext';
import { useAnimatedText } from '@/app/hooks/useAnimatedText';
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
  isStreaming?: boolean;
  onEdit?: (newContent: string, attachments?: EditAttachment[]) => void;
  onRetry?: () => void;
  modelName?: string;
  fullModelName?: string;
  tokensPerSecond?: number;
  onClarifySubmit?: (answers: { q: string; a: string }[]) => void;
  onSkipClarify?: () => void;
  chatMode?: ChatMode;
  learningSubMode?: LearningSubMode;
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

// AI Indicator - animated signal pulse with scan effect
function AIIndicator() {
  return (
    <div className="flex-shrink-0 pt-[2px] group/indicator">
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Outer frame - corner brackets */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 left-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 right-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 right-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 left-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 left-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 right-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 right-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
        </div>
        {/* Inner core - pulsing dot */}
        <div className="w-[4px] h-[4px] bg-[var(--text-accent)] animate-pulse" />
        {/* Scan line on hover */}
        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover/indicator:opacity-100">
          <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--text-accent)] to-transparent animate-[scan_1s_ease-in-out_infinite]"
            style={{ animation: 'scan 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
}

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

// Search labels (similar to thinking labels)
const SEARCH_LABELS = [
  "Browsing",
  "Surfing",
  "Scouring",
  "Scanning",
  "Exploring",
  "Querying",
  "Fetching",
  "Digging",
  "Hunting",
  "Probing"
];

// Globe Icon for search
function SearchIcon({ className, isSearching }: { className?: string; isSearching?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center w-4 h-4", className)}>
      <Globe size={14} className={cn("text-[var(--text-accent)]", isSearching && "animate-pulse")} />
    </div>
  );
}

// Source item for displaying search results
function SourceItem({ url, title, index }: { url: string; title?: string; index: number }) {
  // Use title as domain since URLs are Google redirect URLs
  const displayDomain = title || 'source';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1a1a] border border-[var(--border-color)] hover:border-[var(--text-accent)] transition-colors group"
    >
      <span className="text-[10px] text-[var(--text-accent)] font-mono">[{index + 1}]</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--text-primary)] truncate">{displayDomain}</div>
      </div>
      <ExternalLink size={12} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)] flex-shrink-0" />
    </a>
  );
}

// Custom Rich Link Component for Markdown
function LinkItem(props: any) {
  const { href, children } = props;
  const isExternal = href?.startsWith('http');

  // Clean up the URL for display if it's the same as children
  let displayText = children;
  if (typeof children === 'string' && children === href) {
    try {
      const urlObj = new URL(href);
      displayText = urlObj.hostname + (urlObj.pathname.length > 1 ? urlObj.pathname : '');
      if (displayText.length > 30) displayText = displayText.slice(0, 27) + '...';
    } catch (e) {
      // keep original if parsing fails
    }
  }

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 align-baseline mx-1 px-1.5 py-0.5 bg-[var(--text-accent)]/10 border border-[var(--text-accent)]/30 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/20 hover:border-[var(--text-accent)]/60 transition-all duration-200 group no-underline"
    >
      <span className="font-medium truncate max-w-[250px]">{children}</span>
      {isExternal && (
        <ExternalLink
          size={10}
          className="opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
        />
      )}
    </a>
  );
}

// Deep Research Completed Badge - matches DeepResearchProgress styling
function DeepResearchCompletedBadge({ sources }: { sources: { url: string; title?: string }[] }) {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  return (
    <div className="border border-[var(--text-accent)]/30 bg-[#141414] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Microscope size={20} className="text-[var(--text-accent)]" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.12em] font-semibold text-[var(--text-accent)]">
              Deep Research Complete
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Comprehensive analysis from {sources.length > 0 ? sources.length : 'multiple'} sources
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (always at 100%) */}
      <div className="space-y-1">
        <div className="h-1.5 bg-[#2a2a2a] overflow-hidden">
          <div className="h-full w-full bg-[var(--text-accent)]" />
        </div>
        <div className="flex items-center justify-between text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
          <span>Research complete</span>
          <span>100%</span>
        </div>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors w-full"
          >
            <Globe size={12} className="text-[var(--text-accent)]" />
            <span>Sources ({sources.length})</span>
            {isSourcesExpanded ? <Minus size={12} /> : <Plus size={12} />}
          </button>

          {isSourcesExpanded && (
            <div className="max-h-[200px] overflow-y-auto space-y-1 pl-5">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors group"
                >
                  <span className="text-[var(--text-accent)] font-mono">[{idx + 1}]</span>
                  <span className="truncate flex-1">{source.title || 'Source'}</span>
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase indicators (all complete) */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
        {['planning', 'searching', 'analyzing', 'deep-dive', 'writing'].map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-[var(--text-accent)]" />
        ))}
      </div>
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

// Helper to format MIME types - uses filename extension when mime is generic/converted
const formatMimeType = (mime?: string, filename?: string) => {
  // If we have a filename, prefer getting extension from it (more accurate for converted files)
  if (filename) {
    const ext = filename.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  if (!mime) return 'FILE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1].toUpperCase();
  if (mime === 'text/plain' && filename) {
    // For converted files, get extension from filename
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'TXT';
  }
  if (mime.includes('text/')) return 'TXT';
  if (mime.includes('word')) return 'DOC';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLS';
  return mime.split('/')[1]?.toUpperCase() || 'FILE';
};

// Smart filename truncation - keeps extension visible
const truncateFilename = (name: string, maxLength: number = 28): string => {
  if (name.length <= maxLength) return name;

  const lastDot = name.lastIndexOf('.');
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;

  // Reserve space for extension + ellipsis
  const availableForBase = maxLength - ext.length - 3; // 3 for "..."

  if (availableForBase <= 4) {
    // Not enough space, just truncate from end
    return name.slice(0, maxLength - 3) + '...';
  }

  // Show start of basename + ... + extension
  const startChars = Math.ceil(availableForBase * 0.7);
  return baseName.slice(0, startChars) + '...' + ext;
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

export const MessageItem = memo(function MessageItem({ role, content, isThinking, isStreaming, onEdit, onRetry, modelName, fullModelName, tokensPerSecond, onClarifySubmit, onSkipClarify, chatMode, learningSubMode }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [randomLabel] = useState(() => THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]);
  const [randomSearchLabel] = useState(() => SEARCH_LABELS[Math.floor(Math.random() * SEARCH_LABELS.length)]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editAttachments, setEditAttachments] = useState<EditAttachment[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);

  // Image lightbox
  const { isOpen: isLightboxOpen, src: lightboxSrc, alt: lightboxAlt, openLightbox, closeLightbox } = useLightbox();

  // NOTE: Quote functionality is now handled by QuoteButton.tsx which shows a floating
  // "Quote" button when text is selected. The user must click the button to add a quote,
  // rather than quoting instantly on selection. This allows users to select text without
  // automatically triggering a quote.

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
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-1 text-[#E5E5E5] marker:text-[var(--text-accent)]">{children}</ul>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-1 text-[#E5E5E5] marker:text-[var(--text-accent)]">{children}</ol>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children }: any) => <li className="mb-1 marker:text-[var(--text-accent)]">{children}</li>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong: ({ children }: any) => <strong className="font-semibold text-[var(--text-accent)]">{children}</strong>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    b: ({ children }: any) => <b className="font-semibold text-[var(--text-accent)]">{children}</b>,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: LinkItem,
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

  // Remove duplicate declarations - these are already declared above

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
      <div className="w-full mb-6 group flex justify-end overflow-hidden">
        <div className="w-full max-w-[80%] min-w-0">
          <div className="flex items-start gap-3 flex-row-reverse min-w-0">
            <span className="text-[var(--text-accent)] font-semibold text-lg leading-none mt-[2px] sr-only flex-shrink-0">{'>'}</span>
            <div className="flex-1 space-y-3 flex flex-col items-end min-w-0 overflow-hidden">
              {/* Render Images if any */}
              {userImages.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative border border-[var(--border-color)] bg-[#141414] overflow-hidden cursor-pointer hover:border-[var(--text-accent)]/50 transition-colors"
                      onClick={() => openLightbox(img.url, img.name || `Attachment ${idx + 1}`)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name || `Attachment ${idx + 1}`} className="max-w-[200px] max-h-[200px] object-cover hover:opacity-80 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Render Files if any */}
              {userFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userFiles.map((file, idx) => {
                    const displayName = truncateFilename(file.name, 28);
                    const needsTooltip = file.name !== displayName;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-[#1e1e1e] border border-[var(--border-color)] px-3 py-2 max-w-[280px]"
                        title={needsTooltip ? file.name : undefined}
                      >
                        <div className="w-10 h-10 bg-[#141414] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                          <FileIcon className="text-[var(--text-secondary)]" size={18} />
                        </div>
                        <div className="flex flex-col overflow-hidden text-right min-w-0">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{displayName}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{formatMimeType(file.mimeType, file.name)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Render Text if there is text */}
              {userText && (() => {
                // Parse quoted text if present
                const quoteMatch = userText.match(/\[QUOTED FROM CONVERSATION\]\n([\s\S]*?)\n\[END QUOTE\]\n\n?([\s\S]*)/);

                if (quoteMatch) {
                  const quotedContent = quoteMatch[1]
                    .split('\n')
                    .map(line => line.replace(/^>\s*"?|"?$/g, '').trim())
                    .filter(Boolean)
                    .join('\n');
                  const userQuestion = quoteMatch[2]?.trim() || '';

                  return (
                    <div className="space-y-2 max-w-full">
                      {/* Quoted text block */}
                      <div className="border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/5 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageSquareQuote size={12} className="text-[var(--text-accent)]" />
                          <span className="text-[9px] uppercase tracking-wider text-[var(--text-accent)] font-semibold">Quoting</span>
                        </div>
                        <div className="text-[var(--text-primary)] text-sm italic border-l-2 border-l-[var(--text-accent)] pl-2">
                          &ldquo;{quotedContent}&rdquo;
                        </div>
                      </div>
                      {/* User's question */}
                      {userQuestion && (
                        <div
                          ref={messageContentRef}
                          className="bg-[#1a1a1a] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed break-words px-4 py-2.5 rounded-2xl rounded-tr-sm border border-[var(--border-color)] max-w-full"
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {userQuestion}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular message without quotes
                return (
                  <div
                    ref={messageContentRef}
                    className="bg-[#1a1a1a] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed break-words px-4 py-2.5 rounded-2xl rounded-tr-sm border border-[var(--border-color)] max-w-full"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {userText}
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] md:opacity-0 md:group-hover:opacity-100 transition-opacity select-none justify-end w-full">
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

        {/* Image Lightbox */}
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          isOpen={isLightboxOpen}
          onClose={closeLightbox}
        />
      </div>
    );
  }

  // Assistant Logic
  let thinkContent = '';
  let finalContent = '';
  const sources: { url: string; title?: string }[] = [];
  const generatedImages: { data: string; mediaType: string }[] = [];
  const toolInvocations: ToolInvocation[] = [];
  let hasGoogleSearch = false;
  let isSearching = false;
  let isDeepResearching = false;
  let deepResearchProgress: ResearchProgress | null = null;
  let clarifyQuestions: string[] | null = null;
  let stopType: 'connection' | 'thinking' | 'stale' | null = null;
  let isReconnecting = false;
  let isWaitingForGeneration = false;
  let waitingElapsedMs = 0;

  if (typeof safeContent !== 'string' && Array.isArray(safeContent)) {
    safeContent.forEach((part: MessagePart) => {
      if (part.type === 'reasoning') {
        thinkContent += (part.reasoning || part.text || '');
      } else if (part.type === 'text') {
        const text = part.text || '';
        if (text === '[[DEEP_RESEARCH_INDICATOR]]') {
          isDeepResearching = true;
        } else {
          finalContent += text;
        }
      } else if ((part as { type: string }).type === 'deep-research-progress') {
        const progressPart = part as { type: string; progress: ResearchProgress };
        deepResearchProgress = progressPart.progress;
        isDeepResearching = true;
      } else if ((part as { type: string }).type === 'clarify-questions') {
        const clarifyPart = part as { type: string; questions: string[] };
        clarifyQuestions = clarifyPart.questions;
        isDeepResearching = true;
      } else if ((part as { type: string; stopType?: string }).type === 'stopped') {
        const stoppedPart = part as { type: string; stopType?: string };
        // Don't set stale stopType for deep research - it has its own completion handling
        if (stoppedPart.stopType === 'connection' || stoppedPart.stopType === 'thinking') {
          stopType = stoppedPart.stopType;
        }
        // Only set stale for non-deep-research messages
        else if (stoppedPart.stopType === 'stale' && !isDeepResearchResult) {
          stopType = stoppedPart.stopType;
        }
      } else if ((part as { type: string; isReconnecting?: boolean; isWaiting?: boolean; elapsedMs?: number }).type === 'reconnecting') {
        const reconnectPart = part as { type: string; isReconnecting?: boolean; isWaiting?: boolean; elapsedMs?: number };
        isReconnecting = true;
        if (reconnectPart.isWaiting) {
          isWaitingForGeneration = true;
          waitingElapsedMs = reconnectPart.elapsedMs || 0;
        }
      } else if (part.type === 'source' || (part as { type: string }).type === 'source-url') {
        // Extract source information from converted source parts (handles both live and DB loaded)
        const sourcePart = part as { type: string; source?: { url: string; title?: string }; url?: string; title?: string };
        const url = sourcePart.url || sourcePart.source?.url;
        const title = sourcePart.title || sourcePart.source?.title;
        if (url) {
          sources.push({ url, title });
          hasGoogleSearch = true;
        }
      } else if (part.type === 'tool-invocation') {
        // Parse tool invocation - supports both flat and nested structures
        const toolPart = part as {
          type: 'tool-invocation';
          toolCallId?: string;
          toolName?: string;
          state?: 'partial-call' | 'call' | 'result';
          args?: Record<string, unknown>;
          result?: unknown;
          toolInvocation?: {
            toolCallId: string;
            toolName: string;
            state: 'partial-call' | 'call' | 'result';
            args?: Record<string, unknown>;
            result?: unknown;
          };
        };

        // Extract from flat or nested structure
        const toolCallId = toolPart.toolCallId || toolPart.toolInvocation?.toolCallId || `tool-${toolInvocations.length}`;
        const toolName = toolPart.toolName || toolPart.toolInvocation?.toolName || '';
        const toolState = (toolPart.state || toolPart.toolInvocation?.state || 'call') as 'partial-call' | 'call' | 'result';
        const toolArgs = toolPart.args || toolPart.toolInvocation?.args;
        const toolResult = toolPart.result || toolPart.toolInvocation?.result;

        // Add to tool invocations list
        if (toolName) {
          // Check if we already have this tool call (update if exists)
          const existingIdx = toolInvocations.findIndex(t => t.toolCallId === toolCallId);
          const invocation: ToolInvocation = {
            toolCallId,
            toolName,
            state: toolState,
            args: toolArgs,
            result: toolResult,
          };

          if (existingIdx >= 0) {
            toolInvocations[existingIdx] = invocation;
          } else {
            toolInvocations.push(invocation);
          }

          // Legacy flags for backward compatibility
          if (toolName === 'google_search') {
            hasGoogleSearch = true;
          }
          if (toolState === 'call' || toolState === 'partial-call') {
            isSearching = true;
          }
        }
      } else if ((part as { type: string; data?: string; mediaType?: string }).type === 'generated-image') {
        // Handle generated images from Gemini image models
        const imgPart = part as { type: string; data: string; mediaType: string };
        if (imgPart.data && imgPart.mediaType) {
          generatedImages.push({ data: imgPart.data, mediaType: imgPart.mediaType });
        }
      } else if (part.type === 'file') {
        // Handle file parts (generated images from API route)
        const filePart = part as { type: 'file'; url?: string; mediaType?: string };
        if (filePart.url && filePart.mediaType?.startsWith('image/')) {
          // Extract base64 from data URL if present (format: data:image/png;base64,XXXX)
          const base64Match = filePart.url.match(/^data:[^;]+;base64,(.+)$/);
          const base64Data = base64Match ? base64Match[1] : filePart.url;
          generatedImages.push({ data: base64Data, mediaType: filePart.mediaType });
        }
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

  // Apply smooth text animation during streaming
  // This creates a word-by-word reveal effect using Framer Motion
  const animatedFinalContent = useAnimatedText(finalContent, {
    delimiter: ' ',  // Word by word animation
    duration: 4,     // 4 seconds to animate full text (catches up naturally)
    ease: 'circOut', // Fast start, smooth end
    enabled: isStreaming && !!finalContent.trim(), // Only animate during streaming
  });

  // If we have finalContent, we're done thinking regardless of what isThinking prop says
  // This handles fast models where SDK status lags behind actual content
  const actuallyThinking = isThinking && !finalContent.trim();

  // Derive thinking label from actuallyThinking for immediate updates
  const thinkingLabel = actuallyThinking ? randomLabel : "Cracked";

  // Don't show thinking section if it only contains [REDACTED]
  const isRedactedOnly = thinkContent.trim() === '[REDACTED]' || thinkContent.trim() === '';
  const hasThinking = (!!thinkContent || actuallyThinking) && thinkContent.length > 0 && !isRedactedOnly;

  // Detect if reasoning mentions searching (Gemini describes search activity in thinking)
  const reasoningIndicatesSearch = !!(thinkContent && /\b(search|searching|looking up|finding|browsing|query|queries|found some|headlines|news from)\b/i.test(thinkContent));

  // Check if this is a deep research result (persisted from database)
  const isDeepResearchResult = fullModelName?.includes('deep-search') || false;

  // Show search indicator when:
  // 1. We have sources (hasGoogleSearch) - always show
  // 2. Explicit search tool invocation (isSearching)
  // 3. Reasoning mentions search activity (for Gemini during streaming)
  const showSearchIndicator = (hasGoogleSearch || isSearching || (isStreaming && reasoningIndicatesSearch)) && !isDeepResearchResult;

  // Determine if we're actively searching (for animation)
  const isActivelySearching = isStreaming && (hasGoogleSearch || isSearching || reasoningIndicatesSearch);

  return (
    <div className="w-full mb-6 group overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <AIIndicator />

        <div className="flex-1 text-[#E5E5E5] leading-relaxed space-y-3 overflow-hidden min-w-0">
          {/* Conditional rendering: Learning Mode OR Thinking Accordion */}
          {chatMode === 'learning' && hasThinking ? (
            /* Learning Mode with expandable thinking */
            <LearningModeIndicator
              isStreaming={isStreaming}
              thinkContent={thinkContent}
              isOpen={isThinkingOpen}
              onToggle={() => setIsThinkingOpen(!isThinkingOpen)}
              markdownComponents={markdownComponents}
              learningSubMode={learningSubMode}
            />
          ) : chatMode === 'learning' && isStreaming ? (
            /* Learning Mode streaming without thinking yet */
            <LearningModeIndicator isStreaming={true} learningSubMode={learningSubMode} />
          ) : chatMode === 'learning' && finalContent && !isDeepResearching ? (
            /* Learning Mode completed badge (no thinking) */
            <LearningModeBadge />
          ) : hasThinking ? (
            /* Regular Thinking Accordion (non-learning mode) */
            <div className="border border-[var(--border-color)] bg-[#141414] p-3">
              <button
                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
              >
                {actuallyThinking ? <ThinkingIcon /> : <ToggleIcon isOpen={isThinkingOpen} />}
                <span className={cn("font-semibold", actuallyThinking && "animate-thinking-glow")}>{thinkingLabel}</span>
              </button>

              {isThinkingOpen && (
                <div className="mt-2 text-[var(--text-secondary)] text-sm whitespace-pre-wrap overflow-hidden">
                  <div
                    ref={messageContentRef}
                    className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
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
          ) : null}

          {/* Deep Research Indicator (for persisted results) */}
          {isDeepResearchResult && !isDeepResearching && finalContent && (
            <DeepResearchCompletedBadge sources={sources} />
          )}

          {/* Tool Call Indicator - shows all tool invocations with query and results */}
          {toolInvocations.length > 0 && !isDeepResearchResult && (
            <ToolCallIndicator
              toolInvocations={toolInvocations}
              isStreaming={isStreaming}
            />
          )}

          {/* Legacy Google Search Indicator removed - using ToolCallIndicator exclusively */}

          {/* Deep Research Progress/Clarify Questions */}
          {isDeepResearching && (clarifyQuestions || deepResearchProgress) && (
            <DeepResearchProgress
              progress={deepResearchProgress || {
                phase: 'clarify',
                phaseDescription: 'Understanding your needs...',
                percent: 0,
                message: 'Waiting for input',
                searches: [],
                sources: [],
                isComplete: false,
              }}
              clarifyQuestions={clarifyQuestions || undefined}
              onClarifySubmit={onClarifySubmit}
              onSkipClarify={onSkipClarify}
            />
          )}

          {/* Legacy Deep Research Indicator (fallback) */}
          {isDeepResearching && !finalContent && !clarifyQuestions && !deepResearchProgress && (
            <div className="border border-[var(--text-accent)]/30 bg-[#141414] p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Microscope size={20} className="text-[var(--text-accent)] animate-pulse" />
                  <div className="absolute inset-0 animate-ping opacity-30">
                    <Microscope size={20} className="text-[var(--text-accent)]" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-[0.12em] font-semibold text-[var(--text-accent)] animate-pulse">
                    Deep Researching...
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Searching multiple sources, analyzing findings, and compiling report
                  </div>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sources Display for completed deep research */}
          {sources.length > 0 && !isStreaming && !showSearchIndicator && (
            <SourcesDisplay sources={sources.map(s => ({ url: s.url, title: s.title || '' }))} maxVisible={6} />
          )}

          {/* Final Content */}
          {finalContent ? (
            <div className="min-h-[20px] space-y-3">
              <div
                ref={messageContentRef}
                className={cn("prose dark:prose-invert max-w-none break-words overflow-wrap-anywhere prose-pre:bg-transparent prose-pre:p-0", isStreaming && "streaming-active")}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                <ReactMarkdown
                  remarkPlugins={REMARK_PLUGINS}
                  rehypePlugins={REHYPE_PLUGINS}
                  components={markdownComponents}
                >
                  {isStreaming ? animatedFinalContent : finalContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            (actuallyThinking && !hasThinking) ? (
              <LoadingIndicator />
            ) : null
          )}

          {/* Generated Images from Gemini Image Models */}
          {generatedImages.length > 0 && (
            <div className="mt-4 space-y-4">
              {generatedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden border border-[var(--border-color)] bg-[#0f0f0f] animate-in fade-in zoom-in-95 duration-500"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {/* Image container with reveal animation */}
                  <div className="relative group">
                    {/* Scanning line animation overlay */}
                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                      <div
                        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--text-accent)] to-transparent opacity-60 animate-[scan-reveal_2s_ease-out_forwards]"
                        style={{ animationDelay: `${idx * 150 + 200}ms` }}
                      />
                    </div>

                    {/* The actual image with blur-in effect */}
                    <img
                      src={`data:${img.mediaType};base64,${img.data}`}
                      alt={`Generated image ${idx + 1}`}
                      className="w-full h-auto max-h-[600px] object-contain animate-[image-materialize_0.8s_ease-out_forwards]"
                      style={{
                        animationDelay: `${idx * 150 + 100}ms`,
                        opacity: 0,
                        filter: 'blur(20px) saturate(0)',
                      }}
                    />

                    {/* Subtle glow effect on the border */}
                    <div className="absolute inset-0 border border-[var(--text-accent)]/0 animate-[border-glow_1s_ease-out_forwards] pointer-events-none" style={{ animationDelay: `${idx * 150 + 500}ms` }} />
                  </div>

                  {/* Image label */}
                  <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0a0a0a] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-accent)] font-semibold">
                        Generated Image
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {img.mediaType.split('/')[1]?.toUpperCase() || 'PNG'}
                      </span>
                    </div>
                    <a
                      href={`data:${img.mediaType};base64,${img.data}`}
                      download={`generated-image-${idx + 1}.${img.mediaType.split('/')[1] || 'png'}`}
                      className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stopped Indicator - only for connection and thinking phases */}
          {stopType === 'connection' && (
            <div className="border border-[var(--border-color)] bg-[#141414] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 bg-red-500/80 rounded-full" />
                  <div className="absolute w-4 h-4 bg-red-500/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.14em]">
                  Generation stopped
                </span>
              </div>
            </div>
          )}
          {stopType === 'thinking' && (
            <div className="border border-[var(--border-color)] bg-[#141414] px-4 py-3 mt-2">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 bg-amber-500/80 rounded-full" />
                  <div className="absolute w-4 h-4 bg-amber-500/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.14em]">
                  Thinking interrupted
                </span>
              </div>
            </div>
          )}
          {stopType === 'stale' && !isDeepResearchResult && (
            <div className="border border-[var(--border-color)] bg-[#141414] px-4 py-3 mt-2">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 bg-[var(--text-accent)]/80 rounded-full" />
                  <div className="absolute w-4 h-4 bg-[var(--text-accent)]/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.14em]">
                  Generation recovered (connection lost)
                </span>
              </div>
            </div>
          )}

          {/* Reconnecting indicator - shown while SSE reconnection is active */}
          {isReconnecting && (
            <div className="border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/5 px-4 py-3 mt-2">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute w-2 h-2 bg-[var(--text-accent)] rounded-full animate-pulse" />
                  <div className="absolute w-4 h-4 border border-[var(--text-accent)]/40 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-[var(--text-accent)] uppercase tracking-[0.14em]">
                  {isWaitingForGeneration
                    ? `Reconnected - Thinking... (${Math.round(waitingElapsedMs / 1000)}s)`
                    : 'Reconnected - Streaming...'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons (Copy, Regenerate) + Model Info */}
          {!isThinking && (finalContent || stopType) && (
            <div className="flex items-center justify-between mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] select-none md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {/* Left: Action buttons */}
              <div className="flex items-center gap-3">
                {finalContent && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                    aria-label="Copy"
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>Copy</span>
                  </button>
                )}
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

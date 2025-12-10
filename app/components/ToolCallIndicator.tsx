'use client';

import React, { useState, useMemo } from 'react';
import { Search, Globe, ChevronDown, ChevronUp, ExternalLink, Youtube, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tool invocation state from AI SDK
export interface ToolInvocation {
    toolCallId: string;
    toolName: string;
    state: 'partial-call' | 'call' | 'result';
    args?: Record<string, unknown>;
    result?: unknown;
}

interface ToolCallIndicatorProps {
    toolInvocations: ToolInvocation[];
    isStreaming?: boolean;
}

// Check if tool is YouTube-related
function isYouTubeTool(toolName: string): boolean {
    return toolName.toLowerCase().includes('youtube');
}

// Get accent color based on tool type
function getToolAccentColor(_toolName: string): string {
    // Use default accent for all tools for a subtle, minimalistic look
    return 'var(--text-accent)';
}

// Extract search query from args
function getSearchQuery(args?: Record<string, unknown>): string | null {
    if (!args) return null;
    return (args.query || args.q || args.search || args.searchQuery) as string | null;
}

// Extract results from tool result (works for both web search and YouTube)
interface SearchResult {
    title: string;
    url: string;
    description?: string;
    channelTitle?: string;
    viewCount?: string;
    thumbnailUrl?: string;
}

function extractSearchResults(result: unknown): SearchResult[] {
    if (!result || typeof result !== 'object') return [];
    const resultObj = result as Record<string, unknown>;
    if (Array.isArray(resultObj.results)) {
        return resultObj.results.map((r: Record<string, unknown>) => {
            const videoId = r.videoId as string | undefined;
            const url = videoId
                ? `https://youtube.com/watch?v=${videoId}`
                : (r.url as string) || '';

            return {
                title: (r.title as string) || 'Untitled',
                url,
                description: (r.description as string) || undefined,
                channelTitle: (r.channelTitle as string) || undefined,
                viewCount: (r.viewCount as string) || undefined,
                thumbnailUrl: (r.thumbnailUrl as string) || undefined,
            };
        });
    }
    return [];
}

// Format view count for display
function formatViewCount(count: string | undefined): string {
    if (!count) return '';
    const num = parseInt(count, 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
    return `${num} views`;
}

// Extract hostname from URL
function getHostname(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}

// Single tool call item - with dynamic accent based on tool type
function ToolCallItem({ invocation }: { invocation: ToolInvocation }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const query = getSearchQuery(invocation.args);
    const isActive = invocation.state === 'call' || invocation.state === 'partial-call';
    const hasResult = invocation.state === 'result';
    const isYouTube = isYouTubeTool(invocation.toolName);
    const accentColor = getToolAccentColor(invocation.toolName);

    const results = useMemo(() => {
        return hasResult ? extractSearchResults(invocation.result) : [];
    }, [hasResult, invocation.result]);

    const displaySites = useMemo(() => {
        if (results.length === 0) return [];
        if (isYouTube) {
            const channels = results.slice(0, 4).map(r => r.channelTitle || 'YouTube').filter(Boolean);
            return [...new Set(channels)];
        }
        const hostnames = results.slice(0, 4).map(r => getHostname(r.url));
        return [...new Set(hostnames)];
    }, [results, isYouTube]);

    const toolDisplayName = isYouTube
        ? (isActive ? 'SEARCHING YOUTUBE' : 'YOUTUBE SEARCH')
        : (isActive ? 'SCANNING WEB' : 'WEB SEARCH');

    const ToolIcon = isYouTube ? Youtube : Search;
    const SiteIcon = isYouTube ? Play : Globe;

    return (
        <div
            className={cn(
                "group relative border border-l-2 transition-all duration-300 overflow-hidden",
                "border-[var(--border-color)]",
                !isActive && "hover:opacity-90"
            )}
            style={{
                borderLeftColor: accentColor,
                backgroundColor: `${accentColor}10`,
                boxShadow: isActive ? `0 0 12px -3px ${accentColor}` : undefined,
            }}
        >
            {isActive && (
                <div
                    className="absolute top-0 left-0 bottom-0 w-1 animate-pulse"
                    style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                />
            )}

            <div className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "w-6 h-6 flex items-center justify-center border transition-all duration-300 flex-shrink-0",
                            isActive ? "text-black" : ""
                        )}
                        style={{
                            backgroundColor: isActive ? accentColor : `${accentColor}30`,
                            borderColor: isActive ? accentColor : `${accentColor}80`,
                            color: isActive ? '#000' : accentColor,
                        }}
                    >
                        <ToolIcon size={12} />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span
                                className="text-[10px] uppercase tracking-[0.16em] font-semibold"
                                style={{ color: accentColor }}
                            >
                                {toolDisplayName}
                            </span>

                            {isActive && (
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="w-1 h-1 animate-bounce"
                                            style={{ backgroundColor: accentColor, animationDelay: `${i * 150}ms` }}
                                        />
                                    ))}
                                </div>
                            )}

                            {hasResult && results.length > 0 && (
                                <span
                                    className="text-[9px] px-1.5 py-0.5 border font-semibold"
                                    style={{
                                        backgroundColor: `${accentColor}30`,
                                        color: accentColor,
                                        borderColor: `${accentColor}50`
                                    }}
                                >
                                    {isYouTube ? `${results.length} VIDEOS` : `${results.length} FOUND`}
                                </span>
                            )}
                        </div>

                        {query && (
                            <span className="text-xs text-[var(--text-primary)] truncate opacity-80 font-mono mt-0.5">
                                {query}
                            </span>
                        )}
                    </div>

                    {hasResult && results.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="p-1 px-2 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold border hover:opacity-80 transition-all"
                            style={{ borderColor: `${accentColor}50`, color: accentColor }}
                        >
                            <span>{isExpanded ? 'HIDE' : 'VIEW'}</span>
                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                    )}
                </div>

                {displaySites.length > 0 && !isExpanded && (
                    <div className="flex items-center gap-2 mt-2 ml-9 flex-wrap">
                        {displaySites.map((site) => (
                            <div
                                key={site}
                                className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)]"
                            >
                                <SiteIcon size={8} style={{ color: accentColor }} />
                                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
                                    {site}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isExpanded && results.length > 0 && (
                <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)]/50 max-h-48 overflow-y-auto scrollbar-custom animate-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                        {results.slice(0, 10).map((result, idx) => (
                            <a
                                key={idx}
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2.5 p-2 hover:bg-[var(--text-accent)]/5 border border-transparent hover:border-[var(--text-accent)]/20 transition-all group/item"
                            >
                                <div className="mt-0.5" style={{ color: accentColor }}>
                                    <SiteIcon size={12} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                                            {isYouTube ? (result.channelTitle || 'YouTube') : getHostname(result.url)}
                                        </span>
                                        {isYouTube && result.viewCount && (
                                            <span className="text-[8px] text-[var(--text-secondary)]">
                                                {formatViewCount(result.viewCount)}
                                            </span>
                                        )}
                                        <ExternalLink size={10} className="text-[var(--text-secondary)] opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[11px] text-[var(--text-primary)] truncate mt-0.5 group-hover/item:text-[var(--text-accent)] transition-colors">
                                        {result.title}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Main component
export function ToolCallIndicator({ toolInvocations }: ToolCallIndicatorProps) {
    if (!toolInvocations || toolInvocations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2 mb-3">
            {toolInvocations.map((invocation) => (
                <ToolCallItem
                    key={invocation.toolCallId}
                    invocation={invocation}
                />
            ))}
        </div>
    );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Search, Globe, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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

// Extract search query from args
function getSearchQuery(args?: Record<string, unknown>): string | null {
    if (!args) return null;
    return (args.query || args.q || args.search || args.searchQuery) as string | null;
}

// Extract results from tool result
interface SearchResult {
    title: string;
    url: string;
    description?: string;
}

function extractSearchResults(result: unknown): SearchResult[] {
    if (!result || typeof result !== 'object') return [];
    const resultObj = result as Record<string, unknown>;
    if (Array.isArray(resultObj.results)) {
        return resultObj.results.map((r: Record<string, unknown>) => ({
            title: (r.title as string) || 'Untitled',
            url: (r.url as string) || '',
            description: (r.description as string) || undefined,
        }));
    }
    return [];
}

// Extract hostname from URL
function getHostname(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}

// Single tool call item - with strong accent
function ToolCallItem({ invocation }: { invocation: ToolInvocation }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const query = getSearchQuery(invocation.args);
    const isActive = invocation.state === 'call' || invocation.state === 'partial-call';
    const hasResult = invocation.state === 'result';

    // Memoize results to prevent infinite loops
    const results = useMemo(() => {
        return hasResult ? extractSearchResults(invocation.result) : [];
    }, [hasResult, invocation.result]);

    // Get unique hostnames for display
    const displaySites = useMemo(() => {
        if (results.length === 0) return [];
        const hostnames = results.slice(0, 4).map(r => getHostname(r.url));
        return [...new Set(hostnames)];
    }, [results]);

    return (
        <div className={cn(
            "group relative border border-l-2 transition-all duration-300 overflow-hidden",
            "border-[var(--border-color)] border-l-[var(--text-accent)] bg-[var(--text-accent)]/5",
            isActive && "shadow-[0_0_12px_-3px_var(--text-accent)]",
            !isActive && "hover:bg-[var(--text-accent)]/8"
        )}>
            {/* Animated scanning bar overlay for active state */}
            {isActive && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--text-accent)] animate-pulse shadow-[0_0_8px_var(--text-accent)]" />
            )}

            <div className="px-3 py-2.5">
                {/* Main status line */}
                <div className="flex items-center gap-3">
                    {/* Icon with accent background */}
                    <div className={cn(
                        "w-6 h-6 flex items-center justify-center border transition-all duration-300 flex-shrink-0",
                        isActive
                            ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                            : "bg-[var(--text-accent)]/20 border-[var(--text-accent)]/50 text-[var(--text-accent)]"
                    )}>
                        <Search size={12} />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-[10px] uppercase tracking-[0.16em] font-semibold transition-colors duration-300",
                                isActive ? "text-[var(--text-accent)]" : "text-[var(--text-accent)]"
                            )}>
                                {isActive ? 'SCANNING WEB' : 'WEB SEARCH'}
                            </span>

                            {/* Animated dots for active state */}
                            {isActive && (
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="w-1 h-1 bg-[var(--text-accent)] animate-bounce"
                                            style={{ animationDelay: `${i * 150}ms` }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Result badge */}
                            {hasResult && results.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[var(--text-accent)]/20 text-[var(--text-accent)] border border-[var(--text-accent)]/30 font-semibold">
                                    {results.length} FOUND
                                </span>
                            )}
                        </div>

                        {/* Query */}
                        {query && (
                            <span className="text-xs text-[var(--text-primary)] truncate opacity-80 font-mono mt-0.5">
                                {query}
                            </span>
                        )}
                    </div>

                    {/* Expand/Collapse Toggle */}
                    {hasResult && results.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="p-1 px-2 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold border border-[var(--text-accent)]/30 hover:border-[var(--text-accent)] text-[var(--text-accent)] hover:bg-[var(--text-accent)]/10 transition-all"
                        >
                            <span>{isExpanded ? 'HIDE' : 'VIEW'}</span>
                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                    )}
                </div>

                {/* Sources List (Horizontal Preview) */}
                {displaySites.length > 0 && !isExpanded && (
                    <div className="flex items-center gap-2 mt-2 ml-9 flex-wrap">
                        {displaySites.map((site) => (
                            <div
                                key={site}
                                className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)]"
                            >
                                <Globe size={8} className="text-[var(--text-accent)]" />
                                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
                                    {site}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Expanded Detailed Results */}
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
                                <div className="mt-0.5 text-[var(--text-accent)]">
                                    <Globe size={12} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                                            {getHostname(result.url)}
                                        </span>
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

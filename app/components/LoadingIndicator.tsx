import React from 'react';

export function LoadingIndicator() {
    return (
        <div className="flex items-center gap-1 h-6">
            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.32s]"></div>
            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.16s]"></div>
            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce"></div>
        </div>
    );
}

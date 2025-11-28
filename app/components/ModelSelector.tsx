'use client';

import React, { useState } from 'react';
import { HexColorPicker } from "react-colorful";
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui';

type ModelOption = {
  id: string;
  name: string;
  description: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { id: "google/gemini-3-pro-preview", name: "Expert", description: "Gemini 3 Pro" },
  { id: "x-ai/grok-4.1-fast", name: "Smart", description: "Grok 4.1 Fast" },
  { id: "openai/gpt-5-nano", name: "Fast", description: "GPT-5 Nano" },
  { id: "openai/gpt-oss-safeguard-20b", name: "Ultra-Fast", description: "GPT OSS 20B" },
];

interface ModelSelectorProps {
  currentModelId: string;
  currentModelName: string;
  onModelChange: (id: string, name: string) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  isHydrated: boolean;
}

export function ModelSelector({
  currentModelId,
  currentModelName,
  onModelChange,
  accentColor,
  onAccentColorChange,
  isHydrated,
}: ModelSelectorProps) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customModelValue, setCustomModelValue] = useState(currentModelId);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

  const handleCustomModelSubmit = () => {
    if (!customModelValue.trim()) return;
    let name = customModelValue.split('/').pop() || customModelValue;
    if (name.includes(':')) name = name.split(':')[0];
    onModelChange(customModelValue.trim(), name);
    setIsCustomDialogOpen(false);
  };

  return (
    <>
      {/* Custom Model Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogHeader>
          <DialogTitle>Set Custom Model ID</DialogTitle>
          <DialogDescription>
            Enter the full OpenRouter model ID (e.g., openai/gpt-oss-120b:exacto).
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <input
            value={customModelValue}
            onChange={(e) => setCustomModelValue(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] tracking-tight"
            placeholder="openai/gpt-oss-120b:exacto"
            autoFocus
          />
        </DialogContent>
        <DialogFooter>
          <button 
            onClick={() => setIsCustomDialogOpen(false)} 
            className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] hover-glow transition-colors uppercase tracking-[0.12em] text-xs"
          >
            Cancel
          </button>
          <button 
            onClick={handleCustomModelSubmit} 
            className="px-4 py-2 bg-[var(--text-accent)] text-black border border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)] hover-glow font-semibold transition-colors uppercase tracking-[0.12em] text-xs"
          >
            Save
          </button>
        </DialogFooter>
      </Dialog>

      <div className="flex items-center gap-2">
        {/* Model Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] px-3 py-2 border border-[var(--border-color)] hover-glow uppercase tracking-[0.16em]"
          >
            <span className={cn(!isHydrated && "opacity-0")}>{currentModelName}</span>
            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
          </button>

          {isModelMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
              <div className="absolute top-full right-0 md:left-0 md:right-auto mt-1 w-[240px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right md:origin-top-left">
                <div className="px-2 py-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Select Model</div>

                {MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id, model.name);
                      setIsModelMenuOpen(false);
                    }}
                    className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#1e1e1e] text-sm transition-colors border border-transparent"
                  >
                    <div className="flex flex-col">
                      <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">{model.name}</span>
                      <span className="text-[var(--text-secondary)] text-[11px]">{model.description}</span>
                    </div>
                    {currentModelId === model.id && <Check size={16} />}
                  </button>
                ))}

                <div className="my-1 border-t border-[var(--border-color)]" />

                <button
                  onClick={() => {
                    setIsModelMenuOpen(false);
                    setCustomModelValue(currentModelId);
                    setIsCustomDialogOpen(true);
                  }}
                  className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#1e1e1e] text-sm transition-colors border border-transparent"
                >
                  <div className="flex flex-col">
                    <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Custom Model</span>
                    <span className="text-[var(--text-secondary)] text-[11px]">Enter ID manually</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
            className="color-picker-btn w-9 h-9 border border-[var(--border-color)] bg-[#141414] hover-glow flex items-center justify-center"
            title="Accent Color"
            style={{ color: accentColor }}
          >
            <div className={cn("ender-eye-container", !isHydrated && "opacity-0")}>
              <div
                className={cn("ender-eye", isColorMenuOpen && "closed")}
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </button>

          {isColorMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsColorMenuOpen(false)} />
              <div className="absolute top-full right-0 md:right-[-80px] mt-1 p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <HexColorPicker color={accentColor} onChange={onAccentColorChange} />
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] uppercase text-[var(--text-secondary)] font-mono">HEX</span>
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => onAccentColorChange(e.target.value)}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] px-2 py-1 text-[var(--text-primary)] font-mono uppercase focus:border-[var(--border-active)] outline-none"
                  />
                </div>
                <button
                  onClick={() => onAccentColorChange('#af8787')}
                  className="mt-2 w-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

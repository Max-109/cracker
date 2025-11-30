'use client';

import React, { useState } from 'react';
import { HexColorPicker } from "react-colorful";
import { cn } from '@/lib/utils';
import { ChevronDown, Cpu, Sparkles, Zap, Rocket, Settings2 } from 'lucide-react';
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
  tier: 'premium' | 'standard' | 'fast' | 'ultra';
  icon: typeof Cpu;
};

const MODEL_OPTIONS: ModelOption[] = [
  { id: "google/gemini-3-pro-preview", name: "Expert", description: "Gemini 3 Pro", tier: 'premium', icon: Sparkles },
  { id: "google/gemini-3-pro-image-preview", name: "Creative", description: "Gemini 3 Pro Image", tier: 'premium', icon: Sparkles },
  { id: "x-ai/grok-4.1-fast", name: "Smart", description: "Grok 4.1 Fast", tier: 'standard', icon: Cpu },
  { id: "openai/gpt-5-nano", name: "Fast", description: "GPT-5 Nano", tier: 'fast', icon: Zap },
  { id: "openai/gpt-oss-safeguard-20b", name: "Ultra-Fast", description: "GPT OSS 20B", tier: 'ultra', icon: Rocket },
];

// All tiers use accent color with varying intensity levels (4 = strongest, 1 = lightest)
const TIER_CONFIG = {
  premium: { badge: 'MAX', level: 4 },
  standard: { badge: 'STD', level: 3 },
  fast: { badge: 'FAST', level: 2 },
  ultra: { badge: 'LITE', level: 1 },
};

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
              <div className="fixed inset-0 z-[9998]" onClick={() => setIsModelMenuOpen(false)} />
              <div className="absolute top-full right-0 md:left-0 md:right-auto mt-1 w-[280px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right md:origin-top-left">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-[var(--text-accent)]" />
                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Select Model</span>
                  </div>
                </div>

                <div className="p-1.5">
                  {MODEL_OPTIONS.map((model) => {
                    const isSelected = currentModelId === model.id;
                    const tierConfig = TIER_CONFIG[model.tier];
                    const Icon = model.icon;
                    // Opacity based on level (4=100%, 3=75%, 2=50%, 1=30%)
                    const opacityClass = tierConfig.level === 4 ? 'opacity-100' : tierConfig.level === 3 ? 'opacity-75' : tierConfig.level === 2 ? 'opacity-50' : 'opacity-30';

                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id, model.name);
                          setIsModelMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group relative",
                          isSelected
                            ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]"
                            : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
                        )}
                      >
                        {/* Icon with intensity ring */}
                        <div className="relative">
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center border transition-all duration-150",
                            isSelected
                              ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                              : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-accent)] group-hover:border-[var(--text-accent)]/50",
                            !isSelected && opacityClass
                          )}>
                            <Icon size={16} />
                          </div>
                          {/* Intensity corner indicator */}
                          {tierConfig.level === 4 && !isSelected && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--text-accent)] animate-pulse" />
                          )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-semibold uppercase tracking-[0.1em] text-xs",
                              isSelected ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                            )}>
                              {model.name}
                            </span>
                            {/* Tier Badge - accent color with varying intensity */}
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 font-bold tracking-wider text-[var(--text-accent)] border border-[var(--text-accent)]",
                                tierConfig.level === 4 && "bg-[var(--text-accent)]/20",
                                tierConfig.level === 3 && "bg-[var(--text-accent)]/10 opacity-80",
                                tierConfig.level === 2 && "bg-transparent opacity-60",
                                tierConfig.level === 1 && "bg-transparent border-dashed opacity-45"
                              )}
                            >
                              {tierConfig.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{model.description}</div>
                        </div>

                        {/* Power Level Bars */}
                        <div className="flex items-end gap-0.5 h-4">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={cn(
                                "w-1 transition-all duration-150 bg-[var(--text-accent)]",
                                bar === 1 ? "h-1" : bar === 2 ? "h-2" : bar === 3 ? "h-3" : "h-4",
                                bar <= tierConfig.level
                                  ? isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-80"
                                  : "opacity-10"
                              )}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-[var(--border-color)]" />

                {/* Custom Model Option */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setIsModelMenuOpen(false);
                      setCustomModelValue(currentModelId);
                      setIsCustomDialogOpen(true);
                    }}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
                  >
                    <div className="w-8 h-8 flex items-center justify-center border border-dashed border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)] transition-all duration-150">
                      <Settings2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold uppercase tracking-[0.1em] text-xs text-[var(--text-primary)]">Custom Model</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Enter OpenRouter ID</div>
                    </div>
                  </button>
                </div>
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
            style={{ color: isHydrated ? accentColor : undefined }}
          >
            <div className={cn("ender-eye-container", !isHydrated && "opacity-0")}>
              <div
                className={cn("ender-eye", isColorMenuOpen && "closed")}
                style={{ backgroundColor: isHydrated ? accentColor : undefined }}
              />
            </div>
          </button>

          {isColorMenuOpen && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setIsColorMenuOpen(false)} />
              <div className="absolute top-full right-0 md:right-[-80px] mt-1 w-[232px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 border border-white/20"
                      style={{ backgroundColor: isHydrated ? accentColor : undefined }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
                      Accent Color
                    </span>
                  </div>
                </div>

                {/* Color Picker */}
                <div className="p-3">
                  <HexColorPicker color={accentColor || '#af8787'} onChange={onAccentColorChange} />
                </div>

                {/* Preset Colors */}
                <div className="px-3 pb-3">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Presets</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      '#af8787', // Default rose
                      '#87af87', // Sage green
                      '#8787af', // Lavender
                      '#afaf87', // Wheat
                      '#87afaf', // Teal
                      '#af87af', // Mauve
                      '#ff6b6b', // Coral
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => onAccentColorChange(color)}
                        className={cn(
                          "w-6 h-6 border transition-all duration-150 hover:scale-110",
                          (accentColor || '').toLowerCase() === color.toLowerCase()
                            ? "border-white scale-110 ring-1 ring-white/50"
                            : "border-[var(--border-color)] hover:border-white/50"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Hex Input */}
                <div className="px-3 pb-3 border-t border-[var(--border-color)] pt-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 border border-[var(--border-color)] flex-shrink-0"
                      style={{ backgroundColor: isHydrated ? accentColor : undefined }}
                    />
                    <div className="flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Hex Code</div>
                      <input
                        type="text"
                        value={accentColor || '#af8787'}
                        onChange={(e) => onAccentColorChange(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] px-2 py-1.5 text-[var(--text-primary)] font-mono uppercase focus:border-[var(--border-active)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f]">
                  <button
                    onClick={() => onAccentColorChange('#af8787')}
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-accent)] hover:border-[var(--text-accent)] transition-all duration-150"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

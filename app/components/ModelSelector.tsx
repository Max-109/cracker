'use client';

import React, { useState, useEffect } from 'react';
import { HexColorPicker } from "react-colorful";
import { cn } from '@/lib/utils';
import { ChevronDown, Cpu, Brain, Zap, Terminal } from 'lucide-react';

type ModelOption = {
  id: string;
  name: string;
  description: string;
  tier: 'expert' | 'balanced' | 'fast' | 'custom';
  icon: typeof Cpu;
};

const CUSTOM_MODEL_OPTION_ID = '__custom-model__';

const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-5.5", name: "Expert", description: "GPT-5.5", tier: 'expert', icon: Brain },
  { id: "gpt-5.4-mini", name: "Balanced", description: "GPT-5.4 Mini", tier: 'balanced', icon: Cpu },
  { id: "gpt-5.3-codex-spark", name: "Ultra Fast", description: "GPT-5.3 Codex Spark", tier: 'fast', icon: Zap },
  { id: CUSTOM_MODEL_OPTION_ID, name: "Custom", description: "Enter a model name", tier: 'custom', icon: Terminal },
];

// Tier config with intensity levels (3 = strongest, 1 = lightest)
const TIER_CONFIG = {
  expert: { badge: 'PRO', level: 3 },
  balanced: { badge: 'STD', level: 2 },
  fast: { badge: 'LITE', level: 1 },
  custom: { badge: 'USER', level: 2 },
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
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isCustomModelDialogOpen, setIsCustomModelDialogOpen] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  // Local state keeps the picker input controlled, while valid colors are applied immediately.
  const [localColor, setLocalColor] = useState(accentColor);

  useEffect(() => {
    if (!isColorMenuOpen) {
      setLocalColor(accentColor);
    }
  }, [accentColor, isColorMenuOpen]);

  const isValidHexColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color);

  const handleColorChange = (color: string) => {
    setLocalColor(color);
    if (isValidHexColor(color)) {
      onAccentColorChange(color);
    }
  };

  const displayColor = isColorMenuOpen && isValidHexColor(localColor) ? localColor : accentColor;
  const isPresetModel = MODEL_OPTIONS.some((model) => model.id === currentModelId && model.id !== CUSTOM_MODEL_OPTION_ID);
  const isCustomModel = isHydrated && !isPresetModel;

  const openCustomModelDialog = () => {
    setCustomModelInput(isCustomModel ? currentModelId : '');
    setIsModelMenuOpen(false);
    setIsCustomModelDialogOpen(true);
  };

  const submitCustomModel = () => {
    const modelId = customModelInput.trim();
    if (!modelId) return;
    onModelChange(modelId, 'Custom');
    setIsCustomModelDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Model Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] px-3 py-2 border border-[var(--border-color)] hover-glow uppercase tracking-[0.16em]"
          >
            <span>{isHydrated ? currentModelName : 'Expert'}</span>
            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
          </button>

          {isModelMenuOpen && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setIsModelMenuOpen(false)} />
              <div className="absolute top-full right-0 md:left-0 md:right-auto mt-1 w-[280px] bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right md:origin-top-left">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-[var(--text-accent)]" />
                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Select Model</span>
                  </div>
                </div>

                <div className="p-1.5">
                  {MODEL_OPTIONS.map((model) => {
                    const isCustomOption = model.id === CUSTOM_MODEL_OPTION_ID;
                    const isSelected = isCustomOption ? isCustomModel : currentModelId === model.id;
                    const tierConfig = TIER_CONFIG[model.tier];
                    const Icon = model.icon;
                    // Opacity based on level (3=100%, 2=70%, 1=40%)
                    const opacityClass = tierConfig.level === 3 ? 'opacity-100' : tierConfig.level === 2 ? 'opacity-70' : 'opacity-40';

                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          if (isCustomOption) {
                            openCustomModelDialog();
                            return;
                          }
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
                          {/* Premium indicator for expert tier */}
                          {tierConfig.level === 3 && !isSelected && !isCustomOption && (
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
                            {/* Tier Badge */}
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 font-bold tracking-wider text-[var(--text-accent)] border border-[var(--text-accent)]",
                                tierConfig.level === 3 && "bg-[var(--text-accent)]/20",
                                tierConfig.level === 2 && "bg-[var(--text-accent)]/10 opacity-80",
                                tierConfig.level === 1 && "bg-transparent border-dashed opacity-60"
                              )}
                            >
                              {tierConfig.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                            {isCustomOption && isCustomModel ? currentModelId : model.description}
                          </div>
                        </div>

                        {/* Power Level Bars */}
                        {!isCustomOption && (
                          <div className="flex items-end gap-0.5 h-4">
                            {[1, 2, 3].map((bar) => (
                              <div
                                key={bar}
                                className={cn(
                                  "w-1 transition-all duration-150 bg-[var(--text-accent)]",
                                  bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-4",
                                  bar <= tierConfig.level
                                    ? isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-80"
                                    : "opacity-10"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
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
            style={{ color: isHydrated ? displayColor : '#444' }}
          >
            <div className="ender-eye-container">
              <div
                className={cn("ender-eye", isColorMenuOpen && "closed")}
                style={{ backgroundColor: isHydrated ? displayColor : '#444' }}
              />
            </div>
          </button>

          {isColorMenuOpen && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setIsColorMenuOpen(false)} />
              <div className="absolute top-full right-0 md:right-[-80px] mt-1 w-[232px] bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 border border-white/20"
                      style={{ backgroundColor: localColor || '#af8787' }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
                      Accent Color
                    </span>
                  </div>
                </div>

                {/* Color Picker */}
                <div className="p-3">
                  <HexColorPicker color={isValidHexColor(localColor) ? localColor : '#af8787'} onChange={handleColorChange} />
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
                        onClick={() => handleColorChange(color)}
                        className={cn(
                          "w-6 h-6 border transition-all duration-150 hover:scale-110",
                          (localColor || '').toLowerCase() === color.toLowerCase()
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
                      style={{ backgroundColor: isHydrated ? localColor : undefined }}
                    />
                    <div className="flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Hex Code</div>
                      <input
                        type="text"
                        value={localColor || '#af8787'}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] px-2 py-1.5 text-[var(--text-primary)] font-mono uppercase focus:border-[var(--border-active)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f]">
                  <button
                    onClick={() => handleColorChange('#af8787')}
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

      {isCustomModelDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4" onClick={() => setIsCustomModelDialogOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitCustomModel();
            }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[360px] border border-[var(--border-color)] bg-[var(--bg-sidebar-solid)] shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f] flex items-center gap-2">
              <Terminal size={13} className="text-[var(--text-accent)]" />
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Custom Model</span>
            </div>
            <div className="p-4 space-y-3">
              <label className="block">
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Model name</span>
                <input
                  value={customModelInput}
                  onChange={(event) => setCustomModelInput(event.target.value)}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="claude-opus-4-8, gpt-5.5, etc."
                  className="mt-2 w-full bg-[#141414] border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--text-accent)]"
                />
              </label>
              <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed">
                This is sent as the model id to your active OpenAI-compatible provider.
              </p>
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[#0f0f0f] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomModelDialogOpen(false)}
                className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customModelInput.trim()}
                className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] bg-[var(--text-accent)] text-black border border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)] disabled:opacity-40 disabled:pointer-events-none font-semibold transition-colors"
              >
                Use Model
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

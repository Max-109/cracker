'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from "react-colorful";
import { cn } from '@/lib/utils';
import {
  Button,
  Input,
  IconButton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownTrigger,
  DropdownLabel,
  DropdownItem,
  DropdownDivider,
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
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customModelValue, setCustomModelValue] = useState(currentModelId);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [hasPositioned, setHasPositioned] = useState(false);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Position color picker
  const updateColorPickerPosition = useCallback(() => {
    if (!colorButtonRef.current) return;

    const rect = colorButtonRef.current.getBoundingClientRect();
    const pickerWidth = 220;
    const pickerHeight = 320;
    const padding = 8;

    let top = rect.bottom + 4;
    let left = rect.right - pickerWidth;

    // Adjust if goes off screen
    if (left < padding) left = padding;
    if (top + pickerHeight > window.innerHeight - padding) {
      top = rect.top - pickerHeight - 4;
    }

    setColorPickerPos({ top, left });
    setHasPositioned(true);
  }, []);

  useEffect(() => {
    if (isColorMenuOpen && mounted) {
      setHasPositioned(false);
      requestAnimationFrame(updateColorPickerPosition);
    }
  }, [isColorMenuOpen, mounted, updateColorPickerPosition]);

  // Close color picker on outside click
  useEffect(() => {
    if (!isColorMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorButtonRef.current?.contains(target) || colorPickerRef.current?.contains(target)) {
        return;
      }
      setIsColorMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [isColorMenuOpen]);

  // Close on escape
  useEffect(() => {
    if (!isColorMenuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsColorMenuOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isColorMenuOpen]);

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
          <Input
            value={customModelValue}
            onChange={(e) => setCustomModelValue(e.target.value)}
            placeholder="openai/gpt-oss-120b:exacto"
            autoFocus
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCustomModelSubmit}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

      <div className="flex items-center gap-2">
        {/* Model Dropdown */}
        <Dropdown
          align="right"
          contentClassName="w-[240px] md:left-0 md:right-auto"
          trigger={
            <DropdownTrigger isHydrated={isHydrated}>
              {currentModelName}
            </DropdownTrigger>
          }
        >
          {(close: () => void) => (
            <>
              <DropdownLabel>Select Model</DropdownLabel>
              {MODEL_OPTIONS.map((model) => (
                <DropdownItem
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id, model.name);
                    close();
                  }}
                  selected={currentModelId === model.id}
                  description={model.description}
                >
                  {model.name}
                </DropdownItem>
              ))}
              <DropdownDivider />
              <DropdownItem
                onClick={() => {
                  setCustomModelValue(currentModelId);
                  setIsCustomDialogOpen(true);
                  close();
                }}
                description="Enter ID manually"
              >
                Custom Model
              </DropdownItem>
            </>
          )}
        </Dropdown>

        {/* Color Picker */}
        <div className="relative group">
          <IconButton
            ref={colorButtonRef}
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
            title="Accent Color"
            style={{ color: accentColor }}
          >
            <div className={cn("ender-eye-container", !isHydrated && "opacity-0")}>
              <div
                className={cn("ender-eye transition-shadow duration-300 group-hover:shadow-[0_0_16px_4px_var(--text-accent)]", isColorMenuOpen && "closed")}
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </IconButton>

          {mounted && isColorMenuOpen && createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0"
                style={{ zIndex: 9998 }}
                onClick={() => setIsColorMenuOpen(false)}
                aria-hidden="true"
              />
              {/* Color Picker Panel */}
              <div
                ref={colorPickerRef}
                style={{
                  position: 'fixed',
                  top: colorPickerPos.top,
                  left: colorPickerPos.left,
                  zIndex: 9999,
                }}
                className={cn(
                  "p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] shadow-xl animate-in fade-in zoom-in-95 duration-100",
                  !hasPositioned && "opacity-0"
                )}
              >
                <HexColorPicker color={accentColor} onChange={onAccentColorChange} />
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] uppercase text-[var(--text-secondary)] font-mono">HEX</span>
                  <Input
                    value={accentColor}
                    onChange={(e) => onAccentColorChange(e.target.value)}
                    className="flex-1 text-[11px] px-2 py-1 h-7 uppercase"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAccentColorChange('#af8787')}
                  className="mt-2 w-full text-[10px]"
                >
                  Reset to Default
                </Button>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </>
  );
}

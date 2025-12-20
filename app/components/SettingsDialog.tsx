'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HexColorPicker } from "react-colorful";
import { Settings2, User, Pencil, Palette, Sparkles, GaugeCircle, MessageSquareText, Search, Globe, Youtube, Sliders, Brain, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui';

// Response length levels with descriptions
const RESPONSE_LEVELS = [
  { value: 10, label: 'Minimal', desc: 'Just the answer, nothing more' },
  { value: 25, label: 'Brief', desc: 'Concise, key points only' },
  { value: 50, label: 'Balanced', desc: 'Clear and informative' },
  { value: 75, label: 'Thorough', desc: 'Full context and examples' },
  { value: 100, label: 'Comprehensive', desc: 'Complete, in-depth coverage' },
];

// Gender options
const GENDER_OPTIONS = [
  { value: 'not-specified', label: 'Not Specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

// Preset colors
const PRESET_COLORS = [
  '#af8787', // Default rose
  '#87af87', // Sage green
  '#8787af', // Lavender
  '#afaf87', // Wheat
  '#87afaf', // Teal
  '#af87af', // Mauve
  '#ff6b6b', // Coral
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Response length
  responseLength: number;
  onResponseLengthChange: (length: number) => void;
  // Custom instructions
  customInstructions: string;
  onCustomInstructionsChange: (instructions: string) => void;
  // User info
  userName: string;
  onUserNameChange: (name: string) => void;
  userGender: string;
  onUserGenderChange: (gender: string) => void;
  // Accent color
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  // MCP Servers
  enabledMcpServers: string[];
  onToggleMcpServer: (serverSlug: string, enabled: boolean) => void;
  // Behavior settings
  codeWrap: boolean;
  onCodeWrapChange: (enabled: boolean) => void;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  responseLength,
  onResponseLengthChange,
  customInstructions,
  onCustomInstructionsChange,
  userName,
  onUserNameChange,
  userGender,
  onUserGenderChange,
  accentColor,
  onAccentColorChange,
  enabledMcpServers,
  onToggleMcpServer,
  codeWrap,
  onCodeWrapChange,
  autoScroll,
  onAutoScrollChange,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<'response' | 'profile' | 'appearance' | 'tools' | 'behavior' | 'memory'>('response');
  // Initialize local state from props
  const [localResponseLength, setLocalResponseLength] = useState(responseLength);
  const [localCustomInstructions, setLocalCustomInstructions] = useState(customInstructions);
  const [localUserName, setLocalUserName] = useState(userName);
  const [localUserGender, setLocalUserGender] = useState(userGender);
  const [localAccentColor, setLocalAccentColor] = useState(accentColor);

  // Reset local state when dialog opens - sync from props
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened - sync from props
      requestAnimationFrame(() => {
        setLocalResponseLength(responseLength);
        setLocalCustomInstructions(customInstructions);
        setLocalUserName(userName);
        setLocalUserGender(userGender);
        setLocalAccentColor(accentColor);
      });
    }
    prevOpenRef.current = open;
  }, [open, responseLength, customInstructions, userName, userGender, accentColor]);

  const handleSave = () => {
    console.log('[Settings] ===== SAVING =====');
    console.log('[Settings] responseLength:', localResponseLength);
    console.log('[Settings] customInstructions:', localCustomInstructions?.length || 0, 'chars');
    console.log('[Settings] userName:', localUserName);

    onResponseLengthChange(localResponseLength);
    onCustomInstructionsChange(localCustomInstructions);
    onUserNameChange(localUserName);
    onUserGenderChange(localUserGender);
    onAccentColorChange(localAccentColor);

    onOpenChange(false);
  };

  // Find current level info
  const currentLevel = RESPONSE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr.value - localResponseLength) < Math.abs(prev.value - localResponseLength) ? curr : prev
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
            <Settings2 size={14} className="text-[var(--text-accent)]" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">
            Settings
          </span>
        </div>
      </div>

      <div className="flex min-h-[400px]">
        {/* Sidebar Navigation */}
        <div className="w-[160px] border-r border-[var(--border-color)] bg-[#0f0f0f] p-2">
          {[
            { id: 'response' as const, icon: GaugeCircle, label: 'Response' },
            { id: 'profile' as const, icon: User, label: 'Profile' },
            { id: 'tools' as const, icon: Globe, label: 'Tools' },
            { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
            { id: 'behavior' as const, icon: Sliders, label: 'Behavior' },
            { id: 'memory' as const, icon: Brain, label: 'Memory' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex items-center gap-2 w-full text-left px-3 py-2.5 text-xs transition-all duration-150 group",
                activeSection === id
                  ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)] text-[var(--text-accent)]"
                  : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent text-[var(--text-secondary)]"
              )}
            >
              <Icon size={14} />
              <span className="uppercase tracking-[0.1em] font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4">
          {activeSection === 'response' && (
            <ResponseLengthSection
              value={localResponseLength}
              onChange={setLocalResponseLength}
              currentLevel={currentLevel}
              customInstructions={localCustomInstructions}
              onCustomInstructionsChange={setLocalCustomInstructions}
            />
          )}
          {activeSection === 'profile' && (
            <ProfileSection
              userName={localUserName}
              onUserNameChange={setLocalUserName}
              userGender={localUserGender}
              onUserGenderChange={setLocalUserGender}
            />
          )}
          {activeSection === 'tools' && (
            <ToolsSection
              enabledServers={enabledMcpServers}
              onToggleServer={onToggleMcpServer}
            />
          )}
          {activeSection === 'appearance' && (
            <AppearanceSection
              accentColor={localAccentColor}
              onAccentColorChange={setLocalAccentColor}
            />
          )}
          {activeSection === 'behavior' && (
            <BehaviorSection
              codeWrap={codeWrap}
              onCodeWrapChange={onCodeWrapChange}
              autoScroll={autoScroll}
              onAutoScrollChange={onAutoScrollChange}
            />
          )}
          {activeSection === 'memory' && (
            <MemorySection />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[#0f0f0f] flex justify-end gap-2">
        <button
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] transition-colors uppercase tracking-[0.12em] text-xs"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[var(--text-accent)] text-black border border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)] font-semibold transition-colors uppercase tracking-[0.12em] text-xs"
        >
          Save
        </button>
      </div>
    </Dialog>
  );
}

// Response Length Section with Arc Dial
interface ResponseLengthSectionProps {
  value: number;
  onChange: (value: number) => void;
  currentLevel: typeof RESPONSE_LEVELS[0];
  customInstructions: string;
  onCustomInstructionsChange: (instructions: string) => void;
}

function ResponseLengthSection({ value, onChange, currentLevel, customInstructions, onCustomInstructionsChange }: ResponseLengthSectionProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDialInteraction = useCallback((clientX: number, clientY: number) => {
    if (!dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + 90; // Arc center is at 90px from top (viewBox center y=0 maps to 90px)

    // Calculate angle from center (standard math: 0° is right, counter-clockwise positive)
    const dx = clientX - centerX;
    const dy = centerY - clientY; // Invert Y for standard math coords
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Map angle to percentage
    // Arc goes from 225° (0%) to -45° (100%), sweeping 270° counter-clockwise through top
    // Dead zone is the bottom 90°: from -135° (225° normalized) to -45°

    // Check if in dead zone (bottom of circle)
    if (angleDeg >= -135 && angleDeg <= -45) {
      // In dead zone - clamp to nearest end
      if (angleDeg > -90) {
        // Closer to 100% end
        onChange(100);
      } else {
        // Closer to 0% end
        onChange(0);
      }
      return;
    }

    // Normal calculation for valid arc range
    let adjustedAngle = angleDeg;
    if (adjustedAngle < -135) adjustedAngle += 360; // Normalize angles past the 0% point

    const rawPercentage = (225 - adjustedAngle) / 270 * 100;
    const percentage = Math.max(0, Math.min(100, rawPercentage));

    onChange(Math.round(percentage));
  }, [onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleDialInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDialInteraction(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDialInteraction]);

  // Arc parameters
  const arcRadius = 70;
  const arcSweep = 270; // Total degrees (from bottom-left to bottom-right through top)

  // Calculate arc length for strokeDasharray (circumference * fraction)
  const arcLength = 2 * Math.PI * arcRadius * (arcSweep / 360);

  // Calculate knob position
  // SVG coordinate system: 0° is right, positive is clockwise
  // We want: 0% at bottom-left (-135° from right = 225° standard), 100% at bottom-right (135° from right = -45° standard)
  const knobAngle = 225 - (value / 100) * arcSweep; // In degrees, measured from positive X axis
  const knobAngleRad = (knobAngle * Math.PI) / 180;
  const knobRadius = 60;
  const knobX = Math.cos(knobAngleRad) * knobRadius;
  const knobY = -Math.sin(knobAngleRad) * knobRadius; // Negative because SVG Y is inverted

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <GaugeCircle size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
          Response Length
        </span>
      </div>

      {/* Arc Dial */}
      <div className="flex flex-col items-center">
        <div
          ref={dialRef}
          className="relative w-[180px] h-[160px] cursor-pointer select-none"
          onMouseDown={handleMouseDown}
        >
          {/* Background Arc */}
          <svg className="absolute inset-0 w-full h-full" viewBox="-90 -90 180 160">
            {/* Track - arc from bottom-left to bottom-right going through top */}
            <path
              d="M -60 35 A 70 70 0 1 1 60 35"
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Progress Arc */}
            <path
              d="M -60 35 A 70 70 0 1 1 60 35"
              fill="none"
              stroke="var(--text-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * arcLength} ${arcLength}`}
              className="transition-all duration-100"
            />
            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const tickAngleDeg = 225 - (tick / 100) * arcSweep;
              const tickAngleRad = (tickAngleDeg * Math.PI) / 180;
              const innerR = 52;
              const outerR = 58;
              const x1 = Math.cos(tickAngleRad) * innerR;
              const y1 = -Math.sin(tickAngleRad) * innerR;
              const x2 = Math.cos(tickAngleRad) * outerR;
              const y2 = -Math.sin(tickAngleRad) * outerR;
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={tick <= value ? 'var(--text-accent)' : '#3a3a3a'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors duration-150"
                />
              );
            })}

            {/* Knob - rendered in SVG for proper layering */}
            <circle
              cx={knobX}
              cy={knobY}
              r={isDragging ? 12 : 10}
              fill="var(--text-accent)"
              stroke="#000"
              strokeWidth="2"
              className="transition-all duration-100 cursor-grab"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            />
          </svg>

          {/* Center Value */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
            <div className="text-3xl font-bold text-[var(--text-accent)] tabular-nums">
              {value}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
              Detail Level
            </div>
          </div>
        </div>

        {/* Current Level Label */}
        <div className="mt-4 px-3 py-2 bg-[var(--text-accent)]/10 border border-[var(--text-accent)]/30">
          <div className="text-xs font-semibold text-[var(--text-accent)] uppercase tracking-wider">
            {currentLevel.label}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            {currentLevel.desc}
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
          Quick Presets
        </div>
        <div className="grid grid-cols-5 gap-1">
          {RESPONSE_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => onChange(level.value)}
              className={cn(
                "py-2 text-[9px] uppercase tracking-wider font-semibold transition-all duration-150 border",
                value === level.value
                  ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)]"
                  : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]"
              )}
            >
              {level.value}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <MessageSquareText size={12} className="text-[var(--text-accent)]" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
            Custom Instructions
          </span>
        </div>
        <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed">
          These instructions have the <span className="text-[var(--text-accent)] font-semibold">highest priority</span>.
          The AI will follow them above all other guidelines.
        </p>
        <textarea
          value={customInstructions || ''}
          onChange={(e) => onCustomInstructionsChange(e.target.value)}
          placeholder="e.g., Always respond in bullet points, use formal language, focus on practical examples..."
          rows={4}
          className="w-full bg-[#1a1a1a] border border-[var(--border-color)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-secondary)]/40 resize-none"
        />
        <p className="text-[9px] text-[var(--text-secondary)]/60">
          Leave empty to use default behavior. Works in Chat mode only (not Learning or Deep Research).
        </p>
      </div>

    </div>
  );
}

// Profile Section
interface ProfileSectionProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  userGender: string;
  onUserGenderChange: (gender: string) => void;
}

function ProfileSection({ userName, onUserNameChange, userGender, onUserGenderChange }: ProfileSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <User size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
          Profile
        </span>
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <Pencil size={10} />
          Your Name
        </label>
        <input
          type="text"
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          placeholder="Enter your name"
          className="w-full bg-[#1a1a1a] border border-[var(--border-color)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-secondary)]/50"
        />
        <p className="text-[9px] text-[var(--text-secondary)]">
          AI will use your name to personalize responses
        </p>
      </div>

      {/* Gender Selection */}
      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <User size={10} />
          Gender
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onUserGenderChange(option.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs transition-all duration-150 border",
                userGender === option.value
                  ? "bg-[var(--text-accent)]/10 border-[var(--text-accent)] text-[var(--text-accent)]"
                  : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]"
              )}
            >
              <div className={cn(
                "w-3 h-3 border-2 transition-all duration-150",
                userGender === option.value
                  ? "border-[var(--text-accent)] bg-[var(--text-accent)]"
                  : "border-[var(--text-secondary)]"
              )} />
              <span className="uppercase tracking-wider font-semibold">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Appearance Section
interface AppearanceSectionProps {
  accentColor: string;
  onAccentColorChange: (color: string) => void;
}

function AppearanceSection({ accentColor, onAccentColorChange }: AppearanceSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Palette size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
          Appearance
        </span>
      </div>

      {/* Color Picker */}
      <div className="space-y-4">
        <label className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles size={10} />
          Accent Color
        </label>

        {/* Color Picker - Full Width */}
        <div className="flex justify-center">
          <HexColorPicker color={accentColor} onChange={onAccentColorChange} />
        </div>

        {/* Current Color Preview */}
        <div className="space-y-2">
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Hex Code</div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 border border-[var(--border-color)] flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => onAccentColorChange(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[var(--border-color)] text-xs px-2 py-1.5 text-[var(--text-primary)] font-mono uppercase focus:border-[var(--text-accent)] outline-none"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Presets</div>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onAccentColorChange(color)}
                className={cn(
                  "w-7 h-7 border transition-all duration-150 hover:scale-110",
                  accentColor.toLowerCase() === color.toLowerCase()
                    ? "border-white scale-110 ring-1 ring-white/50"
                    : "border-[var(--border-color)] hover:border-white/50"
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => onAccentColorChange('#af8787')}
          className="w-full py-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-accent)] hover:border-[var(--text-accent)] transition-all duration-150"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}

// Behavior Section
interface BehaviorSectionProps {
  codeWrap: boolean;
  onCodeWrapChange: (enabled: boolean) => void;
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
}

function BehaviorSection({ codeWrap, onCodeWrapChange, autoScroll, onAutoScrollChange }: BehaviorSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sliders size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
          Behavior
        </span>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
        Customize how the chat interface behaves.
      </p>

      <div className="space-y-3">
        {/* Code Wrap Toggle */}
        <button
          onClick={() => onCodeWrapChange(!codeWrap)}
          className="flex items-center justify-between w-full p-3 bg-[#1a1a1a] border border-[var(--border-color)] hover:border-[var(--text-accent)]/30 transition-all duration-150"
        >
          <div className="text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Code Wrap
            </div>
            <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">
              Wrap long lines in code blocks
            </div>
          </div>
          <div
            className={cn(
              "w-10 h-5 rounded-full transition-all duration-200 relative",
              codeWrap ? "bg-[var(--text-accent)]" : "bg-[#2a2a2a]"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
              codeWrap
                ? "left-[22px] bg-black"
                : "left-0.5 bg-[#4a4a4a]"
            )} />
          </div>
        </button>

        {/* Auto-Scroll Toggle */}
        <button
          onClick={() => onAutoScrollChange(!autoScroll)}
          className="flex items-center justify-between w-full p-3 bg-[#1a1a1a] border border-[var(--border-color)] hover:border-[var(--text-accent)]/30 transition-all duration-150"
        >
          <div className="text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Auto-Scroll
            </div>
            <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">
              Follow AI response while streaming
            </div>
          </div>
          <div
            className={cn(
              "w-10 h-5 rounded-full transition-all duration-200 relative",
              autoScroll ? "bg-[var(--text-accent)]" : "bg-[#2a2a2a]"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
              autoScroll
                ? "left-[22px] bg-black"
                : "left-0.5 bg-[#4a4a4a]"
            )} />
          </div>
        </button>
      </div>
    </div>
  );
}

// Tools Section - MCP Servers for tool calling
interface ToolsSectionProps {
  enabledServers: string[];
  onToggleServer: (serverSlug: string, enabled: boolean) => void;
}

// Available tool servers configuration
const AVAILABLE_SERVERS = [
  {
    slug: 'brave-search', // Internal identifier
    name: 'Web Search', // User-facing name (generic)
    description: 'Search the web for current information',
    icon: Search,
    color: null as string | null, // null = use CSS variable --text-accent
  },
  {
    slug: 'youtube',
    name: 'YouTube',
    description: 'Search videos and get transcripts',
    icon: Youtube,
    color: null as string | null, // null = use default accent for subtle look
  },
];

function ToolsSection({ enabledServers, onToggleServer }: ToolsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Globe size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
          AI Tools
        </span>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
        Enable tools that the AI can use to search the web and access current information.
      </p>

      {/* Server List */}
      <div className="space-y-2">
        {AVAILABLE_SERVERS.map(server => {
          const isEnabled = enabledServers.includes(server.slug);
          const Icon = server.icon;
          const hasCustomColor = server.color !== null;
          const customColor = server.color!; // Non-null when hasCustomColor is true

          return (
            <button
              key={server.slug}
              onClick={() => onToggleServer(server.slug, !isEnabled)}
              className={cn(
                "flex items-center w-full gap-3 p-3 transition-all duration-150 border",
                !isEnabled && "bg-[#1a1a1a] border-[var(--border-color)] hover:border-[var(--text-accent)]/30",
                // Use CSS classes for default accent (when color is null)
                isEnabled && !hasCustomColor && "bg-[var(--text-accent)]/10 border-[var(--text-accent)]/50"
              )}
              style={isEnabled && hasCustomColor ? {
                backgroundColor: `${customColor}10`,
                borderColor: `${customColor}50`,
              } : undefined}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 flex items-center justify-center border",
                  !isEnabled && "border-[var(--border-color)] bg-[#0f0f0f]",
                  isEnabled && !hasCustomColor && "border-[var(--text-accent)] bg-[var(--text-accent)]/20"
                )}
                style={isEnabled && hasCustomColor ? {
                  borderColor: `${customColor}80`,
                  backgroundColor: `${customColor}20`,
                } : undefined}
              >
                <Icon
                  size={14}
                  style={isEnabled && hasCustomColor ? { color: customColor } : undefined}
                  className={cn(
                    !isEnabled && "text-[var(--text-secondary)]",
                    isEnabled && !hasCustomColor && "text-[var(--text-accent)]"
                  )}
                />
              </div>

              {/* Text */}
              <div className="flex-1 text-left">
                <div
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    !isEnabled && "text-[var(--text-primary)]",
                    isEnabled && !hasCustomColor && "text-[var(--text-accent)]"
                  )}
                  style={isEnabled && hasCustomColor ? { color: customColor } : undefined}
                >
                  {server.name}
                </div>
                <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                  {server.description}
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={cn(
                  "w-10 h-5 rounded-full transition-all duration-200 relative",
                  !isEnabled && "bg-[#2a2a2a]",
                  isEnabled && !hasCustomColor && "bg-[var(--text-accent)]"
                )}
                style={isEnabled && hasCustomColor ? { backgroundColor: customColor } : undefined}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
                  isEnabled
                    ? "left-[22px] bg-black"
                    : "left-0.5 bg-[#4a4a4a]"
                )} />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-[var(--text-secondary)]/60 leading-relaxed">
        When enabled, the AI can search the web to find current information and answer questions about recent events.
      </p>
    </div>
  );
}

// Memory Section - User facts management
interface UserFact {
  id: string;
  fact: string;
  category: string;
  createdAt: string;
}

function MemorySection() {
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch facts on mount
  useEffect(() => {
    const fetchFacts = async () => {
      try {
        const res = await fetch('/api/user-facts');
        if (res.ok) {
          const data = await res.json();
          setFacts(data.facts || []);
        }
      } catch (err) {
        console.error('Failed to fetch facts:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setMemoryEnabled(data.memoryEnabled !== false);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };

    fetchFacts();
    fetchSettings();
  }, []);

  const handleDeleteFact = async (factId: string) => {
    setDeletingId(factId);
    try {
      const res = await fetch(`/api/user-facts?id=${factId}`, { method: 'DELETE' });
      if (res.ok) {
        setFacts(prev => prev.filter(f => f.id !== factId));
      }
    } catch (err) {
      console.error('Failed to delete fact:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (fact: UserFact) => {
    setEditingId(fact.id);
    setEditValue(fact.fact);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;

    try {
      const res = await fetch('/api/user-facts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, fact: editValue.trim() }),
      });
      if (res.ok) {
        setFacts(prev => prev.map(f =>
          f.id === editingId ? { ...f, fact: editValue.trim() } : f
        ));
      }
    } catch (err) {
      console.error('Failed to update fact:', err);
    } finally {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleClearAll = async () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    setShowClearConfirm(false);
    try {
      const res = await fetch('/api/user-facts?clearAll=true', { method: 'DELETE' });
      if (res.ok) {
        setFacts([]);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const handleToggleMemory = async () => {
    const newValue = !memoryEnabled;
    setMemoryEnabled(newValue);

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryEnabled: newValue }),
      });
    } catch (err) {
      setMemoryEnabled(!newValue); // Revert on error
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-4">
      {/* Custom confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-[#151515] border border-[var(--border-color)] p-5 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={16} className="text-red-400" />
              <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Clear All Memory</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              This will permanently delete all {facts.length} facts. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-red-500/80 text-white border border-red-500 hover:bg-red-500 transition-all font-semibold"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={12} className="text-[var(--text-accent)]" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">
            Memory
          </span>
        </div>
        <button
          onClick={handleToggleMemory}
          className="flex items-center gap-2"
        >
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
            {memoryEnabled ? 'ON' : 'OFF'}
          </span>
          <div
            className={cn(
              "w-10 h-5 rounded-full transition-all duration-200 relative",
              memoryEnabled ? "bg-[var(--text-accent)]" : "bg-[#2a2a2a]"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
              memoryEnabled
                ? "left-[22px] bg-black"
                : "left-0.5 bg-[#4a4a4a]"
            )} />
          </div>
        </button>
      </div>

      {/* Description */}
      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
        Memory learns facts about you to personalize responses.
      </p>

      {loading ? (
        <div className="text-center py-6 text-[var(--text-secondary)] text-xs">
          Loading...
        </div>
      ) : facts.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[var(--border-color)]">
          <Brain size={20} className="mx-auto mb-2 text-[var(--text-secondary)]/30" />
          <div className="text-xs text-[var(--text-secondary)]">
            No facts yet
          </div>
          <div className="text-[9px] text-[var(--text-secondary)]/50 mt-1">
            Start chatting and I&apos;ll learn about you
          </div>
        </div>
      ) : (
        <>
          {/* Fact count */}
          <div className="flex items-center justify-between p-2 bg-[var(--text-accent)]/5 border-l-2 border-l-[var(--text-accent)]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-accent)] font-semibold">
              {facts.length} fact{facts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClearAll}
              className="text-[9px] uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Flat facts list */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {facts.map(fact => (
              <div
                key={fact.id}
                className="group flex items-start gap-3 p-3 bg-[#131313] border-l-2 border-l-[var(--text-accent)]/40 border-y border-r border-y-[var(--border-color)] border-r-[var(--border-color)] hover:border-l-[var(--text-accent)] hover:bg-[#181818] hover:shadow-[0_0_20px_-5px_var(--text-accent)] transition-all duration-200"
              >
                {editingId === fact.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                      }}
                      autoFocus
                      className="flex-1 bg-[#0f0f0f] border border-[var(--text-accent)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 text-[9px] uppercase bg-[var(--text-accent)] text-black font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      {fact.fact}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => handleStartEdit(fact)}
                        className="p-1 hover:bg-[var(--text-accent)]/10 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-all"
                        title="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteFact(fact.id)}
                        disabled={deletingId === fact.id}
                        className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all"
                        title="Delete"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

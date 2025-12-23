import { Platform } from 'react-native';

/**
 * Design System Constants
 * Matches the web's "Living Interface" dark cyberpunk aesthetic
 */

// Sharp edges - NO rounded corners
export const BORDER_RADIUS = 0;

// Spacing scale
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

// Typography - EXACT match to web (JetBrains Mono from Google Fonts)
export const FONTS = {
    // JetBrains Mono - bundled with app, loaded in _layout.tsx
    mono: 'JetBrainsMono-Regular',
    monoMedium: 'JetBrainsMono-Medium',
    monoSemiBold: 'JetBrainsMono-SemiBold',
    monoBold: 'JetBrainsMono-Bold',
    // System font for body text (optional)
    system: Platform.OS === 'ios' ? 'System' : 'Roboto',
} as const;

// Font sizes
export const FONT_SIZES = {
    xs: 9,
    sm: 11,
    md: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    xxxl: 32,
} as const;

// Dark theme colors - EXACT match from web globals.css
export const COLORS = {
    // Backgrounds (from --bg-main, --bg-sidebar-solid, etc.)
    bgMain: '#1a1a1a',           // Web: --bg-main
    bgSidebar: '#141414',        // Web: --bg-sidebar-solid  (was #0f0f0f)
    bgSidebarSolid: '#141414',   // Web: --bg-sidebar-solid
    bgCard: '#1a1a1a',           // Web: matches bgMain
    bgInput: '#1e1e1e',          // Web: --bg-input
    bgElevated: '#141414',       // Web: sidebar-primary
    bgHover: '#252525',          // Web: --bg-hover
    bgCode: '#222222',           // Web: --bg-code

    // Borders (from --border-color, --border-active)
    border: '#333333',           // Web: --border-color (was #222222)
    borderColor: '#333333',      // Alias for consistency
    borderLight: '#333333',      // Same as border
    borderActive: '#af8787',     // Web: --border-active (accent)

    // Text (from --text-primary, --text-secondary)
    textPrimary: '#FFFFFF',      // Web: --text-primary (was #f5f5f5)
    textSecondary: '#555555',    // Web: --text-secondary (was #888888)
    textMuted: '#555555',        // Web: same as secondary
    textDim: '#555555',          // Web: same as secondary
    textAccent: '#af8787',       // Web: --text-accent (default rose)

    // States
    error: '#ef4444',            // Web: --destructive (was #f87171)
    success: '#4ade80',
    warning: '#fbbf24',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

// Default accent colors (matching web presets)
export const ACCENT_PRESETS = [
    '#af8787', // Rose (default)
    '#87af87', // Sage
    '#8787af', // Lavender
    '#afaf87', // Wheat
    '#87afaf', // Teal
    '#af87af', // Mauve
    '#f87171', // Coral
] as const;

// Animation durations
export const ANIMATION = {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
} as const;

// Icon sizes
export const ICON_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

// Button sizes
export const BUTTON_SIZES = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
} as const;

// Icon mapping from Lucide (web) to Ionicons (mobile)
export const ICON_MAP = {
    // Actions
    'Zap': 'flash',
    'Brain': 'bulb',
    'Flame': 'flame',
    'Sparkles': 'sparkles',
    'Cpu': 'hardware-chip',
    'Rocket': 'rocket',
    'Settings': 'settings-sharp',
    'Settings2': 'settings-outline',
    'Search': 'search',
    'Paperclip': 'attach',
    'Plus': 'add',
    'Mic': 'mic',
    'MicOff': 'mic-off',
    'ArrowUp': 'arrow-up',
    'ArrowDown': 'arrow-down',
    'Square': 'stop',
    'Stop': 'stop',
    'Play': 'play',
    'Send': 'send',

    // Navigation
    'Menu': 'menu',
    'X': 'close',
    'ChevronDown': 'chevron-down',
    'ChevronUp': 'chevron-up',
    'ChevronLeft': 'chevron-back',
    'ChevronRight': 'chevron-forward',
    'ArrowLeft': 'arrow-back',

    // Content
    'MessageSquare': 'chatbubble-outline',
    'MessageCircle': 'chatbubble',
    'File': 'document',
    'FileText': 'document-text',
    'Image': 'image',
    'Copy': 'copy',
    'Check': 'checkmark',
    'Clock': 'time',
    'Calendar': 'calendar',

    // Actions
    'Trash': 'trash-outline',
    'Trash2': 'trash',
    'Edit': 'pencil',
    'Edit2': 'create',
    'Share': 'share',
    'Download': 'download',
    'Upload': 'cloud-upload',
    'Refresh': 'refresh',
    'RotateCcw': 'refresh',

    // Status
    'AlertTriangle': 'warning',
    'AlertCircle': 'alert-circle',
    'Info': 'information-circle',
    'HelpCircle': 'help-circle',
    'CheckCircle': 'checkmark-circle',
    'XCircle': 'close-circle',

    // User
    'User': 'person',
    'Users': 'people',
    'LogOut': 'log-out',
    'LogIn': 'log-in',

    // Features
    'Globe': 'globe',
    'Newspaper': 'newspaper',
    'Youtube': 'logo-youtube',
    'Book': 'book',
    'BookOpen': 'book-outline',
    'GraduationCap': 'school',
    'Lightbulb': 'bulb',
    'Code': 'code-slash',
    'Terminal': 'terminal',
    'Eye': 'eye',
    'EyeOff': 'eye-off',
    'Lock': 'lock-closed',
    'Unlock': 'lock-open',
    'Key': 'key',

    // Misc
    'Moon': 'moon',
    'Sun': 'sunny',
    'Star': 'star',
    'Heart': 'heart',
    'Bookmark': 'bookmark',
    'Flag': 'flag',
    'Tag': 'pricetag',
    'Link': 'link',
    'ExternalLink': 'open-outline',
    'MoreHorizontal': 'ellipsis-horizontal',
    'MoreVertical': 'ellipsis-vertical',
} as const;

// Model tiers (matching web)
export const MODEL_TIERS = [
    { id: 'gemini-3-pro-preview', name: 'Expert', tier: 4, icon: 'sparkles', description: 'Most capable, best reasoning' },
    { id: 'gemini-2.5-flash', name: 'Balanced', tier: 3, icon: 'hardware-chip', description: 'Fast and accurate' },
    { id: 'gemini-2.5-flash-lite', name: 'Ultra Fast', tier: 2, icon: 'rocket', description: 'Fastest responses' },
] as const;

// Reasoning effort levels
export const REASONING_LEVELS = [
    { level: 'low', icon: 'flash', label: 'Quick', description: 'Fast responses', bars: 1 },
    { level: 'medium', icon: 'bulb', label: 'Balanced', description: 'Standard reasoning', bars: 2 },
    { level: 'high', icon: 'flame', label: 'Deep', description: 'Maximum analysis', bars: 3 },
] as const;

// Chat modes
export const CHAT_MODES = [
    { id: 'cracking', name: 'Chat', icon: 'chatbubble', description: 'General conversation' },
    { id: 'deep-search', name: 'Deep Research', icon: 'search', description: 'In-depth research' },
    { id: 'learning', name: 'Learning', icon: 'school', description: 'Educational mode' },
] as const;

// Learning sub-modes
export const LEARNING_MODES = [
    { id: 'summary', name: 'Summary', icon: 'document-text', description: 'Digest information' },
    { id: 'flashcard', name: 'Flashcard', icon: 'card', description: 'Q&A format' },
    { id: 'teaching', name: 'Teaching', icon: 'school', description: 'Step-by-step explanation' },
] as const;

// Suggestion cards (matching home screen)
export const HOME_SUGGESTIONS = [
    {
        icon: 'code-slash',
        title: 'CODE',
        subtitle: 'Help me write a Python...',
        description: 'Get Coding Assistance',
    },
    {
        icon: 'bulb',
        title: 'IDEAS',
        subtitle: 'Brainstorm ideas for my...',
        description: 'Creative Thinking',
    },
    {
        icon: 'create',
        title: 'WRITE',
        subtitle: 'Write a professional...',
        description: 'Content Creation',
    },
    {
        icon: 'school',
        title: 'EXPLAIN',
        subtitle: 'Explain quantum computing...',
        description: 'Learn Anything',
    },
] as const;

// Helper function to get accent color with opacity
export function withOpacity(color: string, opacity: number): string {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

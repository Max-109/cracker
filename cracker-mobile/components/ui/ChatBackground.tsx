import React, { useEffect, useState } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Line, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Icon types - EXACT match to web (8 icon types, 10 instances)
const ICON_TYPES = [
    'chatbubble-outline',  // MessageSquare
    'sparkles',            // Sparkles
    'bulb-outline',        // Brain (closest)
    'flash-outline',       // Zap
    'code-slash-outline',  // Code
    'document-text-outline', // FileText
    'bulb',                // Lightbulb
    'terminal-outline',    // Terminal
] as const;

interface FloatingIcon {
    id: number;
    icon: typeof ICON_TYPES[number];
    x: number;
    y: number;
    size: number;
    opacity: number;
}

/**
 * ChatBackground - EXACT match to web's ChatBackground.tsx
 * 
 * Web features replicated:
 * ✅ Grid pattern (80px cells, accent color at 3% opacity)
 * ✅ 10 Floating icons (32-48px, 4-6% opacity) 
 * ✅ Ambient glows (top-left 600px 4%, bottom-right 500px 3%)
 * ✅ Corner accent brackets (64px L-shapes, accent/10)
 * ✅ Side decoration bars (left top-1/4, right bottom-1/4)
 */
export default function ChatBackground() {
    const theme = useTheme();
    const [icons, setIcons] = useState<FloatingIcon[]>([]);

    // Generate 10 floating icons - EXACT match to web
    useEffect(() => {
        const generated: FloatingIcon[] = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            icon: ICON_TYPES[i % ICON_TYPES.length],
            x: (Math.random() * 0.85 + 0.05) * SCREEN_WIDTH,  // 5-90% of width
            y: (Math.random() * 0.80 + 0.05) * SCREEN_HEIGHT, // 5-85% of height
            size: Math.random() * 16 + 32, // 32-48px - EXACT match to web
            opacity: 0.04 + Math.random() * 0.02, // 4-6% - EXACT match to web
        }));
        setIcons(generated);
    }, []);

    // Grid cell size - web uses 80px
    const GRID_SIZE = 80;
    const numHorizontalLines = Math.ceil(SCREEN_HEIGHT / GRID_SIZE);
    const numVerticalLines = Math.ceil(SCREEN_WIDTH / GRID_SIZE);

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Ambient Glows - matching web exactly */}
            {/* Web: top-left -top-32 -left-32 w-[600px] h-[600px] opacity-[0.04] blur-[100px] */}
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.ambientGlow}>
                <Defs>
                    <RadialGradient id="glowTopLeft" cx="0" cy="0" rx="300" ry="300" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor={theme.accent} stopOpacity="0.04" />
                        <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="glowBottomRight" cx={SCREEN_WIDTH} cy={SCREEN_HEIGHT} rx="250" ry="250" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor={theme.accent} stopOpacity="0.03" />
                        <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                {/* Top-left glow: web = 600px diameter centered at -32,-32 */}
                <Circle cx={-32} cy={-32} r={300} fill="url(#glowTopLeft)" />
                {/* Bottom-right glow: web = 500px diameter centered at SCREEN+32 */}
                <Circle cx={SCREEN_WIDTH + 32} cy={SCREEN_HEIGHT + 32} r={250} fill="url(#glowBottomRight)" />
            </Svg>

            {/* Grid Pattern - SVG for crisp lines */}
            <Svg
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                style={styles.grid}
            >
                {/* Horizontal lines */}
                {Array.from({ length: numHorizontalLines + 1 }, (_, i) => (
                    <Line
                        key={`h-${i}`}
                        x1={0}
                        y1={i * GRID_SIZE}
                        x2={SCREEN_WIDTH}
                        y2={i * GRID_SIZE}
                        stroke={theme.accent}
                        strokeWidth={1}
                        opacity={0.03}
                    />
                ))}
                {/* Vertical lines */}
                {Array.from({ length: numVerticalLines + 1 }, (_, i) => (
                    <Line
                        key={`v-${i}`}
                        x1={i * GRID_SIZE}
                        y1={0}
                        x2={i * GRID_SIZE}
                        y2={SCREEN_HEIGHT}
                        stroke={theme.accent}
                        strokeWidth={1}
                        opacity={0.03}
                    />
                ))}
            </Svg>

            {/* Floating Icons - 10 icons matching web */}
            {icons.map((item) => (
                <View
                    key={item.id}
                    style={[
                        styles.floatingIcon,
                        {
                            left: item.x,
                            top: item.y,
                            opacity: item.opacity,
                        },
                    ]}
                >
                    <Ionicons
                        name={item.icon}
                        size={item.size}
                        color={theme.accent}
                    />
                </View>
            ))}

            {/* Corner Accents - matching web: w-16 h-16 (64px) L-brackets with border-2 */}
            {/* Web: border-[var(--text-accent)]/10 = accent with 10% opacity = 1A in hex */}
            {/* Top Left: border-l-2 border-t-2 */}
            <View
                style={[
                    styles.cornerL,
                    styles.topLeft,
                    {
                        borderLeftColor: `${theme.accent}1A`,
                        borderTopColor: `${theme.accent}1A`,
                        borderLeftWidth: 2,
                        borderTopWidth: 2,
                    }
                ]}
            />
            {/* Top Right: border-r-2 border-t-2 */}
            <View
                style={[
                    styles.cornerL,
                    styles.topRight,
                    {
                        borderRightColor: `${theme.accent}1A`,
                        borderTopColor: `${theme.accent}1A`,
                        borderRightWidth: 2,
                        borderTopWidth: 2,
                    }
                ]}
            />
            {/* Bottom Left: border-l-2 border-b-2 */}
            <View
                style={[
                    styles.cornerL,
                    styles.bottomLeft,
                    {
                        borderLeftColor: `${theme.accent}1A`,
                        borderBottomColor: `${theme.accent}1A`,
                        borderLeftWidth: 2,
                        borderBottomWidth: 2,
                    }
                ]}
            />
            {/* Bottom Right: border-r-2 border-b-2 */}
            <View
                style={[
                    styles.cornerL,
                    styles.bottomRight,
                    {
                        borderRightColor: `${theme.accent}1A`,
                        borderBottomColor: `${theme.accent}1A`,
                        borderRightWidth: 2,
                        borderBottomWidth: 2,
                    }
                ]}
            />

            {/* Side Decorations - Left (1/4 from top) */}
            {/* Web: left-3 (12px), top-1/4, w-1 (4px), gap-1 (4px) */}
            <View style={[styles.sideDecoration, styles.leftDecoration]}>
                {[3, 5, 2, 4, 3].map((h, i) => (
                    <View
                        key={i}
                        style={{
                            width: 4,
                            height: h * 4,
                            backgroundColor: theme.accent,
                            opacity: 0.1,
                            marginBottom: 4,
                        }}
                    />
                ))}
            </View>

            {/* Side Decorations - Right (1/4 from bottom) */}
            {/* Web: right-3 (12px), bottom-1/4 */}
            <View style={[styles.sideDecoration, styles.rightDecoration]}>
                {[2, 4, 3, 5, 2].map((h, i) => (
                    <View
                        key={i}
                        style={{
                            width: 4,
                            height: h * 4,
                            backgroundColor: theme.accent,
                            opacity: 0.1,
                            marginBottom: 4,
                        }}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0,
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    grid: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    floatingIcon: {
        position: 'absolute',
    },
    // Corner L-brackets - 64px (matching web w-16 h-16)
    cornerL: {
        position: 'absolute',
        width: 64,
        height: 64,
    },
    topLeft: {
        top: 24,  // web: top-6 = 24px
        left: 24, // web: left-6 = 24px
    },
    topRight: {
        top: 24,
        right: 24,
    },
    bottomLeft: {
        bottom: 24,
        left: 24,
    },
    bottomRight: {
        bottom: 24,
        right: 24,
    },
    // Side decorations
    sideDecoration: {
        position: 'absolute',
        flexDirection: 'column',
    },
    leftDecoration: {
        left: 12, // web: left-3 = 12px
        top: '25%', // 1/4 from top
    },
    rightDecoration: {
        right: 12,
        bottom: '25%', // 1/4 from bottom
    },
});

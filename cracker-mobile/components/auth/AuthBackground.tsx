import React, { useEffect, useState } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/theme';

const { width, height } = Dimensions.get('window');

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
}

function FloatingParticle({ particle, accentColor }: { particle: Particle; accentColor: string }) {
    const opacity = useSharedValue(0.1);
    const translateY = useSharedValue(0);

    useEffect(() => {
        opacity.value = withDelay(
            particle.delay * 1000,
            withRepeat(
                withTiming(0.3, { duration: particle.duration * 500, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );
        translateY.value = withDelay(
            particle.delay * 1000,
            withRepeat(
                withTiming(-20, { duration: particle.duration * 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: accentColor,
                },
                animatedStyle,
            ]}
        />
    );
}

function ScanLine({ accentColor }: { accentColor: string }) {
    const translateY = useSharedValue(-10);

    useEffect(() => {
        translateY.value = withRepeat(
            withTiming(height + 10, { duration: 8000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    opacity: 0.15,
                },
                animatedStyle,
            ]}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: accentColor,
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
                }}
            />
        </Animated.View>
    );
}

function PulsingBar({ height: barHeight, delay, accentColor }: { height: number; delay: number; accentColor: string }) {
    const opacity = useSharedValue(0.2);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: 3,
                    height: barHeight,
                    backgroundColor: accentColor,
                    marginBottom: 6,
                },
                animatedStyle,
            ]}
        />
    );
}

export default function AuthBackground() {
    const theme = useTheme();
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const generated: Particle[] = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            delay: Math.random() * 5,
            duration: Math.random() * 10 + 15,
        }));
        setParticles(generated);
    }, []);

    const barHeights = [16, 12, 20, 8, 16, 12];

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Grid Pattern */}
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    opacity: 0.03,
                }}
            >
                {/* Vertical lines */}
                {Array.from({ length: Math.ceil(width / 60) }).map((_, i) => (
                    <View
                        key={`v-${i}`}
                        style={{
                            position: 'absolute',
                            left: i * 60,
                            top: 0,
                            bottom: 0,
                            width: 1,
                            backgroundColor: theme.accent,
                        }}
                    />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: Math.ceil(height / 60) }).map((_, i) => (
                    <View
                        key={`h-${i}`}
                        style={{
                            position: 'absolute',
                            top: i * 60,
                            left: 0,
                            right: 0,
                            height: 1,
                            backgroundColor: theme.accent,
                        }}
                    />
                ))}
            </View>

            {/* Scan Line */}
            <ScanLine accentColor={theme.accent} />

            {/* Floating Particles */}
            {particles.map((particle) => (
                <FloatingParticle
                    key={particle.id}
                    particle={particle}
                    accentColor={theme.accent}
                />
            ))}

            {/* Corner Accents */}
            <View style={[styles.cornerAccent, styles.topLeft, { borderColor: theme.accentMedium }]} />
            <View style={[styles.cornerAccent, styles.topRight, { borderColor: theme.accentMedium }]} />
            <View style={[styles.cornerAccent, styles.bottomLeft, { borderColor: theme.accentMedium }]} />
            <View style={[styles.cornerAccent, styles.bottomRight, { borderColor: theme.accentMedium }]} />

            {/* Left Side Bars */}
            <View style={styles.leftBars}>
                {barHeights.map((h, i) => (
                    <PulsingBar key={i} height={h} delay={i * 150} accentColor={theme.accent} />
                ))}
            </View>

            {/* Right Side Bars */}
            <View style={styles.rightBars}>
                {barHeights.slice().reverse().map((h, i) => (
                    <PulsingBar key={i} height={h} delay={i * 150 + 500} accentColor={theme.accent} />
                ))}
            </View>

            {/* Ambient Glow */}
            <View
                style={{
                    position: 'absolute',
                    top: '20%',
                    left: '10%',
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    backgroundColor: theme.accent,
                    opacity: 0.03,
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    bottom: '20%',
                    right: '10%',
                    width: 150,
                    height: 150,
                    borderRadius: 75,
                    backgroundColor: theme.accent,
                    opacity: 0.02,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    cornerAccent: {
        position: 'absolute',
        width: 60,
        height: 60,
    },
    topLeft: {
        top: 20,
        left: 20,
        borderLeftWidth: 2,
        borderTopWidth: 2,
    },
    topRight: {
        top: 20,
        right: 20,
        borderRightWidth: 2,
        borderTopWidth: 2,
    },
    bottomLeft: {
        bottom: 40,
        left: 20,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
    },
    bottomRight: {
        bottom: 40,
        right: 20,
        borderRightWidth: 2,
        borderBottomWidth: 2,
    },
    leftBars: {
        position: 'absolute',
        left: 30,
        top: '35%',
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    rightBars: {
        position: 'absolute',
        right: 30,
        top: '45%',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
});

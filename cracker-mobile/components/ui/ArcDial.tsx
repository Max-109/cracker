import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../../lib/design';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DIAL_SIZE = 180;
const ARC_RADIUS = 70;
const ARC_SWEEP = 270; // Total degrees (225° to -45°)
const CENTER = DIAL_SIZE / 2;

interface ArcDialProps {
    value: number;
    onChange: (value: number) => void;
}

import { useTheme } from '../../store/theme';

export default function ArcDial({ value, onChange }: ArcDialProps) {
    const theme = useTheme();
    // Arc length for strokeDasharray
    const arcLength = 2 * Math.PI * ARC_RADIUS * (ARC_SWEEP / 360);

    // Pan Responder for interaction
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt, gestureState) => {
                handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
        })
    ).current;

    const handleTouch = (x: number, y: number) => {
        // Calculate angle from center
        const dx = x - CENTER;
        const dy = CENTER - y; // Invert Y for standard math coords
        const angleRad = Math.atan2(dy, dx);
        let angleDeg = (angleRad * 180) / Math.PI;

        // Normalize angle to map to our 0-100 range
        // Our 0% is at 225° (bottom left), 100% is at -45° (bottom right)
        // Dead zone is -45° to -135° (bottom)

        // Check dead zone
        if (angleDeg >= -135 && angleDeg <= -45) {
            if (angleDeg > -90) onChange(100);
            else onChange(0);
            return;
        }

        // Normalize
        let adjustedAngle = angleDeg;
        if (adjustedAngle < -135) adjustedAngle += 360;

        // Calculate percentage
        // 225° is 0%, -45° (315°) is 100%
        // Range is 270 degrees

        const rawPercentage = (225 - adjustedAngle) / 270 * 100;
        const percentage = Math.max(0, Math.min(100, Math.round(rawPercentage)));

        onChange(percentage);
    };

    // Calculate knob position based on value
    const knobAngle = 225 - (value / 100) * ARC_SWEEP;
    const knobAngleRad = (knobAngle * Math.PI) / 180;
    const KNOB_ORBIT = 60;

    // SVG coords (y is down)
    const knobX = CENTER + Math.cos(knobAngleRad) * KNOB_ORBIT;
    const knobY = CENTER - Math.sin(knobAngleRad) * KNOB_ORBIT;

    return (
        <View style={styles.container}>
            <View
                style={styles.dialContainer}
                {...panResponder.panHandlers}
            >
                <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
                    {/* Background Track */}
                    <Path
                        d={`M ${CENTER + ARC_RADIUS * Math.cos(225 * Math.PI / 180)} ${CENTER - ARC_RADIUS * Math.sin(225 * Math.PI / 180)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 1 1 ${CENTER + ARC_RADIUS * Math.cos(-45 * Math.PI / 180)} ${CENTER - ARC_RADIUS * Math.sin(-45 * Math.PI / 180)}`}
                        fill="none"
                        stroke="#2a2a2a"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />

                    {/* Progress Arc */}
                    <Path
                        d={`M ${CENTER + ARC_RADIUS * Math.cos(225 * Math.PI / 180)} ${CENTER - ARC_RADIUS * Math.sin(225 * Math.PI / 180)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 1 1 ${CENTER + ARC_RADIUS * Math.cos(-45 * Math.PI / 180)} ${CENTER - ARC_RADIUS * Math.sin(-45 * Math.PI / 180)}`}
                        fill="none"
                        stroke={theme.accent}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(value / 100) * arcLength} ${arcLength}`}
                    />

                    {/* Ticks */}
                    {[0, 25, 50, 75, 100].map(tick => {
                        const tickAngle = 225 - (tick / 100) * ARC_SWEEP;
                        const tickRad = (tickAngle * Math.PI) / 180;
                        const innerR = 52;
                        const outerR = 58;
                        const x1 = CENTER + Math.cos(tickRad) * innerR;
                        const y1 = CENTER - Math.sin(tickRad) * innerR;
                        const x2 = CENTER + Math.cos(tickRad) * outerR;
                        const y2 = CENTER - Math.sin(tickRad) * outerR;

                        return (
                            <Line
                                key={tick}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={tick <= value ? theme.accent : '#3a3a3a'}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Knob */}
                    <Circle
                        cx={knobX}
                        cy={knobY}
                        r="10"
                        fill={theme.accent}
                        stroke="#000"
                        strokeWidth="2"
                    />
                </Svg>

                {/* Center Value */}
                <View style={styles.centerText}>
                    <Text style={[styles.valueText, { color: theme.accent }]}>{Math.round(value)}</Text>
                    <Text style={styles.labelText}>DETAIL LEVEL</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    dialContainer: {
        width: DIAL_SIZE,
        height: DIAL_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerText: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        // Carefully positioned to match web
        top: '55%',
    },
    valueText: {
        fontSize: 32,
        fontWeight: 'bold',
        fontFamily: FONTS.monoBold,
    },
    labelText: {
        fontSize: 9,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontFamily: FONTS.mono,
        marginTop: 4,
    }
});

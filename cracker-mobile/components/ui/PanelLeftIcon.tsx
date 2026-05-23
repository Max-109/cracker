import Svg, { Line, Rect } from 'react-native-svg';

interface PanelLeftIconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

export default function PanelLeftIcon({ size = 18, color = '#555555', strokeWidth = 1.8 }: PanelLeftIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Line
                x1="10"
                y1="4"
                x2="10"
                y2="20"
                stroke={color}
                strokeWidth={strokeWidth}
            />
        </Svg>
    );
}

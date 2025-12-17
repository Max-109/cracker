import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
}

function CircularProgress({ 
  progress, 
  size = 48, 
  strokeWidth = 3,
  className,
  showLabel = true,
  labelClassName
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg 
        className="transform -rotate-90" 
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--text-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-150"
        />
      </svg>
      {showLabel && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center text-xs font-bold text-white",
          labelClassName
        )}>
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}

export { CircularProgress }

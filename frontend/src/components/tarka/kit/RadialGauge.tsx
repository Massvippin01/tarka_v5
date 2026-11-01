import React from "react";
import { AnimatedCounter } from "../../ui/forensic-infographics";

export interface RadialGaugeProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  showTicks?: boolean;
  className?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  percentage,
  label,
  sublabel,
  size = 140,
  color = "#10B981",
  strokeWidth = 9,
  showTicks = true,
  className = "",
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 240 degrees (from 150 deg to 390 deg)
  const arcLength = (240 / 360) * circumference;
  const dashOffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div
      className={`radial-gauge ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(150 ${center} ${center})`}
        />

        {/* Dynamic Colored Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(150 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />

        {/* Tick Marks */}
        {showTicks &&
          Array.from({ length: 13 }).map((_, i) => {
            const angle = 150 + i * (240 / 12);
            const rad = (angle * Math.PI) / 180;
            const rInner = radius - 8;
            const rOuter = radius - 3;
            const x1 = center + rInner * Math.cos(rad);
            const y1 = center + rInner * Math.sin(rad);
            const x2 = center + rOuter * Math.cos(rad);
            const y2 = center + rOuter * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#CBD5E1"
                strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
              />
            );
          })}
      </svg>

      {/* Center Percentage Display */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-sans)" }}>
          <AnimatedCounter value={percentage} suffix="%" duration={320} />
        </div>
        {label && (
          <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginTop: "-2px" }}>
            {label}
          </div>
        )}
      </div>

      {sublabel && (
        <div style={{ fontSize: "9.5px", color: "#64748B", fontWeight: 600, marginTop: "-12px", textAlign: "center" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
};


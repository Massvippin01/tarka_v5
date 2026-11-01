import React from "react";

export interface ScaleZone {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface ScaleBarProps {
  min: number;
  max: number;
  value: number;
  unit?: string;
  zones?: ScaleZone[];
  thresholdLine?: { value: number; label: string; color?: string };
  toleranceBand?: { from: number; to: number; label: string };
  isLog?: boolean;
  labelAbove?: string;
  valueBelow?: string;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  min,
  max,
  value,
  unit = "",
  zones = [],
  thresholdLine,
  toleranceBand,
  isLog = false,
  labelAbove,
  valueBelow,
  height = 14,
  className = "",
  style,
}) => {
  const getPct = (val: number) => {
    if (isLog) {
      const logMin = Math.log10(Math.max(min, 1e-12));
      const logMax = Math.log10(Math.max(max, 1e-12));
      const logVal = Math.log10(Math.max(val, 1e-12));
      return Math.min(Math.max(((logVal - logMin) / (logMax - logMin)) * 100, 0), 100);
    }
    return Math.min(Math.max(((val - min) / (max - min)) * 100, 0), 100);
  };

  const valPct = getPct(value);

  return (
    <div
      className={`scale-bar-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        ...style,
      }}
    >
      {/* Label Cleanly Above Band (Never overlaps pin or track) */}
      {(labelAbove || toleranceBand?.label) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#64748B", fontWeight: 700 }}>
          <span>{labelAbove || ""}</span>
          {toleranceBand && (
            <span style={{ color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px", border: "1px solid #A7F3D0" }}>
              {toleranceBand.label}: [{toleranceBand.from}{unit}, +{toleranceBand.to}{unit}]
            </span>
          )}
        </div>
      )}

      {/* The Instrument Track */}
      <div
        style={{
          position: "relative",
          height: `${height}px`,
          background: "#F1F5F9",
          borderRadius: "6px",
          border: "1px solid #CBD5E1",
          overflow: "visible",
        }}
      >
        {/* Shaded Colored Zones */}
        {zones.map((z, idx) => {
          const leftPct = getPct(z.from);
          const rightPct = getPct(z.to);
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${Math.max(rightPct - leftPct, 0)}%`,
                top: 0,
                bottom: 0,
                background: z.color,
                opacity: 0.85,
                borderRadius: idx === 0 ? "5px 0 0 5px" : idx === zones.length - 1 ? "0 5px 5px 0" : "0",
              }}
              title={z.label}
            />
          );
        })}

        {/* Shaded Tolerance Band */}
        {toleranceBand && (
          <div
            style={{
              position: "absolute",
              left: `${getPct(toleranceBand.from)}%`,
              width: `${Math.max(getPct(toleranceBand.to) - getPct(toleranceBand.from), 0)}%`,
              top: 0,
              bottom: 0,
              background: "rgba(16, 185, 129, 0.35)",
              borderLeft: "1px dashed #10B981",
              borderRight: "1px dashed #10B981",
              zIndex: 2,
            }}
          />
        )}

        {/* Threshold Line */}
        {thresholdLine && (
          <div
            style={{
              position: "absolute",
              left: `${getPct(thresholdLine.value)}%`,
              top: "-4px",
              bottom: "-4px",
              width: "2px",
              background: thresholdLine.color || "#DC2626",
              zIndex: 5,
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                background: thresholdLine.color || "#DC2626",
                color: "#FFFFFF",
                fontSize: "7.5px",
                fontWeight: 800,
                padding: "1px 4px",
                borderRadius: "3px",
                whiteSpace: "nowrap",
                marginBottom: "2px",
              }}
            >
              {thresholdLine.label}
            </div>
          </div>
        )}

        {/* Marker Needle Pin with Status Dot */}
        <div
          style={{
            position: "absolute",
            left: `${valPct}%`,
            top: "-3px",
            bottom: "-3px",
            width: "2px",
            background: "#0F172A",
            zIndex: 10,
            transform: "translateX(-50%)",
            transition: "left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Top Pip */}
          <div
            style={{
              position: "absolute",
              top: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4F46E5",
              border: "1.5px solid #FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* Value Below Pin & Axis Extents (Non-overlapping) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "9px",
          color: "#64748B",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{min > 0 ? `+${min}` : min}{unit}</span>
        <span style={{ fontWeight: 800, color: "#0F172A", background: "#EEF2FF", padding: "1px 6px", borderRadius: "3px", border: "1px solid #C7D2FE" }}>
          {valueBelow || `Current: ${value > 0 ? `+${value}` : value}${unit}`}
        </span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );
};

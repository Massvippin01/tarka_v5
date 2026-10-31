import React, { useState, useEffect, useRef, useMemo } from "react";
import { Lock } from "lucide-react";

// ============================================================================
// PRIMITIVE 1: <AnimatedCounter />
// Smooth 320ms spring-interpolated tabular counter
// ============================================================================
export interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  formatIndian?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 320,
  formatIndian = true,
  className = "",
  style,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) startTimeRef.current = currentTime;
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Spring ease-out: 1 - (1 - progress)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  const formattedNum = useMemo(() => {
    const fixed = displayValue.toFixed(decimals);
    if (!formatIndian) return fixed;

    const parts = fixed.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1] ? `.${parts[1]}` : "";

    // Indian numbering formatting (e.g. 5,00,000)
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedInt =
      otherNumbers !== ""
        ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
        : lastThree;

    return `${formattedInt}${decimalPart}`;
  }, [displayValue, decimals, formatIndian]);

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        display: "inline-flex",
        alignItems: "baseline",
        ...style,
      }}
    >
      {prefix}
      {formattedNum}
      {suffix}
    </span>
  );
};

// ============================================================================
// PRIMITIVE 2: <StripeSegmentedBar />
// Multi-Layer Hatched Financial & Telemetry Infographic Bar
// ============================================================================
export interface StripeSegment {
  id: string;
  label: string;
  value: number;
  color?: string;
  isHatched?: boolean;
  isSpecular?: boolean;
  tooltipText?: string;
}

export interface StripeSegmentedBarProps {
  segments: StripeSegment[];
  totalValue?: number;
  thresholdMarker?: {
    value: number;
    label: string;
    sublabel?: string;
    color?: string;
  };
  height?: number;
  showLabels?: boolean;
  currencyPrefix?: string;
  className?: string;
}

export const StripeSegmentedBar: React.FC<StripeSegmentedBarProps> = ({
  segments,
  totalValue,
  thresholdMarker,
  height = 28,
  showLabels = true,
  currencyPrefix = "₹",
  className = "",
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<StripeSegment | null>(null);

  const calculatedTotal = useMemo(() => {
    if (totalValue !== undefined && totalValue > 0) return totalValue;
    return segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0) || 1;
  }, [segments, totalValue]);

  const thresholdPct = useMemo(() => {
    if (!thresholdMarker) return null;
    return Math.min(Math.max((thresholdMarker.value / calculatedTotal) * 100, 0), 100);
  }, [thresholdMarker, calculatedTotal]);

  return (
    <div className={`stripe-segmented-bar-wrapper ${className}`} style={{ width: "100%", position: "relative" }}>
      {/* SVG Pattern Defs */}
      <svg width="0" height="0" style={{ position: "absolute", visibility: "hidden" }}>
        <defs>
          <pattern
            id="stripe-diagonal-hatch-crimson"
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(244, 63, 94, 0.45)" strokeWidth="2.5" />
          </pattern>
          <pattern
            id="stripe-diagonal-hatch-amber"
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="2.5" />
          </pattern>
          <linearGradient id="stripe-solid-emerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="stripe-solid-indigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bar Track Container */}
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          background: "#E2E8F0",
          borderRadius: "8px",
          display: "flex",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
          border: "1px solid #CBD5E1",
        }}
      >
        {segments.map((segment) => {
          const pct = Math.max((segment.value / calculatedTotal) * 100, 0);
          if (pct <= 0) return null;

          const isHatched = segment.isHatched;
          const bgFill = isHatched
            ? segment.color === "amber"
              ? "url(#stripe-diagonal-hatch-amber)"
              : "url(#stripe-diagonal-hatch-crimson)"
            : segment.color || "url(#stripe-solid-emerald)";

          return (
            <div
              key={segment.id}
              onMouseEnter={() => setHoveredSegment(segment)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{
                width: `${pct}%`,
                height: "100%",
                background: bgFill,
                backgroundColor: isHatched
                  ? segment.color === "amber"
                    ? "#FFFBEB"
                    : "#FFF1F2"
                  : undefined,
                borderRight: "2px solid #FFFFFF",
                boxShadow: segment.isSpecular !== false
                  ? "inset 0 1px 0 rgba(255,255,255,0.4)"
                  : undefined,
                transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                position: "relative",
                cursor: "pointer",
              }}
            />
          );
        })}

        {/* Vertical Threshold Marker Line */}
        {thresholdMarker && thresholdPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${thresholdPct}%`,
              top: 0,
              bottom: 0,
              width: "2px",
              background: thresholdMarker.color || "#DC2626",
              boxShadow: "0 0 6px rgba(220, 38, 38, 0.8)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Threshold Marker Pin Callout */}
      {thresholdMarker && thresholdPct !== null && (
        <div
          style={{
            position: "absolute",
            left: `${thresholdPct}%`,
            top: "-20px",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 12,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "8.5px",
              fontWeight: 800,
              color: "#FFFFFF",
              background: thresholdMarker.color || "#DC2626",
              padding: "1px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {thresholdMarker.label}
          </span>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "3.5px solid transparent",
              borderRight: "3.5px solid transparent",
              borderTop: `4px solid ${thresholdMarker.color || "#DC2626"}`,
            }}
          />
        </div>
      )}

      {/* Hover Floating Glassmorphic Tooltip */}
      {hoveredSegment && (
        <div
          style={{
            position: "absolute",
            top: `${height + 6}px`,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(8px)",
            color: "#FFFFFF",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <span style={{ color: hoveredSegment.isHatched ? "#FDA4AF" : "#6EE7B7" }}>
            ● {hoveredSegment.label}:
          </span>
          <span style={{ fontWeight: 800 }}>
            {currencyPrefix}
            {hoveredSegment.value.toLocaleString("en-IN")}
          </span>
          <span style={{ color: "#94A3B8" }}>
            ({((hoveredSegment.value / calculatedTotal) * 100).toFixed(1)}%)
          </span>
          {hoveredSegment.tooltipText && (
            <span style={{ color: "#FDE047", marginLeft: "4px" }}>
              · {hoveredSegment.tooltipText}
            </span>
          )}
        </div>
      )}

      {/* Optional Legend Labels */}
      {showLabels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "5px",
            fontSize: "9.5px",
            color: "#64748B",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {segments.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: s.isHatched ? "#F43F5E" : s.color || "#10B981",
                  display: "inline-block",
                }}
              />
              <span>{s.label}: <strong>{currencyPrefix}{s.value.toLocaleString("en-IN")}</strong></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PRIMITIVE 3: <AnimatedFlowRibbon />
// Live Particle-Stream SVG Bezier Connector with Keyframe Pulse
// ============================================================================
export interface AnimatedFlowRibbonProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  curvature?: number;
  volume?: number;
  isTainted?: boolean;
  isFrozen?: boolean;
  isLeaking?: boolean;
  label?: string;
  id?: string;
}

export const AnimatedFlowRibbon: React.FC<AnimatedFlowRibbonProps> = ({
  x1,
  y1,
  x2,
  y2,
  curvature = 0.5,
  volume = 4,
  isTainted = false,
  isFrozen = false,
  isLeaking = false,
  label,
  id = "ribbon",
}) => {
  const dx = (x2 - x1) * curvature;
  const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  const strokeW = Math.min(Math.max(volume, 2.5), 8);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const gradId = `flowGrad-${id}`;

  return (
    <g className="animated-flow-ribbon-group">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop
            offset="0%"
            stopColor={isFrozen ? "#94A3B8" : isTainted ? "#F43F5E" : "#6366F1"}
          />
          <stop
            offset="100%"
            stopColor={isFrozen ? "#64748B" : isTainted ? "#F59E0B" : "#10B981"}
          />
        </linearGradient>
        <style>{`
          @keyframes ribbonPulseAnim {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -48; }
          }
          .ribbon-pulse-active {
            animation: ribbonPulseAnim 1.4s linear infinite;
          }
          .ribbon-pulse-fast {
            animation: ribbonPulseAnim 0.7s linear infinite;
          }
        `}</style>
      </defs>

      {/* Layer A: Base Smooth Bezier Ribbon */}
      <path
        d={pathData}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        opacity={isFrozen ? 0.35 : 0.85}
      />

      {/* Layer B: Animated Signal Pulse Stream (only active if not frozen) */}
      {!isFrozen && (
        <path
          d={pathData}
          fill="none"
          stroke={isTainted || isLeaking ? "#FFE4E6" : "#ECFDF5"}
          strokeWidth={Math.max(strokeW - 1.5, 1.5)}
          strokeDasharray="6 14"
          strokeLinecap="round"
          className={isLeaking ? "ribbon-pulse-fast" : "ribbon-pulse-active"}
          opacity={0.9}
        />
      )}

      {/* Frozen Shield or Lock Badge Icon directly on the wire */}
      {isFrozen && (
        <g transform={`translate(${midX}, ${midY})`}>
          <circle cx="0" cy="0" r="10" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.5" />
          <g transform="translate(-5, -5)">
            <Lock size={10} color="#F43F5E" />
          </g>
        </g>
      )}

      {/* Wire Label Pill */}
      {label && (
        <g transform={`translate(${midX}, ${midY - 10})`}>
          <rect
            x="-28"
            y="-8"
            width="56"
            height="14"
            rx="4"
            fill={isFrozen ? "#F1F5F9" : isTainted ? "#FFF1F2" : "#EEF2FF"}
            stroke={isFrozen ? "#CBD5E1" : isTainted ? "#FECDD3" : "#C7D2FE"}
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill={isFrozen ? "#64748B" : isTainted ? "#BE123C" : "#4338CA"}
            fontSize="8.5"
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
};

// ============================================================================
// PRIMITIVE 4: <PrecisionVernierGauge />
// Instrument-Grade Caliper & Clock-Drift Oscilloscope Ruler
// ============================================================================
export interface PrecisionVernierGaugeProps {
  min: number;
  max: number;
  value: number;
  feasibleRange?: [number, number];
  unit?: string;
  majorTicks?: number;
  minorTicksPerMajor?: number;
  title?: string;
  statusLabel?: string;
  isSat?: boolean;
  onChange?: (val: number) => void;
  height?: number;
  className?: string;
}

export const PrecisionVernierGauge: React.FC<PrecisionVernierGaugeProps> = ({
  min = -5.0,
  max = 5.0,
  value = 0.0,
  feasibleRange = [-1.2, 0.8],
  unit = "s",
  title,
  statusLabel,
  isSat,
  onChange,
  className = "",
}) => {
  const range = max - min;
  const valuePct = Math.min(Math.max(((value - min) / range) * 100, 0), 100);

  const feasibleLeftPct = Math.min(Math.max(((feasibleRange[0] - min) / range) * 100, 0), 100);
  const feasibleRightPct = Math.min(Math.max(((feasibleRange[1] - min) / range) * 100, 0), 100);
  const feasibleWidthPct = Math.max(feasibleRightPct - feasibleLeftPct, 0);

  const satState = isSat !== undefined ? isSat : value >= feasibleRange[0] && value <= feasibleRange[1];

  return (
    <div
      className={`precision-vernier-gauge ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "8px 12px",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
          {title || `Vernier Feasible Interval: [${feasibleRange[0]}${unit}, +${feasibleRange[1]}${unit}]`}
        </span>
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 800,
            color: satState ? "#059669" : "#DC2626",
            background: satState ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${satState ? "#A7F3D0" : "#FECDD3"}`,
            padding: "1.5px 7px",
            borderRadius: "4px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {statusLabel || (satState ? "TOLERANCE: SAT ✓" : "DRIFT: UNSAT ✗")}
        </span>
      </div>

      {/* The Instrument Vernier Ruler Visual */}
      <div
        style={{
          position: "relative",
          height: "28px",
          background: "#F8FAFC",
          borderRadius: "6px",
          border: "1px solid #CBD5E1",
          overflow: "hidden",
          margin: "4px 0",
        }}
      >
        {/* Shaded Feasible Tolerance Zone */}
        <div
          style={{
            position: "absolute",
            left: `${feasibleLeftPct}%`,
            width: `${feasibleWidthPct}%`,
            top: 0,
            bottom: 0,
            background: "rgba(16, 185, 129, 0.28)",
            borderLeft: "1px dashed #10B981",
            borderRight: "1px dashed #10B981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "7.5px", fontWeight: 800, color: "#047857", letterSpacing: "0.05em", opacity: 0.8 }}>
            ADMISSIBLE BOUND
          </span>
        </div>

        {/* Center Reference Datum (0.0s) */}
        <div
          style={{
            position: "absolute",
            left: `${((0 - min) / range) * 100}%`,
            top: 0,
            bottom: 0,
            width: "1.5px",
            background: "#64748B",
            zIndex: 2,
          }}
        />

        {/* SVG Millimeter Ruler Ticks */}
        <svg width="100%" height="28" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          {Array.from({ length: 41 }, (_, i) => {
            const pct = (i / 40) * 100;
            const isMajor = i % 10 === 0;
            const isMedium = i % 5 === 0 && !isMajor;
            const tickH = isMajor ? 12 : isMedium ? 8 : 4;
            return (
              <line
                key={i}
                x1={`${pct}%`}
                y1="0"
                x2={`${pct}%`}
                y2={tickH}
                stroke={isMajor ? "#475569" : "#94A3B8"}
                strokeWidth={isMajor ? 1.2 : 0.8}
                opacity={0.65}
              />
            );
          })}
        </svg>

        {/* Needle Pin Marker */}
        <div
          style={{
            position: "absolute",
            left: `${valuePct}%`,
            top: 0,
            bottom: 0,
            width: "2px",
            background: satState ? "#059669" : "#DC2626",
            boxShadow: `0 0 6px ${satState ? "rgba(16,185,129,0.8)" : "rgba(220,38,38,0.8)"}`,
            zIndex: 6,
            transform: "translateX(-50%)",
            transition: "left 0.1s ease-out",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: satState ? "#059669" : "#DC2626",
              border: "2px solid #FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* Interactive Invisible Range Slider for live caliper scrubbing */}
        {onChange && (
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "ew-resize",
              zIndex: 10,
              margin: 0,
            }}
            title="Drag to test clock-offset verification across tolerance bounds"
          />
        )}
      </div>

      {/* Vernier Metric Axis Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#64748B",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <span>{min > 0 ? `+${min}` : min}{unit}</span>
        <span style={{ color: "#047857", fontWeight: 700 }}>
          {feasibleRange[0] > 0 ? `+${feasibleRange[0]}` : feasibleRange[0]}{unit}
        </span>
        <span style={{ fontWeight: 800, color: satState ? "#059669" : "#DC2626" }}>
          Δ = {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}{unit} {value === 0 ? "(NTP Sync)" : ""}
        </span>
        <span style={{ color: "#047857", fontWeight: 700 }}>
          +{feasibleRange[1]}{unit}
        </span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );
};

// ============================================================================
// PRIMITIVE 5: <SlidingPillTabs />
// Tactile Sliding White Pill Tabs with Keycap Shortcuts
// ============================================================================
export interface SlidingTabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string;
  shortcut?: string;
}

export interface SlidingPillTabsProps {
  tabs: SlidingTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SlidingPillTabs: React.FC<SlidingPillTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div
      className={`sliding-pill-tabs-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "#F1F5F9",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "2px",
        gap: "2px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "6px",
              border: isActive ? "1px solid rgba(15, 23, 42, 0.08)" : "1px solid transparent",
              background: isActive ? "#FFFFFF" : "transparent",
              color: isActive ? "#0F172A" : "#64748B",
              boxShadow: isActive ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none",
              fontSize: "10.5px",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
              whiteSpace: "nowrap",
            }}
          >
            {Icon && <Icon size={12} color={isActive ? "#4F46E5" : "#64748B"} />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: "8.5px",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: isActive ? "#EEF2FF" : "#E2E8F0",
                  color: isActive ? "#4338CA" : "#64748B",
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
            {tab.shortcut && (
              <kbd
                style={{
                  fontSize: "8px",
                  fontFamily: "var(--font-mono, monospace)",
                  background: isActive ? "#F8FAFC" : "#E2E8F0",
                  border: "1px solid #CBD5E1",
                  borderRadius: "3px",
                  padding: "0 3px",
                  color: "#94A3B8",
                  marginLeft: "2px",
                }}
              >
                {tab.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
};

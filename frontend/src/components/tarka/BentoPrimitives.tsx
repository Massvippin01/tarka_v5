import React from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";

// ============================================================================
// 1. BentoKpiCard
// ============================================================================
export interface BentoKpiCardProps {
  title: string;
  metric: string;
  metricColor?: string;
  delta?: {
    value: string;
    isPositive?: boolean;
    isWarning?: boolean;
    label?: string;
  };
  subtitle: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  onSeeDetails?: () => void;
  sparklineData?: number[];
  className?: string;
}

export const BentoKpiCard: React.FC<BentoKpiCardProps> = ({
  title,
  metric,
  metricColor,
  delta,
  subtitle,
  icon: Icon,
  iconColor = "#4F46E5",
  iconBg = "var(--bento-indigo-subtle)",
  onSeeDetails,
  sparklineData = [24, 28, 22, 35, 42, 38, 52, 60],
  className = "",
}) => {
  // Generate simple sparkline SVG path
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal || 1;
  const width = 80;
  const height = 30;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className={`bento-card ${className}`} style={{ minHeight: "148px", justifyContent: "space-between" }}>
      {/* Top Header Row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={iconColor} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-secondary)", letterSpacing: "-0.1px" }}>
              {title}
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--bento-text-muted)", marginTop: "1px" }}>
              {subtitle}
            </div>
          </div>
        </div>

        {onSeeDetails && (
          <button
            type="button"
            onClick={onSeeDetails}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--bento-indigo)",
              padding: "2px 4px",
            }}
          >
            <span>Details</span>
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Main Metric & Bottom Trends */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "14px" }}>
        <div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.6px",
              lineHeight: 1.1,
              color: metricColor || "var(--bento-text-primary)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {metric}
          </div>

          {delta && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
              <span
                className={`bento-badge ${
                  delta.isWarning
                    ? "badge-crimson"
                    : delta.isPositive
                    ? "badge-emerald"
                    : "badge-slate"
                }`}
                style={{ fontSize: "10px", padding: "2px 7px" }}
              >
                {delta.isPositive ? <ArrowUpRight size={11} /> : delta.isWarning ? <ArrowDownRight size={11} /> : null}
                <span>{delta.value}</span>
              </span>
              {delta.label && (
                <span style={{ fontSize: "10.5px", color: "var(--bento-text-muted)" }}>
                  {delta.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mini SVG Sparkline */}
        <div style={{ width: `${width}px`, height: `${height}px`, opacity: 0.85 }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
            <polyline
              fill="none"
              stroke={delta?.isWarning ? "var(--bento-crimson)" : "var(--bento-indigo)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. HatchedBarChart (Pure SVG with <pattern id="bentoDiagonalHatch">)
// ============================================================================
export interface HatchedBarItem {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  sublabel?: string;
  isHatched?: boolean;
  isAccent?: boolean;
  color?: string;
  callout?: string;
}

export interface HatchedBarChartProps {
  title?: string;
  subtitle?: string;
  bars: HatchedBarItem[];
  maxScaleValue?: number;
  height?: number;
  className?: string;
}

export const HatchedBarChart: React.FC<HatchedBarChartProps> = ({
  title,
  subtitle,
  bars,
  maxScaleValue,
  height = 190,
  className = "",
}) => {
  const maxVal = maxScaleValue || Math.max(...bars.map((b) => b.value), 1);
  const chartHeight = height - 40;
  const barWidth = 38;
  const barGap = 24;
  const totalWidth = bars.length * barWidth + (bars.length - 1) * barGap + 60;

  return (
    <div className={`bento-card ${className}`} style={{ padding: "18px 20px" }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: "16px" }}>
          {title && <div className="bento-card-title">{title}</div>}
          {subtitle && <div className="bento-card-subtitle">{subtitle}</div>}
        </div>
      )}

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${Math.max(totalWidth, 380)} ${height}`}
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Diagonal Hatch Pattern for Unverified / Claim / Initial Candidate Bars */}
            <pattern id="bentoDiagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(225, 29, 72, 0.45)" strokeWidth="3" />
            </pattern>
            <pattern id="bentoDiagonalHatchSlate" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="2.5" />
            </pattern>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((pct) => {
            const y = chartHeight - pct * (chartHeight - 30);
            return (
              <g key={pct}>
                <line
                  x1="10"
                  y1={y}
                  x2={Math.max(totalWidth, 380)}
                  y2={y}
                  stroke="var(--bento-card-border)"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

          {/* Render Bars */}
          {bars.map((bar, idx) => {
            const x = 20 + idx * (barWidth + barGap);
            const barH = Math.max(((bar.value / maxVal) * (chartHeight - 35)), 6);
            const y = chartHeight - barH;
            const fill = bar.isHatched
              ? "url(#bentoDiagonalHatch)"
              : bar.isAccent
              ? (bar.color || "var(--bento-indigo)")
              : "rgba(100, 116, 139, 0.25)";

            return (
              <g key={bar.id}>
                {/* Floating Callout Pill */}
                {bar.callout && (
                  <g transform={`translate(${x + barWidth / 2}, ${y - 14})`}>
                    <rect
                      x="-38"
                      y="-16"
                      width="76"
                      height="18"
                      rx="9"
                      fill={bar.isAccent ? "var(--bento-indigo)" : "var(--bento-crimson)"}
                    />
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {bar.callout}
                    </text>
                  </g>
                )}

                {/* The Bar Rect */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  fill={fill}
                  stroke={bar.isHatched ? "var(--bento-crimson)" : bar.isAccent ? "none" : "var(--bento-card-border)"}
                  strokeWidth={bar.isHatched ? 1.5 : 1}
                />

                {/* Formatted Top Value */}
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fill="var(--bento-text-primary)"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {bar.formattedValue}
                </text>

                {/* X-axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fill="var(--bento-text-secondary)"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                >
                  {bar.label}
                </text>
                {bar.sublabel && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 28}
                    textAnchor="middle"
                    fill="var(--bento-text-muted)"
                    fontSize="9"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {bar.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SemiCircleGauge (18-Segment Precision Judicial Arc)
// ============================================================================
export interface SemiCircleGaugeProps {
  percentage: number;
  label: string;
  sublabel?: string;
  summaryText?: string;
  color?: string;
  segments?: number;
  size?: number;
  className?: string;
}

export const SemiCircleGauge: React.FC<SemiCircleGaugeProps> = ({
  percentage,
  label,
  sublabel,
  summaryText,
  color = "var(--bento-emerald)",
  segments = 18,
  size = 200,
  className = "",
}) => {
  const activeSegments = Math.round((percentage / 100) * segments);
  const radius = size * 0.42;
  const strokeWidth = 10;
  const center = size / 2;

  // Arc angles (from -180 deg to 0 deg)
  const segmentAngle = 180 / segments;

  return (
    <div className={`bento-card ${className}`} style={{ alignItems: "center", textAlign: "center", padding: "18px" }}>
      <div style={{ position: "relative", width: `${size}px`, height: `${size * 0.58}px` }}>
        <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
          {Array.from({ length: segments }).map((_, idx) => {
            const startAngle = 180 + idx * segmentAngle + 1.5;
            const endAngle = 180 + (idx + 1) * segmentAngle - 1.5;
            const toRad = (deg: number) => (deg * Math.PI) / 180;

            const x1 = center + radius * Math.cos(toRad(startAngle));
            const y1 = center + radius * Math.sin(toRad(startAngle));
            const x2 = center + radius * Math.cos(toRad(endAngle));
            const y2 = center + radius * Math.sin(toRad(endAngle));

            const isLit = idx < activeSegments;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={isLit ? color : "var(--bento-card-border)"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center Percentage Display */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "var(--bento-text-primary)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1,
            }}
          >
            {percentage.toFixed(1)}%
          </div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary)", marginTop: "4px" }}>
            {label}
          </div>
        </div>
      </div>

      {sublabel && (
        <div style={{ fontSize: "11px", color: "var(--bento-text-muted)", marginTop: "4px" }}>
          {sublabel}
        </div>
      )}

      {summaryText && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: "var(--bento-canvas-subtle)",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--bento-text-secondary)",
            width: "100%",
          }}
        >
          {summaryText}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. SegmentedPillSwitcher
// ============================================================================
export interface SegmentedPillItem {
  id: string;
  label: string;
  badge?: string;
}

export interface SegmentedPillSwitcherProps {
  options: SegmentedPillItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SegmentedPillSwitcher: React.FC<SegmentedPillSwitcherProps> = ({
  options,
  activeId,
  onChange,
  className = "",
}) => {
  return (
    <div className={`bento-pill-group ${className}`}>
      {options.map((opt) => {
        const isActive = activeId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`bento-pill-btn ${isActive ? "active" : ""}`}
          >
            <span>{opt.label}</span>
            {opt.badge && (
              <span
                style={{
                  marginLeft: "4px",
                  fontSize: "9px",
                  padding: "1px 4px",
                  borderRadius: "4px",
                  background: isActive ? "var(--bento-indigo-subtle)" : "rgba(148, 163, 184, 0.2)",
                  color: isActive ? "var(--bento-indigo)" : "var(--bento-text-muted)",
                }}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};


import React from "react";

// ============================================================================
// 1. BentoKpiCard — Compact FlowMail / ReUI Daylight Card (96px, #09090B Hero)
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
  statusBadge?: {
    text: string;
    variant?: "emerald" | "rose" | "indigo" | "amber" | "slate" | "purple";
  };
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  onSeeDetails?: () => void;
  sparklineData?: number[];
  className?: string;
  meta?: string;
}

const statusBadgeStyles = {
  emerald: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  rose: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
  indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  amber: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  slate: { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  purple: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

export const BentoKpiCard: React.FC<BentoKpiCardProps> = ({
  title,
  metric,
  delta,
  statusBadge,
  subtitle,
  icon: Icon,
  iconColor = "#4F46E5",
  iconBg = "#EEF2FF",
  className = "",
  meta,
}) => {
  // Determine badge styling and text
  const badgeText = statusBadge?.text || delta?.value || "";
  const badgeVariant = statusBadge?.variant || (delta?.isWarning ? "rose" : delta?.isPositive ? "emerald" : "indigo");
  const badgeStyle = statusBadgeStyles[badgeVariant] || statusBadgeStyles.emerald;

  // Determine top-right meta tag
  const rightMeta = meta || delta?.label || (subtitle && subtitle.length <= 32 ? subtitle : "");

  return (
    <div
      className={`bento-card ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "14px 18px",
        height: "96px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Row 1 (Top): Icon + Title & Top-Right Muted Meta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={15} color={iconColor} strokeWidth={2.2} />
          </div>
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#475569",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>

        {rightMeta && (
          <span
            style={{
              fontSize: "11px",
              color: "#94A3B8",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {rightMeta}
          </span>
        )}
      </div>

      {/* Row 2 (Bottom): Hero Value in #09090B + Single-Line Semantic Pill Badge */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", width: "100%" }}>
        <span
          style={{
            fontSize: metric.length > 15 ? "18px" : metric.length > 11 ? "20px" : "24px",
            fontWeight: 800,
            color: "#09090B",
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1,
            fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
          }}
          title={metric}
        >
          {metric}
        </span>

        {badgeText && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
              fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {badgeText}
          </span>
        )}
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
// 2B. SalezyHatchedBarChart (Suspect Receipt vs SBI CBS Discrepancy)
// ============================================================================
export interface SalezyHatchedBarChartProps {
  claimedAmount?: number;
  settledAmount?: number;
  claimedLabel?: string;
  settledLabel?: string;
  height?: number;
  className?: string;
}

export const SalezyHatchedBarChart: React.FC<SalezyHatchedBarChartProps> = ({
  claimedAmount = 15000,
  settledAmount = 215000,
  claimedLabel = "Claimed Receipt",
  settledLabel = "SBI CBS Settled",
  height = 190,
  className = "",
}) => {
  const maxVal = Math.max(claimedAmount, settledAmount, 220000);
  const chartHeight = height - 44;
  const barWidth = 48;
  const leftX = 54;
  const rightX = 186;

  const leftBarH = Math.max((claimedAmount / maxVal) * (chartHeight - 40), 12);
  const leftY = chartHeight - leftBarH;

  const rightBarH = Math.max((settledAmount / maxVal) * (chartHeight - 40), 20);
  const rightY = chartHeight - rightBarH;

  const diffAmount = settledAmount - claimedAmount;

  return (
    <div className={className} style={{ width: "100%", height: `${height}px`, position: "relative" }}>
      <svg width="100%" height={height} viewBox="0 0 300 190" preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
        <defs>
          <pattern id="salezyHatchSlate" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#E11D48" strokeWidth="2" opacity="0.45" />
          </pattern>
          <linearGradient id="solidSettledGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#3730A3" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 35);
          return (
            <g key={i}>
              <line x1="16" y1={y} x2="284" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x="14" y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="8.5" fontFamily="'JetBrains Mono', monospace">
                {i === 0 ? "0" : i === 1 ? "1L" : "2L"}
              </text>
            </g>
          );
        })}

        {/* Left Bar: Suspect Claimed Receipt (Hatched) */}
        <g>
          <rect
            x={leftX}
            y={leftY}
            width={barWidth}
            height={leftBarH}
            rx="7"
            fill="#FFE4E6"
            stroke="#FECDD3"
            strokeWidth="1"
          />
          <rect
            x={leftX}
            y={leftY}
            width={barWidth}
            height={leftBarH}
            rx="7"
            fill="url(#salezyHatchSlate)"
          />
          <text
            x={leftX + barWidth / 2}
            y={leftY - 6}
            textAnchor="middle"
            fill="#BE123C"
            fontSize="11"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
          >
            ₹15k
          </text>
          <text
            x={leftX + barWidth / 2}
            y={chartHeight + 15}
            textAnchor="middle"
            fill="#BE123C"
            fontSize="10"
            fontWeight="700"
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
            {claimedLabel}
          </text>
          <text
            x={leftX + barWidth / 2}
            y={chartHeight + 27}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="8.5"
            fontFamily="'JetBrains Mono', monospace"
          >
            Tier 3
          </text>
        </g>

        {/* Right Bar: SBI Central CBS Ledger (Solid Indigo) */}
        <g>
          <rect
            x={rightX}
            y={rightY}
            width={barWidth}
            height={rightBarH}
            rx="7"
            fill="url(#solidSettledGrad)"
            stroke="#4338CA"
            strokeWidth="1"
          />
          <text
            x={rightX + barWidth / 2}
            y={rightY - 6}
            textAnchor="middle"
            fill="#4F46E5"
            fontSize="11"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
          >
            ₹2.15L
          </text>
          <text
            x={rightX + barWidth / 2}
            y={chartHeight + 15}
            textAnchor="middle"
            fill="#0F172A"
            fontSize="10"
            fontWeight="700"
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
            {settledLabel}
          </text>
          <text
            x={rightX + barWidth / 2}
            y={chartHeight + 27}
            textAnchor="middle"
            fill="#059669"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
          >
            Tier 1
          </text>
        </g>

        {/* Floating Callout Badge connecting the gap */}
        <g transform={`translate(${(leftX + rightX + barWidth) / 2}, ${Math.min(leftY, rightY) + 12})`}>
          <rect
            x="-48"
            y="-12"
            width="96"
            height="22"
            rx="6"
            fill="#E11D48"
            style={{ filter: "drop-shadow(0 2px 5px rgba(225,29,72,0.35))" }}
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
          >
            +₹{(diffAmount / 100000).toFixed(2)}L Hidden
          </text>
        </g>
      </svg>
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
  color = "#059669",
  segments = 18,
  size = 220,
  className = "",
}) => {
  const activeSegments = Math.round((percentage / 100) * segments);
  const radius = size * 0.40;
  const strokeWidth = 11;
  const center = size / 2;

  // Arc angles (from -180 deg to 0 deg)
  const segmentAngle = 180 / segments;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "10px 14px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", width: `${size}px`, height: `${size * 0.52 + 10}px`, margin: "0 auto" }}>
        <svg width={size} height={size * 0.55} viewBox={`0 0 ${size} ${size * 0.55}`} style={{ overflow: "visible" }}>
          {Array.from({ length: segments }).map((_, idx) => {
            const startAngle = 180 + idx * segmentAngle + 1.8;
            const endAngle = 180 + (idx + 1) * segmentAngle - 1.8;
            const toRad = (deg: number) => (deg * Math.PI) / 180;

            const x1 = center + radius * Math.cos(toRad(startAngle));
            const y1 = center + radius * Math.sin(toRad(startAngle));
            const x2 = center + radius * Math.cos(toRad(endAngle));
            const y2 = center + radius * Math.sin(toRad(endAngle));

            const isLit = idx < activeSegments;
            // Gradient effect matching Salezy gauge: lighter blue/emerald to deep vibrant
            const litColor = color === "#059669"
              ? `rgb(${Math.round(16 + (idx / segments) * 5)}, ${Math.round(185 - (idx / segments) * 35)}, ${Math.round(129 - (idx / segments) * 24)})`
              : color;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={isLit ? litColor : "#E2E8F0"}
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
            bottom: "0px",
            left: "-20px",
            right: "-20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "#0F172A",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1,
            }}
          >
            {percentage.toFixed(1)}%
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#64748B",
              marginTop: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </div>
      </div>

      {sublabel && (
        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px", fontWeight: 600 }}>
          {sublabel}
        </div>
      )}

      {summaryText && (
        <div
          style={{
            marginTop: "10px",
            padding: "6px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 700,
            color: percentage >= 100 ? "#047857" : "#B45309",
            width: "100%",
            maxWidth: "280px",
            boxSizing: "border-box",
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

// ============================================================================
// 7. ReUI Micro-Primitives (Daylight Double-Bezel Precision Architecture)
// ============================================================================

export interface ReuiStatusBadgeProps {
  text: string;
  variant?: "emerald" | "rose" | "amber" | "indigo";
  className?: string;
  dot?: boolean;
}

export const ReuiStatusBadge: React.FC<ReuiStatusBadgeProps> = ({
  text,
  variant = "emerald",
  className = "",
  dot = true,
}) => {
  return (
    <span className={`reui-status-badge ${variant} ${className}`}>
      {dot && <span className="dot" />}
      <span>{text}</span>
    </span>
  );
};

export interface ReuiSegmentedTabsProps {
  options: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const ReuiSegmentedTabs: React.FC<ReuiSegmentedTabsProps> = ({
  options,
  activeId,
  onChange,
  className = "",
}) => {
  return (
    <div className={`reui-segmented-tabs ${className}`}>
      {options.map((opt) => {
        const isActive = activeId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`reui-tab-btn ${isActive ? "active" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export interface ReuiKbdProps {
  children: React.ReactNode;
  className?: string;
}

export const ReuiKbd: React.FC<ReuiKbdProps> = ({ children, className = "" }) => {
  return <kbd className={`reui-kbd ${className}`}>{children}</kbd>;
};

export interface ReuiDoubleBezelCardProps {
  title: React.ReactNode;
  icon?: React.ElementType;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const ReuiDoubleBezelCard: React.FC<ReuiDoubleBezelCardProps> = ({
  title,
  icon: Icon,
  headerRight,
  footer,
  children,
  className = "",
  bodyStyle,
  style,
}) => {
  return (
    <div className={`reui-card-well ${className}`} style={style}>
      <div className="reui-well-header">
        <div className="reui-well-title">
          {Icon && <Icon size={14} color="#71717A" strokeWidth={2.2} />}
          <span>{title}</span>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>

      <div className="reui-card-body" style={bodyStyle}>
        {children}
      </div>

      {footer && <div className="reui-well-footer">{footer}</div>}
    </div>
  );
};



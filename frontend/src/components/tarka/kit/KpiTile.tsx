import React from "react";
import type { LucideIcon } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatedCounter } from "../../ui/forensic-infographics";

export interface KpiTileProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  statusBadge?: {
    text: string;
    variant: "emerald" | "rose" | "amber" | "indigo" | "slate";
    dot?: boolean;
  };
  subtitle?: string;
  sublabel?: string;
  microVisual?: "ring" | "spark" | "gauge" | "none";
  progressPct?: number;
  sparklineData?: number[];
  provenanceTooltip?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  title,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  iconColor = "#4F46E5",
  iconBg = "#EEF2FF",
  statusBadge,
  subtitle,
  microVisual = "ring",
  progressPct = 100,
  provenanceTooltip,
  className = "",
  style,
}) => {
  const isNumber = typeof value === "number";

  const badgeColors = {
    emerald: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
    rose: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
    amber: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
    indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    slate: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  };

  const badgeStyle = statusBadge
    ? badgeColors[statusBadge.variant] || badgeColors.slate
    : badgeColors.slate;

  return (
    <div
      className={`kpi-tile group ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "8px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        minHeight: "68px",
        maxHeight: "76px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
    >
      {/* Left: Icon & Metric Content */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 0%" }}>
        {/* Icon Well */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <Icon size={18} color={iconColor} strokeWidth={2.2} />
        </div>

        {/* Text Stack */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Header Row: Full Untruncated Label & Provenance Tooltip */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={title}
            >
              {title}
            </span>
            {provenanceTooltip && (
              <Tooltip.Provider delayDuration={150}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#94A3B8",
                        cursor: "help",
                        lineHeight: 1,
                      }}
                    >
                      ⓘ
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      sideOffset={4}
                      style={{
                        background: "#0F172A",
                        color: "#FFFFFF",
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        maxWidth: "220px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        zIndex: 9999,
                      }}
                    >
                      {provenanceTooltip}
                      <Tooltip.Arrow style={{ fill: "#0F172A" }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>

          {/* Numeral Value Row */}
          <div
            style={{
              fontSize: "19px",
              fontWeight: 800,
              color: "#0F172A",
              fontFamily: "var(--font-sans)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.2,
              display: "flex",
              alignItems: "baseline",
              gap: "2px",
              whiteSpace: "nowrap",
            }}
          >
            {isNumber ? (
              <AnimatedCounter value={value as number} prefix={prefix} suffix={suffix} duration={280} />
            ) : (
              <span>
                {prefix}
                {value}
                {suffix}
              </span>
            )}
          </div>

          {/* Optional Subtitle */}
          {subtitle && (
            <span style={{ fontSize: "9px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: Status Badge & Micro Visual */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        {statusBadge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "9.5px",
              fontWeight: 700,
              padding: "1.5px 6px",
              borderRadius: "4px",
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {statusBadge.dot && (
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: badgeStyle.text,
                }}
              />
            )}
            {statusBadge.text}
          </span>
        )}

        {/* 24px Micro-Visual Progress Ring */}
        {microVisual === "ring" && (
          <div style={{ position: "relative", width: "22px", height: "22px" }}>
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle
                cx="11"
                cy="11"
                r="9"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              <circle
                cx="11"
                cy="11"
                r="9"
                fill="none"
                stroke={iconColor}
                strokeWidth="2"
                strokeDasharray={`${(progressPct / 100) * 56.5} 56.5`}
                strokeLinecap="round"
                transform="rotate(-90 11 11)"
                style={{ transition: "stroke-dasharray 0.35s ease" }}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

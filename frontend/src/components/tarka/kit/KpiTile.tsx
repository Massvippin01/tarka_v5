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
  disabled?: boolean;
  isLoading?: boolean;
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
  onClick,
  disabled = false,
  isLoading = false,
  className = "",
  style,
}) => {
  const isNumber = typeof value === "number";

  if (isLoading) {
    return (
      <div
        className={`kpi-tile-skeleton animate-pulse ${className}`}
        style={{
          background: "var(--reui-card-bg, #0F1B2E)",
          border: "1px solid var(--reui-border-strong, rgba(255, 255, 255, 0.08))",
          borderRadius: "12px",
          padding: "8px 12px",
          minHeight: "68px",
          maxHeight: "76px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "rgba(255, 255, 255, 0.08)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            <div style={{ width: "60%", height: "10px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px" }} />
            <div style={{ width: "40%", height: "18px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px" }} />
          </div>
        </div>
      </div>
    );
  }

  const badgeColors = {
    emerald: { bg: "rgba(16, 185, 129, 0.16)", text: "#34D399", border: "rgba(16, 185, 129, 0.35)" },
    rose: { bg: "rgba(244, 63, 94, 0.16)", text: "#FB7185", border: "rgba(244, 63, 94, 0.35)" },
    amber: { bg: "rgba(245, 158, 11, 0.16)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.35)" },
    indigo: { bg: "rgba(6, 182, 212, 0.16)", text: "#22D3EE", border: "rgba(34, 211, 238, 0.35)" },
    slate: { bg: "rgba(255, 255, 255, 0.06)", text: "#94A3B8", border: "rgba(255, 255, 255, 0.10)" },
  };

  const badgeStyle = statusBadge
    ? badgeColors[statusBadge.variant] || badgeColors.slate
    : badgeColors.slate;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-disabled={disabled}
      className={`kpi-tile group ${
        onClick && !disabled
          ? "cursor-pointer hover:border-cyan-400 hover:shadow-md active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          : ""
      } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
      style={{
        background: "var(--reui-card-bg, #0F1B2E)",
        border: "1px solid var(--reui-border-strong, rgba(255, 255, 255, 0.08))",
        borderRadius: "12px",
        padding: "8px 12px",
        boxShadow: "0 4px 18px -2px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        minHeight: "68px",
        maxHeight: "76px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
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
            border: "1px solid rgba(255, 255, 255, 0.08)",
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
                color: "var(--reui-text-secondary, #94A3B8)",
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
                      role="img"
                      aria-label="Provenance Information"
                      style={{
                        fontSize: "9px",
                        cursor: "help",
                        opacity: 0.8,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      ℹ️
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      sideOffset={4}
                      style={{
                        background: "#132238",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#FFFFFF",
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        maxWidth: "220px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                        zIndex: 9999,
                      }}
                    >
                      {provenanceTooltip}
                      <Tooltip.Arrow style={{ fill: "#132238" }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>

          {/* Numeral Value Row */}
          <div
            data-testid="kpi-value"
            style={{
              fontSize: isNumber ? "clamp(15px, 1.4vw, 19px)" : "clamp(12px, 1.1vw, 14px)",
              fontWeight: 800,
              color: "var(--reui-text-strong, #FFFFFF)",
              fontFamily: "var(--font-sans)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.25,
              display: "flex",
              alignItems: "baseline",
              gap: "2px",
              whiteSpace: "normal",
              wordBreak: "break-word",
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
            <span style={{ fontSize: "9px", color: "var(--reui-text-muted, #64748B)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

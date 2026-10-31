import React from "react";
import NumberFlow from "@number-flow/react";
import { type LucideIcon, Info } from "lucide-react";
import * as HoverCard from "@radix-ui/react-hover-card";

export interface IntakeKpiCardProps {
  title: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  heroText?: string;
  pillText: string;
  pillVariant: "emerald" | "indigo" | "rose" | "amber" | "purple";
  metaText: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  tooltipText?: string;
  onClick?: () => void;
  active?: boolean;
}

const pillVariantStyles: Record<
  IntakeKpiCardProps["pillVariant"],
  { bg: string; color: string; border: string }
> = {
  emerald: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  indigo: { bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" },
  rose: { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
  amber: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  purple: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
};

export const IntakeKpiCard: React.FC<IntakeKpiCardProps> = ({
  title,
  numericValue,
  prefix = "",
  suffix = "",
  heroText,
  pillText,
  pillVariant,
  metaText,
  icon: Icon,
  iconColor,
  iconBg,
  tooltipText,
  onClick,
  active = false,
}) => {
  const pStyle = pillVariantStyles[pillVariant] || pillVariantStyles.emerald;

  return (
    <div
      onClick={onClick}
      data-card="kpi-card"
      className="bento-card"
      style={{
        height: "80px",
        minHeight: "80px",
        maxHeight: "80px",
        padding: "8px 12px",
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: active ? "1px solid #4F46E5" : "1px solid #E2E8F0",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: active
          ? "0 0 0 2px rgba(79, 70, 229, 0.2), 0 1px 3px rgba(15, 23, 42, 0.04)"
          : "0 1px 2px rgba(15, 23, 42, 0.03)",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "all 0.15s ease",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* Top Row: Icon Well + Full Label + Info HoverCard + Status Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: "6px",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "5px",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={12} color={iconColor} strokeWidth={2.4} />
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#334155",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>

          {/* Info HoverCard for Sub-label & Metadata */}
          <HoverCard.Root openDelay={150} closeDelay={100}>
            <HoverCard.Trigger asChild>
              <button
                type="button"
                aria-label={`Detailed forensic metadata for ${title}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "1px",
                  cursor: "help",
                  display: "inline-flex",
                  alignItems: "center",
                  color: "#94A3B8",
                  flexShrink: 0,
                }}
              >
                <Info size={11} />
              </button>
            </HoverCard.Trigger>
            <HoverCard.Portal>
              <HoverCard.Content
                side="top"
                align="center"
                sideOffset={4}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  fontSize: "10px",
                  color: "#0F172A",
                  zIndex: 9999,
                  maxWidth: "220px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>{title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#64748B", marginBottom: "4px" }}>
                  {metaText}
                </div>
                {tooltipText && <div style={{ fontSize: "9.5px", color: "#475569" }}>{tooltipText}</div>}
                <HoverCard.Arrow style={{ fill: "#FFFFFF" }} />
              </HoverCard.Content>
            </HoverCard.Portal>
          </HoverCard.Root>
        </div>

        {/* Status Pill */}
        <span
          style={{
            fontSize: "8.5px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            background: pStyle.bg,
            color: pStyle.color,
            border: `1px solid ${pStyle.border}`,
            padding: "1.5px 5px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {pillText}
        </span>
      </div>

      {/* Second Row: Hero Number Value */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          width: "100%",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontSize: "20px",
            fontWeight: 800,
            fontFamily: "var(--font-sans)",
            color: "#09090B",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {heroText ? (
            <span>{heroText}</span>
          ) : numericValue !== undefined ? (
            <span style={{ display: "inline-flex", alignItems: "baseline" }}>
              {prefix && <span>{prefix}</span>}
              <NumberFlow value={numericValue} />
              {suffix && <span style={{ fontSize: "14px", fontWeight: 700, marginLeft: "2px", color: "#64748B" }}>{suffix}</span>}
            </span>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );
};

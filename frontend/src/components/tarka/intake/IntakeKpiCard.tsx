import React from "react";
import NumberFlow from "@number-flow/react";
import { type LucideIcon, Info } from "lucide-react";

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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="bento-card"
      style={{
        height: "96px",
        minHeight: "96px",
        maxHeight: "96px",
        padding: "9px 12px",
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: active ? "1px solid #6366F1" : "1px solid #E2E8F0",
        borderRadius: "14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: active
          ? "0 0 0 2px rgba(99, 102, 241, 0.2), 0 1px 3px rgba(15, 23, 42, 0.04)"
          : "0 1px 3px rgba(15, 23, 42, 0.03)",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        userSelect: "none",
        transition: "all 0.15s ease",
      }}
    >
      {/* Top Row: Icon + Title + Pill */}
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
              width: "19px",
              height: "19px",
              borderRadius: "5px",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={11.5} color={iconColor} strokeWidth={2.4} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#475569",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={title}
          >
            {title}
          </span>
          {tooltipText && (
            <span
              title={tooltipText}
              style={{
                color: "#94A3B8",
                display: "inline-flex",
                alignItems: "center",
                cursor: "help",
                flexShrink: 0,
              }}
            >
              <Info size={10} />
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "1.5px 5px",
            borderRadius: "4px",
            background: pStyle.bg,
            color: pStyle.color,
            border: `1px solid ${pStyle.border}`,
            whiteSpace: "nowrap",
            flexShrink: 0,
            lineHeight: 1.2,
          }}
        >
          {pillText}
        </span>
      </div>

      {/* Center Row: Hero Value strictly #09090B font-weight 800 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "3px",
          margin: "auto 0",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {heroText ? (
          <span
            style={{
              fontSize: "19.5px",
              fontWeight: 800,
              color: "#09090B",
              letterSpacing: "-0.025em",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={heroText}
          >
            {heroText}
          </span>
        ) : typeof numericValue === "number" ? (
          <div
            style={{
              fontSize: "19.5px",
              fontWeight: 800,
              color: "#09090B",
              letterSpacing: "-0.025em",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.1,
              display: "flex",
              alignItems: "baseline",
            }}
          >
            {prefix && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "15px",
                  color: "#475569",
                  marginRight: "2px",
                }}
              >
                {prefix}
              </span>
            )}
            <NumberFlow
              value={numericValue}
              format={{ maximumFractionDigits: 2, minimumFractionDigits: 0 }}
            />
            {suffix && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  marginLeft: "4px",
                  fontWeight: 600,
                }}
              >
                {suffix}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Row: Subtitle / Meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#64748B",
          fontFamily: "var(--font-mono)",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={metaText}>
          {metaText}
        </span>
      </div>
    </div>
  );
};

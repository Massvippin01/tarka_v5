import React from "react";

export interface SaasKpiCardProps {
  label: string;
  metric: string;
  metricColor?: string;
  subtext: string;
  statusBadge: {
    text: string;
    variant: "emerald" | "rose" | "indigo" | "amber" | "slate";
  };
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
}

const variantStyles = {
  emerald: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  rose: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
  indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  amber: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  slate: { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
};

export const SaasExecutiveKpiCard: React.FC<SaasKpiCardProps> = ({
  label,
  metric,
  metricColor = "#0F172A",
  subtext,
  statusBadge,
  icon: Icon,
  iconColor = "#4F46E5",
  iconBg = "#EEF2FF",
}) => {
  const vStyle = variantStyles[statusBadge.variant] || variantStyles.slate;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "14px 18px",
        boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "108px",
        boxSizing: "border-box",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
    >
      {/* Top Row: Icon Badge + Category Label on Left, Status Pill on Right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            {label}
          </span>
        </div>

        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "6px",
            background: vStyle.bg,
            color: vStyle.text,
            border: `1px solid ${vStyle.border}`,
            fontFamily: "var(--font-mono)",
            letterSpacing: "-0.2px",
          }}
        >
          {statusBadge.text}
        </span>
      </div>

      {/* Middle Row: Hero Number with Dynamic Font Sizing to Prevent Multi-Line Wrapping */}
      <div
        style={{
          fontSize:
            metric.length > 16
              ? "18px"
              : metric.length > 12
              ? "22px"
              : metric.length > 8
              ? "25px"
              : "28px",
          fontWeight: 800,
          color: metricColor,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          margin: "6px 0 2px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={metric}
      >
        {metric}
      </div>

      {/* Bottom Row: 1-line plain-English context */}
      <div
        style={{
          fontSize: "12px",
          color: "#64748B",
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subtext}
      </div>
    </div>
  );
};


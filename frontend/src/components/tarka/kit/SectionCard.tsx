import React from "react";
import type { LucideIcon } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  badgeText?: string;
  badgeVariant?: "emerald" | "rose" | "amber" | "indigo" | "slate";
  provenanceTooltip?: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  noPadding?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = "#4F46E5",
  iconBg = "#EEF2FF",
  badgeText,
  badgeVariant = "indigo",
  provenanceTooltip,
  actionSlot,
  children,
  className = "",
  style,
  bodyStyle,
  noPadding = false,
}) => {
  const badgeStyles = {
    emerald: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
    rose: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
    amber: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
    indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    slate: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  };

  const badgeColor = badgeStyles[badgeVariant] || badgeStyles.indigo;

  return (
    <section
      className={`section-card ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03), 0 4px 12px -2px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {/* Header Bar (38px-42px) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid #F1F5F9",
          flexShrink: 0,
          background: "#FFFFFF",
        }}
      >
        {/* Left: Icon, Title & Provenance Tooltip */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {Icon && (
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={13} color={iconColor} strokeWidth={2.2} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#0F172A",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </span>

              {badgeText && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background: badgeColor.bg,
                    color: badgeColor.text,
                    border: `1px solid ${badgeColor.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badgeText}
                </span>
              )}

              {provenanceTooltip && (
                <Tooltip.Provider delayDuration={150}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        style={{
                          fontSize: "10px",
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
                          maxWidth: "260px",
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

            {subtitle && (
              <span style={{ fontSize: "9px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {actionSlot && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {actionSlot}
          </div>
        )}
      </div>

      {/* Body Slot (Fills Remaining Height) */}
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          padding: noPadding ? 0 : "12px 14px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </section>
  );
};

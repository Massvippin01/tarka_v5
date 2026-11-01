import React from "react";
import { Check, AlertTriangle, Clock } from "lucide-react";

export interface TimelineMilestone {
  time?: string;
  label: string;
  sub?: string;
  status?: "verified" | "flagged" | "pending";
  isCurrent?: boolean;
}

export interface TimelineStripProps {
  milestones: TimelineMilestone[];
  windowLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TimelineStrip: React.FC<TimelineStripProps> = ({
  milestones,
  windowLabel,
  className = "",
  style,
}) => {
  return (
    <div
      className={`timeline-strip ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "8px 12px",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        ...style,
      }}
    >
      {milestones.map((m, idx) => {
        const isFlagged = m.status === "flagged";
        const isVerified = m.status === "verified";
        const color = isFlagged ? "#DC2626" : isVerified ? "#059669" : "#4F46E5";
        const bg = isFlagged ? "#FEF2F2" : isVerified ? "#ECFDF5" : "#EEF2FF";
        const border = isFlagged ? "#FECDD3" : isVerified ? "#A7F3D0" : "#C7D2FE";

        return (
          <React.Fragment key={idx}>
            {/* Milestone Node */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: bg,
                  border: `1.5px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isFlagged ? (
                  <AlertTriangle size={11} color={color} />
                ) : isVerified ? (
                  <Check size={11} color={color} />
                ) : (
                  <Clock size={11} color={color} />
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {m.time && (
                  <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: color, fontWeight: 700 }}>
                    {m.time}
                  </span>
                )}
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
                  {m.label}
                </span>
                {m.sub && (
                  <span style={{ fontSize: "8px", color: "#64748B" }}>
                    {m.sub}
                  </span>
                )}
              </div>
            </div>

            {/* Connecting Line / Window Pill */}
            {idx < milestones.length - 1 && (
              <div
                style={{
                  flex: "1 1 0%",
                  margin: "0 8px",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "1.5px",
                    background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 4px, transparent 4px, transparent 8px)",
                  }}
                />
                {windowLabel && idx === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    {windowLabel}
                  </span>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

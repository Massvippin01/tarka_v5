import React from "react";
import { AlertCircle, Scale, ArrowRight, UserCheck } from "lucide-react";

export interface ContradictionIndicatorProps {
  findingTitle: string;
  sourceA: { name: string; value: string; tier: string };
  sourceB: { name: string; value: string; tier: string };
  discrepancyDelta: string;
  humanResolutionRequired?: boolean;
  onReview?: () => void;
  className?: string;
}

export const ContradictionIndicator: React.FC<ContradictionIndicatorProps> = ({
  findingTitle,
  sourceA,
  sourceB,
  discrepancyDelta,
  humanResolutionRequired = true,
  onReview,
  className = "",
}) => {
  return (
    <div
      className={`contradiction-indicator ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "var(--radius-sm, 6px)",
        background: "var(--forensic-tamper-bg, #FFF1F2)",
        border: "1px solid var(--forensic-tamper-border, #FECDD3)",
        boxSizing: "border-box",
      }}
      role="region"
      aria-label="Evidentiary Contradiction"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertCircle size={15} color="var(--forensic-tamper, #E11D48)" />
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "var(--forensic-tamper, #E11D48)",
              fontFamily: "var(--font-sans)",
            }}
          >
            CONTRADICTION DETECTED: {findingTitle}
          </span>
        </div>

        {humanResolutionRequired && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#FFFFFF",
              color: "var(--forensic-tamper, #E11D48)",
              border: "1px solid var(--forensic-tamper-border, #FECDD3)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <UserCheck size={11} /> HUMAN DECISION REQUIRED
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#FFFFFF",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm, 6px)",
          border: "1px solid var(--border-structural, #E2E8F0)",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: "var(--text-muted, #64748B)", fontSize: "10px" }}>{sourceA.name} ({sourceA.tier}): </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary, #0F172A)" }}>{sourceA.value}</span>
        </div>

        <Scale size={14} color="var(--forensic-tamper, #E11D48)" />

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: "var(--text-muted, #64748B)", fontSize: "10px" }}>{sourceB.name} ({sourceB.tier}): </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary, #0F172A)" }}>{sourceB.value}</span>
        </div>

        <div style={{ paddingLeft: "8px", borderLeft: "1px solid var(--border-structural, #E2E8F0)" }}>
          <span style={{ color: "var(--forensic-tamper, #E11D48)", fontWeight: 700 }}>Δ {discrepancyDelta}</span>
        </div>

        {onReview && (
          <button
            onClick={onReview}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "4px",
              background: "var(--forensic-tamper, #E11D48)",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            Review <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
};


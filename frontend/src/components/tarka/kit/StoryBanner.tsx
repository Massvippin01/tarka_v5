import React from "react";
import { Sparkles, Lightbulb } from "lucide-react";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { EvidenceChip, type EvidenceChipProps } from "./EvidenceChip";

export interface StoryBannerProps {
  takeaway: React.ReactNode;
  evidenceChips?: EvidenceChipProps[];
  screenId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StoryBanner: React.FC<StoryBannerProps> = ({
  takeaway,
  evidenceChips = [],
  screenId: _screenId,
  className = "",
  style,
}) => {
  const { explainSimply, toggleExplainSimply } = useTarkaUiStore();

  return (
    <div
      className={`story-banner ${className}`}
      style={{
        minHeight: "36px",
        maxHeight: "56px",
        background: "var(--reui-card-bg, #0F1B2E)",
        border: "1px solid var(--reui-border-strong, rgba(255, 255, 255, 0.08))",
        borderRadius: "8px",
        padding: "4px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxSizing: "border-box",
        flexShrink: 0,
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Left: Takeaway sentence (passes 5-Second Test) */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 0%" }}>
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "4px",
            background: "rgba(6, 182, 212, 0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={11} color="#22D3EE" />
        </div>
        <div
          title={typeof takeaway === "string" ? takeaway : undefined}
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--reui-text-primary, #F8FAFC)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
          }}
        >
          {takeaway}
        </div>
      </div>

      {/* Right Controls: Evidence Chips & Explain Simply Toggle */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", flexShrink: 0 }}>
        {/* Evidence Chips */}
        {evidenceChips.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {evidenceChips.map((chip, idx) => (
              <EvidenceChip key={idx} {...chip} />
            ))}
          </div>
        )}

        {/* Explain Simply Toggle */}
        <button
          type="button"
          onClick={toggleExplainSimply}
          className="hover:border-cyan-400 hover:shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 transition-transform"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            fontWeight: 700,
            padding: "2.5px 7px",
            borderRadius: "5px",
            border: explainSimply ? "1px solid #06B6D4" : "1px solid var(--reui-border-strong, rgba(255, 255, 255, 0.12))",
            background: explainSimply ? "rgba(6, 182, 212, 0.18)" : "rgba(255, 255, 255, 0.04)",
            color: explainSimply ? "#22D3EE" : "var(--reui-text-secondary, #94A3B8)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
          title="Toggle plain-English judicial translation mode"
        >
          <Lightbulb size={11} color={explainSimply ? "#4F46E5" : "#64748B"} />
          <span>Explain simply</span>
          <span
            style={{
              fontSize: "8.5px",
              fontWeight: 800,
              padding: "0.5px 3.5px",
              borderRadius: "3px",
              background: explainSimply ? "#4F46E5" : "#E2E8F0",
              color: explainSimply ? "#FFFFFF" : "#64748B",
            }}
          >
            {explainSimply ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    </div>
  );
};

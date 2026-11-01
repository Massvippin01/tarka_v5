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
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "4px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxSizing: "border-box",
        flexShrink: 0,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.02)",
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
            background: "#EEF2FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={11} color="#4F46E5" />
        </div>
        <div
          title={typeof takeaway === "string" ? takeaway : undefined}
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#0F172A",
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            fontWeight: 700,
            padding: "2.5px 7px",
            borderRadius: "5px",
            border: explainSimply ? "1px solid #4F46E5" : "1px solid #CBD5E1",
            background: explainSimply ? "#EEF2FF" : "#F8FAFC",
            color: explainSimply ? "#4338CA" : "#64748B",
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

import React, { useState, useEffect } from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface InvestigationContextIndicatorProps {
  clarificationCandidates?: Array<{ candidate_id: string; display_label: string }>;
  clarificationPrompt?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  onDismissClarification?: () => void;
}

export const InvestigationContextIndicator: React.FC<InvestigationContextIndicatorProps> = ({
  clarificationCandidates = [],
  clarificationPrompt = null,
  onSelectCandidate,
  onDismissClarification,
}) => {
  const {
    activeCaseId,
    selectedEntityId,
    entityFilters,
    relationshipFilters,
    timeRange,
    selectEntity,
  } = useInvestigation();

  const [isClarifying, setIsClarifying] = useState<boolean>(clarificationCandidates.length > 0);

  useEffect(() => {
    setIsClarifying(clarificationCandidates.length > 0);
  }, [clarificationCandidates]);

  // Handle Escape key to cancel clarification safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isClarifying) {
        setIsClarifying(false);
        if (onDismissClarification) onDismissClarification();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClarifying, onDismissClarification]);

  const handlePick = (candidateId: string) => {
    if (onSelectCandidate) {
      onSelectCandidate(candidateId);
    } else {
      selectEntity(candidateId);
    }
    setIsClarifying(false);
  };

  const filterSummary = [
    ...entityFilters,
    ...relationshipFilters,
  ].join(", ");

  return (
    <div
      role="region"
      aria-label="Investigation Context Fabric"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        backgroundColor: "var(--surface-secondary)",
        border: "1px solid var(--border-structural)",
        borderRadius: "var(--radius-sm)",
        padding: "2px 8px",
        color: "var(--text-secondary)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--primary-accent)" }}>
        {activeCaseId}
      </span>
      <span style={{ color: "var(--border-strong)" }}>/</span>

      <span
        style={{
          color: selectedEntityId ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: selectedEntityId ? 600 : 400,
        }}
        title="Active Selected Entity"
      >
        {selectedEntityId ? selectedEntityId : "UNFOCUSED"}
      </span>

      {filterSummary && (
        <>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <span style={{ color: "var(--status-gap)" }} title="Active Filters">
            {filterSummary}
          </span>
        </>
      )}

      {timeRange && timeRange[0] && (
        <>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }} title="Time Range">
            {timeRange[0]}..{timeRange[1]}
          </span>
        </>
      )}

      {/* Ambiguity Clarification Dialog / Pill */}
      {isClarifying && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Context Clarification"
          style={{
            position: "fixed",
            top: "48px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--primary-accent)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minWidth: "320px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "12px" }}>
              CLARIFICATION REQUIRED
            </span>
            <button
              onClick={() => {
                setIsClarifying(false);
                if (onDismissClarification) onDismissClarification();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "12px",
              }}
              aria-label="Dismiss clarification"
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
            {clarificationPrompt || "Multiple candidates match this reference. Which one did you mean?"}
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {clarificationCandidates.map((cand) => (
              <button
                key={cand.candidate_id}
                onClick={() => handlePick(cand.candidate_id)}
                style={{
                  backgroundColor: "var(--surface-secondary)",
                  border: "1px solid var(--border-structural)",
                  color: "var(--primary-accent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cand.display_label || cand.candidate_id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

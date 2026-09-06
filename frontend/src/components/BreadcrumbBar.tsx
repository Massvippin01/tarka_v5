import React from "react";
import { useInvestigation } from "../context/InvestigationContext";
import { SecurityBadge } from "./SecurityBadge";
import { VoiceCommandOverlay } from "./VoiceCommandOverlay";

interface BreadcrumbBarProps {
  onOpenCommandSearch: () => void;
  onOpenAuth: () => void;
  onGoLanding: () => void;
  theme: "dark" | "parchment";
  onToggleTheme: () => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  onOpenCommandSearch,
  onOpenAuth,
  onGoLanding,
  theme,
  onToggleTheme,
}) => {
  const {
    activeCaseId,
    activeLens,
    selectedEntityId,
    queryBounds,
    realtimeState,
    lastSequenceNumber,
    historyStack,
    goBack,
    selectCase,
    copilotOpen,
    toggleCopilot,
  } = useInvestigation();

  const caseName = activeCaseId === "C102" ? "Delhi Cyber Phishing FIR" : "Gurugram Auto Theft FIR";

  return (
    <header
      style={{
        height: "48px",
        background: "var(--surface-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        gap: "12px",
        fontSize: "0.75rem",
        zIndex: 10,
      }}
    >
      {/* Left: History Back & Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={goBack}
          disabled={historyStack.length <= 1}
          title="Return to previous investigation context"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            color: historyStack.length > 1 ? "var(--text-accent)" : "var(--text-muted)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: historyStack.length > 1 ? "pointer" : "not-allowed",
            opacity: historyStack.length > 1 ? 1 : 0.5,
          }}
        >
          ← BACK
        </button>

        {/* Breadcrumb Path */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>Command Center</span>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <span style={{ color: "var(--text-primary)" }}>{activeCaseId}: {caseName}</span>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <span style={{ color: "var(--text-accent)", fontWeight: 700 }}>{activeLens}</span>
          {selectedEntityId && (
            <>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span style={{ background: "rgba(49, 196, 216, 0.15)", color: "var(--text-accent)", padding: "1px 5px", borderRadius: "3px", fontSize: "0.68rem" }}>
                {selectedEntityId}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Middle: Active Case Selector & Realtime Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>CASE:</label>
          <select
            value={activeCaseId}
            onChange={(e) => selectCase(e.target.value)}
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-accent)",
              padding: "3px 6px",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 700,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="C102">CASE C102: Delhi Cyber Phishing FIR</option>
            <option value="C481">CASE C481: Gurugram Auto Theft FIR</option>
          </select>
        </div>

        {/* Query Bounded Badge */}
        <div
          style={{
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            color: "#38bdf8",
            fontSize: "0.62rem",
            fontWeight: 700,
            padding: "3px 6px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}
        >
          🔒 {queryBounds.maxNodes} NODES BOUNDED
        </div>

        {/* Realtime Live SSE Indicator */}
        <div
          style={{
            background: realtimeState === "LIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            border: `1px solid ${realtimeState === "LIVE" ? "rgba(52, 211, 153, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            color: realtimeState === "LIVE" ? "#34d399" : "#f59e0b",
            fontSize: "0.62rem",
            fontWeight: 700,
            padding: "3px 6px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            whiteSpace: "nowrap",
          }}
        >
          ● {realtimeState} | SEQ #{lastSequenceNumber}
        </div>
      </div>

      {/* Right Controls: Security Badge, Voice Overlay, Global Search, Theme & Copilot */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={onGoLanding}
          style={{
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🏠 OVERVIEW
        </button>
        <button
          onClick={onOpenAuth}
          style={{
            background: "rgba(158, 42, 43, 0.2)",
            border: "1px solid var(--border-accent)",
            color: "var(--text-primary)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🔒 AUTH
        </button>
        <SecurityBadge />
        <VoiceCommandOverlay />

        <button
          onClick={onOpenCommandSearch}
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-accent)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          🔍 SEARCH <kbd style={{ background: "var(--surface-elevated)", padding: "1px 4px", borderRadius: "3px", color: "var(--text-muted)", fontSize: "0.58rem" }}>⌘K</kbd>
        </button>

        <button
          onClick={onToggleTheme}
          style={{
            background: theme === "parchment" ? "#9e2a2b" : "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            color: "#ffffff",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? "📜 PARCHMENT" : "🌙 DARK"}
        </button>

        <button
          onClick={() => toggleCopilot()}
          style={{
            background: copilotOpen ? "var(--status-observed)" : "var(--text-accent)",
            border: "none",
            color: "#081018",
            padding: "4px 10px",
            borderRadius: "4px",
            fontWeight: 800,
            fontSize: "0.7rem",
            cursor: "pointer",
            boxShadow: copilotOpen ? "0 0 10px rgba(52, 211, 153, 0.5)" : "none",
          }}
        >
          🤖 AI COPILOT
        </button>
      </div>
    </header>
  );
};

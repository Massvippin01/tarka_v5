import React from "react";
import { useInvestigation } from "../context/InvestigationContext";
import { useTheme } from "../context/ThemeContext";
import { VoiceCommandOverlay } from "./VoiceCommandOverlay";

interface BreadcrumbBarProps {
  onOpenCommandSearch: () => void;
  onOpenAuth: () => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  onOpenCommandSearch,
  onOpenAuth,
}) => {
  const {
    activeCaseId,
    selectedEntityId,
    realtimeState,
    selectCase,
    copilotOpen,
    toggleCopilot,
  } = useInvestigation();

  const { theme, cycleTheme } = useTheme();

  const themeDisplayNames: Record<string, string> = {
    "forensic-paper": "FORENSIC PAPER",
    "night-ops": "NIGHT OPS",
    "high-contrast": "HIGH CONTRAST",
  };

  return (
    <header
      style={{
        height: "40px",
        backgroundColor: "var(--surface-primary)",
        borderBottom: "1px solid var(--border-structural)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        gap: "12px",
        fontSize: "var(--font-size-meta)",
        fontFamily: "var(--font-sans)",
        zIndex: 10,
        userSelect: "none",
        color: "var(--text-primary)",
      }}
    >
      {/* Left: Document-Style Case Context & Jurisdiction */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        {/* Case Selector presented as Document Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            CASE
          </span>
          <select
            value={activeCaseId === "C102" ? "CASE-2026-001" : activeCaseId}
            onChange={(e) => selectCase(e.target.value)}
            style={{
              backgroundColor: "var(--surface-primary)",
              border: "1px solid var(--border-structural)",
              color: "var(--text-primary)",
              fontSize: "var(--font-size-meta)",
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="CASE-2026-001">2026-001 // Operation Triad Nexus</option>
            <option value="C102">C102 // Hawala Syndicate - NCR</option>
            <option value="C114">C114 // Inter-State Cyber Fraud Cell</option>
          </select>
        </div>

        <span style={{ color: "var(--border-strong)" }}>·</span>

        <span
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          DELHI NCR // SPECIAL CELL
        </span>

        <span style={{ color: "var(--border-strong)" }}>·</span>

        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
          }}
        >
          RESTRICTED // LE SENSITIVE
        </span>

        {selectedEntityId && (
          <>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                padding: "1px 6px",
                backgroundColor: "var(--surface-secondary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              FOCUS: {selectedEntityId}
            </span>
          </>
        )}
      </div>

      {/* Right: Operational Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* CAS Integrity / Realtime Indicator */}
        <div
          title={`CAS SHA-256 Storage Integrity: ${realtimeState}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: realtimeState === "LIVE" ? "var(--status-verified)" : "var(--status-gap)",
            padding: "2px 6px",
            border: "1px solid var(--border-structural)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--surface-primary)",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: realtimeState === "LIVE" ? "var(--status-verified)" : "var(--status-gap)",
              display: "inline-block",
            }}
          />
          <span>CAS SHA-256 VERIFIED</span>
        </div>

        {/* Global Case Search */}
        <button
          onClick={onOpenCommandSearch}
          title="Search case documents, evidence and entities (Ctrl+K)"
          style={{
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-structural)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>Search</span>
          <kbd
            style={{
              backgroundColor: "var(--surface-secondary)",
              padding: "1px 4px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme Mode Toggle (Forensic Paper / Night Ops / High Contrast) */}
        <button
          onClick={cycleTheme}
          title="Toggle Synchronized Theme Mode (Alt+T)"
          style={{
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-structural)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>{themeDisplayNames[theme] || theme}</span>
        </button>

        {/* Voice Navigation Overlay */}
        <VoiceCommandOverlay />

        {/* Officer Session */}
        <button
          onClick={onOpenAuth}
          title="Sworn Officer Credentials"
          style={{
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-structural)",
            color: "var(--text-secondary)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          INSP. A. RAWAT [DL-8842]
        </button>

        {/* Restrained Sentinel Indicator */}
        <button
          onClick={() => toggleCopilot()}
          title="Toggle Sentinel Analyst Panel"
          style={{
            backgroundColor: copilotOpen ? "var(--sentinel-crimson)" : "var(--surface-primary)",
            border: `1px solid ${copilotOpen ? "var(--sentinel-crimson)" : "var(--border-structural)"}`,
            color: copilotOpen ? "#FFFFFF" : "var(--sentinel-crimson)",
            padding: "2px 9px",
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: copilotOpen ? "#FFFFFF" : "var(--sentinel-crimson)",
              display: "inline-block",
            }}
          />
          <span>SENTINEL</span>
        </button>
      </div>
    </header>
  );
};

import React, { useState } from "react";
import type {
  OnboardingActionOption,
  OnboardingIntentCode,
  OperatingContext,
} from "../../types/operatingContext";
import { OperatingContextService } from "../../services/operatingContextService";

interface FirstOpenControllerProps {
  operatingContext: OperatingContext;
  onSelectCase: (caseId: string, route?: string) => void;
  onDismissOnboarding: () => void;
  onRunGoal?: (goal: string) => void;
}

export const FirstOpenController: React.FC<FirstOpenControllerProps> = ({
  operatingContext,
  onSelectCase,
  onDismissOnboarding,
  onRunGoal,
}) => {
  const [selectedIntent, setSelectedIntent] = useState<OnboardingIntentCode | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedCaseTarget, setSelectedCaseTarget] = useState<string>(
    operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001"
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);

  const contextService = OperatingContextService.getInstance();

  const handleActionClick = async (option: OnboardingActionOption) => {
    setSelectedIntent(option.intent_code);

    if (!option.requires_input && option.intent_code === "OPEN_CASE") {
      // User can pick from available targets or click to proceed
      return;
    }

    if (option.intent_code === "CONTINUE_INVESTIGATION") {
      setIsProcessing(true);
      const targetCase = operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001";
      await contextService.activateCaseScope(operatingContext.session_id, targetCase, "command");
      onSelectCase(targetCase, "command");
      onDismissOnboarding();
      return;
    }

    if (option.intent_code === "REVIEW_EVIDENCE") {
      setIsProcessing(true);
      const targetCase = operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001";
      await contextService.activateCaseScope(operatingContext.session_id, targetCase, "evidence");
      onSelectCase(targetCase, "evidence");
      onDismissOnboarding();
      return;
    }
  };

  const handleExecuteIntent = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (selectedIntent === "OPEN_CASE") {
        await contextService.activateCaseScope(
          operatingContext.session_id,
          selectedCaseTarget,
          "graph"
        );
        onSelectCase(selectedCaseTarget, "graph");
        onDismissOnboarding();
      } else if (selectedIntent === "START_INVESTIGATION") {
        // Activate new investigation scope with user reference
        const caseRef = inputValue.trim() || "CASE-2026-NEW";
        await contextService.activateCaseScope(
          operatingContext.session_id,
          "CASE-2026-001",
          "command"
        );
        onSelectCase("CASE-2026-001", "command");
        if (onRunGoal) {
          onRunGoal(`Initiate investigation docket: ${caseRef}`);
        }
        onDismissOnboarding();
      } else if (selectedIntent === "SEARCH_ENTITY") {
        const query = inputValue.trim();
        const targetCase = operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001";
        await contextService.activateCaseScope(
          operatingContext.session_id,
          targetCase,
          "search"
        );
        onSelectCase(targetCase, "search");
        if (query && onRunGoal) {
          onRunGoal(`Search entity: ${query}`);
        }
        onDismissOnboarding();
      } else if (selectedIntent === "OTHER" || inputValue.trim().length > 0) {
        const goal = inputValue.trim();
        const targetCase = operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001";
        await contextService.activateCaseScope(
          operatingContext.session_id,
          targetCase,
          "command"
        );
        onSelectCase(targetCase, "command");
        if (goal && onRunGoal) {
          onRunGoal(goal);
        }
        onDismissOnboarding();
      } else {
        // Default proceed
        const targetCase = operatingContext.allowed_cases[0]?.case_id || "CASE-2026-001";
        await contextService.activateCaseScope(
          operatingContext.session_id,
          targetCase,
          "command"
        );
        onSelectCase(targetCase, "command");
        onDismissOnboarding();
      }
    } catch (e) {
      console.error("Failed to execute onboarding action:", e);
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive) {
      setInputValue("Investigate burner phone PH002 and correlate with DND Toll observations");
    }
  };

  const ACTION_CARDS: Array<{
    code: OnboardingIntentCode;
    title: string;
    description: string;
    badge: string;
  }> = [
    {
      code: "OPEN_CASE",
      title: "Open Case Docket",
      description: "Access an authorized active docket and explore its intelligence graph and raw evidence.",
      badge: "AUTHORIZED SCOPE",
    },
    {
      code: "START_INVESTIGATION",
      title: "Start Investigation",
      description: "Initiate a new forensic inquiry, define statutory power, and establish evidence boundary.",
      badge: "PROCEDURAL INTAKE",
    },
    {
      code: "SEARCH_ENTITY",
      title: "Search Entity",
      description: "Direct lookup across suspects, phone identifiers, vehicle registrations, or accounts.",
      badge: "FEDERATED LOOKUP",
    },
    {
      code: "REVIEW_EVIDENCE",
      title: "Review Evidence",
      description: "Audit incoming CAS forensic artifacts, verify SHA-256 hashes, and inspect custody logs.",
      badge: "CAS INTEGRITY",
    },
    {
      code: "CONTINUE_INVESTIGATION",
      title: "Continue Investigation",
      description: "Resume primary dossier and review recent kinematic anomalies and unresolved gaps.",
      badge: "QUICK RESUME",
    },
    {
      code: "OTHER",
      title: "State Custom Objective",
      description: "Decompose a multi-step objective via natural language or authorized voice instruction.",
      badge: "GOVERNED AUTONOMY",
    },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.sheetContainer}>
        {/* Top Header / Sovereign Credential Header */}
        <header style={styles.topHeader}>
          <div style={styles.headerLeft}>
            <div style={styles.crestContainer}>
              <span style={styles.crestDot} />
              <span style={styles.brandTitle}>TARKA FORENSICS</span>
            </div>
            <span style={styles.divider}>·</span>
            <span style={styles.scopeBadge}>
              {operatingContext.clearance} // LE SENSITIVE
            </span>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.officerBadge}>
              <span style={styles.officerRank}>{operatingContext.display_name}</span>
              <span style={styles.officerId}>[{operatingContext.badge_number}]</span>
            </div>
            <div
              style={{
                ...styles.voiceIndicator,
                color: operatingContext.voice_capability?.supported ? "#1E7E34" : "#8A8477",
              }}
              title="Voice Operating Mode: WebRTC Ready"
            >
              <span style={styles.voiceDot} />
              <span>VOICE OS READY</span>
            </div>
          </div>
        </header>

        {/* Operating Context Greeting Section */}
        <div style={styles.greetingSection}>
          <div style={styles.eyebrowTag}>
            SESSION INITIALIZED · ENVIRONMENT NEGOTIATED
          </div>
          <h1 style={styles.mainTitle}>Welcome to TARKA.</h1>
          <p style={styles.subtitle}>
            What would you like to investigate?
          </p>
        </div>

        {/* Natural Language Objective Input with Voice Toggle */}
        <div style={styles.inputSection}>
          <div style={styles.inputBox}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#625E57"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecuteIntent();
              }}
              placeholder="State an investigative objective, enter an identifier, or select a docket below..."
              style={styles.textInput}
              autoFocus
            />
            {/* Voice Mic Toggle */}
            <button
              onClick={handleVoiceToggle}
              title={voiceActive ? "Microphone Active" : "Click to speak objective"}
              style={{
                ...styles.micBtn,
                backgroundColor: voiceActive ? "#AE2D30" : "transparent",
                color: voiceActive ? "#FAF8F3" : "#625E57",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>{voiceActive ? "LISTENING" : "VOICE"}</span>
            </button>
            <button
              onClick={handleExecuteIntent}
              disabled={isProcessing}
              style={styles.dispatchBtn}
            >
              {isProcessing ? "INITIALIZING..." : "ENTER WORKSPACE →"}
            </button>
          </div>
        </div>

        {/* Actionable Intent Grid */}
        <div style={styles.cardsGrid}>
          {ACTION_CARDS.map((card) => {
            const isSelected = selectedIntent === card.code;
            return (
              <div
                key={card.code}
                onClick={() => handleActionClick(card as any)}
                style={{
                  ...styles.actionCard,
                  borderColor: isSelected ? "#AE2D30" : "#D8D2C7",
                  backgroundColor: isSelected ? "#FAF8F3" : "#FFFFFF",
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>{card.title}</span>
                  <span style={styles.cardBadge}>{card.badge}</span>
                </div>
                <p style={styles.cardDesc}>{card.description}</p>

                {/* Sub-Selector when OPEN_CASE is selected */}
                {card.code === "OPEN_CASE" && isSelected && (
                  <div style={styles.casePickerContainer}>
                    <label style={styles.casePickerLabel}>SELECT AUTHORIZED DOCKET:</label>
                    <select
                      value={selectedCaseTarget}
                      onChange={(e) => setSelectedCaseTarget(e.target.value)}
                      style={styles.caseSelect}
                    >
                      {operatingContext.allowed_cases.map((c) => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_id} — {c.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteIntent();
                      }}
                      style={styles.confirmCaseBtn}
                    >
                      OPEN DOCKET →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Sovereign Notice */}
        <footer style={styles.footerNotice}>
          <div style={styles.epistemicFormula}>
            <span>AI PROPOSES</span>
            <span style={{ color: "#AE2D30" }}>→</span>
            <span>EVIDENCE VERIFIES</span>
            <span style={{ color: "#AE2D30" }}>→</span>
            <span>HUMAN DECIDES</span>
          </div>
          <div style={styles.legalCatalog}>
            STATUTORY POWER BASE: BNSS SEC. 94 · CRPC SEC. 91 · BSA SEC. 63 · IEA SEC. 65B
          </div>
        </footer>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13, 17, 26, 0.7)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  sheetContainer: {
    width: "100%",
    maxWidth: "960px",
    backgroundColor: "#F4F1EA",
    border: "1px solid #D8D2C7",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
    borderRadius: "2px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topHeader: {
    height: "44px",
    backgroundColor: "#FAF8F3",
    borderBottom: "1px solid #D8D2C7",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  crestContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  crestDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#AE2D30",
  },
  brandTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#1E1D1A",
  },
  divider: {
    color: "#D8D2C7",
  },
  scopeBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    color: "#625E57",
    letterSpacing: "0.05em",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  officerBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    color: "#1E1D1A",
    display: "flex",
    gap: "6px",
  },
  officerRank: {
    fontWeight: 600,
  },
  officerId: {
    color: "#8A8477",
  },
  voiceIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  voiceDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "currentColor",
  },
  greetingSection: {
    padding: "32px 36px 12px 36px",
    backgroundColor: "#F4F1EA",
  },
  eyebrowTag: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    color: "#AE2D30",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  },
  mainTitle: {
    fontFamily: "'IBM Plex Serif', serif",
    fontSize: "28px",
    fontWeight: 600,
    color: "#1E1D1A",
    margin: "0 0 6px 0",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "15px",
    color: "#625E57",
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  inputSection: {
    padding: "16px 36px 24px 36px",
  },
  inputBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "4px 8px 4px 14px",
    gap: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  textInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    color: "#1E1D1A",
    backgroundColor: "transparent",
  },
  micBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "5px 10px",
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
  },
  dispatchBtn: {
    backgroundColor: "#AE2D30",
    color: "#FAF8F3",
    border: "none",
    borderRadius: "2px",
    padding: "7px 16px",
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    padding: "0 36px 28px 36px",
  },
  actionCard: {
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "16px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },
  cardTitle: {
    fontFamily: "'IBM Plex Serif', serif",
    fontSize: "14px",
    fontWeight: 600,
    color: "#1E1D1A",
  },
  cardBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    color: "#8A8477",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  cardDesc: {
    fontSize: "11px",
    color: "#625E57",
    lineHeight: "1.4",
    margin: 0,
  },
  casePickerContainer: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #ECE8DF",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  casePickerLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    color: "#8A8477",
    fontWeight: 600,
  },
  caseSelect: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    padding: "4px",
    border: "1px solid #D8D2C7",
    backgroundColor: "#FAF8F3",
    color: "#1E1D1A",
    borderRadius: "2px",
  },
  confirmCaseBtn: {
    backgroundColor: "#AE2D30",
    color: "#FAF8F3",
    border: "none",
    borderRadius: "2px",
    padding: "5px 10px",
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
    marginTop: "4px",
  },
  footerNotice: {
    backgroundColor: "#ECE8DF",
    borderTop: "1px solid #D8D2C7",
    padding: "10px 36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  epistemicFormula: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    fontWeight: 700,
    color: "#1E1D1A",
    display: "flex",
    gap: "8px",
    letterSpacing: "0.05em",
  },
  legalCatalog: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    color: "#8A8477",
  },
};

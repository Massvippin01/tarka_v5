import React, { useState, useEffect, useRef } from "react";
import { useInvestigation, type ExperienceLevel } from "../../context/InvestigationContext";
import { voiceService } from "../../services/voiceService";
import { useTheme } from "../../context/ThemeContext";

export type VoiceIntegratedState =
  | "READY"
  | "LISTENING"
  | "PROCESSING"
  | "EXECUTING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "ERROR"
  | "OFFLINE";

interface QuickActionChip {
  id: string;
  icon: string;
  label: string;
  description: string;
  targetLevel: ExperienceLevel;
  intent: string;
  args?: Record<string, any>;
}

export const CommandFirstSurface: React.FC = () => {
  const {
    activeCaseId,
    selectCase,
    dispatchCommand,
    setExperienceLevel,
    realtimeState,
    operatingContext,
  } = useInvestigation();

  const { cycleTheme } = useTheme();

  const [voiceState, setVoiceState] = useState<VoiceIntegratedState>("READY");
  const [inputText, setInputText] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isMicrophoneSupported, setIsMicrophoneSupported] = useState(true);
  const [hasPlayedIntro, setHasPlayedIntro] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check audio/mic capability
  useEffect(() => {
    if (typeof window !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
      setIsMicrophoneSupported(false);
      setVoiceState("OFFLINE");
    }
  }, []);

  // Minimal voice state visual configuration
  const voiceStateConfig: Record<
    VoiceIntegratedState,
    { label: string; dotColor: string; pulse: boolean; hint: string }
  > = {
    READY: {
      label: "Voice Ready",
      dotColor: "var(--status-verified)",
      pulse: false,
      hint: "Microphone active. Click mic or press Alt+V to speak.",
    },
    LISTENING: {
      label: "Listening...",
      dotColor: "var(--sentinel-crimson)",
      pulse: true,
      hint: "Streaming speech... Speak naturally or press Esc to cancel.",
    },
    PROCESSING: {
      label: "Processing...",
      dotColor: "var(--status-gap)",
      pulse: true,
      hint: "Normalizing investigative intent into CommandBus...",
    },
    EXECUTING: {
      label: "Executing...",
      dotColor: "var(--primary-accent)",
      pulse: true,
      hint: "Enforcing statutory governance & dispatching state actions...",
    },
    SPEAKING: {
      label: "Speaking...",
      dotColor: "var(--primary-accent)",
      pulse: true,
      hint: "Synthesizing briefing. Click mic or press Esc to barge-in.",
    },
    INTERRUPTED: {
      label: "Interrupted",
      dotColor: "var(--sentinel-crimson)",
      pulse: false,
      hint: "Barge-in registered. Speech halted.",
    },
    ERROR: {
      label: "Voice Error",
      dotColor: "var(--status-contradicted)",
      pulse: false,
      hint: "Microphone unavailable or permission denied.",
    },
    OFFLINE: {
      label: "Voice Offline",
      dotColor: "var(--text-muted)",
      pulse: false,
      hint: "Audio subsystem unavailable. Use keyboard command input.",
    },
  };

  /**
   * Start streaming microphone capture with turn detection
   */
  const startListening = async () => {
    try {
      setVoiceState("LISTENING");
      setStatusFeedback(null);
      const success = await voiceService.startMicrophoneCapture({
        onPartialTranscript: (text: string) => {
          setPartialTranscript(text);
          setVoiceState("LISTENING");
        },
        onFinalTranscript: (text: string) => {
          setPartialTranscript("");
          setInputText(text);
          handleExecuteQuery(text, "VOICE");
        },
        onError: (err: string) => {
          console.warn("[CommandFirstSurface] Mic error:", err);
          setVoiceState("ERROR");
          setStatusFeedback(`Voice error: ${err}`);
          setTimeout(() => setVoiceState("READY"), 2500);
        },
      });

      if (!success) {
        setVoiceState("ERROR");
        setStatusFeedback("Unable to capture microphone audio.");
        setTimeout(() => setVoiceState("READY"), 2500);
      }
    } catch (e: any) {
      setVoiceState("ERROR");
      setStatusFeedback(`Voice failure: ${e.message || e}`);
      setTimeout(() => setVoiceState("READY"), 2500);
    }
  };

  /**
   * Handle Toggle Voice Microphone with Canonical Intro on first open
   */
  const handleToggleVoice = async () => {
    if (voiceState === "LISTENING") {
      voiceService.stopMicrophoneCapture();
      setVoiceState("READY");
      setPartialTranscript("");
      return;
    }

    if (voiceState === "SPEAKING") {
      // Immediate Barge-in interruption
      voiceService.stopSpeaking();
      await voiceService.handleInterruption();
      setVoiceState("INTERRUPTED");
      setTimeout(() => setVoiceState("READY"), 1200);
      return;
    }

    // Canonical Intro on explicit voice activation / first open
    if (!hasPlayedIntro) {
      setHasPlayedIntro(true);
      setVoiceState("SPEAKING");
      try {
        const intro = await voiceService.getCanonicalIntro();
        setStatusFeedback(intro.display_text);
        voiceService.speakResponse(intro.spoken_text, () => {
          startListening();
        });
        return;
      } catch (introErr) {
        console.warn("[CommandFirstSurface] Intro skipped:", introErr);
      }
    }

    await startListening();
  };

  /**
   * Execute Typed or Spoken Command through canonical CommandBus
   */
  const handleExecuteQuery = async (queryText: string, source: "CHAT" | "VOICE" = "CHAT") => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    setVoiceState("PROCESSING");
    setStatusFeedback(null);

    try {
      // Natural language normalization & execution via CommandBus
      const result = await dispatchCommand({
        source: source,
        intent: trimmed,
        arguments: { query: trimmed },
        case_id: activeCaseId,
      });

      setVoiceState("EXECUTING");

      if (result.status === "SUCCESS") {
        if (source === "VOICE" && result.message) {
          setVoiceState("SPEAKING");
          voiceService.speakResponse(result.message, () => {
            setVoiceState("READY");
          });
        } else {
          setTimeout(() => setVoiceState("READY"), 600);
        }
        setInputText("");
      } else {
        setStatusFeedback(result.message || "Command execution could not be completed.");
        setVoiceState("READY");
      }
    } catch (err: any) {
      console.error("[CommandFirstSurface] Dispatch error:", err);
      setStatusFeedback("Network or service communication failure.");
      setVoiceState("ERROR");
      setTimeout(() => setVoiceState("READY"), 2500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleExecuteQuery(inputText, "CHAT");
    } else if (e.key === "Escape") {
      if (voiceState === "LISTENING") {
        voiceService.stopMicrophoneCapture();
        setVoiceState("READY");
        setPartialTranscript("");
      } else if (voiceState === "SPEAKING") {
        voiceService.stopSpeaking();
        voiceService.handleInterruption();
        setVoiceState("INTERRUPTED");
        setTimeout(() => setVoiceState("READY"), 1000);
      } else {
        setInputText("");
        setStatusFeedback(null);
      }
    }
  };

  // Minimal, high-value quick action chips
  const QUICK_ACTIONS: QuickActionChip[] = [
    {
      id: "continue-case",
      icon: "▶",
      label: `Continue ${activeCaseId}`,
      description: "Open investigation focus docket & active contradictions",
      targetLevel: 1,
      intent: "OPEN_CASE",
      args: { case_id: activeCaseId, level: 1 },
    },
    {
      id: "contradictions",
      icon: "⚡",
      label: "Show Contradictions",
      description: "Scrutinize alibi, temporal, and spatial evidentiary conflicts",
      targetLevel: 2,
      intent: "OPEN_CONTRADICTIONS",
    },
    {
      id: "evidence-gaps",
      icon: "⚑",
      label: "Show Evidence Gaps",
      description: "Analyze missing statutory artifacts and requisition needs",
      targetLevel: 2,
      intent: "OPEN_GAPS",
    },
    {
      id: "intel-graph",
      icon: "⌘",
      label: "Show Intelligence Graph",
      description: "Explore 2D/3D entity networks, financial links, and communications",
      targetLevel: 2,
      intent: "OPEN_GRAPH",
    },
    {
      id: "timeline",
      icon: "⏱",
      label: "Analyze Timeline",
      description: "Evaluate chronological sequence of verified observations",
      targetLevel: 2,
      intent: "OPEN_TIMELINE",
    },
    {
      id: "deep-workspace",
      icon: "⚖",
      label: "Analytical Workspace",
      description: "Direct entry to full multi-rail forensic workspace",
      targetLevel: 2,
      intent: "SWITCH_LEVEL",
      args: { level: 2 },
    },
  ];

  const handleChipClick = async (chip: QuickActionChip) => {
    setVoiceState("EXECUTING");
    try {
      await dispatchCommand({
        source: "UI",
        intent: chip.intent,
        requested_actions: [chip.intent],
        arguments: chip.args || { case_id: activeCaseId },
        case_id: activeCaseId,
      });
      setExperienceLevel(chip.targetLevel);
      setVoiceState("READY");
    } catch (e) {
      setVoiceState("READY");
      setExperienceLevel(chip.targetLevel);
    }
  };

  const currentVoiceMeta = voiceStateConfig[voiceState];

  return (
    <div style={styles.surfaceRoot}>
      {/* Top Subtle Custody & Authority Bar */}
      <header style={styles.topAuthorityBar}>
        <div style={styles.authorityLeft}>
          <span style={styles.insigniaTag}>SENTINELX</span>
          <span style={styles.barDivider}>/</span>
          <span style={styles.securityPill}>RESTRICTED // LE SENSITIVE</span>
          <span style={styles.barDivider}>·</span>
          <span style={styles.jurisdictionText}>
            {operatingContext?.jurisdiction_scope?.[0] || "DELHI NCR // SPECIAL CELL"}
          </span>
        </div>

        <div style={styles.authorityRight}>
          <div style={styles.casStatusPill} title="CAS Storage Content-Addressed Hash Integrity">
            <span
              style={{
                ...styles.statusDot,
                backgroundColor:
                  realtimeState === "LIVE" ? "var(--status-verified)" : "var(--status-gap)",
              }}
            />
            <span>CAS SHA-256 VERIFIED</span>
          </div>

          <div style={styles.officerPill}>
            <span>INSP. A. RAWAT [DL-8842]</span>
          </div>

          <button
            onClick={cycleTheme}
            style={styles.themeToggleBtn}
            title="Toggle theme mode (Forensic Paper / Night Ops / High Contrast)"
          >
            THEME
          </button>
        </div>
      </header>

      {/* Main Centered Command Stage */}
      <main style={styles.commandStage}>
        {/* Brand & Subtitle Heading */}
        <div style={styles.brandContainer}>
          <h1 style={styles.brandTitle}>SENTINELX</h1>
          <p style={styles.brandSubtitle}>
            FORENSIC COGNITIVE INVESTIGATION OPERATING SYSTEM // BHARAT SPECIAL CELL
          </p>
        </div>

        {/* Integrated Voice Assistant Pill */}
        <div
          style={styles.voiceAssistantPill}
          title={currentVoiceMeta.hint}
          aria-live="polite"
          role="status"
        >
          <span
            style={{
              ...styles.voiceStatusDot,
              backgroundColor: currentVoiceMeta.dotColor,
              animation: currentVoiceMeta.pulse ? "pulse 1.8s infinite ease-in-out" : "none",
            }}
          />
          <span style={styles.voiceStateLabel}>{currentVoiceMeta.label}</span>
          {partialTranscript && (
            <span style={styles.liveTranscriptSnippet}>"{partialTranscript}"</span>
          )}
        </div>

        {/* Central Inquiry Prompt */}
        <div style={styles.inquiryPromptContainer}>
          <h2 style={styles.inquiryPrompt}>What would you like to investigate?</h2>
        </div>

        {/* Unified Command Input Bar */}
        <div style={styles.inputContainer}>
          {/* Integrated Microphone Action Button */}
          <button
            onClick={handleToggleVoice}
            disabled={!isMicrophoneSupported}
            style={{
              ...styles.micButton,
              backgroundColor:
                voiceState === "LISTENING"
                  ? "var(--sentinel-crimson)"
                  : voiceState === "SPEAKING"
                  ? "var(--primary-accent)"
                  : "var(--surface-secondary)",
              color:
                voiceState === "LISTENING" || voiceState === "SPEAKING"
                  ? "#FFFFFF"
                  : "var(--text-primary)",
            }}
            title={
              voiceState === "LISTENING"
                ? "Stop listening"
                : voiceState === "SPEAKING"
                ? "Click to interrupt (Barge-in)"
                : "Start voice command"
            }
            aria-label="Toggle voice input"
          >
            {voiceState === "LISTENING" ? (
              <span style={{ fontSize: "15px" }}>⏹</span>
            ) : voiceState === "SPEAKING" ? (
              <span style={{ fontSize: "15px" }}>⊘</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Natural Language & Command Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask in natural language, enter an entity or case ID, or type a command..."
            style={styles.commandInput}
            aria-label="Investigative command input"
          />

          {/* Submit Action Button */}
          <button
            onClick={() => handleExecuteQuery(inputText, "CHAT")}
            disabled={!inputText.trim() && voiceState !== "LISTENING"}
            style={{
              ...styles.investigateButton,
              opacity: inputText.trim() ? 1 : 0.6,
            }}
            title="Execute investigative action (Enter)"
          >
            <span>Investigate</span>
            <kbd style={styles.kbdShortcut}>↵</kbd>
          </button>
        </div>

        {/* Status / Error Feedback Message */}
        {statusFeedback && (
          <div style={styles.feedbackBanner} role="alert">
            <span>{statusFeedback}</span>
            <button onClick={() => setStatusFeedback(null)} style={styles.feedbackDismiss}>
              ✕
            </button>
          </div>
        )}

        {/* Minimal Keyboard Shortcut Legend */}
        <div style={styles.shortcutLegend}>
          <span>Press <kbd style={styles.subKbd}>↵</kbd> to run</span>
          <span>·</span>
          <span><kbd style={styles.subKbd}>Alt+V</kbd> voice</span>
          <span>·</span>
          <span><kbd style={styles.subKbd}>Esc</kbd> reset</span>
          <span>·</span>
          <span><kbd style={styles.subKbd}>Alt+1..4</kbd> switch levels</span>
        </div>

        {/* Minimal Quick Actions Section */}
        <div style={styles.quickActionsSection}>
          <div style={styles.quickActionHeader}>
            <span style={styles.quickActionTitle}>RECOMMENDED INVESTIGATION PATHS</span>
            <span style={styles.caseBadge}>ACTIVE: {activeCaseId}</span>
          </div>

          <div style={styles.quickChipsGrid}>
            {QUICK_ACTIONS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip)}
                style={styles.chipButton}
                title={chip.description}
              >
                <div style={styles.chipTopRow}>
                  <span style={styles.chipIcon}>{chip.icon}</span>
                  <span style={styles.chipLabel}>{chip.label}</span>
                </div>
                <span style={styles.chipDescription}>{chip.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Minimal Active Case Switcher */}
        <div style={styles.caseSwitchBar}>
          <span style={styles.caseSwitchLabel}>SELECT ACTIVE CASE DOCKET:</span>
          <select
            value={activeCaseId}
            onChange={(e) => selectCase(e.target.value, "focus")}
            style={styles.caseSelectDropdown}
          >
            <option value="CASE-2026-001">CASE-2026-001 // Operation Triad Nexus (Active Hawala Inquiry)</option>
            <option value="C102">C102 // Hawala Syndicate - NCR Inter-State Nexus</option>
            <option value="C114">C114 // Inter-State Cyber Fraud Cell</option>
          </select>
        </div>
      </main>

      {/* Bottom Progressive Disclosure Navigation Bar */}
      <footer style={styles.bottomLevelBar}>
        <div style={styles.levelSelector}>
          <span style={styles.levelBarLabel}>PROGRESSIVE DISCLOSURE:</span>
          <button
            onClick={() => setExperienceLevel(0)}
            style={{ ...styles.levelPill, ...styles.activeLevelPill }}
          >
            L0 Command
          </button>
          <button onClick={() => setExperienceLevel(1)} style={styles.levelPill}>
            L1 Focus
          </button>
          <button onClick={() => setExperienceLevel(2)} style={styles.levelPill}>
            L2 Workspace
          </button>
          <button onClick={() => setExperienceLevel(3)} style={styles.levelPill}>
            L3 Forensic
          </button>
          <button onClick={() => setExperienceLevel(4)} style={styles.levelPill}>
            L4 Audit
          </button>
        </div>

        <div style={styles.statutoryFooter}>
          <span>CONSTITUTIONAL COMPLIANCE: SECTION 94 BNSS // IMMUTABLE CAS LEDGER</span>
        </div>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  surfaceRoot: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "var(--bg-canonical)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    userSelect: "none",
  },
  topAuthorityBar: {
    height: "44px",
    backgroundColor: "var(--surface-primary)",
    borderBottom: "1px solid var(--border-structural)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    fontSize: "var(--font-size-meta)",
  },
  authorityLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  insigniaTag: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: "0.08em",
    color: "var(--text-primary)",
  },
  barDivider: {
    color: "var(--border-strong)",
  },
  securityPill: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--sentinel-crimson)",
    backgroundColor: "var(--surface-secondary)",
    padding: "2px 8px",
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.05em",
  },
  jurisdictionText: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
  },
  authorityRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  casStatusPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-secondary)",
    padding: "2px 8px",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--surface-primary)",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block",
  },
  officerPill: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
    padding: "2px 8px",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--surface-secondary)",
  },
  themeToggleBtn: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  commandStage: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    maxWidth: "920px",
    width: "100%",
    margin: "0 auto",
  },
  brandContainer: {
    textAlign: "center",
    marginBottom: "28px",
  },
  brandTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "38px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: 1.1,
  },
  brandSubtitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "0.12em",
    color: "var(--text-muted)",
    marginTop: "8px",
    marginBottom: 0,
  },
  voiceAssistantPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 14px",
    borderRadius: "16px",
    border: "1px solid var(--border-structural)",
    backgroundColor: "var(--surface-primary)",
    marginBottom: "20px",
    transition: "all 0.2s ease",
  },
  voiceStatusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  voiceStateLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
  },
  liveTranscriptSnippet: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    color: "var(--text-primary)",
    fontStyle: "italic",
    maxWidth: "240px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  inquiryPromptContainer: {
    marginBottom: "24px",
    textAlign: "center",
  },
  inquiryPrompt: {
    fontFamily: "var(--font-display)",
    fontSize: "26px",
    fontWeight: 500,
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  inputContainer: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    padding: "6px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
    transition: "border-color 0.15s ease",
  },
  micButton: {
    width: "38px",
    height: "38px",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    flexShrink: 0,
  },
  commandInput: {
    flex: 1,
    height: "38px",
    backgroundColor: "transparent",
    border: "none",
    padding: "0 14px",
    fontSize: "15px",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    outline: "none",
  },
  investigateButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--primary-accent)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "0 14px",
    height: "38px",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    flexShrink: 0,
  },
  kbdShortcut: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: "1px 5px",
    borderRadius: "2px",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
  },
  feedbackBanner: {
    marginTop: "12px",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--status-gap)",
    backgroundColor: "var(--surface-secondary)",
    color: "var(--text-primary)",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  feedbackDismiss: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "12px",
  },
  shortcutLegend: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
  },
  subKbd: {
    backgroundColor: "var(--surface-secondary)",
    padding: "1px 4px",
    borderRadius: "2px",
    color: "var(--text-secondary)",
  },
  quickActionsSection: {
    marginTop: "44px",
    width: "100%",
  },
  quickActionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
    paddingBottom: "6px",
    borderBottom: "1px solid var(--border-structural)",
  },
  quickActionTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "0.08em",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  caseBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  quickChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
  },
  chipButton: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  chipTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  chipIcon: {
    fontSize: "14px",
    color: "var(--primary-accent)",
  },
  chipLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  chipDescription: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  caseSwitchBar: {
    marginTop: "32px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
  },
  caseSwitchLabel: {
    fontSize: "11px",
    letterSpacing: "0.05em",
  },
  caseSelectDropdown: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-primary)",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  bottomLevelBar: {
    height: "44px",
    backgroundColor: "var(--surface-primary)",
    borderTop: "1px solid var(--border-structural)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
  },
  levelSelector: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  levelBarLabel: {
    color: "var(--text-muted)",
    letterSpacing: "0.04em",
    marginRight: "6px",
  },
  levelPill: {
    backgroundColor: "transparent",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    transition: "all 0.15s ease",
  },
  activeLevelPill: {
    backgroundColor: "var(--surface-selected)",
    borderColor: "var(--primary-accent)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  statutoryFooter: {
    color: "var(--text-muted)",
    fontSize: "10px",
    letterSpacing: "0.05em",
  },
};

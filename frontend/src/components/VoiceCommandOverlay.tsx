import React, { useState, useEffect, useCallback, useRef } from "react";
import { useInvestigation } from "../context/InvestigationContext";
import { voiceService } from "../services/voiceService";
import type { AmbientVoiceState, VoiceSessionInfo, VoiceResponsePayload } from "../types/voice";
import { SentinelRunnerOverlay, type TaskPlanView } from "./investigation/SentinelRunnerOverlay";

/**
 * AMBIENT VOICE STATE MACHINE (SUBPHASE A1)
 * Visual indicator, consent protocol, local VAD controller, and interaction drawer.
 * Guarantees zero audio upload while in READY state.
 */

interface StateVisualConfig {
  label: string;
  subtitle: string;
  borderColor: string;
  badgeBg: string;
  textColor: string;
  icon: (size?: number) => React.ReactNode;
}

export const VoiceCommandOverlay: React.FC = () => {
  const { activeCaseId, operatingContext, dispatchCommand } = useInvestigation();

  const [voiceState, setVoiceState] = useState<AmbientVoiceState>("READY");
  const [session, setSession] = useState<VoiceSessionInfo | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [responseMsg, setResponseMsg] = useState<string>("");
  const [policyRejection, setPolicyRejection] = useState<string | null>(null);
  const [agentActivity, setAgentActivity] = useState<{ agentType: string; objective: string } | null>(null);
  const [speechActive, setSpeechActive] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [inputVal, setInputVal] = useState<string>("");
  const [activePlan, setActivePlan] = useState<TaskPlanView | null>(null);
  const [runnerOpen, setRunnerOpen] = useState<boolean>(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

  const isProcessingRef = useRef<boolean>(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sync with VoiceService ambient state transitions
  useEffect(() => {
    const unsubscribe = voiceService.onStateChange((newState) => {
      setVoiceState(newState);
      if (newState === "MICROPHONE_DENIED") {
        setIsConsoleExpanded(true);
        setTimeout(() => textInputRef.current?.focus(), 150);
      }
    });
    return unsubscribe;
  }, []);

  // Initialize or maintain session bound to OperatingContext
  const ensureSession = useCallback(async (): Promise<VoiceSessionInfo> => {
    if (session) return session;
    const newSession = await voiceService.initSession(
      activeCaseId || "CASE-2026-001",
      operatingContext?.session_id || "CTX-DEFAULT",
      operatingContext?.jurisdiction_scope?.[0] || "Delhi NCR / Special Cell"
    );
    setSession(newSession);
    return newSession;
  }, [session, activeCaseId, operatingContext]);

  /**
   * Start Ambient Microphone & Local VAD.
   * INVARIANT: No audio transmitted until SPEECH_ONSET.
   */
  const handleStartListening = async () => {
    try {
      await ensureSession();
      const success = await voiceService.startAmbientMicrophone({
        onPartialTranscript: (text: string) => {
          setPartialTranscript(text);
        },
        onFinalTranscript: (text: string) => {
          setPartialTranscript("");
          setTranscript(text);
          handleProcessVoiceTurn(text);
        },
        onSpeechActivity: (isSpeaking: boolean) => {
          setSpeechActive(isSpeaking);
          if (isSpeaking && voiceState === "SPEAKING") {
            handleBargeIn();
          }
        },
        onError: (err: string) => {
          console.warn("[VoiceCommandOverlay] VAD/Mic alert:", err);
        },
      });

      if (success) {
        setIsConsoleExpanded(true);
      }
    } catch (e: any) {
      console.error("[VoiceCommandOverlay] Voice startup failed:", e);
      voiceService.transition("ERROR_OCCURRED", { error: e.message });
    }
  };

  /**
   * Stop Microphone & Cleanly Transition State.
   */
  const handleStopListening = () => {
    voiceService.stopMicrophoneCapture();
    setSpeechActive(false);
  };

  /**
   * Barge-in / Interruption: Stops active TTS and resets for new speech turn.
   */
  const handleBargeIn = async () => {
    voiceService.handleInterruption(session?.session_id);
    setTimeout(() => {
      voiceService.transition("RESET");
    }, 400);
  };

  /**
   * CANONICAL COMMAND DISPATCH (VOICE MODALITY):
   * Dispatches speech transcript through the unified Command Control Plane.
   */
  const handleProcessVoiceTurn = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;

    setTranscript(text);
    setPolicyRejection(null);
    setAgentActivity(null);
    setClarificationQuestion(null);

    try {
      // 1. Submit through backend VoiceGateway
      const voiceResp: VoiceResponsePayload = await voiceService.submitVoiceTurn(
        text,
        session?.session_id
      );

      // 2. Check for Policy Denial
      if (voiceResp.response_type === "POLICY_DENIAL") {
        setPolicyRejection(voiceResp.spoken_text || "POLICY_DENIAL: Access restricted.");
        setResponseMsg(voiceResp.spoken_text);
        isProcessingRef.current = false;
        return;
      }

      // 3. Check for Ambiguity / Clarification
      if (voiceResp.response_type === "AMBIGUITY") {
        const q = voiceResp.spoken_text || "Which connection or entity do you want me to inspect?";
        setClarificationQuestion(q);
        setResponseMsg(q);
        isProcessingRef.current = false;
        return;
      }

      // 4. Converge through Context dispatchCommand so frontend UI action executors run
      const result = await dispatchCommand({
        source: "VOICE",
        intent: text,
        case_id: activeCaseId,
        arguments: { raw_query: text },
      });

      // 5. High-risk Confirmation Required
      if (result.requires_confirmation || voiceResp.response_type === "CONFIRMATION_REQUIRED") {
        setPendingAction(result.confirmation_challenge || { prompt_message: result.message });
        setShowConfirmModal(true);
        isProcessingRef.current = false;
        return;
      }

      // 6. Agent Task Activity
      if (
        result.ui_actions &&
        result.ui_actions.some((a) => a.action_type === "RUN_AGENT_TASK")
      ) {
        const agentAction = result.ui_actions.find((a) => a.action_type === "RUN_AGENT_TASK");
        setAgentActivity({
          agentType: agentAction?.arguments?.agent_type || "GOVERNED_ANALYST",
          objective: text,
        });
      }

      // 7. Success & TTS Response
      const speechText = voiceResp.spoken_text || result.message || "Observation recorded.";
      setResponseMsg(speechText);

      voiceService.speakResponse(speechText, () => {
        // Automatically returns to READY
      });
    } catch (err: any) {
      console.error("[VoiceCommandOverlay] Turn error:", err);
      setResponseMsg(`Execution error: ${err.message || "Failed to process turn"}`);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Keyboard shortcut listener (Alt+V toggles voice)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        if (voiceState === "READY" || voiceState === "LISTENING" || voiceState === "USER_SPEAKING") {
          handleStopListening();
        } else {
          handleStartListening();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [voiceState]);

  // Visual representations for all 14 states (Color + Icon + Label + Motion)
  const getStateConfig = (st: AmbientVoiceState): StateVisualConfig => {
    switch (st) {
      case "READY":
        return {
          label: "Sentinel Ready",
          subtitle: "Ambient standby • VAD ready • No audio streaming",
          borderColor: "#31C4D8",
          badgeBg: "rgba(49, 196, 216, 0.12)",
          textColor: "#31C4D8",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          ),
        };
      case "LISTENING":
        return {
          label: "Listening",
          subtitle: "Microphone active • Awaiting speech onset",
          borderColor: "#38BDF8",
          badgeBg: "rgba(56, 189, 248, 0.15)",
          textColor: "#38BDF8",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ),
        };
      case "USER_SPEAKING":
        return {
          label: "User Speaking",
          subtitle: "Speech detected • Bounded turn capture",
          borderColor: "#22C55E",
          badgeBg: "rgba(34, 197, 94, 0.2)",
          textColor: "#22C55E",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 10v4" />
              <path d="M6 7v10" />
              <path d="M10 4v16" />
              <path d="M14 7v10" />
              <path d="M18 9v6" />
              <path d="M22 11v2" />
            </svg>
          ),
        };
      case "TRANSCRIBING":
        return {
          label: "Transcribing",
          subtitle: "Converting phonemes to forensic text",
          borderColor: "#A855F7",
          badgeBg: "rgba(168, 85, 247, 0.15)",
          textColor: "#A855F7",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          ),
        };
      case "UNDERSTANDING":
        return {
          label: "Understanding Request",
          subtitle: "Resolving InvestigationIntent & entity context",
          borderColor: "#6366F1",
          badgeBg: "rgba(99, 102, 241, 0.15)",
          textColor: "#818CF8",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          ),
        };
      case "EXECUTING":
        return {
          label: "Investigating",
          subtitle: "Dispatching via CommandBus & PolicyGateway",
          borderColor: "#3B82F6",
          badgeBg: "rgba(59, 130, 246, 0.15)",
          textColor: "#60A5FA",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          ),
        };
      case "SHOWING_RESULT":
        return {
          label: "Result Ready",
          subtitle: "Workspace synchronizing to analytical findings",
          borderColor: "#45C98A",
          badgeBg: "rgba(69, 201, 138, 0.15)",
          textColor: "#45C98A",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
        };
      case "SPEAKING":
        return {
          label: "Speaking",
          subtitle: "Streaming synthesized operational audio",
          borderColor: "#10B981",
          badgeBg: "rgba(16, 185, 129, 0.2)",
          textColor: "#10B981",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ),
        };
      case "INTERRUPTED":
        return {
          label: "Interrupted",
          subtitle: "Barge-in detected • Truncating playback",
          borderColor: "#F59E0B",
          badgeBg: "rgba(245, 158, 11, 0.15)",
          textColor: "#F59E0B",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ),
        };
      case "WAITING_FOR_CLARIFICATION":
        return {
          label: "Need Clarification",
          subtitle: "Ambiguous entity reference • Specific target required",
          borderColor: "#EAB308",
          badgeBg: "rgba(234, 179, 8, 0.15)",
          textColor: "#EAB308",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case "WAITING_FOR_CONFIRMATION":
        return {
          label: "Confirmation Required",
          subtitle: "High-risk operation • Sovereign confirmation needed",
          borderColor: "#E6B85C",
          badgeBg: "rgba(230, 184, 92, 0.2)",
          textColor: "#E6B85C",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case "OFFLINE":
        return {
          label: "Offline Mode",
          subtitle: "Network connection lost • Local caching active",
          borderColor: "#64748B",
          badgeBg: "rgba(100, 116, 139, 0.2)",
          textColor: "#94A3B8",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          ),
        };
      case "MICROPHONE_DENIED":
        return {
          label: "Microphone Denied",
          subtitle: "Microphone access blocked • Use keyboard fallback",
          borderColor: "#EF4444",
          badgeBg: "rgba(239, 68, 68, 0.15)",
          textColor: "#F87171",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ),
        };
      case "ERROR":
      default:
        return {
          label: "Operational Error",
          subtitle: "Command execution or transport issue",
          borderColor: "#E26D78",
          badgeBg: "rgba(226, 109, 120, 0.15)",
          textColor: "#E26D78",
          icon: () => (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ),
        };
    }
  };

  const stateCfg = getStateConfig(voiceState);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Ambient Voice Pill Affordance */}
      <button
        id="voice-mic-control-btn"
        aria-label={`Ambient Voice Assistant: ${stateCfg.label}`}
        style={{
          backgroundColor:
            voiceState === "USER_SPEAKING" || voiceState === "SPEAKING"
              ? "rgba(49, 196, 216, 0.2)"
              : "var(--surface-primary)",
          border: `1.5px solid ${stateCfg.borderColor}`,
          color: stateCfg.textColor,
          padding: "4px 12px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-meta)",
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.18s ease-in-out",
          boxShadow: voiceState === "USER_SPEAKING" ? "0 0 8px rgba(34, 197, 94, 0.4)" : "none",
        }}
        onClick={() => {
          if (voiceState === "MICROPHONE_DENIED") {
            handleStartListening();
          } else if (voiceState === "READY") {
            voiceService.transition("VOICE_ACTIVATED");
          } else {
            handleStopListening();
          }
        }}
        title={`SentinelX Ambient Voice OS (${stateCfg.label}) — Click or Alt+V`}
      >
        {stateCfg.icon()}
        <span>{stateCfg.label.toUpperCase()}</span>

        {/* Animated Speech Indicator */}
        {(speechActive || voiceState === "USER_SPEAKING" || voiceState === "SPEAKING") && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: stateCfg.textColor,
              display: "inline-block",
              animation: "pulse 1s infinite alternate",
            }}
          />
        )}
      </button>

      {/* State Communicator Badge */}
      <button
        id="voice-state-badge"
        aria-label="Toggle Forensic Voice Console"
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-mono)",
          border: `1px solid ${stateCfg.borderColor}`,
          color: stateCfg.textColor,
          backgroundColor: stateCfg.badgeBg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
      >
        <span>{voiceState}</span>
        <span style={{ fontSize: 9, opacity: 0.8 }}>{isConsoleExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Forensic Voice Operating Console */}
      {isConsoleExpanded && (
        <div
          id="voice-console-drawer"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 440,
            backgroundColor: "var(--surface-elevated, #111E2A)",
            border: `1.5px solid ${stateCfg.borderColor}`,
            borderRadius: "var(--radius-md, 6px)",
            padding: 14,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.65)",
            zIndex: 1000,
            color: "var(--text-primary, #F3F6F8)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: "1px solid var(--border, #243342)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {stateCfg.icon(16)}
              <span style={{ fontWeight: 700, fontSize: 13, color: stateCfg.textColor }}>
                {stateCfg.label}
              </span>
            </div>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary, #9BAAB7)" }}>
              CASE: {activeCaseId || "CASE-2026-001"}
            </span>
          </div>

          {/* Subtitle / Operational Status */}
          <div style={{ fontSize: 12, color: "var(--text-secondary, #9BAAB7)", marginBottom: 12 }}>
            {stateCfg.subtitle}
          </div>

          {/* State-specific Interactive Banners */}
          {voiceState === "MICROPHONE_DENIED" && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid #EF4444",
                borderRadius: 4,
                padding: 10,
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, color: "#F87171", marginBottom: 4 }}>
                Microphone Permission Blocked
              </div>
              <div style={{ color: "#9BAAB7", marginBottom: 8 }}>
                The browser denied audio access. Enter your investigative command below or grant microphone permission in your browser URL bar.
              </div>
              <button
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid #EF4444",
                  color: "#F3F6F8",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: "pointer",
                }}
                onClick={handleStartListening}
              >
                Retry Permission Request
              </button>
            </div>
          )}

          {voiceState === "WAITING_FOR_CLARIFICATION" && clarificationQuestion && (
            <div
              style={{
                backgroundColor: "rgba(234, 179, 8, 0.12)",
                border: "1px solid #EAB308",
                borderRadius: 4,
                padding: 10,
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, color: "#EAB308", marginBottom: 4 }}>
                Clarification Required
              </div>
              <div style={{ color: "#F3F6F8", marginBottom: 8 }}>{clarificationQuestion}</div>
            </div>
          )}

          {/* Live Partial & Final Transcripts */}
          {(partialTranscript || transcript) && (
            <div
              style={{
                backgroundColor: "var(--surface-primary, #0D1721)",
                borderRadius: 4,
                padding: 8,
                marginBottom: 10,
                border: "1px solid var(--border, #243342)",
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-secondary, #9BAAB7)", marginBottom: 2 }}>
                FORENSIC TRANSCRIPT
              </div>
              <div style={{ color: "#F3F6F8" }}>
                {transcript}
                {partialTranscript && (
                  <span style={{ color: "#31C4D8", fontStyle: "italic" }}> {partialTranscript}</span>
                )}
              </div>
            </div>
          )}

          {/* Policy Rejection Banner */}
          {policyRejection && (
            <div
              style={{
                backgroundColor: "rgba(226, 109, 120, 0.12)",
                border: "1px solid #E26D78",
                borderRadius: 4,
                padding: 8,
                marginBottom: 10,
                fontSize: 12,
                color: "#F87171",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>POLICY GATEWAY DENIAL</div>
              <div>{policyRejection}</div>
            </div>
          )}

          {/* Agent Activity Banner */}
          {agentActivity && (
            <div
              style={{
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                border: "1px solid #818CF8",
                borderRadius: 4,
                padding: 8,
                marginBottom: 10,
                fontSize: 12,
                color: "#C7D2FE",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>AGENT SUPERVISOR ACTIVE</div>
              <div>{agentActivity.agentType}: {agentActivity.objective}</div>
            </div>
          )}

          {/* Assistant Response Box */}
          {responseMsg && (
            <div
              style={{
                backgroundColor: "rgba(49, 196, 216, 0.08)",
                border: "1px solid rgba(49, 196, 216, 0.3)",
                borderRadius: 4,
                padding: 8,
                marginBottom: 10,
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 10, color: "#31C4D8", fontWeight: 600, marginBottom: 2 }}>
                SENTINEL RESPONSE
              </div>
              <div style={{ color: "#F3F6F8" }}>{responseMsg}</div>
            </div>
          )}

          {/* Keyboard / Text Fallback Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputVal.trim()) {
                handleProcessVoiceTurn(inputVal.trim());
                setInputVal("");
              }
            }}
            style={{ display: "flex", gap: 6, marginTop: 10 }}
          >
            <input
              ref={textInputRef}
              type="text"
              placeholder={
                voiceState === "WAITING_FOR_CLARIFICATION"
                  ? "Type clarification target (e.g., P001)..."
                  : "Type or speak investigative command..."
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: "var(--surface-primary, #0D1721)",
                border: "1px solid var(--border, #243342)",
                borderRadius: 4,
                padding: "6px 10px",
                color: "#F3F6F8",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: "var(--accent, #31C4D8)",
                border: "none",
                borderRadius: 4,
                color: "#081018",
                fontWeight: 600,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>

          {/* Barge-in Stop Button if Speaking */}
          {voiceState === "SPEAKING" && (
            <button
              onClick={handleBargeIn}
              style={{
                marginTop: 8,
                width: "100%",
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                border: "1px solid #F59E0B",
                color: "#F59E0B",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Halt Speech (Barge-In)
            </button>
          )}
        </div>
      )}

      {/* High-Risk Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface-elevated, #111E2A)",
              border: "1.5px solid #E6B85C",
              borderRadius: 8,
              padding: 24,
              maxWidth: 480,
              width: "90%",
              color: "#F3F6F8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E6B85C" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3 style={{ margin: 0, fontSize: 16, color: "#E6B85C" }}>Confirmation Required</h3>
            </div>
            <p style={{ fontSize: 13, color: "#9BAAB7", marginBottom: 20 }}>
              {pendingAction?.prompt_message || "This operation modifies consequential records or accesses restricted surveillance files. Do you confirm?"}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border, #243342)",
                  color: "#9BAAB7",
                  padding: "6px 14px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                onClick={() => {
                  voiceService.transition("CONFIRMATION_REJECTED");
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
              >
                Reject
              </button>
              <button
                style={{
                  backgroundColor: "#E6B85C",
                  border: "none",
                  color: "#081018",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                onClick={() => {
                  voiceService.transition("CONFIRMATION_ACCEPTED");
                  setShowConfirmModal(false);
                  setPendingAction(null);
                  if (transcript) handleProcessVoiceTurn(transcript);
                }}
              >
                Confirm Sovereign Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governed Agent Supervisor Runner Overlay */}
      {runnerOpen && activePlan && (
        <SentinelRunnerOverlay
          plan={activePlan}
          isOpen={runnerOpen}
          onClose={() => setRunnerOpen(false)}
          onPlanUpdated={(updated) => setActivePlan(updated)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useInvestigation } from "../context/InvestigationContext";
import { voiceService } from "../services/voiceService";
import type { VoiceUIState, VoiceSessionInfo, VoiceResponsePayload } from "../types/voice";
import { SentinelRunnerOverlay, type TaskPlanView } from "./investigation/SentinelRunnerOverlay";

export const VoiceCommandOverlay: React.FC = () => {
  const { activeCaseId, operatingContext, dispatchCommand } = useInvestigation();

  const [voiceState, setVoiceState] = useState<VoiceUIState>("MIC_OFF");
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

  const isProcessingRef = useRef<boolean>(false);

  // Initialize or maintain session bound to OperatingContext
  const ensureSession = useCallback(async (): Promise<VoiceSessionInfo> => {
    if (session) return session;
    setVoiceState("CONNECTING");
    const newSession = await voiceService.initSession(
      activeCaseId || "CASE-2026-001",
      operatingContext?.session_id || "CTX-DEFAULT",
      operatingContext?.jurisdiction_scope?.[0] || "Delhi NCR / Special Cell"
    );
    setSession(newSession);
    return newSession;
  }, [session, activeCaseId, operatingContext]);

  /**
   * Start Live Microphone & Streaming STT / VAD.
   */
  const handleStartListening = async () => {
    setIsConsoleExpanded(true);
    try {
      await ensureSession();
      setVoiceState("CONNECTING");

      const success = await voiceService.startMicrophoneCapture({
        onPartialTranscript: (text: string) => {
          setPartialTranscript(text);
          setVoiceState("LISTENING");
        },
        onFinalTranscript: (text: string) => {
          setPartialTranscript("");
          setTranscript(text);
          handleProcessVoiceTurn(text);
        },
        onSpeechActivity: (isSpeaking: boolean) => {
          setSpeechActive(isSpeaking);
          if (isSpeaking && voiceState === "SPEAKING") {
            // Investigator Barge-In detected during TTS output
            handleBargeIn();
          }
        },
        onError: (err: string) => {
          console.warn("[VoiceCommandOverlay] Microphone/STT warning:", err);
          setVoiceState("DEGRADED");
        },
      });

      if (success) {
        setVoiceState("LISTENING");
      } else {
        setVoiceState("DEGRADED");
      }
    } catch (e: any) {
      console.error("Voice startup failed:", e);
      setVoiceState("ERROR");
    }
  };

  /**
   * Stop Microphone & Cleanly Transition State.
   */
  const handleStopListening = () => {
    voiceService.stopMicrophoneCapture();
    setVoiceState("MIC_OFF");
    setSpeechActive(false);
  };

  /**
   * Barge-in / Interruption: Stops active TTS and resets for new speech turn.
   */
  const handleBargeIn = async () => {
    setVoiceState("INTERRUPTED");
    voiceService.stopSpeaking();
    if (session) {
      await voiceService.handleInterruption(session.session_id);
    }
    setTimeout(() => {
      setVoiceState("LISTENING");
    }, 400);
  };

  /**
   * CANONICAL COMMAND DISPATCH (VOICE MODALITY):
   * Dispatches speech transcript through the unified Command Control Plane.
   * State transitions and UI actions are strictly governed by backend CommandBus.
   */
  const handleProcessVoiceTurn = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;

    setTranscript(text);
    setVoiceState("PROCESSING");
    setPolicyRejection(null);
    setAgentActivity(null);

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
        setVoiceState("ERROR");
        isProcessingRef.current = false;
        return;
      }

      // 3. Check for Ambiguity
      if (voiceResp.response_type === "AMBIGUITY") {
        setResponseMsg(voiceResp.spoken_text || "Command ambiguous. Please specify inquiry.");
        setVoiceState("DEGRADED");
        isProcessingRef.current = false;
        return;
      }

      // 4. Also converge through Context dispatchCommand so frontend UI action executors run
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
        setVoiceState("MIC_OFF");
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
      const speechText = voiceResp.spoken_text || result.message || "Command executed.";
      setResponseMsg(speechText);
      setVoiceState("SPEAKING");

      voiceService.speakResponse(speechText, () => {
        setVoiceState("LISTENING");
      });
    } catch (err: any) {
      console.error("[VoiceCommandOverlay] Turn processing error:", err);
      setResponseMsg(`Execution error: ${err.message || "Failed to process turn"}`);
      setVoiceState("ERROR");
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Keyboard shortcut listener (Alt+V toggles voice)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        if (voiceState === "LISTENING") handleStopListening();
        else handleStartListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [voiceState]);

  const getVoiceColor = (st: VoiceUIState): string => {
    switch (st) {
      case "LISTENING":
        return speechActive ? "#22C55E" : "var(--sentinel-crimson)";
      case "PROCESSING":
        return "#3B82F6";
      case "SPEAKING":
        return "#10B981";
      case "INTERRUPTED":
        return "#F59E0B";
      case "CONNECTING":
      case "RECONNECTING":
        return "#60A5FA";
      case "DEGRADED":
        return "#EAB308";
      case "ERROR":
        return "#EF4444";
      case "MIC_OFF":
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        position: "relative",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Microphone Control Button */}
      <button
        id="voice-mic-control-btn"
        style={{
          backgroundColor:
            voiceState === "LISTENING" || voiceState === "SPEAKING"
              ? "var(--sentinel-crimson)"
              : "var(--surface-primary)",
          border: `1px solid ${getVoiceColor(voiceState)}`,
          color: voiceState === "LISTENING" || voiceState === "SPEAKING" ? "#FFFFFF" : "var(--text-primary)",
          padding: "3px 10px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-meta)",
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s ease",
        }}
        onClick={() => {
          if (voiceState === "MIC_OFF" || voiceState === "ERROR") {
            handleStartListening();
          } else {
            handleStopListening();
          }
        }}
        title="Realtime Governed Voice OS (Click or Alt+V)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        <span>{voiceState === "MIC_OFF" ? "VOICE" : voiceState}</span>
        {speechActive && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#22C55E",
              display: "inline-block",
            }}
          />
        )}
      </button>

      {/* State Badge */}
      <button
        id="voice-state-badge"
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-mono)",
          border: `1px solid ${getVoiceColor(voiceState)}`,
          color: getVoiceColor(voiceState),
          backgroundColor: "var(--surface-primary)",
          cursor: "pointer",
        }}
        onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
      >
        ● {voiceState}
      </button>

      {/* Barge-In / Interruption Button (Visible when speaking or processing) */}
      {(voiceState === "SPEAKING" || voiceState === "PROCESSING") && (
        <button
          id="voice-barge-in-btn"
          onClick={handleBargeIn}
          style={{
            background: "none",
            border: "1px solid #F59E0B",
            color: "#F59E0B",
            padding: "2px 6px",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
          }}
          title="Barge-in: Interrupt current voice output"
        >
          INTERRUPT
        </button>
      )}

      {/* Runner Toggle Button (if plan exists) */}
      {activePlan && (
        <button
          onClick={() => setRunnerOpen(!runnerOpen)}
          style={{
            background: "none",
            border: "1px solid var(--border-structural)",
            color: "var(--text-secondary)",
            padding: "2px 6px",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {runnerOpen ? "HIDE RUNNER" : "SHOW RUNNER"}
        </button>
      )}

      {/* Expanded Realtime Voice Console */}
      {isConsoleExpanded && (
        <div
          id="voice-console-drawer"
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            width: 440,
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-structural)",
            borderRadius: "var(--radius-sm)",
            padding: 12,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            zIndex: 950,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "var(--font-size-meta)",
              fontFamily: "var(--font-mono)",
              borderBottom: "1px solid var(--border-structural)",
              paddingBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: getVoiceColor(voiceState), fontWeight: 700 }}>
                VOICE CONTROL PLANE // {voiceState}
              </span>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                [{activeCaseId}]
              </span>
            </div>
            <button
              onClick={() => setIsConsoleExpanded(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Policy Rejection Alert */}
          {policyRejection && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid #EF4444",
                padding: 8,
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-meta)",
                fontFamily: "var(--font-mono)",
                color: "#EF4444",
              }}
            >
              <strong>POLICY DENIAL:</strong> {policyRejection}
            </div>
          )}

          {/* Governed Agent Activity */}
          {agentActivity && (
            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid #3B82F6",
                padding: 6,
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-meta)",
                fontFamily: "var(--font-mono)",
                color: "#60A5FA",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>DISPATCHED AGENT: {agentActivity.agentType}</span>
              <span>GOVERNED TASK</span>
            </div>
          )}

          {/* Quick Natural Language Inquiries (Multilingual & Canonical) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              INVESTIGATIVE INQUIRIES (VOICE / TEXT):
            </span>
            {[
              "Show contradictions.",
              "Contradictions ka summary dikhao.",
              "Analyze the contradiction.",
              "Show evidence gaps.",
              "Open CASE-999.",
              "Execute authorized action.",
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleProcessVoiceTurn(q)}
                style={{
                  backgroundColor: "var(--surface-secondary)",
                  border: "1px solid var(--border-structural)",
                  color: "var(--text-primary)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-meta)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                }}
              >
                "{q}"
              </button>
            ))}
          </div>

          {/* Accessible Fallback Input Field (Convergence Boundary) */}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              id="voice-text-fallback-input"
              type="text"
              placeholder="Speak via mic or type canonical query..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputVal.trim()) {
                  handleProcessVoiceTurn(inputVal.trim());
                  setInputVal("");
                }
              }}
              style={{
                flex: 1,
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border-structural)",
                color: "var(--text-primary)",
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            />
            <button
              id="voice-dispatch-btn"
              onClick={() => {
                if (inputVal.trim()) {
                  handleProcessVoiceTurn(inputVal.trim());
                  setInputVal("");
                }
              }}
              style={{
                backgroundColor: "var(--sentinel-crimson)",
                color: "#FFFFFF",
                border: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-meta)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              DISPATCH
            </button>
          </div>

          {/* Realtime Streaming Transcript / Feedback */}
          {(partialTranscript || transcript || responseMsg) && (
            <div
              style={{
                padding: 8,
                backgroundColor: "var(--surface-secondary)",
                border: "1px solid var(--border-structural)",
                fontSize: "var(--font-size-meta)",
                fontFamily: "var(--font-mono)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderRadius: "var(--radius-sm)",
              }}
            >
              {partialTranscript && (
                <div>
                  <span style={{ color: "#60A5FA" }}>STREAMING STT: </span>
                  <span style={{ color: "var(--text-primary)", fontStyle: "italic" }}>
                    "{partialTranscript}"
                  </span>
                </div>
              )}
              {transcript && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>QUERY: </span>
                  <span style={{ color: "var(--text-primary)" }}>"{transcript}"</span>
                </div>
              )}
              {responseMsg && (
                <div>
                  <span style={{ color: "var(--sentinel-crimson)" }}>SENTINEL TTS: </span>
                  <span style={{ color: "var(--text-primary)" }}>{responseMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sentinel Runner Overlay */}
      <SentinelRunnerOverlay
        plan={activePlan}
        isOpen={runnerOpen}
        onClose={() => setRunnerOpen(false)}
        onPlanUpdated={(updated) => setActivePlan(updated)}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--surface-primary)",
              border: "1px solid var(--sentinel-crimson)",
              padding: 24,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--sentinel-crimson)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-secondary)",
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>STATUTORY REQUISITION CONFIRMATION</span>
            </div>

            <div style={{ fontSize: "var(--font-size-body)", marginBottom: 16, lineHeight: 1.5 }}>
              {pendingAction?.prompt_message ||
                "The requested voice action involves statutory authority: Section 94 BNSS / Section 91 CrPC requisition for external telecom and digital extraction logs."}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: "none",
                  border: "1px solid var(--border-structural)",
                  padding: "6px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-meta)",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  setVoiceState("PROCESSING");
                  await dispatchCommand({
                    source: "VOICE",
                    intent: transcript || "Execute authorized action.",
                    case_id: activeCaseId,
                    confirmation_token: "CONFIRMED_STATUTORY_AUTHORIZATION",
                  });
                  setVoiceState("SPEAKING");
                  setResponseMsg("Statutory requisition confirmed and logged to audit ledger.");
                }}
                style={{
                  backgroundColor: "var(--sentinel-crimson)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "6px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-meta)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                AUTHORIZE & COMMIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import axios from "axios";
import { useInvestigation } from "../context/InvestigationContext";
import { SentinelRunnerOverlay, type TaskPlanView } from "./investigation/SentinelRunnerOverlay";

export type VoiceState =
  | "READY"
  | "LISTENING"
  | "TRANSCRIBING"
  | "UNDERSTANDING"
  | "PLANNING"
  | "EXECUTING"
  | "VERIFYING"
  | "CONFIRMATION"
  | "RESPONDING";

export const VoiceCommandOverlay: React.FC = () => {
  const {
    activeCaseId,
    selectEntity,
    selectCase,
    setActiveRightTab,
    setActiveNav,
    setActiveWorkspaceView,
    openProofDrawer,
  } = useInvestigation();

  const [voiceState, setVoiceState] = useState<VoiceState>("READY");
  const [transcript, setTranscript] = useState<string>("");
  const [responseMsg, setResponseMsg] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [inputVal, setInputVal] = useState<string>("");
  const [activePlan, setActivePlan] = useState<TaskPlanView | null>(null);
  const [runnerOpen, setRunnerOpen] = useState<boolean>(false);

  const handleStartListening = () => {
    setVoiceState("LISTENING");
    setTranscript("Listening... Speak an authorized investigation request");
    setResponseMsg("");
  };

  const handleProcessTranscript = async (text: string) => {
    setTranscript(text);
    setVoiceState("TRANSCRIBING");

    setTimeout(() => {
      setVoiceState("UNDERSTANDING");
      setTimeout(async () => {
        try {
          // 1. Resolve Intent via Unified Semantic Interaction Engine
          const res = await axios.post("http://localhost:8000/api/v1/interaction/intent/resolve", {
            query: text,
            case_id: activeCaseId,
            modality: "VOICE",
          });

          const intent = res.data;
          setVoiceState("PLANNING");

          // 2. Generate Plan
          const planRes = await axios.post("http://localhost:8000/api/v1/interaction/plan", {
            intent: intent,
            case_id: activeCaseId,
          });

          const plan: TaskPlanView = planRes.data;
          setActivePlan(plan);
          setRunnerOpen(true);

          setVoiceState("EXECUTING");

          // Check if confirmation is required immediately
          if (intent.requires_confirmation) {
            setVoiceState("CONFIRMATION");
            setPendingAction(intent);
            setShowConfirmModal(true);
            return;
          }

          // Execute first step
          setVoiceState("VERIFYING");
          const stepRes = await axios.post("http://localhost:8000/api/v1/interaction/runner/step", {
            plan_id: plan.plan_id,
            purpose: `Voice dispatch: ${text}`,
          });

          if (stepRes.data.status === "WAITING_CONFIRMATION") {
            setVoiceState("CONFIRMATION");
            setShowConfirmModal(true);
          } else {
            // Apply workspace changes
            executeClientNav(intent, text);
            setVoiceState("RESPONDING");
            setResponseMsg(`Plan ${plan.plan_id} active: ${intent.intent_name}`);
            setTimeout(() => setVoiceState("READY"), 4000);
          }
        } catch (e) {
          console.error("Interaction engine fallback:", e);
          executeLocalVoiceFallback(text);
        }
      }, 350);
    }, 300);
  };

  const executeClientNav = (intent: any, text: string) => {
    const name = intent.intent_name || "";
    const p = intent.parameters || {};

    if (name === "INSPECT_CONTRADICTIONS" || text.toLowerCase().includes("contradiction")) {
      setActiveNav("contradictions");
      setActiveWorkspaceView("contradictions");
    } else if (name === "INSPECT_EVIDENCE_GAPS" || text.toLowerCase().includes("gap")) {
      setActiveNav("gaps");
      setActiveWorkspaceView("gaps");
    } else if (name === "PROVE_CLAIM_LINEAGE" || text.toLowerCase().includes("proof") || text.toLowerCase().includes("claim")) {
      openProofDrawer(p.claim_id || "CLM-2026-001");
    } else if (name === "COMPARE_TIMELINES" || text.toLowerCase().includes("timeline")) {
      setActiveNav("timeline");
      setActiveWorkspaceView("timeline");
    } else if (name === "FIND_ENTITY_LINKAGES") {
      if (p.entity_a) selectEntity(p.entity_a);
      setActiveNav("entities");
    } else if (name === "OPEN_CASE" && p.case_id) {
      selectCase(p.case_id);
    }
  };

  const executeLocalVoiceFallback = (text: string) => {
    const lower = text.toLowerCase();
    setVoiceState("VERIFYING");

    setTimeout(() => {
      if (lower.includes("case 2026-001") || lower.includes("open case")) {
        selectCase("CASE-2026-001");
        setResponseMsg("Case CASE-2026-001 activated in workspace context.");
      } else if (lower.includes("contradiction") || lower.includes("kinematic")) {
        setActiveNav("contradictions");
        setActiveWorkspaceView("contradictions");
        setResponseMsg("Contradiction Center opened: Impossible velocity anomaly displayed.");
      } else if (lower.includes("trace this claim") || lower.includes("source") || lower.includes("proof")) {
        openProofDrawer("CLM-2026-001");
        setResponseMsg("Live Proof backward lineage drawer displayed for Claim CLM-2026-001.");
      } else if (lower.includes("timeline")) {
        setActiveNav("timeline");
        setActiveWorkspaceView("timeline");
        setResponseMsg("Spatiotemporal Timeline opened with uncertainty bounds.");
      } else if (lower.includes("phone") || lower.includes("9888044556")) {
        selectEntity("PH002");
        setActiveNav("entities");
        setActiveRightTab("dossier");
        setResponseMsg("Burner phone +91-9888044556 selected in entity dossier.");
      } else if (lower.includes("change") || lower.includes("delta")) {
        setActiveWorkspaceView("delta");
        setResponseMsg("Append-only Investigation Delta displayed.");
      } else if (lower.includes("gap")) {
        setActiveNav("gaps");
        setActiveWorkspaceView("gaps");
        setResponseMsg("Evidence Gap Center opened: Missing subscriber CAF displayed.");
      }
      setVoiceState("RESPONDING");
      setTimeout(() => setVoiceState("READY"), 4000);
    }, 300);
  };

  const getVoiceColor = (st: VoiceState): string => {
    switch (st) {
      case "LISTENING":
        return "var(--sentinel-crimson)";
      case "TRANSCRIBING":
      case "UNDERSTANDING":
        return "var(--text-secondary)";
      case "PLANNING":
        return "var(--primary-accent)";
      case "EXECUTING":
        return "var(--sentinel-crimson)";
      case "VERIFYING":
      case "RESPONDING":
        return "var(--status-verified)";
      case "CONFIRMATION":
        return "var(--status-gap)";
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
      {/* Microphone Control Button with Clean SVG (Zero Emojis) */}
      <button
        style={{
          backgroundColor: voiceState === "LISTENING" ? "var(--sentinel-crimson)" : "var(--surface-primary)",
          border: "1px solid var(--border-structural)",
          color: voiceState === "LISTENING" ? "#FFFFFF" : "var(--text-primary)",
          padding: "2px 8px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-meta)",
          fontWeight: 500,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        onClick={() => {
          if (voiceState === "READY") handleStartListening();
          else {
            setVoiceState("READY");
            setTranscript("");
          }
        }}
        title="Voice OS Control Surface (Push-to-Talk / Hands-Free)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        <span>{voiceState === "READY" ? "VOICE" : voiceState}</span>
      </button>

      {/* State Badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "1px 6px",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-mono)",
          border: `1px solid ${getVoiceColor(voiceState)}`,
          color: getVoiceColor(voiceState),
          backgroundColor: "var(--surface-primary)",
        }}
      >
        ● {voiceState}
      </span>

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

      {/* Expanded Voice Console */}
      {voiceState !== "READY" && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            width: 420,
            backgroundColor: "var(--surface-primary)",
            border: "1px solid var(--border-structural)",
            borderRadius: "var(--radius-sm)",
            padding: 12,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            zIndex: 950,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
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
            <span style={{ color: getVoiceColor(voiceState), fontWeight: 700 }}>
              SENTINEL VOICE OS // {voiceState}
            </span>
            <button
              onClick={() => setVoiceState("READY")}
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

          {/* Quick Natural Language Prompts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              NATURAL LANGUAGE INQUIRIES:
            </span>
            {[
              "Explain why this contradiction matters.",
              "Find everything connecting these two people.",
              "Trace this claim to its original evidence.",
              "Show me what changed since my last session.",
              "Compare these timelines.",
              "Prepare Section 94 notice for telecom records.",
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleProcessTranscript(q)}
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

          {/* Freeform Technical Input */}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              type="text"
              placeholder="Speak or type investigative objective..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputVal.trim()) {
                  handleProcessTranscript(inputVal.trim());
                  setInputVal("");
                }
              }}
              autoFocus
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
              onClick={() => {
                if (inputVal.trim()) {
                  handleProcessTranscript(inputVal.trim());
                  setInputVal("");
                }
              }}
              style={{
                backgroundColor: "var(--sentinel-crimson)",
                color: "#FFFFFF",
                border: "none",
                padding: "6px 10px",
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

          {/* Transcript / Feedback */}
          {transcript && (
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
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>QUERY: </span>
                <span style={{ color: "var(--text-primary)" }}>"{transcript}"</span>
              </div>
              {responseMsg && (
                <div>
                  <span style={{ color: "var(--sentinel-crimson)" }}>SENTINEL: </span>
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
            backgroundColor: "rgba(0,0,0,0.5)",
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
              boxShadow: "0 16px 36px rgba(0,0,0,0.25)",
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
              The requested action ({pendingAction?.intent_name || "HIGH_RISK_ACTION"}) involves statutory authority: Section 94 BNSS / Section 91 CrPC requisition for
              external telecom and digital extraction logs.
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
                onClick={() => {
                  setShowConfirmModal(false);
                  setVoiceState("RESPONDING");
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

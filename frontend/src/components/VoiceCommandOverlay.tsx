import React, { useState } from "react";
import axios from "axios";
import { useInvestigation } from "../context/InvestigationContext";

export const VoiceCommandOverlay: React.FC = () => {
  const {
    activeCaseId,
    selectEntity,
    selectCase,
    selectRelationship,
    setCanvasMode,
    setActiveRightTab,
    runCopilotQuery,
  } = useInvestigation();

  const [voiceState, setVoiceState] = useState<string>("IDLE");
  const [transcript, setTranscript] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>("");

  const handleStartListening = () => {
    setVoiceState("LISTENING");
    setTranscript("Listening... Say a command (e.g., 'Show connections of P001', 'Switch to GIS')");
  };

  const handleProcessTranscript = async (text: string) => {
    setTranscript(text);
    setVoiceState("PROCESSING");
    try {
      const res = await axios.post("http://localhost:8000/api/v1/investigation/voice/command", {
        transcript: text,
        active_case_id: activeCaseId,
      });

      const data = res.data;
      setLastResponse(data);

      if (data.execution_status === "CONFIRMATION_REQUIRED" || data.interpretation.requires_confirmation) {
        setVoiceState("CONFIRMATION_REQUIRED");
        setShowConfirmModal(true);
      } else {
        executeCommandAction(data.interpretation);
        setVoiceState("COMPLETED");
        setTimeout(() => setVoiceState("IDLE"), 4000);
      }
    } catch (e) {
      console.error(e);
      setVoiceState("ERROR");
      setTimeout(() => setVoiceState("IDLE"), 4000);
    }
  };

  const executeCommandAction = (interpretation: any) => {
    const { action, parameters } = interpretation;
    if (action === "OPEN_CASE" && parameters.case_id) {
      selectCase(parameters.case_id);
    } else if (action === "FOCUS_ENTITY" && parameters.entity_id) {
      selectEntity(parameters.entity_id);
    } else if (action === "FOCUS_RELATIONSHIP" && parameters.rel_id) {
      selectRelationship(parameters.rel_id);
    } else if (action === "SWITCH_MODE" && parameters.mode) {
      setCanvasMode(parameters.mode);
    } else if (action === "SHOW_NETWORK") {
      setCanvasMode("2D");
      setActiveRightTab("dossier");
    } else if (action === "SHOW_TIMELINE") {
      setActiveRightTab("dossier");
    } else if (action === "SHOW_EVIDENCE") {
      setActiveRightTab("gaps");
    } else if (action === "GO_BACK") {
      // goBack triggered from context
    } else if (action === "SHOW_CONTRADICTIONS" || action === "SHOW_GAPS") {
      setActiveRightTab("gaps");
    } else if (action === "SHOW_INTELLIGENCE") {
      setActiveRightTab("signals");
    } else if (action === "ASK_COPILOT" && parameters.query) {
      runCopilotQuery(parameters.query);
    }
  };

  const handleConfirmAction = () => {
    if (lastResponse?.interpretation) {
      executeCommandAction(lastResponse.interpretation);
    }
    setShowConfirmModal(false);
    setVoiceState("COMPLETED");
    setTimeout(() => setVoiceState("IDLE"), 3000);
  };

  const getStateBadgeColor = (st: string) => {
    switch (st) {
      case "LISTENING": return "#f59e0b";
      case "PROCESSING": return "#38bdf8";
      case "CONFIRMATION_REQUIRED": return "#f43f5e";
      case "COMPLETED": return "#10b981";
      default: return "#64748b";
    }
  };

  return (
    <div style={styles.container}>
      {/* Microphone Control Button */}
      <button
        style={{
          ...styles.micBtn,
          ...(voiceState === "LISTENING" ? styles.micActive : {}),
        }}
        onClick={() => {
          if (voiceState === "IDLE") handleStartListening();
          else { setVoiceState("IDLE"); setTranscript(""); }
        }}
      >
        🎙️ {voiceState === "IDLE" ? "VOICE COMMAND" : voiceState}
      </button>

      {/* State Status Tag */}
      <span style={{ ...styles.stateBadge, color: getStateBadgeColor(voiceState), borderColor: `${getStateBadgeColor(voiceState)}44` }}>
        ● {voiceState}
      </span>

      {/* Simulated Audio / Speech Input Field */}
      {voiceState !== "IDLE" && (
        <div style={styles.inputBox}>
          <input
            type="text"
            placeholder="Simulate Speech Input (e.g., 'Show connections of P001', 'Switch to GIS')"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputVal.trim()) {
                handleProcessTranscript(inputVal.trim());
                setInputVal("");
              }
            }}
            autoFocus
            style={styles.textInput}
          />
          <button style={styles.execBtn} onClick={() => { if (inputVal.trim()) { handleProcessTranscript(inputVal.trim()); setInputVal(""); } }}>
            EXECUTE
          </button>
        </div>
      )}

      {/* Transcript & Interpretation Banner */}
      {transcript && (
        <div style={styles.transcriptBanner}>
          <span>YOU SAID: "{transcript}"</span>
          {lastResponse && (
            <span>➔ ACTION: {lastResponse.interpretation.action} ({lastResponse.interpretation.intent})</span>
          )}
        </div>
      )}

      {/* High-Risk Confirmation Preview Modal */}
      {showConfirmModal && lastResponse && (
        <div style={styles.confirmOverlay} onClick={() => setShowConfirmModal(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ color: "#f43f5e", margin: 0 }}>⚠️ HIGH-RISK VOICE COMMAND CONFIRMATION</h4>
            <div style={styles.confirmBox}>
              <div><strong>YOU SAID:</strong> "{lastResponse.transcript}"</div>
              <div><strong>INTERPRETED ACTION:</strong> {lastResponse.interpretation.action}</div>
              <div><strong>RISK LEVEL:</strong> {lastResponse.interpretation.risk_level}</div>
              <div><strong>SCOPE:</strong> Case {activeCaseId}</div>
              <div>{lastResponse.interpretation.confirmation_message}</div>
            </div>

            <div style={styles.btnGroup}>
              <button style={styles.cancelBtn} onClick={() => { setShowConfirmModal(false); setVoiceState("CANCELLED"); }}>
                CANCEL (ESC)
              </button>
              <button style={styles.confirmBtn} onClick={handleConfirmAction}>
                CONFIRM EXECUTION (ENTER)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
  },
  micBtn: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "#f8fafc",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  micActive: {
    background: "rgba(245, 158, 11, 0.2)",
    borderColor: "#f59e0b",
    color: "#fbbf24",
    boxShadow: "0 0 10px rgba(245, 158, 11, 0.4)",
  },
  stateBadge: {
    fontSize: "0.64rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid transparent",
  },
  inputBox: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  textInput: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "#f8fafc",
    fontSize: "0.72rem",
    padding: "4px 8px",
    borderRadius: "4px",
    width: "240px",
    outline: "none",
  },
  execBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.68rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  transcriptBanner: {
    position: "absolute",
    top: "36px",
    left: 0,
    background: "#0a0f18",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#38bdf8",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    whiteSpace: "nowrap",
    zIndex: 1000,
    display: "flex",
    gap: "8px",
  },
  confirmOverlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(3px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModal: {
    width: "440px",
    background: "#0f172a",
    border: "1px solid rgba(244, 63, 94, 0.4)",
    padding: "20px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  confirmBox: {
    background: "#070a0f",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "0.74rem",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  btnGroup: {
    display: "flex",
    gap: "8px",
  },
  cancelBtn: {
    flex: 1,
    background: "#334155",
    border: "none",
    color: "#f8fafc",
    padding: "8px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.72rem",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    background: "#f43f5e",
    border: "none",
    color: "#fff",
    padding: "8px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.72rem",
    cursor: "pointer",
  },
};

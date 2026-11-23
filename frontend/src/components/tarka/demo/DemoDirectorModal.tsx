import React, { useState } from "react";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Cpu,
} from "lucide-react";
import type { PreflightStatus, DemoState } from "./demoTypes";

interface DemoDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  preflight: PreflightStatus;
  onRunPreflight: () => Promise<boolean>;
  onStartDemo: () => Promise<void>;
  demoState?: DemoState;
}

export const DemoDirectorModal: React.FC<DemoDirectorModalProps> = ({
  isOpen,
  onClose,
  preflight,
  onRunPreflight,
  onStartDemo,
}) => {
  const [operatorConfirmedRecording, setOperatorConfirmedRecording] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  React.useEffect(() => {
    if (isOpen && !preflight.passed && !preflight.running) {
      onRunPreflight();
    }
  }, [isOpen, onRunPreflight, preflight.passed, preflight.running]);

  if (!isOpen) return null;

  const handleLaunchWithCountdown = () => {
    setCountdown(3);
    setTimeout(() => {
      setCountdown(2);
      setTimeout(() => {
        setCountdown(1);
        setTimeout(() => {
          setCountdown(null);
          onStartDemo();
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case "PASSED":
        return <CheckCircle2 size={16} color="#34D399" />;
      case "RUNNING":
        return <RefreshCw size={16} color="#60A5FA" className="animate-spin" />;
      case "FAILED":
        return <AlertTriangle size={16} color="#F43F5E" />;
      default:
        return <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #6B7280" }} />;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10005,
        padding: "20px",
      }}
    >
      <div
        data-testid="demo-director-modal"
        style={{
          width: "100%",
          maxWidth: "680px",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(59, 130, 246, 0.2)",
          color: "#F3F4F6",
          overflow: "hidden",
          fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.3) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                border: "1px solid #3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60A5FA",
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>
                TARKA Autonomous Demo Director
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>
                Zero-Mouse Verification Engine • SUTRAM 2026 Protocol
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", maxHeight: "65vh", overflowY: "auto" }}>
          {countdown !== null ? (
            /* Countdown screen */
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div
                style={{
                  fontSize: "72px",
                  fontWeight: 900,
                  color: "#60A5FA",
                  fontFamily: "'IBM Plex Mono', monospace",
                  textShadow: "0 0 30px rgba(59, 130, 246, 0.6)",
                  animation: "pulse 1s infinite",
                }}
              >
                {countdown}
              </div>
              <h3 style={{ fontSize: "18px", color: "#FFFFFF", marginTop: "16px" }}>
                Launching Autonomous Demonstration...
              </h3>
              <p style={{ fontSize: "13px", color: "#9CA3AF", maxWidth: "400px", margin: "8px auto 0" }}>
                Hands off the mouse! TARKA is about to navigate, verify bitstreams, analyze contradictions, and generate the Section 63 BSA report automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Mission Statement */}
              <div
                style={{
                  backgroundColor: "rgba(30, 58, 138, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  color: "#BFDBFE",
                }}
              >
                <strong>Zero-Mouse Execution Guarantee:</strong> Once initiated, TARKA will navigate through 8 acts automatically, point animated arrows to live forensic elements, execute real backend Z3 difference logic, verify the ₹25,000 vs ₹15,000 discrepancy, and produce the court-admissible Section 63 report.
              </div>

              {/* Preflight Checks List */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#9CA3AF",
                      fontWeight: 600,
                    }}
                  >
                    System Preflight & Integrity Verification ({preflight.checks.filter((c) => c.status === "PASSED").length}/{preflight.checks.length})
                  </h3>

                  <button
                    onClick={onRunPreflight}
                    disabled={preflight.running}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#60A5FA",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RefreshCw size={11} className={preflight.running ? "animate-spin" : ""} />
                    <span>Re-verify Checks</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {preflight.checks.map((chk) => (
                    <div
                      key={chk.id}
                      data-testid={`preflight-check-${chk.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {getCheckIcon(chk.status)}
                        <div>
                          <span style={{ fontWeight: 500, color: "#E2E8F0" }}>{chk.label}</span>
                          {chk.details && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: chk.status === "FAILED" ? "#FCA5A5" : "#94A3B8",
                                fontFamily: "'IBM Plex Mono', monospace",
                                marginTop: "2px",
                              }}
                            >
                              {chk.details}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                          color:
                            chk.status === "PASSED"
                              ? "#34D399"
                              : chk.status === "FAILED"
                              ? "#F43F5E"
                              : "#60A5FA",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                        }}
                      >
                        {chk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operator Screen Recording Confirmation Gate */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "12px 14px",
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <input
                  type="checkbox"
                  id="operator-confirm-record"
                  checked={operatorConfirmedRecording}
                  onChange={(e) => setOperatorConfirmedRecording(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#3B82F6" }}
                />
                <label
                  htmlFor="operator-confirm-record"
                  style={{ fontSize: "12px", color: "#D1D5DB", cursor: "pointer", lineHeight: 1.4 }}
                >
                  <strong style={{ color: "#FFFFFF" }}>Screen Recording Ready:</strong> I have prepared my recording tool (OBS Studio or Chrome Extension) and am ready for uninterrupted zero-mouse capture.
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {countdown === null && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "rgba(10, 15, 29, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
              Keyboard controls: <code style={{ color: "#93C5FD" }}>Space</code> Pause • <code style={{ color: "#93C5FD" }}>Esc</code> Exit • <code style={{ color: "#93C5FD" }}>→</code> Next
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={onClose}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#D1D5DB",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                data-testid="btn-start-autonomous-demo"
                onClick={handleLaunchWithCountdown}
                disabled={!preflight.passed || !operatorConfirmedRecording || preflight.running}
                style={{
                  backgroundColor:
                    preflight.passed && operatorConfirmedRecording
                      ? "#2563EB"
                      : "rgba(37, 99, 235, 0.3)",
                  border: "1px solid #3B82F6",
                  color: "#FFFFFF",
                  borderRadius: "6px",
                  padding: "8px 20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor:
                    preflight.passed && operatorConfirmedRecording ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow:
                    preflight.passed && operatorConfirmedRecording
                      ? "0 0 15px rgba(59, 130, 246, 0.5)"
                      : "none",
                }}
              >
                <Play size={14} fill="#FFFFFF" />
                <span>Start Autonomous Demonstration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import axios from "axios";

export interface RunnerStep {
  step_id: string;
  step_index: number;
  tool_name: string;
  description: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED" | "SKIPPED" | "BLOCKED_ON_CONFIRMATION";
  mandatory: boolean;
  requires_confirmation: boolean;
  risk_class: string;
  input_params: Record<string, any>;
  output_summary?: string;
  evidence_retrieved: string[];
  verification_status?: string;
  blockers: string[];
}

export interface TaskPlanView {
  plan_id: string;
  case_id: string;
  objective: string;
  steps: RunnerStep[];
  current_step_index: number;
  status: string;
}

interface SentinelRunnerOverlayProps {
  plan: TaskPlanView | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated: (updatedPlan: TaskPlanView) => void;
}

export const SentinelRunnerOverlay: React.FC<SentinelRunnerOverlayProps> = ({
  plan,
  isOpen,
  onClose,
  onPlanUpdated,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [confirmationToken, setConfirmationToken] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen || !plan) return null;

  const currentStep = plan.steps[plan.current_step_index] || null;
  const progressPercent = Math.round(
    (plan.steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length /
      Math.max(1, plan.steps.length)) *
      100
  );

  const handleExecuteNext = async (token?: string) => {
    setExecuting(true);
    setErrorNotice(null);
    try {
      const res = await axios.post("/api/v1/interaction/runner/step", {
        plan_id: plan.plan_id,
        confirmation_token: token || confirmationToken || null,
        purpose: `Investigator execution of step ${plan.current_step_index}`,
      });

      const data = res.data;
      if (data.status === "WAITING_CONFIRMATION") {
        setShowConfirmModal(true);
      } else if (data.status === "FAILED") {
        setErrorNotice(data.error || "Step execution failed policy or tool check.");
      }

      // Refresh plan state
      const updatedSteps = [...plan.steps];
      if (data.completed_step_index !== undefined) {
        updatedSteps[data.completed_step_index] = {
          ...updatedSteps[data.completed_step_index],
          status: "COMPLETED",
          output_summary: "Execution verified by canonical engine.",
        };
      }
      onPlanUpdated({
        ...plan,
        steps: updatedSteps,
        current_step_index: data.next_step_index !== null && data.next_step_index !== undefined ? data.next_step_index : plan.current_step_index,
        status: data.status,
      });
    } catch (err: any) {
      setErrorNotice(err.response?.data?.detail || err.message || "Failed to execute step");
    } finally {
      setExecuting(false);
    }
  };

  const handleSkipStep = async (stepIndex: number) => {
    setErrorNotice(null);
    try {
      await axios.post("/api/v1/interaction/runner/skip", {
        plan_id: plan.plan_id,
        step_index: stepIndex,
      });

      const updated = [...plan.steps];
      updated[stepIndex] = { ...updated[stepIndex], status: "SKIPPED" };
      onPlanUpdated({
        ...plan,
        steps: updated,
        current_step_index: plan.current_step_index === stepIndex ? plan.current_step_index + 1 : plan.current_step_index,
      });
    } catch (err: any) {
      setErrorNotice(err.response?.data?.detail || "Policy Error: Cannot skip step.");
    }
  };

  const handlePause = async () => {
    try {
      await axios.post(`/api/v1/interaction/runner/pause?plan_id=${plan.plan_id}`);
      onPlanUpdated({ ...plan, status: "PAUSED" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    try {
      await axios.post(`/api/v1/interaction/runner/resume?plan_id=${plan.plan_id}`);
      onPlanUpdated({ ...plan, status: "RUNNING" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(`/api/v1/interaction/runner/cancel?plan_id=${plan.plan_id}`);
      onPlanUpdated({ ...plan, status: "CANCELLED" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 48,
        right: 16,
        width: 540,
        maxHeight: "calc(100vh - 72px)",
        backgroundColor: "var(--surface-primary)",
        border: "1px solid var(--border-structural)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
        display: "flex",
        flexDirection: "column",
        zIndex: 900,
        fontFamily: "var(--font-sans)",
        fontSize: "var(--font-size-body)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header Line */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-structural)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor:
                plan.status === "COMPLETED"
                  ? "var(--status-verified)"
                  : plan.status === "WAITING_CONFIRMATION"
                  ? "var(--status-gap)"
                  : "var(--sentinel-crimson)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-meta)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            RUNNER // {plan.plan_id}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: "var(--font-size-meta)",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
            }}
          >
            {plan.status} ({progressPercent}%)
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: "100%", height: 3, backgroundColor: "var(--border-subtle)" }}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            backgroundColor: "var(--sentinel-crimson)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Content Container */}
      <div style={{ padding: 16, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Objective */}
        <div>
          <div
            style={{
              fontSize: "var(--font-size-meta)",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            OBJECTIVE
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--font-size-section)",
              lineHeight: 1.4,
              color: "var(--text-primary)",
            }}
          >
            {plan.objective}
          </div>
        </div>

        {errorNotice && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(244, 63, 94, 0.08)",
              border: "1px solid var(--status-critical)",
              fontSize: "var(--font-size-meta)",
              color: "var(--status-critical)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {errorNotice}
          </div>
        )}

        {/* Step Progression List */}
        <div>
          <div
            style={{
              fontSize: "var(--font-size-meta)",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            GOVERNED PLAN STEPS ({plan.steps.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {plan.steps.map((st, idx) => {
              const isCurrent = idx === plan.current_step_index && plan.status !== "COMPLETED";
              const isSelected = selectedStepIndex === idx;

              return (
                <div
                  key={st.step_id}
                  onClick={() => setSelectedStepIndex(idx)}
                  style={{
                    padding: "8px 12px",
                    border: isCurrent
                      ? "1px solid var(--sentinel-crimson)"
                      : isSelected
                      ? "1px solid var(--border-strong)"
                      : "1px solid var(--border-structural)",
                    backgroundColor: isCurrent
                      ? "var(--surface-selected)"
                      : isSelected
                      ? "var(--surface-secondary)"
                      : "var(--surface-primary)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--font-size-meta)",
                        color: isCurrent ? "var(--sentinel-crimson)" : "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      STEP {idx + 1} // {st.tool_name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {st.mandatory && (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            padding: "1px 4px",
                            backgroundColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          MANDATORY
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "var(--font-size-meta)",
                          fontFamily: "var(--font-mono)",
                          color:
                            st.status === "COMPLETED"
                              ? "var(--status-verified)"
                              : st.status === "RUNNING"
                              ? "var(--sentinel-crimson)"
                              : st.status === "BLOCKED_ON_CONFIRMATION"
                              ? "var(--status-gap)"
                              : "var(--text-muted)",
                        }}
                      >
                        {st.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: "var(--font-size-secondary)", color: "var(--text-primary)" }}>
                    {st.description}
                  </div>

                  {st.evidence_retrieved && st.evidence_retrieved.length > 0 && (
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--status-verified)" }}>
                      Evidence: {st.evidence_retrieved.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected / Current Step Details */}
        {currentStep && (
          <div
            style={{
              padding: 12,
              border: "1px solid var(--border-structural)",
              backgroundColor: "var(--surface-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-meta)",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              ACTIVE EXECUTION FOCUS // STEP {currentStep.step_index + 1}
            </div>

            <div style={{ fontSize: "var(--font-size-body)" }}>{currentStep.description}</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: "4px 8px",
                fontSize: "var(--font-size-meta)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
              }}
            >
              <span>TOOL:</span>
              <span style={{ color: "var(--text-primary)" }}>{currentStep.tool_name}</span>
              <span>RISK CLASS:</span>
              <span style={{ color: "var(--text-primary)" }}>{currentStep.risk_class}</span>
              <span>PARAMETERS:</span>
              <span style={{ color: "var(--text-primary)" }}>{JSON.stringify(currentStep.input_params)}</span>
            </div>

            {/* Actions for current step */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {plan.status !== "COMPLETED" && plan.status !== "CANCELLED" && (
                <button
                  onClick={() => handleExecuteNext()}
                  disabled={executing}
                  style={{
                    backgroundColor: "var(--sentinel-crimson)",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "6px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--font-size-meta)",
                    fontWeight: 600,
                    cursor: executing ? "not-allowed" : "pointer",
                  }}
                >
                  {executing ? "EXECUTING..." : "EXECUTE STEP"}
                </button>
              )}

              {!currentStep.mandatory && (
                <button
                  onClick={() => handleSkipStep(currentStep.step_index)}
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-structural)",
                    padding: "6px 12px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--font-size-meta)",
                    cursor: "pointer",
                  }}
                >
                  SKIP STEP
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--border-structural)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {plan.status === "RUNNING" ? (
            <button
              onClick={handlePause}
              style={{
                background: "none",
                border: "1px solid var(--border-structural)",
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              PAUSE
            </button>
          ) : plan.status === "PAUSED" ? (
            <button
              onClick={handleResume}
              style={{
                background: "none",
                border: "1px solid var(--border-structural)",
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              RESUME
            </button>
          ) : null}

          {plan.status !== "COMPLETED" && (
            <button
              onClick={handleCancel}
              style={{
                background: "none",
                border: "1px solid var(--border-structural)",
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              CANCEL
            </button>
          )}
        </div>

        <span
          style={{
            fontSize: "var(--font-size-meta)",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          GOVERNED RUNNER // AUDITED
        </span>
      </div>

      {/* Authorized Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface-primary)",
              border: "1px solid var(--sentinel-crimson)",
              padding: 20,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                color: "var(--sentinel-crimson)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-meta)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              AUTHORIZED CONFIRMATION REQUIRED
            </div>

            <div style={{ fontSize: "var(--font-size-secondary)", marginBottom: 12 }}>
              This step has high operational or statutory impact. Provide authorized confirmation token or passphrase
              to proceed.
            </div>

            <input
              type="password"
              placeholder="Enter authorization token / passphrase..."
              value={confirmationToken}
              onChange={(e) => setConfirmationToken(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-body)",
                border: "1px solid var(--border-structural)",
                backgroundColor: "var(--surface-secondary)",
                color: "var(--text-primary)",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: "none",
                  border: "1px solid var(--border-structural)",
                  padding: "6px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-meta)",
                  cursor: "pointer",
                }}
              >
                DISMISS
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleExecuteNext(confirmationToken);
                }}
                style={{
                  backgroundColor: "var(--sentinel-crimson)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "6px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-meta)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                CONFIRM & PROCEED
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

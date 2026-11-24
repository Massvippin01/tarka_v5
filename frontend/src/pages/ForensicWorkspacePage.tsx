import React, { useState, useEffect, useCallback } from "react";
import { FileCheck, Mic } from "lucide-react";
import { forensicsApi } from "../api/forensicsApi";
import type { ArtifactIntake, ProvenanceDAG, CounterfactualComparison } from "../types/forensics";
import { EvidenceRegister } from "../components/tarka/EvidenceRegister";
import { ForensicTimeline, type TimelineEvent } from "../components/tarka/ForensicTimeline";
import { ContradictionPanel, type ContradictionItem, type EvidenceGapItem } from "../components/tarka/ContradictionPanel";
import { ProvenanceDAGView } from "../components/graphs/ProvenanceDAGView";
import { ChallengeDiffCard } from "../components/tarka/ChallengeDiffCard";
import { ForensicAssistantPanel } from "../components/tarka/ForensicAssistantPanel";
import { ForensicReportModal } from "../components/tarka/ForensicReportModal";
import { FounderValidationLab } from "../components/tarka/validation/FounderValidationLab";

type WorkspaceTab = "evidence" | "timeline" | "contradictions" | "robustness" | "provenance" | "validation";

interface ForensicCaseItem {
  case_id: string;
  artifact_count?: number;
  custody_chain_head?: string;
  [key: string]: unknown;
}

export const ForensicWorkspacePage: React.FC = () => {
  const [activeCaseId, setActiveCaseId] = useState<string>("upi_payment_discrepancy");
  const [cases, setCases] = useState<ForensicCaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("evidence");
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(true);

  // Case Data State
  const [artifacts, setArtifacts] = useState<ArtifactIntake[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [gaps, setGaps] = useState<EvidenceGapItem[]>([]);
  const [provenanceDag, setProvenanceDag] = useState<ProvenanceDAG | null>(null);

  // Authentication & Case Authorization State
  const [authError, setAuthError] = useState<{
    status: number;
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const checkAuthError = useCallback((err: unknown) => {
    const axErr = err as { response?: { status?: number; data?: { detail?: string; message?: string } } };
    const status = axErr?.response?.status;
    if (status === 401 || status === 403) {
      const detailStr = axErr.response?.data?.detail || axErr.response?.data?.message;
      const detail = typeof detailStr === "string" ? detailStr : detailStr ? JSON.stringify(detailStr) : undefined;
      const info = {
        status,
        title: status === 401 ? "HTTP 401: Authentication Required" : "HTTP 403: Case Scope Access Forbidden",
        message:
          status === 401
            ? "Missing, invalid, expired, or revoked credentials. TARKA forensic endpoints fail closed by default."
            : "Access to this case scope is not authorized for your identity.",
        detail,
      };
      setAuthError(info);
      return info;
    }
    return null;
  }, []);

  // Evidence Robustness Lab State
  const [baselineRunId, setBaselineRunId] = useState<string>("run-001");
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>(["art-screenshot-receipt-004"]);
  const [runningChallenge, setRunningChallenge] = useState<boolean>(false);
  const [challengeResult, setChallengeResult] = useState<CounterfactualComparison | null>(null);

  const loadCaseData = useCallback(async (caseId: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      // Fetch artifacts
      const arts = await forensicsApi.listArtifacts(caseId);
      setArtifacts(arts || []);

      // Fetch timeline
      const tl = await forensicsApi.getTimeline(caseId);
      setTimelineEvents((tl?.events as TimelineEvent[]) || []);

      // Fetch contradictions
      const contras = await forensicsApi.getContradictions(caseId);
      setContradictions((contras?.contradictions as ContradictionItem[]) || []);
      setGaps((contras?.evidence_gaps as EvidenceGapItem[]) || []);
      if (contras?.run_id) {
        setBaselineRunId(contras.run_id);
      }

      // Fetch DAG
      const dag = await forensicsApi.getProvenanceDag(caseId);
      setProvenanceDag(dag);
    } catch (err) {
      console.error("Failed to load case data:", err);
      checkAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [checkAuthError]);

  const loadCases = useCallback(async () => {
    try {
      setAuthError(null);
      const res = await forensicsApi.listCases();
      setCases((res as ForensicCaseItem[]) || []);
      if (res && res.length > 0 && !res.find((c: ForensicCaseItem) => c.case_id === activeCaseId)) {
        setActiveCaseId(res[0].case_id);
      }
    } catch (err) {
      console.error("Failed to list cases:", err);
      checkAuthError(err);
    }
  }, [activeCaseId, checkAuthError]);

  // Load initial cases and data
  useEffect(() => {
    let ignore = false;
    forensicsApi
      .listCases()
      .then((res) => {
        if (!ignore) {
          setCases((res as ForensicCaseItem[]) || []);
          if (res && res.length > 0 && !res.find((c: ForensicCaseItem) => c.case_id === activeCaseId)) {
            setActiveCaseId(res[0].case_id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to list cases:", err);
        if (!ignore) {
          checkAuthError(err);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeCaseId, checkAuthError]);

  useEffect(() => {
    if (!activeCaseId) return;
    let ignore = false;
    setAuthError(null);
    Promise.all([
      forensicsApi.listArtifacts(activeCaseId),
      forensicsApi.getTimeline(activeCaseId),
      forensicsApi.getContradictions(activeCaseId),
      forensicsApi.getProvenanceDag(activeCaseId),
    ])
      .then(([arts, tl, contras, dag]) => {
        if (!ignore) {
          setArtifacts(arts || []);
          setTimelineEvents((tl?.events as TimelineEvent[]) || []);
          setContradictions((contras?.contradictions as ContradictionItem[]) || []);
          setGaps((contras?.evidence_gaps as EvidenceGapItem[]) || []);
          if (contras?.run_id) {
            setBaselineRunId(contras.run_id);
          }
          setProvenanceDag(dag);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load case data:", err);
        if (!ignore) {
          checkAuthError(err);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeCaseId, checkAuthError]);

  const handleSeedSynthetic = async () => {
    try {
      setSeeding(true);
      await forensicsApi.seedSyntheticCase("upi_payment_discrepancy");
      await loadCases();
      await loadCaseData("upi_payment_discrepancy");
      setActiveCaseId("upi_payment_discrepancy");
    } catch (err) {
      console.error("Failed to seed synthetic case:", err);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleExclusion = (artifactId: string) => {
    setSelectedExclusions((prev) =>
      prev.includes(artifactId)
        ? prev.filter((id) => id !== artifactId)
        : [...prev, artifactId]
    );
  };

  const handleExecuteChallenge = async () => {
    if (!baselineRunId) return;
    try {
      setRunningChallenge(true);
      const res = await forensicsApi.runChallenge(
        activeCaseId,
        baselineRunId,
        selectedExclusions,
        "Examiner hypothesis test: Exclude disputed artifact"
      );
      setChallengeResult(res);
    } catch (err) {
      console.error("Counterfactual challenge failed:", err);
    } finally {
      setRunningChallenge(false);
    }
  };

  const handleReviewAction = async (
    targetId: string,
    decision: string,
    notes: string,
    scope?: string,
    targetType?: string
  ) => {
    try {
      await forensicsApi.recordReview(activeCaseId, {
        target_id: targetId,
        decision,
        notes,
        scope,
        target_type: targetType,
      });
      await loadCaseData(activeCaseId);
    } catch (err) {
      console.error("Failed to commit examiner review:", err);
      checkAuthError(err);
    }
  };

  return (

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#FAF8F3",
        fontFamily: "'Inter', sans-serif",
        color: "#1E1D1A",
        overflow: "hidden",
      }}
    >
      {/* Top Forensic Control Bar */}
      <header
        style={{
          padding: "12px 20px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #D8D2C7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  backgroundColor: "#26715A",
                  display: "inline-block",
                }}
              />
              <h1
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 600,
                  fontFamily: '"IBM Plex Serif", Georgia, serif',
                  letterSpacing: "0.2px",
                }}
              >
                TARKA Forensic Intelligence Workspace
              </h1>
            </div>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
              Deterministic Z3 Solver • Immutable Custody DAG • BSA § 63 Evidentiary Standard
            </div>
          </div>

          {/* Case Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>CASE:</label>
            <select
              value={activeCaseId}
              onChange={(e) => setActiveCaseId(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid #CCC",
                backgroundColor: "#FAF8F3",
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {cases.map((c: ForensicCaseItem) => (
                <option key={c.case_id} value={c.case_id}>
                  {c.case_id} ({c.artifact_count} artifacts)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleSeedSynthetic}
            disabled={seeding}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              backgroundColor: "#FAF8F3",
              border: "1px solid #CCC",
              borderRadius: "4px",
              fontWeight: 500,
              cursor: seeding ? "not-allowed" : "pointer",
            }}
          >
            {seeding ? "Seeding..." : "Seed SUTRAM Case"}
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              backgroundColor: "#26715A",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "4px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FileCheck size={14} /> Section 63 BSA Report
          </button>

          <button
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              backgroundColor: isAssistantOpen ? "#1E1D1A" : "#FAF8F3",
              color: isAssistantOpen ? "#FFFFFF" : "#1E1D1A",
              border: "1px solid #CCC",
              borderRadius: "4px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Mic size={14} /> {isAssistantOpen ? "Hide Assistant" : "Grounded Assistant"}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#F3EFE6",
          borderBottom: "1px solid #D8D2C7",
          padding: "0 20px",
          gap: "4px",
        }}
      >
        <button
          onClick={() => setActiveTab("evidence")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            borderBottom: activeTab === "evidence" ? "3px solid #1E1D1A" : "3px solid transparent",
            backgroundColor: activeTab === "evidence" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "evidence" ? "#1E1D1A" : "#666",
          }}
        >
          EVIDENCE REGISTER ({artifacts.length})
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            borderBottom: activeTab === "timeline" ? "3px solid #1E1D1A" : "3px solid transparent",
            backgroundColor: activeTab === "timeline" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "timeline" ? "#1E1D1A" : "#666",
          }}
        >
          TIMELINE ({timelineEvents.length})
        </button>

        <button
          onClick={() => setActiveTab("contradictions")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            borderBottom: activeTab === "contradictions" ? "3px solid #AF3F3A" : "3px solid transparent",
            backgroundColor: activeTab === "contradictions" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "contradictions" ? "#AF3F3A" : "#666",
          }}
        >
          CONTRADICTIONS & MUS ({contradictions.length})
        </button>

        <button
          onClick={() => setActiveTab("robustness")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            borderBottom: activeTab === "robustness" ? "3px solid #355C8A" : "3px solid transparent",
            backgroundColor: activeTab === "robustness" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "robustness" ? "#355C8A" : "#666",
          }}
        >
          ROBUSTNESS LAB (WHAT-IF)
        </button>

        <button
          onClick={() => setActiveTab("provenance")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            borderBottom: activeTab === "provenance" ? "3px solid #1E1D1A" : "3px solid transparent",
            backgroundColor: activeTab === "provenance" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "provenance" ? "#1E1D1A" : "#666",
          }}
        >
          PROVENANCE DAG
        </button>

        <button
          onClick={() => setActiveTab("validation")}
          style={{
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 700,
            border: "none",
            borderBottom: activeTab === "validation" ? "3px solid #AF3F3A" : "3px solid transparent",
            backgroundColor: activeTab === "validation" ? "#FAF8F3" : "transparent",
            cursor: "pointer",
            color: activeTab === "validation" ? "#AF3F3A" : "#666",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#AF3F3A" }}></span>
          FOUNDER VALIDATION LAB (49)
        </button>
      </div>

      {/* Main Workspace Body & Assistant Split Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Main Tab Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {authError ? (
            <div
              style={{
                maxWidth: "800px",
                margin: "40px auto",
                padding: "32px",
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: authError.status === 401 ? "2px solid #D97706" : "2px solid #DC2626",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    backgroundColor: authError.status === 401 ? "#FEF3C7" : "#FEE2E2",
                    color: authError.status === 401 ? "#92400E" : "#991B1B",
                    border: authError.status === 401 ? "1px solid #F59E0B" : "1px solid #EF4444",
                  }}
                >
                  {authError.status === 401 ? "SECURITY GATE: 401 UNAUTHENTICATED" : "SECURITY GATE: 403 CASE SCOPE FORBIDDEN"}
                </span>
                <span style={{ fontSize: "12px", color: "#6B7280", fontFamily: "monospace" }}>
                  FAIL-CLOSED ENFORCEMENT
                </span>
              </div>

              <h2
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#111827",
                  fontFamily: '"IBM Plex Serif", Georgia, serif',
                }}
              >
                {authError.title}
              </h2>

              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
                {authError.message}
              </p>

              {authError.detail && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    color: "#4B5563",
                    marginBottom: "20px",
                    wordBreak: "break-all",
                  }}
                >
                  <strong>Server Response:</strong> {authError.detail}
                </div>
              )}

              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#F8FAFC",
                  borderLeft: "4px solid #3B82F6",
                  borderRadius: "0 6px 6px 0",
                  marginBottom: "24px",
                  fontSize: "13px",
                  color: "#1E293B",
                  lineHeight: 1.5,
                }}
              >
                <strong>Architecture & Governance Invariant:</strong>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                  <li>
                    Per TARKA Engineering Constitution § 1 (Repository Truth) & § 7 (Governance), all protected investigative routes reject missing, expired, or invalid credentials with HTTP 401.
                  </li>
                  <li>
                    Hardcoded investigator demo fallbacks have been removed. Arbitrary user IDs are rejected.
                  </li>
                  <li>
                    <strong>External Session Dependency:</strong> Enterprise Identity Provider (OIDC / OAuth2) session issuance is required for active investigator sessions. Synthetic development keys are strictly disabled by default and rejected at startup in staging and production.
                  </li>
                </ul>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  onClick={() => {
                    setLoading(true);
                    loadCases();
                    loadCaseData(activeCaseId);
                  }}
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: "#1E1D1A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Retry Request
                </button>
                <button
                  onClick={() => {
                    const token = window.prompt("Paste valid signed Bearer token (JWT) to test session:");
                    if (token) {
                      sessionStorage.setItem("sentinelx_auth_token", token.trim());
                      setLoading(true);
                      loadCases();
                      loadCaseData(activeCaseId);
                    }
                  }}
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: "#FFFFFF",
                    color: "#1E1D1A",
                    border: "1px solid #D1D5DB",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Set Session Token (Manual Auth)
                </button>
                {sessionStorage.getItem("sentinelx_auth_token") && (
                  <button
                    onClick={() => {
                      sessionStorage.removeItem("sentinelx_auth_token");
                      loadCases();
                      loadCaseData(activeCaseId);
                    }}
                    style={{
                      padding: "8px 14px",
                      fontSize: "13px",
                      color: "#DC2626",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Clear Current Token
                  </button>
                )}
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
              Loading case artifacts and solver logic...
            </div>
          ) : (
            <>
              {activeTab === "evidence" && (
                <EvidenceRegister
                  caseId={activeCaseId}
                  artifacts={artifacts}
                  onRefresh={() => loadCaseData(activeCaseId)}
                />
              )}

              {activeTab === "timeline" && (
                <ForensicTimeline events={timelineEvents} />
              )}

              {activeTab === "contradictions" && (
                <ContradictionPanel
                  contradictions={contradictions}
                  gaps={gaps}
                  caseId={activeCaseId}
                  runId={baselineRunId}
                  onReviewAction={handleReviewAction}
                />
              )}

              {activeTab === "robustness" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Robustness Controls */}
                  <div
                    style={{
                      padding: "16px 20px",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "6px",
                      border: "1px solid #D8D2C7",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "16px",
                        fontFamily: '"IBM Plex Serif", Georgia, serif',
                      }}
                    >
                      Evidence Robustness Lab: Counterfactual Sensitivity
                    </h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
                      Select artifacts to exclude and observe how downstream findings, timeline events, and
                      Minimal Unsatisfiable Subsets (MUS) change under deterministic recomputation. Findings are
                      never merely hidden; the Z3 solver re-evaluates all constraints.
                    </p>

                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#444", marginBottom: "8px" }}>
                        SELECT ARTIFACTS TO CHALLENGE / EXCLUDE:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
                        {artifacts.map((art) => {
                          const isExcluded = selectedExclusions.includes(art.artifact_id);
                          return (
                            <label
                              key={art.artifact_id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                backgroundColor: isExcluded ? "#FFF2F2" : "#FAF8F3",
                                border: isExcluded ? "1px solid #AF3F3A" : "1px solid #E2DCD2",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isExcluded}
                                onChange={() => handleToggleExclusion(art.artifact_id)}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{art.filename || art.artifact_id}</div>
                                <div style={{ fontSize: "11px", color: "#666" }}>
                                  Tier {art.source_tier} • {art.artifact_id}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={handleExecuteChallenge}
                        disabled={runningChallenge || selectedExclusions.length === 0}
                        style={{
                          padding: "8px 20px",
                          backgroundColor: "#355C8A",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: runningChallenge ? "not-allowed" : "pointer",
                        }}
                      >
                        {runningChallenge ? "Recomputing SMT Constraints..." : "Run Counterfactual Recomputation"}
                      </button>
                    </div>
                  </div>

                  {/* Challenge Results */}
                  {challengeResult && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div
                        style={{
                          padding: "12px 16px",
                          backgroundColor: "#EBF3FC",
                          border: "1px solid #B8D5FA",
                          borderRadius: "6px",
                          fontSize: "13px",
                          color: "#1E3A8A",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          <strong>Recomputation Completed:</strong> Excluded {challengeResult.excluded_artifact_ids.length} artifact(s).
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px" }}>
                          Run: {challengeResult.challenge_run_id}
                        </span>
                      </div>

                      {/* Diff Cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                        {challengeResult.removed_findings.map((finding) => (
                          <ChallengeDiffCard
                            key={finding.finding_id}
                            changeType="REMOVED"
                            finding={finding}
                            impactReasoning="This finding depended entirely on the excluded artifact. Without it, the condition is no longer supported."
                          />
                        ))}

                        {challengeResult.surviving_findings.map((finding) => (
                          <ChallengeDiffCard
                            key={finding.finding_id}
                            changeType="SURVIVING"
                            finding={finding}
                            impactReasoning="Independently corroborated by remaining tier-1 bank or CDR records."
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "provenance" && (
                <ProvenanceDAGView
                  dag={provenanceDag}
                  onSelectNode={(nodeId) => console.log("Selected DAG node:", nodeId)}
                />
              )}

              {activeTab === "validation" && (
                <FounderValidationLab />
              )}
            </>
          )}
        </main>

        {/* Right Assistant Panel (Grounded SLM + Voice) */}
        {isAssistantOpen && (
          <aside
            style={{
              width: "420px",
              borderLeft: "1px solid #D8D2C7",
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ForensicAssistantPanel caseId={activeCaseId} />
          </aside>
        )}
      </div>

      {/* Statutory Section 63 BSA Report Modal */}
      <ForensicReportModal
        caseId={activeCaseId}
        runId={baselineRunId}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};

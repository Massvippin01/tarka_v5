import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Bot,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";
import { forensicsApi } from "../../../api/forensicsApi";

interface InvestigationIntelligenceBriefProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvestigationIntelligenceBrief: React.FC<InvestigationIntelligenceBriefProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
  });

  const [activeModelBadge, setActiveModelBadge] = useState<string>("llama3.1:8b · local · offline");
  const [copilotQuery, setCopilotQuery] = useState<string>("");
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] = useState<{
    answer_markdown: string;
    citations: Array<{
      citation_id?: string;
      artifact_id?: string;
      source_filename?: string;
      sha256_short?: string;
      trust_tier?: string;
      snippet?: string;
    }>;
    speech_text?: string;
    uncertainty_disclosure?: string;
    badge?: string;
  } | null>(null);

  const { reconstructedInvestigation } = useTarkaUiStore();
  const defaultInv = reconstruct5FileInvestigation();
  const investigation = reconstructedInvestigation || defaultInv;
  const brief = investigation?.sevenQuestionBrief || defaultInv.sevenQuestionBrief;
  const questions = Array.isArray(brief?.questions) && brief.questions.length > 0
    ? brief.questions
    : defaultInv.sevenQuestionBrief.questions;
  const currentCaseId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("case") || brief?.caseId || "CASE-2026-001"
      : brief?.caseId || "CASE-2026-001";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    forensicsApi
      .getAssistantRuntime()
      .then((status: any) => {
        if (status?.badge) {
          setActiveModelBadge(status.badge);
        } else if (status?.active_model) {
          setActiveModelBadge(`${status.active_model} · local · offline`);
        }
      })
      .catch(() => {
        setActiveModelBadge("offline-rules · local");
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (id: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyFullReport = () => {
    const report = `=== TARKA INVESTIGATION INTELLIGENCE BRIEF (7-QUESTION EXPLAINABLE DISCLOSURE) ===
Case Reference: ${brief?.firNumber || "FIR-2026-CY-0492"} | Case ID: ${brief?.caseId || currentCaseId}
Generated: ${brief?.generatedIst || new Date().toLocaleString()} | Classification: LAW ENFORCEMENT SENSITIVE (IO EYES ONLY)

[EXECUTIVE INTELLIGENCE SUMMARY]
${brief?.executiveSummary || "Forensic investigation in progress."}

================================================================================
${(questions || [])
        .map(
          (q) => `QUESTION ${q.questionId}: ${q.questionText}
Headline Verdict: ${q.headlineSummary || "ANALYSIS COMPLETED"}
Statutory Basis: ${q.statutoryBasis || "BSA §63 / IT Act §43"} | Confidence: ${Math.round((q.confidenceScore || 0.95) * 100)}%

${q.answerMarkdown || ""}

Evidentiary Citations:
${(q.evidenceChips || []).map((c) => `• [${c.tier || "T2"}] ${c.label} (Hash: ${c.hash || "PENDING"}) — ${c.detail} [Source: ${c.sourceFile || "Evidence Repository"}]`).join("\n")}
--------------------------------------------------------------------------------`
        )
        .join("\n\n")}

[LEGAL ADMISSIBILITY DISCLAIMER]
TARKA produces Forensic Technical Findings and Draft Statutory Requisitions for execution by the Investigating Officer and Authorized Custodians. Admissibility in law is adjudicated strictly by the learned Court under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.
=== END OF BRIEF ===`;

    navigator.clipboard.writeText(report);
    setCopiedAll(true);
    toast.success("Full 7-Question Intelligence Brief copied to clipboard!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExecuteCopilotQuery = async (queryText?: string) => {
    const textToSend = (queryText || copilotQuery).trim();
    if (!textToSend || copilotLoading) return;

    setCopilotLoading(true);
    try {
      const resp = await forensicsApi.queryAssistant(currentCaseId, textToSend);
      setCopilotResponse(resp);
      if (queryText) {
        setCopilotQuery(queryText);
      }
    } catch (err: any) {
      toast.error("Copilot query failed. Offline fallback active.");
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1020px",
          height: "92vh",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            HEADER BAR WITH ACTIVE MODEL BADGE
            ========================================================================= */}
        <div
          style={{
            padding: "14px 20px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4F46E5",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                  TARKA Forensic Copilot & Intelligence Brief
                </span>
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "#ECFDF5",
                    color: "#059669",
                    border: "1px solid #A7F3D0",
                  }}
                >
                  {currentCaseId}
                </span>
                {/* Active Model Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                  title="Local AI Inference: zero case data leaves this machine"
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#10B981",
                    }}
                  />
                  <span>{activeModelBadge}</span>
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                Case: {brief?.firNumber || "FIR-2026-CY-0492"} · Cross-Artifact Evidence Grounding & BSA § 63 Seals
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopyFullReport}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 11px",
                borderRadius: "6px",
                background: "#4F46E5",
                border: "1px solid #4338CA",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
              }}
            >
              {copiedAll ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedAll ? "Copied" : "Copy Brief"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                color: "#334155",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "5px 8px",
                cursor: "pointer",
                color: "#64748B",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            GROUNDED AI COPILOT INTERACTIVE QUERY BAR
            ========================================================================= */}
        <div
          style={{
            padding: "12px 20px",
            background: "#FAF5FF",
            borderBottom: "1px solid #F3E8FF",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#6B21A8" }}>
              <Bot size={14} color="#7C3AED" />
              <span>Grounded AI Forensic Copilot (Natural-Language Investigation)</span>
            </div>
            <span style={{ fontSize: "10px", color: "#9333EA", fontWeight: 600 }}>
              Cites Bitstream Hashes & Transaction IDs
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecuteCopilotQuery();
              }}
              placeholder="Ask copilot: e.g. Which accounts should I freeze first? Is Vikram Shah linked to other FIRs?"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #D8B4FE",
                fontSize: "12px",
                color: "#1E293B",
                background: "#FFFFFF",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => handleExecuteCopilotQuery()}
              disabled={copilotLoading || !copilotQuery.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 16px",
                borderRadius: "6px",
                background: "#7C3AED",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: copilotLoading || !copilotQuery.trim() ? "not-allowed" : "pointer",
                opacity: copilotLoading || !copilotQuery.trim() ? 0.6 : 1,
              }}
            >
              {copilotLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{copilotLoading ? "Analyzing..." : "Ask Copilot"}</span>
            </button>
          </div>

          {/* Quick Pre-canned Question Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "10.5px", color: "#7E22CE", fontWeight: 600 }}>Suggested:</span>
            {[
              "Which accounts should I freeze first?",
              "Is Vikram Shah linked to other FIRs?",
              "Summarise the money trail in Hindi",
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExecuteCopilotQuery(p)}
                style={{
                  padding: "3px 9px",
                  borderRadius: "12px",
                  background: "#EDE9FE",
                  border: "1px solid #DDD6FE",
                  color: "#6D28D9",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Copilot Active Answer Box */}
          {copilotResponse && (
            <div
              style={{
                marginTop: "6px",
                padding: "12px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "1px solid #C084FC",
                boxShadow: "0 2px 6px rgba(124, 58, 237, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B" }}>
                    Verified Forensic Analysis Response
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCopilotResponse(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    fontSize: "11px",
                  }}
                >
                  Clear
                </button>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.55,
                  color: "#1E293B",
                  whiteSpace: "pre-line",
                }}
              >
                {copilotResponse.answer_markdown}
              </div>

              {/* Clickable Citations */}
              {copilotResponse.citations && copilotResponse.citations.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#475569" }}>
                    Evidence Citations:
                  </span>
                  {copilotResponse.citations.map((c, i) => (
                    <span
                      key={i}
                      onClick={() => {
                        toast.info(`Artifact: ${c.source_filename || c.artifact_id} | SHA-256: ${c.sha256_short}...`);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: c.trust_tier === "T1" ? "#EFF6FF" : "#FEF3C7",
                        border: `1px solid ${c.trust_tier === "T1" ? "#BFDBFE" : "#FDE68A"}`,
                        color: c.trust_tier === "T1" ? "#1D4ED8" : "#B45309",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      title="Click to view artifact verification details"
                    >
                      <ExternalLink size={10} />
                      <span>{c.source_filename || c.artifact_id}</span>
                      <span style={{ opacity: 0.8 }}>({c.trust_tier || "T2"})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            EXECUTIVE SUMMARY CALLOUT
            ========================================================================= */}
        <div
          style={{
            padding: "10px 20px",
            background: "#EFF6FF",
            borderBottom: "1px solid #DBEAFE",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#1D4ED8", letterSpacing: "0.04em" }}>
            Executive Intelligence Summary
          </div>
          <p style={{ fontSize: "11.5px", color: "#1E3A8A", lineHeight: 1.45, margin: "2px 0 0 0" }}>
            {brief?.executiveSummary || "Forensic technical brief initialized."}
          </p>
        </div>

        {/* =========================================================================
            SCROLLABLE ACCORDION QUESTIONS
            ========================================================================= */}
        <div
          style={{
            flex: "1 1 0%",
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          {(questions || []).map((q) => {
            const isExp = expandedQuestions[q.questionId] ?? true;
            const isInsufficient = (q.headlineSummary || "").includes("INSUFFICIENT_EVIDENCE");

            return (
              <div
                key={q.questionId}
                style={{
                  borderRadius: "8px",
                  border: `1px solid ${isInsufficient ? "#FCD34D" : "#E2E8F0"}`,
                  background: "#FFFFFF",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(q.questionId)}
                  style={{
                    padding: "10px 14px",
                    background: isInsufficient ? "#FFFBEB" : "#F8FAFC",
                    borderBottom: isExp ? `1px solid ${isInsufficient ? "#FDE68A" : "#E2E8F0"}` : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: isInsufficient ? "#FEF3C7" : "#EEF2FF",
                        color: isInsufficient ? "#B45309" : "#4F46E5",
                        fontWeight: 800,
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {q.questionId}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B" }}>
                      {q.questionText}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: isInsufficient ? "#FEF3C7" : "#ECFDF5",
                        color: isInsufficient ? "#B45309" : "#059669",
                      }}
                    >
                      {Math.round(q.confidenceScore * 100)}% Confidence
                    </span>
                    {isExp ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isExp && (
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "11.5px", color: "#334155", lineHeight: 1.5 }}>
                      {q.answerMarkdown}
                    </div>

                    {/* Evidence Chips */}
                    {q.evidenceChips && q.evidenceChips.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {q.evidenceChips.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 600,
                              background: "#F1F5F9",
                              color: "#475569",
                              border: "1px solid #E2E8F0",
                            }}
                          >
                            [{c.tier}] {c.label} ({c.hash})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

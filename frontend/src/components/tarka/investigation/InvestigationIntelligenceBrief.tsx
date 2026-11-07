import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";

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

  const { reconstructedInvestigation } = useTarkaUiStore();
  const investigation = reconstructedInvestigation || reconstruct5FileInvestigation();
  const brief = investigation.sevenQuestionBrief;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleExpand = (id: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyFullReport = () => {
    const report = `=== TARKA INVESTIGATION INTELLIGENCE BRIEF (7-QUESTION EXPLAINABLE DISCLOSURE) ===
Case Reference: ${brief.firNumber} | Case ID: ${brief.caseId}
Generated: ${brief.generatedIst} | Classification: LAW ENFORCEMENT SENSITIVE (IO EYES ONLY)

[EXECUTIVE INTELLIGENCE SUMMARY]
${brief.executiveSummary}

================================================================================
${brief.questions
  .map(
    (q) => `QUESTION ${q.questionId}: ${q.questionText}
Headline Verdict: ${q.headlineSummary}
Statutory Basis: ${q.statutoryBasis} | Confidence: ${Math.round(q.confidenceScore * 100)}%

${q.answerMarkdown}

Evidentiary Citations:
${q.evidenceChips.map((c) => `• [${c.tier}] ${c.label} (Hash: ${c.hash}) — ${c.detail} [Source: ${c.sourceFile}]`).join("\n")}
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
            HEADER BAR
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
                  7-Question Explainable Investigation Intelligence Brief
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
                  FIR #0149/2026
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                Generated: {brief.generatedIst} · Cross-Artifact Correlation across 5 Evidentiary Files
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
              <span>{copiedAll ? "Copied Full Brief" : "Copy Brief Text"}</span>
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
            EXECUTIVE SUMMARY CALLOUT
            ========================================================================= */}
        <div
          style={{
            padding: "12px 20px",
            background: "#EFF6FF",
            borderBottom: "1px solid #DBEAFE",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#1D4ED8", letterSpacing: "0.04em" }}>
            Executive Intelligence Summary
          </div>
          <p style={{ fontSize: "11.5px", color: "#1E3A8A", lineHeight: 1.5, margin: "4px 0 0 0" }}>
            {brief.executiveSummary}
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
          {brief.questions.map((q) => {
            const isExp = expandedQuestions[q.questionId] ?? true;
            const isInsufficient = q.headlineSummary.includes("INSUFFICIENT_EVIDENCE");

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
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F172A" }}>
                        {q.questionText}
                      </div>
                      <div style={{ fontSize: "11px", color: isInsufficient ? "#B45309" : "#475569", fontWeight: 600, marginTop: "2px" }}>
                        {q.headlineSummary}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "1.5px 6px",
                        borderRadius: "4px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        background: "#F1F5F9",
                        color: "#475569",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      {q.statutoryBasis}
                    </span>
                    <button
                      type="button"
                      style={{ background: "transparent", border: "none", color: "#64748B", cursor: "pointer", padding: "2px" }}
                    >
                      {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExp && (
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "#1E293B",
                        lineHeight: 1.6,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {q.answerMarkdown}
                    </div>

                    {/* Evidentiary Citations Chips */}
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", paddingTop: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                        Citations:
                      </span>
                      {q.evidenceChips.map((chip, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => {
                            navigator.clipboard.writeText(`${chip.label}: ${chip.hash} (${chip.detail})`);
                            toast.success(`Copied citation for ${chip.label}`);
                          }}
                          title={`Click to copy: ${chip.sourceFile} - ${chip.detail}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: chip.tier === "T3" ? "#FFF1F2" : chip.tier === "T2" ? "#FFFBEB" : "#F8FAFC",
                            border: `1px solid ${chip.tier === "T3" ? "#FECDD3" : chip.tier === "T2" ? "#FDE68A" : "#E2E8F0"}`,
                            fontSize: "10px",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: "8.5px",
                              padding: "0.5px 3px",
                              borderRadius: "2px",
                              background: chip.tier === "T3" ? "#FFE4E6" : chip.tier === "T2" ? "#FEF3C7" : "#DCFCE7",
                              color: chip.tier === "T3" ? "#BE123C" : chip.tier === "T2" ? "#92400E" : "#15803D",
                            }}
                          >
                            {chip.tier}
                          </span>
                          <span style={{ fontWeight: 700, color: "#0F172A" }}>{chip.label}</span>
                          <code style={{ fontSize: "9.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                            {chip.hash.slice(0, 8)}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            FOOTER DISCLAIMER
            ========================================================================= */}
        <div
          style={{
            padding: "10px 20px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            fontSize: "10.5px",
            color: "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Scale size={14} color="#4F46E5" />
            <span>
              TARKA Forensic Technical Intelligence · Draft Requisitions Prepared for IO & Custodian Execution.
            </span>
          </div>
          <span style={{ fontWeight: 700, color: "#334155" }}>
            BSA §63(4) Court Admissibility Reserved
          </span>
        </div>
      </div>
    </div>
  );
};

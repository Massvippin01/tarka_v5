import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  Copy,
  Check,
  Database,
  Scale,
  Building,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import type { ReconstructedEdge } from "../../../utils/investigationReconstructor";

interface RelationshipEvidenceSheetProps {
  edge: ReconstructedEdge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RelationshipEvidenceSheet: React.FC<RelationshipEvidenceSheetProps> = ({
  edge,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !edge) return null;

  const isExact = edge.matchClassification === "EXACT_DETERMINISTIC";
  const isCorroborated = edge.matchClassification === "CORROBORATED_MULTI_VECTOR";
  const isInsufficient = edge.matchClassification === "INSUFFICIENT_EVIDENCE";

  const handleCopyRequisition = () => {
    const text = `=== STATUTORY REQUISITION DRAFT FOR INVESTIGATING OFFICER (IO) EXECUTION ===
Case Reference: FIR #0149/2026, Noida Cyber Crime PS, UP (NCRP-1930-DL-2026-0922841)
Statutory Authority: ${edge.recommendedAction.legalSection}
Priority Tier: ${edge.recommendedAction.priority}
Target Relationship: ${edge.sourceLabel} → ${edge.targetLabel}
Payment Rail: ${edge.rail} | RRN / UTR: ${edge.rrn} | Amount: ₹${edge.amount.toLocaleString()}
Match Classification: ${edge.matchClassification}

[MANDATORY STATUTORY DIRECTIVE]
${edge.recommendedAction.statutoryAction}

[FORENSIC CAUTION & SAFEGUARD NOTICE]
${edge.recommendedAction.cautionNotice}

[SUPPORTING FORENSIC CITATIONS]
${edge.supportingEvidence.map((e, idx) => `${idx + 1}. [${e.sourceFile}] ${e.corroboratingAttribute}: ${e.rawLogValue} (${e.timestamp})`).join("\n")}

[LEGAL DISCLAIMER]
Prepared by TARKA Forensic Engine as a Technical Finding and Draft Requisition. Legal admissibility is adjudicated exclusively by the learned Court under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.
=== END REQUISITION DRAFT ===`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Draft Statutory Requisition copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
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
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          height: "100%",
          background: "#FFFFFF",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.18)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          animation: "slideInRight 0.22s ease-out",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            HEADER BAR
            ========================================================================= */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: isExact ? "#ECFDF5" : isCorroborated ? "#EEF2FF" : "#FEF3C7",
                border: `1px solid ${isExact ? "#A7F3D0" : isCorroborated ? "#C7D2FE" : "#FDE68A"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isExact ? "#059669" : isCorroborated ? "#4F46E5" : "#D97706",
              }}
            >
              {isExact ? (
                <ShieldCheck size={18} />
              ) : isCorroborated ? (
                <FileCheck2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#0F172A" }}>
                  Relationship Evidence Sheet
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    background: isExact ? "#DCFCE7" : isCorroborated ? "#E0E7FF" : "#FEF3C7",
                    color: isExact ? "#15803D" : isCorroborated ? "#4338CA" : "#B45309",
                    border: `1px solid ${isExact ? "#86EFAC" : isCorroborated ? "#A5B4FC" : "#FCD34D"}`,
                  }}
                >
                  {edge.matchClassification.replace(/_/g, " ")}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                RRN: <code style={{ fontFamily: "monospace", color: "#1E293B", fontWeight: 700 }}>{edge.rrn}</code> · Timestamp: {edge.timestampIst}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "4px 8px",
              cursor: "pointer",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <X size={14} />
            <span>Close (Esc)</span>
          </button>
        </div>

        {/* =========================================================================
            TRANSACTION TRAIL HERO STRIP
            ========================================================================= */}
        <div
          style={{
            padding: "12px 18px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A" }}>
              {edge.sourceLabel}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#4F46E5" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "1px 6px", background: "#EEF2FF", borderRadius: "4px", border: "1px solid #C7D2FE" }}>
                {edge.rail}
              </span>
              <ArrowRight size={14} />
            </div>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A" }}>
              {edge.targetLabel}
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: 900, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
              ₹{edge.amount.toLocaleString()}
            </div>
            <div style={{ fontSize: "10px", color: "#64748B" }}>
              {edge.sourceFiles.length} Ingested Source Files
            </div>
          </div>
        </div>

        {/* =========================================================================
            SCROLLABLE BODY CONTENT
            ========================================================================= */}
        <div
          style={{
            flex: "1 1 0%",
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxSizing: "border-box",
          }}
        >
          {/* SECTION 1: INSUFFICIENT EVIDENCE SAFEGUARD BANNER (IF APPLICABLE) */}
          {isInsufficient && edge.insufficientEvidenceAnalysis && (
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid #F59E0B",
                background: "#FFFBEB",
                padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(245, 158, 11, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#B45309" }}>
                <ShieldAlert size={16} />
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  MHA Safe Harbor Safeguard: Insufficient Evidence Warning
                </span>
              </div>
              <p style={{ fontSize: "11.5px", color: "#92400E", lineHeight: 1.5, marginTop: "6px", margin: "6px 0" }}>
                {edge.insufficientEvidenceAnalysis.reason}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  marginTop: "8px",
                  background: "#FEF3C7",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
              >
                <div>
                  <span style={{ color: "#78350F", fontWeight: 700 }}>Candidate Subscriber Pool:</span>{" "}
                  <strong style={{ color: "#B45309" }}>{edge.insufficientEvidenceAnalysis.cgnatCandidateCount} Mobile Users</strong>
                </div>
                <div>
                  <span style={{ color: "#78350F", fontWeight: 700 }}>Port Status:</span>{" "}
                  <strong style={{ color: "#B45309" }}>{edge.insufficientEvidenceAnalysis.portStatus}</strong>
                </div>
              </div>
              <div
                style={{
                  marginTop: "8px",
                  padding: "6px 10px",
                  background: "#FDE68A",
                  borderRadius: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "#78350F",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>⚠️ {edge.insufficientEvidenceAnalysis.precautionaryWarning}</span>
              </div>
            </div>
          )}

          {/* SECTION 2: BONA-FIDE MERCHANT HARD-VETO BANNER (IF APPLICABLE) */}
          {edge.targetLabel.includes("Apex Electronics") && (
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid #10B981",
                background: "#ECFDF5",
                padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(16, 185, 129, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#065F46" }}>
                <Building size={16} />
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Bona-Fide Commercial Merchant Hard-Veto Applied (§106 BNSS)
                </span>
              </div>
              <p style={{ fontSize: "11.5px", color: "#047857", lineHeight: 1.5, marginTop: "6px", margin: "6px 0" }}>
                Apex Electronics Pvt Ltd holds verified <strong>GSTIN 07AAACA1234F1Z8</strong> and <strong>MCA CIN U51909DL2018PTC334912</strong> with a 68-month corporate banking relationship. Under the equitable <em>Lowest Intermediate Balance Rule (Roscoe v. Winder)</em>, TARKA has marked a proportional debit lien for <strong>₹1,80,000.00</strong>, while shielding <strong>₹2,50,000.00 in clean operational working capital</strong> from unlawful blanket freeze.
              </p>
            </div>
          )}

          {/* SECTION 3: SUPPORTING EVIDENCE TABLE */}
          <div
            style={{
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                background: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
                <Database size={14} color="#4F46E5" />
                <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  1. Supporting Evidentiary Citations ({edge.supportingEvidence.length})
                </span>
              </div>
              <span style={{ fontSize: "10.5px", color: "#64748B" }}>Deterministic Cross-File Joins</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", color: "#475569", borderBottom: "1px solid #CBD5E1" }}>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Source File</th>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Attribute</th>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Raw Log Value</th>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {edge.supportingEvidence.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: idx === edge.supportingEvidence.length - 1 ? "none" : "1px solid #F1F5F9",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                      }}
                    >
                      <td style={{ padding: "7px 10px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "#0369A1", fontWeight: 600 }}>
                        {row.sourceFile.replace(/\.csv$/, "")}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#334155", fontWeight: 700 }}>
                        {row.corroboratingAttribute}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#0F172A", fontFamily: "var(--font-mono)", fontSize: "10.5px" }}>
                        {row.rawLogValue}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#64748B", whiteSpace: "nowrap", fontSize: "10px" }}>
                        {row.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: CONTRADICTORY / COUNTER-EVIDENCE EVALUATION */}
          <div
            style={{
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                background: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
                <Scale size={14} color="#D97706" />
                <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  2. Contradictory & Counter-Hypotheses Evaluated ({edge.contradictoryEvidence.length})
                </span>
              </div>
              <span style={{ fontSize: "10.5px", color: "#64748B" }}>Falsification & Adversarial Check</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", color: "#475569", borderBottom: "1px solid #CBD5E1" }}>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Hypothesis Tested</th>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Refuting Attribute</th>
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>Forensic Evaluation Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {edge.contradictoryEvidence.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: idx === edge.contradictoryEvidence.length - 1 ? "none" : "1px solid #F1F5F9",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                      }}
                    >
                      <td style={{ padding: "7px 10px", color: "#475569", fontWeight: 600 }}>
                        {c.hypotheticalInvolvement}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#334155", fontWeight: 700 }}>
                        {c.refutingAttribute}
                      </td>
                      <td style={{ padding: "7px 10px", color: c.evalVerdict.includes("REJECTED") ? "#DC2626" : c.evalVerdict.includes("EXCLUDED") ? "#059669" : "#D97706", fontWeight: 700, fontSize: "10.5px" }}>
                        {c.evalVerdict}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5: RECOMMENDED ACTIONS FOR INVESTIGATING OFFICER (IO) */}
          <div
            style={{
              borderRadius: "8px",
              border: "1px solid #C7D2FE",
              background: "#EEF2FF",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#312E81" }}>
                <FileText size={16} color="#4F46E5" />
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  3. Recommended Statutory Action for Investigating Officer
                </span>
              </div>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
                  fontWeight: 800,
                  background: edge.recommendedAction.priority === "CRITICAL_P0" ? "#FFE4E6" : "#E0E7FF",
                  color: edge.recommendedAction.priority === "CRITICAL_P0" ? "#BE123C" : "#3730A3",
                  border: `1px solid ${edge.recommendedAction.priority === "CRITICAL_P0" ? "#FDA4AF" : "#A5B4FC"}`,
                }}
              >
                {edge.recommendedAction.priority}
              </span>
            </div>

            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#1E1B4B" }}>
                {edge.recommendedAction.legalSection}
              </div>
              <p style={{ fontSize: "11px", color: "#3730A3", lineHeight: 1.4, margin: "4px 0" }}>
                {edge.recommendedAction.statutoryAction}
              </p>
              <div style={{ fontSize: "10.5px", color: "#4338CA", marginTop: "4px", fontStyle: "italic" }}>
                Caution: {edge.recommendedAction.cautionNotice}
              </div>
            </div>

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleCopyRequisition}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
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
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Requisition Copied!" : "Copy Draft Statutory Requisition"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            FOOTER DISCLAIMER
            ========================================================================= */}
        <div
          style={{
            padding: "8px 18px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            fontSize: "10px",
            color: "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span>
            TARKA Forensic Engine · Technical Finding & Draft Requisitions Prepared for IO Execution.
          </span>
          <span style={{ fontWeight: 600, color: "#475569" }}>
            BSA §63(4) Court Admissibility Reserved
          </span>
        </div>
      </div>
    </div>
  );
};

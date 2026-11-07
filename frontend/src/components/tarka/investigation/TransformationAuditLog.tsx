import React, { useState } from "react";
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  FileCheck2,
  Copy,
  Check,
  X,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";

interface TransformationAuditLogProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const TransformationAuditLog: React.FC<TransformationAuditLogProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false,
}) => {
  const [copiedRoot, setCopiedRoot] = useState(false);
  const { reconstructedInvestigation } = useTarkaUiStore();
  const investigation = reconstructedInvestigation || reconstruct5FileInvestigation();
  const steps = investigation.transformationSteps;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyMerkleRoot = () => {
    navigator.clipboard.writeText(investigation.postIngestionMerkleRoot);
    setCopiedRoot(true);
    toast.success("Post-Ingestion Merkle Root copied to clipboard!");
    setTimeout(() => setCopiedRoot(false), 2000);
  };

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* =========================================================================
          AUTHENTICITY VS INTEGRITY DUAL BANNER
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        {/* Box A: Pre-Ingestion Authenticity */}
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid #FECDD3",
            background: "#FFF1F2",
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#BE123C" }}>
            <AlertOctagon size={15} />
            <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Pre-Ingestion Authenticity Check (Input File Audit)
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#9F1239", marginTop: "4px", lineHeight: 1.4 }}>
            <strong>{investigation.preIngestionTamper.finding}</strong>
          </div>
          <div style={{ fontSize: "10px", color: "#E11D48", marginTop: "4px" }}>
            {investigation.preIngestionTamper.discrepancyNote}
          </div>
        </div>

        {/* Box B: Post-Ingestion Cryptographic Integrity */}
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid #A7F3D0",
            background: "#ECFDF5",
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#065F46" }}>
              <ShieldCheck size={15} />
              <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Post-Ingestion Cryptographic Integrity (Memory Seal)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyMerkleRoot}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {copiedRoot ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiedRoot ? "Copied" : "Copy Merkle Root"}</span>
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#047857", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
            RFC-6962 Merkle Root: <strong>{investigation.postIngestionMerkleRoot.slice(0, 28)}...</strong>
          </div>
          <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px" }}>
            Zero In-Memory Tamper · All 5 CSV artifacts & derived graph nodes sealed under SHA-256 tree.
          </div>
        </div>
      </div>

      {/* =========================================================================
          LEGAL SEPARATION NOTICE
          ========================================================================= */}
      <div
        style={{
          borderRadius: "6px",
          border: "1px solid #C7D2FE",
          background: "#EEF2FF",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "10.5px",
          color: "#3730A3",
          flexShrink: 0,
        }}
      >
        <Scale size={15} color="#4F46E5" style={{ flexShrink: 0 }} />
        <div>
          <strong>Statutory Separation of Powers Notice:</strong> TARKA produces <em>Forensic Technical Findings and Draft Statutory Requisitions</em> for execution by the Investigating Officer & Custodians. Admissibility in law is adjudicated strictly by the learned Court under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.
        </div>
      </div>

      {/* =========================================================================
          10-STEP TRANSFORMATION AUDIT TABLE
          ========================================================================= */}
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          overflow: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F1F5F9", color: "#475569", borderBottom: "1px solid #CBD5E1", position: "sticky", top: 0, zIndex: 10 }}>
              <th style={{ padding: "8px 10px", fontWeight: 700, width: "45px" }}>Step</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, width: "180px" }}>Engine & Operation</th>
              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Input Evidentiary Artifacts</th>
              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Mathematical Transformation Basis</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, width: "110px" }}>Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((st) => {
              const isQuarantined = st.status === "QUARANTINED";
              const isFlagged = st.status === "INSUFFICIENT_FLAGGED";
              const isPassed = st.status === "PASSED_VERIFIED";

              return (
                <tr
                  key={st.stepIndex}
                  style={{
                    borderBottom: "1px solid #F1F5F9",
                    background: isQuarantined ? "#FFF8F8" : isFlagged ? "#FFFDF5" : st.stepIndex % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                  }}
                >
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#64748B" }}>
                    #{String(st.stepIndex).padStart(2, "0")}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 800, color: "#0F172A" }}>{st.engine}</div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>{st.operation}</div>
                  </td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                      {(st.inputArtifacts || []).map((art, aIdx) => (
                        <span
                          key={aIdx}
                          style={{
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                            fontSize: "9.5px",
                            fontFamily: "var(--font-mono)",
                            color: "#0369A1",
                          }}
                        >
                          {art}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "#1E293B" }}>
                    {st.mathematicalBasis}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        background: isQuarantined ? "#FFE4E6" : isFlagged ? "#FEF3C7" : "#ECFDF5",
                        color: isQuarantined ? "#BE123C" : isFlagged ? "#92400E" : "#059669",
                        border: `1px solid ${isQuarantined ? "#FDA4AF" : isFlagged ? "#FCD34D" : "#A7F3D0"}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isPassed && <ShieldCheck size={10} />}
                      {isQuarantined && <AlertOctagon size={10} />}
                      {isFlagged && <AlertTriangle size={10} />}
                      <span>{st.status.replace(/_/g, " ")}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          height: "90vh",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4F46E5",
              }}
            >
              <FileCheck2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                10-Step Deterministic Transformation Audit Log
              </div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>
                Verifiable Pipeline from 5 Raw Evidentiary Files to BSA §63(4) Court Dossier
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

        {/* Body */}
        <div style={{ flex: "1 1 0%", minHeight: 0, padding: "16px 20px", boxSizing: "border-box" }}>
          {content}
        </div>
      </div>
    </div>
  );
};

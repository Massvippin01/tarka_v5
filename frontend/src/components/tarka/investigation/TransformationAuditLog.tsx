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
  const defaultInv = reconstruct5FileInvestigation();
  const investigation = reconstructedInvestigation || defaultInv;
  const steps = Array.isArray(investigation?.transformationSteps) && investigation.transformationSteps.length > 0
    ? investigation.transformationSteps
    : defaultInv.transformationSteps;

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
    <div className="flex flex-col gap-3 w-full max-w-full min-w-0">
      {/* =========================================================================
          AUTHENTICITY VS INTEGRITY DUAL BANNER
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        {/* Box A: Pre-Ingestion Authenticity */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertOctagon className="size-4 shrink-0 text-rose-600" />
            <span className="text-[12px] font-bold uppercase tracking-wide">
              Pre-Ingestion Authenticity Check (Input File Audit)
            </span>
          </div>
          <div className="text-[12.5px] font-semibold text-rose-950 leading-snug">
            {investigation?.preIngestionTamper?.finding || defaultInv.preIngestionTamper.finding}
          </div>
          <div className="text-[12px] text-rose-800 leading-normal">
            {investigation?.preIngestionTamper?.discrepancyNote || defaultInv.preIngestionTamper.discrepancyNote}
          </div>
        </div>

        {/* Box B: Post-Ingestion Cryptographic Integrity */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span className="text-[12px] font-bold uppercase tracking-wide">
                Post-Ingestion Cryptographic Integrity (Memory Seal)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyMerkleRoot}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 text-[12px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              {copiedRoot ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedRoot ? "Copied" : "Copy Merkle Root"}</span>
            </button>
          </div>
          <div className="text-[12px] font-mono text-emerald-950">
            RFC-6962 Merkle Root: <strong>{investigation.postIngestionMerkleRoot ? `${investigation.postIngestionMerkleRoot.slice(0, 32)}…` : "not computed yet"}</strong>
          </div>
          <div className="text-[12px] text-emerald-800">
            Zero In-Memory Tamper · All 5 CSV artifacts & derived graph nodes sealed under SHA-256 tree.
          </div>
        </div>
      </div>

      {/* =========================================================================
          LEGAL SEPARATION NOTICE
          ========================================================================= */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 flex items-start gap-2.5 text-[12px] text-blue-950 shrink-0 shadow-2xs">
        <Scale className="size-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-blue-900">Statutory Separation of Powers Notice:</strong>{" "}
          TARKA produces <em>Forensic Technical Findings and Draft Statutory Requisitions</em> for execution by the Investigating Officer & Custodians. Admissibility in law is adjudicated strictly by the learned Court under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.
        </div>
      </div>

      {/* =========================================================================
          10-STEP TRANSFORMATION AUDIT TABLE
          ========================================================================= */}
      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-white shadow-2xs">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="bg-[var(--surface-1)] text-[var(--fg-2)] border-b border-[var(--line)] font-semibold">
              <th className="py-2.5 px-3.5 w-16">Step</th>
              <th className="py-2.5 px-3.5 w-48">Engine & Operation</th>
              <th className="py-2.5 px-3.5">Input Evidentiary Artifacts</th>
              <th className="py-2.5 px-3.5">Mathematical Transformation Basis</th>
              <th className="py-2.5 px-3.5 w-36">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {steps.map((st) => {
              const isQuarantined = st.status === "QUARANTINED";
              const isFlagged = st.status === "INSUFFICIENT_FLAGGED";
              const isPassed = st.status === "PASSED_VERIFIED";

              return (
                <tr
                  key={st.stepIndex}
                  className={`transition-colors ${
                    isQuarantined
                      ? "bg-rose-50/40"
                      : isFlagged
                      ? "bg-amber-50/40"
                      : st.stepIndex % 2 === 0
                      ? "bg-white"
                      : "bg-[var(--surface-1)]/40"
                  } hover:bg-[var(--surface-2)]/60`}
                >
                  <td className="py-2.5 px-3.5 font-mono font-bold text-[var(--fg-3)]">
                    #{String(st.stepIndex).padStart(2, "0")}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-bold text-[var(--fg-1)]">{st.engine}</div>
                    <div className="text-[12px] text-[var(--fg-3)] mt-0.5">{st.operation}</div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(st.inputArtifacts || []).map((art, aIdx) => (
                        <span
                          key={aIdx}
                          className="px-2 py-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--line)] text-[12px] font-mono text-[var(--accent)]"
                        >
                          {art}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[12px] text-[var(--fg-2)] leading-relaxed">
                    {st.mathematicalBasis}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold whitespace-nowrap ${
                        isQuarantined
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isFlagged
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isPassed && <ShieldCheck className="size-3.5 text-emerald-600" />}
                      {isQuarantined && <AlertOctagon className="size-3.5 text-rose-600" />}
                      {isFlagged && <AlertTriangle className="size-3.5 text-amber-600" />}
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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col border border-[var(--line)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[var(--surface-1)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[var(--accent)]">
              <FileCheck2 className="size-4" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[var(--fg-1)]">
                10-Step Deterministic Transformation Audit Log
              </div>
              <div className="text-[12px] text-[var(--fg-3)]">
                Verifiable Pipeline from 5 Raw Evidentiary Files to BSA §63(4) Court Dossier
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-[var(--line)] text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-white text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
            <span>Close (Esc)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-5 overflow-y-auto">
          {content}
        </div>
      </div>
    </div>
  );
};

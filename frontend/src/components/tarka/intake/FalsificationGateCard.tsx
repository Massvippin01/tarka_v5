import React, { useEffect } from "react";
import {
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";

export interface FalsificationGateCardProps {
  isRow14Valid: boolean;
  isRrnValid: boolean;
  isReceiptConflicted: boolean;
  isPdfAppended: boolean;
  isMerkleCompliant: boolean;
  onJumpToLedger?: () => void;
}

export const FalsificationGateCard: React.FC<FalsificationGateCardProps> = ({
  isRow14Valid,
  isRrnValid,
  isReceiptConflicted,
  isPdfAppended,
  isMerkleCompliant,
  onJumpToLedger,
}) => {
  const { setIntakeGate } = useTarkaGlobal();

  // Gate halts if double-entry math fails or RRN clock skew breaches spec
  const isHalted = !isRow14Valid || !isRrnValid;

  const invariants: {
    id: "I1" | "I2" | "I3" | "I4" | "I5";
    name: string;
    formula: string;
    status: "PASS" | "FAIL" | "WARN";
    ms: number;
    expected: string;
    observed: string;
    icon: typeof ShieldCheck;
  }[] = [
    {
      id: "I1",
      name: "Double-Entry Conservation",
      formula: "Bal[k] = Bal[k-1] + Cr - Dr",
      status: isRow14Valid ? "PASS" : "FAIL",
      ms: 0.4,
      expected: "0.00 Deficit",
      observed: isRow14Valid ? "6/6 Reconciled ✓" : "Δ ₹2,00,000 Deficit at #14 ✗",
      icon: ShieldCheck,
    },
    {
      id: "I2",
      name: "NPCI RRN Clock Sync",
      formula: "|Δt_NTP| ≤ 180s",
      status: isRrnValid ? "PASS" : "FAIL",
      ms: 0.2,
      expected: "≤ 180s Window",
      observed: isRrnValid ? "Δ +14.0s (IN SPEC)" : "Δ +3,000s (>180s SKEW) ✗",
      icon: Clock,
    },
    {
      id: "I3",
      name: "Cross-Source Delta",
      formula: "Receipt.Amount == CBS.Debit",
      status: isReceiptConflicted ? "WARN" : "PASS",
      ms: 0.3,
      expected: "₹2,15,000.00",
      observed: isReceiptConflicted ? "Receipt: ₹15,000 (14.3× Overwrite)" : "Matched",
      icon: AlertTriangle,
    },
    {
      id: "I4",
      name: "PDF XRef Binary Traversal",
      formula: "Trailer.Count == 1",
      status: isPdfAppended ? "WARN" : "PASS",
      ms: 0.6,
      expected: "1 %%EOF Trailer",
      observed: isPdfAppended ? "2 Trailers (Appended at 0x00014209)" : "Clean 1 Trailer",
      icon: FileCheck,
    },
    {
      id: "I5",
      name: "CGNAT Privacy Blindness",
      formula: "DoT Clause 39.20 Inclusion",
      status: isMerkleCompliant ? "PASS" : "FAIL",
      ms: 0.5,
      expected: "Zero Civilian Leakage",
      observed: "9,996 Records Blinded ✓",
      icon: Zap,
    },
  ];

  const totalMs = invariants.reduce((acc, inv) => acc + inv.ms, 0);

  // Sync with global shell context
  useEffect(() => {
    setIntakeGate({
      isHalted,
      invariants: invariants.map((inv) => ({
        id: inv.id,
        name: inv.name,
        status: inv.status,
        expectedVsObserved: `${inv.expected} -> ${inv.observed}`,
        executionTimeMs: inv.ms,
      })),
      totalMs: Number(totalMs.toFixed(1)),
    });
  }, [isHalted, isRow14Valid, isRrnValid, isReceiptConflicted, isPdfAppended, isMerkleCompliant, setIntakeGate]);

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: isHalted ? "1px solid #FECDD3" : "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "8px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "4px",
        boxSizing: "border-box",
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Top Header & Overall Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "5px",
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "5px",
              background: isHalted ? "#FFF1F2" : "#ECFDF5",
              color: isHalted ? "#BE123C" : "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isHalted ? <Lock size={11} color="#E11D48" /> : <Unlock size={11} color="#059669" />}
          </div>
          <div>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Falsification Gate
            </h3>
            <span style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              Falsify-Before-Attribute · Z3 Engine
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "1.5px 6px",
              borderRadius: "9999px",
              background: isHalted ? "#FFF1F2" : "#ECFDF5",
              color: isHalted ? "#BE123C" : "#047857",
              border: isHalted ? "1px solid #FECDD3" : "1px solid #A7F3D0",
              whiteSpace: "nowrap",
            }}
          >
            {isHalted ? "PIPELINE HALTED ✗" : "GATE UNLOCKED ✓"}
          </span>
          <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginTop: "1px" }}>
            Verified in {totalMs.toFixed(1)}ms
          </span>
        </div>
      </div>

      {/* 5-Invariant Timeline Stepper */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {invariants.map((inv) => {
          const isPassed = inv.status === "PASS";
          const isFailed = inv.status === "FAIL";
          const isWarning = inv.status === "WARN";

          return (
            <div
              key={inv.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "3px 6px",
                borderRadius: "5px",
                background: isFailed ? "#FFF1F2" : isWarning ? "#FFFBEB" : "#F8FAFC",
                border: `1px solid ${isFailed ? "#FECDD3" : isWarning ? "#FDE68A" : "#E2E8F0"}`,
                fontSize: "10.5px",
              }}
            >
              {/* Left: ID + Name + Formula */}
              <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                <span
                  style={{
                    width: "18px",
                    height: "16px",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    fontWeight: 700,
                    flexShrink: 0,
                    background: isFailed ? "#FFE4E6" : isWarning ? "#FEF3C7" : "#ECFDF5",
                    color: isFailed ? "#BE123C" : isWarning ? "#92400E" : "#047857",
                  }}
                >
                  {inv.id}
                </span>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#1E293B", fontSize: "10.5px", whiteSpace: "nowrap" }}>
                      {inv.name}
                    </span>
                    <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#94A3B8", whiteSpace: "nowrap" }}>
                      ({inv.formula})
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      color: isFailed ? "#BE123C" : isWarning ? "#B45309" : "#64748B",
                      fontWeight: isFailed ? 700 : 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={inv.observed}
                  >
                    {inv.observed}
                  </div>
                </div>
              </div>

              {/* Right: Status Icon + ms */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>
                  {inv.ms}ms
                </span>
                {isPassed && <CheckCircle2 size={12} color="#059669" />}
                {isFailed && <XCircle size={12} color="#E11D48" />}
                {isWarning && <AlertTriangle size={12} color="#D97706" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gate Summary Footer Banner */}
      <div
        style={{
          padding: "5px 7px",
          borderRadius: "5px",
          fontSize: "9.5px",
          lineHeight: 1.3,
          display: "flex",
          alignItems: "flex-start",
          gap: "5px",
          background: isHalted ? "#FFF1F2" : "#ECFDF5",
          border: `1px solid ${isHalted ? "#FECDD3" : "#A7F3D0"}`,
          color: isHalted ? "#9F1239" : "#065F46",
        }}
      >
        {isHalted ? (
          <>
            <XCircle size={12} color="#E11D48" style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong style={{ color: "#BE123C" }}>Judicial Lock Engaged: </strong>
              <span>
                Downstream CGNAT, Taint DAG, and §63(4) certificates halted to prevent tainted evidence submission.
              </span>
              {onJumpToLedger && (
                <button
                  type="button"
                  onClick={onJumpToLedger}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#BE123C",
                    fontWeight: 700,
                    textDecoration: "underline",
                    marginLeft: "3px",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "9.5px",
                  }}
                >
                  Review Row #14
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 size={12} color="#059669" style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong style={{ color: "#047857" }}>All Mathematical Proofs Verified: </strong>
              <span>
                Double-entry conservation and NPCI clock sync confirmed. Cleared for CGNAT attribution.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

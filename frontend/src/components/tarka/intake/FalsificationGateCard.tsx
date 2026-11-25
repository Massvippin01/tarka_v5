import React, { useEffect, useState } from "react";
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
  Sliders,
  X,
} from "lucide-react";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import {
  deriveGateVerdict,
  type InvariantId,
  type InvariantStatusDetail,
  type GateVerdictResult,
} from "./deriveGateVerdict";

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
  const { setIntakeGate, toggleMutation } = useTarkaGlobal();
  const [selectedStation, setSelectedStation] = useState<InvariantStatusDetail | null>(null);
  const [breakMenuOpen, setBreakMenuOpen] = useState(false);

  // Compute 3-tier verdict via pure evaluation function
  const verdictResult: GateVerdictResult = deriveGateVerdict({
    i1_ledgerConservation: isRow14Valid,
    i2_rrnClockSync: isRrnValid,
    i3_cbsSwitchMatch: !isReceiptConflicted || isRow14Valid,
    i4_pdfRevisionIntegrity: !isPdfAppended,
    i5_cgnatMerklePrivacy: isMerkleCompliant,
  });

  const { verdict, isHalted, totalLatencyMs, invariants } = verdictResult;

  // Sync state with global shell context
  useEffect(() => {
    setIntakeGate({
      isHalted,
      invariants: invariants.map((inv) => ({
        id: inv.id,
        name: inv.name,
        status: inv.passed ? "PASS" : inv.severity === "BLOCKING" ? "FAIL" : "WARN",
        expectedVsObserved: `${inv.expected} -> ${inv.observed}`,
        executionTimeMs: inv.latencyMs,
      })),
      totalMs: totalLatencyMs,
    });
  }, [isHalted, totalLatencyMs, invariants, setIntakeGate]);

  const getStationIcon = (id: InvariantId) => {
    switch (id) {
      case "I1":
        return ShieldCheck;
      case "I2":
        return Clock;
      case "I3":
        return AlertTriangle;
      case "I4":
        return FileCheck;
      case "I5":
        return Zap;
    }
  };

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: isHalted ? "1px solid #FECDD3" : "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "8px 12px 10px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxSizing: "border-box",
        minHeight: "168px",
        width: "100%",
        minWidth: 0,
        transition: "border-color 0.2s ease",
      }}
      aria-live="polite"
    >
      {/* =========================================================================
          1. HEADER: GATE TITLE + LATENCY + VERDICT STATUS PILL + PRESETS
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          height: "28px",
          borderBottom: "1px solid #F1F5F9",
          paddingBottom: "4px",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "5px",
              background: isHalted ? "#FFF1F2" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FFFBEB" : "#ECFDF5",
              color: isHalted ? "#BE123C" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#B45309" : "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isHalted ? (
              <Lock size={11} color="#E11D48" />
            ) : (
              <Unlock size={11} color={verdict === "UNLOCKED_WITH_QUARANTINE" ? "#D97706" : "#059669"} />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", margin: 0, letterSpacing: "-0.01em" }}>
              Real-Time Falsification Gate
            </h3>
            <span style={{ fontSize: "9.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              Falsify-Before-Attribute Pipeline · Z3 Solver
            </span>
          </div>
        </div>

        {/* Right: Verdict Badge & Break Invariant Menu */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "1.5px 7px",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: isHalted ? "#FFF1F2" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FFFBEB" : "#ECFDF5",
              color: isHalted ? "#BE123C" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#B45309" : "#047857",
              border: `1px solid ${
                isHalted ? "#FECDD3" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FDE68A" : "#A7F3D0"
              }`,
            }}
          >
            {isHalted ? (
              <>
                <XCircle size={10} color="#E11D48" />
                <span>PIPELINE HALTED ✗</span>
              </>
            ) : (
              <>
                {verdict === "UNLOCKED_WITH_QUARANTINE" ? (
                  <AlertTriangle size={10} color="#D97706" />
                ) : (
                  <CheckCircle2 size={10} color="#059669" />
                )}
                <span>GATE UNLOCKED ✓</span>
                {verdict === "UNLOCKED_WITH_QUARANTINE" && (
                  <span
                    style={{
                      fontSize: "8px",
                      background: "#FEF3C7",
                      color: "#92400E",
                      padding: "0 3px",
                      borderRadius: "2px",
                      fontWeight: 800,
                    }}
                  >
                    QUARANTINE
                  </span>
                )}
              </>
            )}
          </span>

          <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>
            {totalLatencyMs}ms
          </span>

          {/* Break an Invariant Menu */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setBreakMenuOpen((p) => !p)}
              style={{
                fontSize: "9px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
              title="Test falsification by deliberately breaking an invariant"
            >
              <Sliders size={9} />
              <span>Break an Invariant ▾</span>
            </button>

            {breakMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "24px",
                  zIndex: 50,
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: "180px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleMutation("alterBankRow14");
                    setBreakMenuOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 8px",
                    fontSize: "10px",
                    color: "#BE123C",
                    cursor: "pointer",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF1F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Break I1: Alter Row #14 Balance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleMutation("forgeRrnTimestamp");
                    setBreakMenuOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 8px",
                    fontSize: "10px",
                    color: "#B45309",
                    cursor: "pointer",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FFFBEB")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Break I2: Forge RRN Clock Skew
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. HORIZONTAL PIPELINE: 5 STATIONS JOINED BY WIRE INTO VERDICT NODE
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr) 180px",
          gap: "8px",
          alignItems: "stretch",
          padding: "4px 0",
        }}
      >
        {invariants.map((inv, idx) => {
          const IconComp = getStationIcon(inv.id);
          const isPassed = inv.passed;
          const isBlocking = inv.severity === "BLOCKING";

          return (
            <div
              key={inv.id}
              onClick={() => setSelectedStation(inv)}
              style={{
                background: isPassed ? "#FFFFFF" : isBlocking ? "#FFF1F2" : "#FFFBEB",
                border: `1px solid ${isPassed ? "#E2E8F0" : isBlocking ? "#FECDD3" : "#FDE68A"}`,
                borderRadius: "8px",
                padding: "6px 8px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "4px",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                position: "relative",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#94A3B8")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = isPassed
                  ? "#E2E8F0"
                  : isBlocking
                  ? "#FECDD3"
                  : "#FDE68A")
              }
              title={`Click to inspect proof for Station ${inv.id}: ${inv.name}`}
            >
              {/* Header: Tag + Severity */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <IconComp size={11} color={isPassed ? "#4F46E5" : isBlocking ? "#BE123C" : "#B45309"} />
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      color: isPassed ? "#4338CA" : isBlocking ? "#BE123C" : "#92400E",
                      background: isPassed ? "#EEF2FF" : isBlocking ? "#FFE4E6" : "#FEF3C7",
                      padding: "1px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {inv.id}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "7.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: isBlocking ? "#BE123C" : "#B45309",
                    background: isBlocking ? "#FFE4E6" : "#FFFBEB",
                    padding: "0.5px 3px",
                    borderRadius: "2px",
                  }}
                >
                  {inv.severity}
                </span>
              </div>

              {/* Station Title */}
              <div>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#09090B", lineHeight: 1.2 }}>
                  {inv.name}
                </div>
                <div
                  style={{
                    fontSize: "8.5px",
                    fontFamily: "var(--font-mono)",
                    color: "#64748B",
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inv.formula}
                </div>
              </div>

              {/* Observed status line */}
              <div
                style={{
                  fontSize: "8.5px",
                  fontFamily: "var(--font-mono)",
                  color: isPassed ? "#047857" : isBlocking ? "#BE123C" : "#B45309",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {inv.observed}
              </div>

              {/* Footer: Latency */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "8px", color: "#94A3B8" }}>
                <span>Station #{idx + 1}</span>
                <span>{inv.latencyMs}ms</span>
              </div>
            </div>
          );
        })}

        {/* Station 6: Final Verdict Node */}
        <div
          style={{
            background: isHalted ? "#FFF1F2" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FFFBEB" : "#ECFDF5",
            border: `1.5px solid ${
              isHalted ? "#FECDD3" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FDE68A" : "#A7F3D0"
            }`,
            borderRadius: "8px",
            padding: "6px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "9px", fontWeight: 800, color: isHalted ? "#BE123C" : "#047857" }}>
              GATE VERDICT
            </span>
            {isHalted ? (
              <XCircle size={14} color="#E11D48" />
            ) : verdict === "UNLOCKED_WITH_QUARANTINE" ? (
              <AlertTriangle size={14} color="#D97706" />
            ) : (
              <CheckCircle2 size={14} color="#059669" />
            )}
          </div>

          <div style={{ fontSize: "11px", fontWeight: 800, color: "#09090B", lineHeight: 1.2 }}>
            {isHalted ? "DOWNSTREAM HALTED ✗" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "UNLOCKED (QUARANTINE)" : "ALL CLEAR"}
          </div>

          <div style={{ fontSize: "8.5px", color: "#475569", lineHeight: 1.2 }}>
            {isHalted
              ? "Engines 02-04 locked until falsified ledger is repaired."
              : verdict === "UNLOCKED_WITH_QUARANTINE"
              ? "Secondary artifact quarantined; primary bank ledger admitted."
              : "Mathematical conservation satisfied. Proceeding to CGNAT."}
          </div>

          <div style={{ fontSize: "8px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
            Z3 Verification: {totalLatencyMs}ms
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. THIN DOWNSTREAM ENGINE STATUS BAR
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          background: "#F8FAFC",
          borderRadius: "6px",
          border: "1px solid #E2E8F0",
          fontSize: "9.5px",
        }}
      >
        <span style={{ fontWeight: 700, color: "#475569" }}>Downstream Engines Status:</span>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Engine 02 */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748B" }}>02 CGNAT Attribution:</span>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: isHalted ? "#BE123C" : "#047857",
                background: isHalted ? "#FFE4E6" : "#ECFDF5",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              {isHalted ? "LOCKED ✗" : "READY ✓"}
            </span>
          </div>

          {/* Engine 03 */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748B" }}>03 Taint & BNSS:</span>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: isHalted ? "#BE123C" : "#047857",
                background: isHalted ? "#FFE4E6" : "#ECFDF5",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              {isHalted ? "LOCKED ✗" : "READY ✓"}
            </span>
          </div>

          {/* Engine 04 */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748B" }}>04 BSA § 63(4) Court Dossier:</span>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: isHalted ? "#BE123C" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#B45309" : "#047857",
                background: isHalted ? "#FFE4E6" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FEF3C7" : "#ECFDF5",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              {isHalted ? "LOCKED ✗" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "CAVEAT RECORDED" : "CERTIFIED ✓"}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. PROOF INSPECTOR MODAL SHEET (CLICKING A STATION OPENS DEEP PROOF)
          ========================================================================= */}
      {selectedStation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectedStation(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "520px",
              background: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "#4338CA",
                    background: "#EEF2FF",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {selectedStation.id}
                </span>
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#09090B", margin: 0 }}>
                  Station Proof Inspector: {selectedStation.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Formula & Severity Box */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ color: "#64748B" }}>Invariant Specification:</span>
                <span style={{ fontWeight: 700, color: selectedStation.severity === "BLOCKING" ? "#BE123C" : "#B45309" }}>
                  {selectedStation.severity} ENFORCEMENT
                </span>
              </div>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                {selectedStation.formula}
              </code>
            </div>

            {/* Expected vs Observed */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B", marginBottom: "2px" }}>Expected Invariant</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857" }}>
                  {selectedStation.expected}
                </div>
              </div>

              <div
                style={{
                  background: selectedStation.passed ? "#ECFDF5" : "#FFF1F2",
                  border: `1px solid ${selectedStation.passed ? "#A7F3D0" : "#FECDD3"}`,
                  borderRadius: "6px",
                  padding: "8px",
                }}
              >
                <div style={{ fontSize: "10px", color: selectedStation.passed ? "#047857" : "#BE123C", marginBottom: "2px" }}>
                  Observed Evidence
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: selectedStation.passed ? "#047857" : "#BE123C",
                  }}
                >
                  {selectedStation.observed}
                </div>
              </div>
            </div>

            {/* Statutory Admissibility Rule */}
            <div
              style={{
                fontSize: "10.5px",
                color: "#475569",
                lineHeight: 1.4,
                background: "#F1F5F9",
                padding: "8px 12px",
                borderRadius: "6px",
              }}
            >
              <strong>Judicial Admissibility Note: </strong>
              Under Bharatiya Sakshya Adhiniyam (BSA) § 63(4), digital records must establish an unbroken chain of custody and pass mathematical conservation tests before forensic attribution can be admitted as evidence.
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {onJumpToLedger && selectedStation.id === "I1" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStation(null);
                    onJumpToLedger();
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #C7D2FE",
                    background: "#EEF2FF",
                    color: "#4338CA",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Jump to SBI Ledger (Row #14)
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#0F172A",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

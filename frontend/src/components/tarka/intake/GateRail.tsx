import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Zap,
  Clock,
  ShieldCheck,
  FileCheck,
  Sliders,
  RotateCcw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getBnss94CbsDirective } from "../../../utils/statutoryDirectives";
import * as HoverCard from "@radix-ui/react-hover-card";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import {
  deriveGateVerdict,
  type InvariantId,
  type GateVerdictResult,
} from "./deriveGateVerdict";

export interface GateRailProps {
  isRow14Valid: boolean;
  isRrnValid: boolean;
  isReceiptConflicted: boolean;
  isPdfAppended: boolean;
  isMerkleCompliant: boolean;
}

export const GateRail: React.FC<GateRailProps> = ({
  isRow14Valid,
  isRrnValid,
  isReceiptConflicted,
  isPdfAppended,
  isMerkleCompliant,
}) => {
  const { setIntakeGate, toggleMutation, resetAllMutations } = useTarkaGlobal();
  const { setProofStepIndex, setActiveDockTab, density } = useTarkaUiStore();
  const isCompact = density === "compact";
  const [breakMenuOpen, setBreakMenuOpen] = useState(false);

  // Pure mathematical verdict evaluation
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

  const shortNames: Record<InvariantId, string> = {
    I1: "Balance",
    I2: "RRN clock",
    I3: "Settlement",
    I4: "PDF revision",
    I5: "Privacy",
  };

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

  const handleStationClick = (idx: number) => {
    setProofStepIndex(idx);
    setActiveDockTab("proof");
  };

  return (
    <div
      data-card="gate-rail"
      style={{
        height: isCompact ? "48px" : "64px",
        minHeight: isCompact ? "48px" : "64px",
        maxHeight: isCompact ? "48px" : "64px",
        background: "#FFFFFF",
        border: `1px solid ${isHalted ? "#FECDD3" : "#E2E8F0"}`,
        borderRadius: "10px",
        padding: isCompact ? "0 8px" : "0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isCompact ? "8px" : "12px",
        boxSizing: "border-box",
        position: "relative",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        transition: "all 0.15s ease",
        containerType: "inline-size",
        containerName: "gaterail",
        width: "100%",
        minWidth: 0,
      }}
      role="region"
      aria-label="Falsification Gate Rail"
    >
      {/* 1. Left: Verdict & Pipeline Label */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: isHalted ? "#FFF1F2" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FFFBEB" : "#ECFDF5",
            color: isHalted ? "#BE123C" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#B45309" : "#047857",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${
              isHalted ? "#FECDD3" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FDE68A" : "#A7F3D0"
            }`,
          }}
        >
          {isHalted ? (
            <Lock size={14} color="#E11D48" />
          ) : (
            <Unlock size={14} color={verdict === "UNLOCKED_WITH_QUARANTINE" ? "#D97706" : "#059669"} />
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#09090B", whiteSpace: "nowrap" }}>
              Falsification Gate
            </span>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 800,
                padding: "1px 5px",
                borderRadius: "3px",
                background: isHalted ? "#FFF1F2" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FEF3C7" : "#ECFDF5",
                color: isHalted ? "#BE123C" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#92400E" : "#047857",
                border: `1px solid ${
                  isHalted ? "#FECDD3" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "#FDE68A" : "#A7F3D0"
                }`,
                whiteSpace: "nowrap",
              }}
            >
              {isHalted ? "HALTED ✗" : verdict === "UNLOCKED_WITH_QUARANTINE" ? "GATE UNLOCKED (QUARANTINE) ✓" : "GATE UNLOCKED ✓"}
            </span>
          </div>
          <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
            Falsify-Before-Attribute · {totalLatencyMs}ms
          </div>
        </div>
      </div>

      {/* 2. Center: 5 Stations joined by fluid SVG wire */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "6px",
          alignItems: "center",
          position: "relative",
          minWidth: 0,
        }}
      >
        {/* Background Connecting Wire */}
        <div
          style={{
            position: "absolute",
            left: "5%",
            right: "5%",
            top: "50%",
            height: "2px",
            background: isHalted ? "#FECDD3" : "#E2E8F0",
            zIndex: 0,
            transform: "translateY(-50%)",
          }}
        />

        {invariants.map((inv, idx) => {
          const IconComp = getStationIcon(inv.id);
          const isPassed = inv.passed;
          const isBlocking = inv.severity === "BLOCKING";

          return (
            <HoverCard.Root key={inv.id} openDelay={150} closeDelay={100}>
              <HoverCard.Trigger asChild>
                <button
                  type="button"
                  data-station={inv.id}
                  onClick={() => handleStationClick(idx)}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    background: isPassed ? "#FFFFFF" : isBlocking ? "#FFF1F2" : "#FFFBEB",
                    border: `1px solid ${isPassed ? "#CBD5E1" : isBlocking ? "#FECDD3" : "#FDE68A"}`,
                    borderRadius: "6px",
                    height: isCompact ? "30px" : "38px",
                    padding: "0 6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "4px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    transition: "all 0.12s ease",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        background: isPassed ? "#ECFDF5" : isBlocking ? "#FFE4E6" : "#FEF3C7",
                        color: isPassed ? "#047857" : isBlocking ? "#BE123C" : "#B45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={10} />
                    </div>

                    <div style={{ textAlign: "left", minWidth: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <span style={{ fontSize: "9.5px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                          {inv.id}
                        </span>
                        <span className="station-name-full" style={{ fontSize: "10px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {shortNames[inv.id]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "8px",
                      fontFamily: "var(--font-mono)",
                      color: isPassed ? "#047857" : isBlocking ? "#BE123C" : "#B45309",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isPassed ? "PASS" : isBlocking ? "FAIL" : "WARN"}
                  </span>
                </button>
              </HoverCard.Trigger>

              <HoverCard.Portal>
                <HoverCard.Content
                  side="bottom"
                  align="center"
                  sideOffset={6}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    width: "240px",
                    zIndex: 9999,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#09090B" }}>
                        {inv.id} {inv.name}
                      </span>
                      <span
                        style={{
                          fontSize: "8px",
                          fontWeight: 700,
                          padding: "1px 4px",
                          borderRadius: "2px",
                          background: isBlocking ? "#FFE4E6" : "#FEF3C7",
                          color: isBlocking ? "#BE123C" : "#92400E",
                        }}
                      >
                        {inv.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#475569", background: "#F8FAFC", padding: "2px 4px", borderRadius: "3px" }}>
                      {inv.formula}
                    </div>

                    <div style={{ fontSize: "9.5px", color: isPassed ? "#047857" : isBlocking ? "#BE123C" : "#B45309", marginTop: "2px" }}>
                      {inv.observed}
                    </div>

                    <div style={{ fontSize: "8.5px", color: "#94A3B8", textAlign: "right", marginTop: "2px" }}>
                      Click to open deep proof in Inspector
                    </div>
                  </div>
                  <HoverCard.Arrow style={{ fill: "#FFFFFF" }} />
                </HoverCard.Content>
              </HoverCard.Portal>
            </HoverCard.Root>
          );
        })}
      </div>

      {/* 3. Right: Break Mutator & Reset Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Break ▾ Menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setBreakMenuOpen((p) => !p)}
            style={{
              fontSize: "10px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "5px",
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#334155",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sliders size={11} color="#64748B" />
            <span>Break ▾</span>
          </button>

          {breakMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "28px",
                zIndex: 999,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                padding: "4px",
                minWidth: "190px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  toggleMutation("alterBankRow14");
                  setBreakMenuOpen(false);
                }}
                style={{
                  padding: "5px 8px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#BE123C",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "4px",
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
                  padding: "5px 8px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#B45309",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FFFBEB")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Break I2: Forge RRN Clock Skew
              </button>
            </div>
          )}
        </div>

        {/* Actionable Statutory Directive (Visible on PDF Append or Tamper Warning) */}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(getBnss94CbsDirective());
            toast.success("Copied §94 BNSS CBS Directive to clipboard!", {
              description: "Requisition for UTR #626510149921 with ₹2.00L delta and dual %%EOF byte ranges.",
              duration: 3500,
            });
          }}
          title="Copy pre-filled §94 BNSS statutory directive to SBI Nodal Officer"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: "5px",
            border: "1px solid #C7D2FE",
            background: "#EEF2FF",
            color: "#4338CA",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            whiteSpace: "nowrap",
          }}
        >
          <FileText size={10} color="#4F46E5" />
          <span>📋 Copy §94 Directive</span>
        </button>

        {/* Reset Clean */}
        <button
          type="button"
          onClick={resetAllMutations}
          title="Reset all invariants to clean baseline"
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "5px",
            border: "1px solid #E2E8F0",
            background: "#FFFFFF",
            color: "#64748B",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <RotateCcw size={10} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

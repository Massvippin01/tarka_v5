import React from "react";
import {
  Zap,
  RotateCcw,
  AlertTriangle,
  Radio,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const LiveJudgeMutatorBar: React.FC = () => {
  const { mutations, toggleMutation, resetAllMutations, activeMutationsCount } = useTarkaGlobal();

  return (
    <div className="lg-mutator-bar">
      {/* Brand & Status Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: activeMutationsCount > 0 ? "rgba(244, 63, 94, 0.2)" : "rgba(37, 99, 235, 0.15)",
            padding: "4px 10px",
            borderRadius: "6px",
            border: activeMutationsCount > 0 ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          <Zap size={13} color={activeMutationsCount > 0 ? "#F43F5E" : "#60A5FA"} className={activeMutationsCount > 0 ? "animate-pulse" : ""} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: activeMutationsCount > 0 ? "#FECDD3" : "#BFDBFE" }}>
            LIVE JUDGE MUTATOR BAR
          </span>
        </div>

        <span style={{ fontSize: "11px", color: "#64748B", display: "none" }} className="lg-desktop-only">
          Adversarial SMT Stress Testing
        </span>
      </div>

      {/* 4 Interactive 1-Click Live Mutation Triggers */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Mutation 1: Balance Jump Fraud */}
        <button
          type="button"
          onClick={() => toggleMutation("balanceJumpFraud")}
          className={`lg-mutator-btn ${mutations.balanceJumpFraud ? "active-coral" : ""}`}
          title="Injects a ₹1,00,000 artificial credit into SBI CBS statement. Demonstrates running-balance conservation failure and triggers Z3 SMT unsat."
        >
          <AlertTriangle size={13} color={mutations.balanceJumpFraud ? "#F43F5E" : "#9CA3AF"} />
          <span>1. Balance Jump (+₹1L Fraud)</span>
          {mutations.balanceJumpFraud && (
            <span style={{ fontSize: "9px", background: "#F43F5E", color: "#FFF", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
              UNSAT
            </span>
          )}
        </button>

        {/* Mutation 2: CGNAT Port Collision */}
        <button
          type="button"
          onClick={() => toggleMutation("cgnatPortCollision")}
          className={`lg-mutator-btn ${mutations.cgnatPortCollision ? "active-amber" : ""}`}
          title="Injects an ambiguous port collision between Airtel CGNAT translation and NetBanking session. Widens suspect pool from 1 back to 6."
        >
          <Radio size={13} color={mutations.cgnatPortCollision ? "#F59E0B" : "#9CA3AF"} />
          <span>2. CGNAT Port Collision</span>
          {mutations.cgnatPortCollision && (
            <span style={{ fontSize: "9px", background: "#F59E0B", color: "#000", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
              6 CANDIDATES
            </span>
          )}
        </button>

        {/* Mutation 3: Clock Skew Tamper */}
        <button
          type="button"
          onClick={() => toggleMutation("clockSkewTamper")}
          className={`lg-mutator-btn ${mutations.clockSkewTamper ? "active-blue" : ""}`}
          title="Rolls back handset RTC clock by -14m. Z3 SMT solver immediately flags IMPLAUSIBLE_CLOCK_OFFSET tamper anomaly."
        >
          <Clock size={13} color={mutations.clockSkewTamper ? "#3B82F6" : "#9CA3AF"} />
          <span>3. Handset Clock Rollback (-14m)</span>
          {mutations.clockSkewTamper && (
            <span style={{ fontSize: "9px", background: "#3B82F6", color: "#FFF", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
              TAMPER
            </span>
          )}
        </button>

        {/* Mutation 4: Bitstream Flip */}
        <button
          type="button"
          onClick={() => toggleMutation("ledgerBitFlip")}
          className={`lg-mutator-btn ${mutations.ledgerBitFlip ? "active-coral" : ""}`}
          title="Operates on demo copy to flip 1 byte in the SQLite custody tree. Verifies zero-bit-flip detection down to exact sequence #4."
        >
          {mutations.ledgerBitFlip ? <ShieldAlert size={13} color="#F43F5E" /> : <ShieldCheck size={13} color="#10B981" />}
          <span>4. Flip Custody Byte (Seq #4)</span>
          {mutations.ledgerBitFlip && (
            <span style={{ fontSize: "9px", background: "#F43F5E", color: "#FFF", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
              ALARM
            </span>
          )}
        </button>
      </div>

      {/* Reset & Status Summary */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {activeMutationsCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#FECDD3", fontWeight: 600 }}>
              {activeMutationsCount} Active Mutation{activeMutationsCount > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={resetAllMutations}
              className="lg-mutator-btn"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#F3F4F6",
              }}
            >
              <RotateCcw size={12} />
              <span>Revert to Ground Truth</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#10B981" }}>
            <CheckCircle2 size={13} />
            <span style={{ fontWeight: 600 }}>Ground Truth Baseline (SAT)</span>
          </div>
        )}
      </div>
    </div>
  );
};

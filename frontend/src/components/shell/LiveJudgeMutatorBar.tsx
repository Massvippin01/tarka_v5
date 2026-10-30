import React from "react";
import {
  Zap,
  RotateCcw,
  AlertTriangle,
  Radio,
  Clock,
  Wifi,
  Landmark,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const LiveJudgeMutatorBar: React.FC = () => {
  const { mutations, toggleMutation, resetAllMutations, activeMutationsCount } = useTarkaGlobal();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "var(--bento-card-bg, #FFFFFF)",
        borderBottom: "1px solid var(--bento-border-subtle, #E2E8F0)",
        boxShadow: "var(--bento-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
        flexShrink: 0,
        zIndex: 50,
        overflowX: "auto",
        gap: "12px",
      }}
    >
      {/* Brand & Status Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: activeMutationsCount > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(37, 99, 235, 0.08)",
            padding: "4px 10px",
            borderRadius: "6px",
            border: activeMutationsCount > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(37, 99, 235, 0.2)",
          }}
        >
          <Zap size={14} color={activeMutationsCount > 0 ? "#DC2626" : "#2563EB"} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: activeMutationsCount > 0 ? "#DC2626" : "#2563EB",
              fontFamily: "var(--font-heading)",
            }}
          >
            ⚡ LIVE JUDGE MUTATOR BAR
          </span>
          {activeMutationsCount > 0 && (
            <span
              style={{
                fontSize: "10px",
                background: "#DC2626",
                color: "#FFFFFF",
                padding: "1px 6px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              {activeMutationsCount} ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* 6 Interactive 1-Click Live Mutation Triggers */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap", overflowX: "auto" }}>
        {/* Mutation 1: alterBankRow14 */}
        <button
          type="button"
          onClick={() => toggleMutation("alterBankRow14")}
          className={`bento-btn bento-btn-sm ${mutations.alterBankRow14 ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.alterBankRow14 ? "#DC2626" : undefined,
            background: mutations.alterBankRow14 ? "#FEF2F2" : undefined,
            color: mutations.alterBankRow14 ? "#DC2626" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Injects a ₹1,00,000 artificial credit into SBI CBS Row 14. Demonstrates running-balance conservation failure."
        >
          <AlertTriangle size={13} color={mutations.alterBankRow14 ? "#DC2626" : "var(--bento-text-muted)"} />
          <span>1. Row 14 (+₹1L Fraud Jump)</span>
          {mutations.alterBankRow14 && <span className="bento-badge bento-badge-coral font-mono-tabular">UNSAT</span>}
        </button>

        {/* Mutation 2: forgeRrnTimestamp */}
        <button
          type="button"
          onClick={() => toggleMutation("forgeRrnTimestamp")}
          className={`bento-btn bento-btn-sm ${mutations.forgeRrnTimestamp ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.forgeRrnTimestamp ? "#D97706" : undefined,
            background: mutations.forgeRrnTimestamp ? "#FFFBEB" : undefined,
            color: mutations.forgeRrnTimestamp ? "#D97706" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Injects +15m clock mismatch between UPI 12-digit RRN Julian hour and bank CBS log."
        >
          <Clock size={13} color={mutations.forgeRrnTimestamp ? "#D97706" : "var(--bento-text-muted)"} />
          <span>2. Forge RRN Clock (+15m)</span>
          {mutations.forgeRrnTimestamp && <span className="bento-badge bento-badge-amber font-mono-tabular">DISCREPANCY</span>}
        </button>

        {/* Mutation 3: dropCgnatSourcePort */}
        <button
          type="button"
          onClick={() => toggleMutation("dropCgnatSourcePort")}
          className={`bento-btn bento-btn-sm ${mutations.dropCgnatSourcePort ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.dropCgnatSourcePort ? "#D97706" : undefined,
            background: mutations.dropCgnatSourcePort ? "#FFFBEB" : undefined,
            color: mutations.dropCgnatSourcePort ? "#D97706" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Drops CGNAT source port, exploding subscriber candidate funnel from 1 to 6 to 41 to 340."
        >
          <Radio size={13} color={mutations.dropCgnatSourcePort ? "#D97706" : "var(--bento-text-muted)"} />
          <span>3. Drop CGNAT Source Port</span>
          {mutations.dropCgnatSourcePort && <span className="bento-badge bento-badge-amber font-mono-tabular">340 CANDS</span>}
        </button>

        {/* Mutation 4: triggerHotspotCollision */}
        <button
          type="button"
          onClick={() => toggleMutation("triggerHotspotCollision")}
          className={`bento-btn bento-btn-sm ${mutations.triggerHotspotCollision ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.triggerHotspotCollision ? "#2563EB" : undefined,
            background: mutations.triggerHotspotCollision ? "#EFF6FF" : undefined,
            color: mutations.triggerHotspotCollision ? "#2563EB" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Simulates Wi-Fi hotspot tethering TTL decrement (64 -> 63) and BSSID collision on accomplice phone."
        >
          <Wifi size={13} color={mutations.triggerHotspotCollision ? "#2563EB" : "var(--bento-text-muted)"} />
          <span>4. Hotspot Tethering (TTL 64→63)</span>
          {mutations.triggerHotspotCollision && <span className="bento-badge bento-badge-blue font-mono-tabular">COLLISION</span>}
        </button>

        {/* Mutation 5: injectMerchantCleanDeposit */}
        <button
          type="button"
          onClick={() => toggleMutation("injectMerchantCleanDeposit")}
          className={`bento-btn bento-btn-sm ${mutations.injectMerchantCleanDeposit ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.injectMerchantCleanDeposit ? "#7C3AED" : undefined,
            background: mutations.injectMerchantCleanDeposit ? "#F5F3FF" : undefined,
            color: mutations.injectMerchantCleanDeposit ? "#7C3AED" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Injects ₹2,50,000 clean commercial deposit into Merchant sink, causing LIBR and FIFO taint calculations to diverge."
        >
          <Landmark size={13} color={mutations.injectMerchantCleanDeposit ? "#7C3AED" : "var(--bento-text-muted)"} />
          <span>5. Clean Deposit (+₹2.5L LIBR Divergence)</span>
          {mutations.injectMerchantCleanDeposit && <span className="bento-badge bento-badge-purple font-mono-tabular">DIVERGED</span>}
        </button>

        {/* Mutation 6: flipCustodyByte */}
        <button
          type="button"
          onClick={() => toggleMutation("flipCustodyByte")}
          className={`bento-btn bento-btn-sm ${mutations.flipCustodyByte ? "bento-btn-primary" : "bento-btn-secondary"}`}
          style={{
            borderColor: mutations.flipCustodyByte ? "#DC2626" : undefined,
            background: mutations.flipCustodyByte ? "#FEF2F2" : undefined,
            color: mutations.flipCustodyByte ? "#DC2626" : undefined,
            whiteSpace: "nowrap",
          }}
          title="Modifies 1 byte in BSA Section 63 custody ledger at seq #4, breaking SHA-256 Merkle root verification."
        >
          {mutations.flipCustodyByte ? <ShieldAlert size={13} color="#DC2626" /> : <ShieldCheck size={13} color="var(--bento-text-muted)" />}
          <span>6. Custody Bit-Flip (Seq #4)</span>
          {mutations.flipCustodyByte && <span className="bento-badge bento-badge-coral font-mono-tabular">HASH BROKEN</span>}
        </button>
      </div>

      {/* Reset All Action */}
      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={resetAllMutations}
          className="bento-btn bento-btn-secondary bento-btn-sm"
          disabled={activeMutationsCount === 0}
          style={{
            opacity: activeMutationsCount === 0 ? 0.5 : 1,
            cursor: activeMutationsCount === 0 ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
          title="Reset all mutations to ground-truth clean state"
        >
          <RotateCcw size={12} />
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );
};

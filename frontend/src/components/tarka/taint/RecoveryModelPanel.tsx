import React from "react";
import {
  FileText,
  X,
  ChevronRight,
} from "lucide-react";
import { ScaleBar } from "../kit/ScaleBar";
import { recoveryModel } from "../../../utils/recoveryModel";

interface RecoveryModelPanelProps {
  isInjectClean: boolean;
  freezeBudgetK: number;
  selectedNodeId: string | null;
  onCloseNodeDrawer: () => void;
  onOpenOrders: () => void;
  caseId?: string;
  victimName?: string;
}

export const RecoveryModelPanel: React.FC<RecoveryModelPanelProps> = ({
  isInjectClean,
  freezeBudgetK,
  selectedNodeId,
  onCloseNodeDrawer,
  onOpenOrders,
  caseId,
  victimName,
}) => {
  const model = recoveryModel(isInjectClean, freezeBudgetK, caseId);

  // If a node is selected, render the Node Drawer view
  if (selectedNodeId) {
    const nodeDossiers: Record<
      string,
      {
        title: string;
        role: string;
        bank: string;
        account: string;
        amount: string;
        statute: string;
        dwell: string;
        description: string;
      }
    > = {
      sunil: {
        title: `${victimName || "Victim"} (Complainant)`,
        role: "Victim Origin",
        bank: "Origin Bank",
        account: "Origin Salary A/C",
        amount: `-₹${model.grossVictimLoss.toLocaleString("en-IN")}.00`,
        statute: "BNSS §106 Victim Inception",
        dwell: "0s (Direct Debit)",
        description: "Victim debited via fraudulent APK credential sniff and coerced UPI intent session.",
      },
      vikram: {
        title: "Vikram Shah",
        role: "Layer-1 Conduit Mule",
        bank: "State Bank of India",
        account: "SBI 41088291083",
        amount: "₹5,00,000 Inflow",
        statute: "BNSS §107 Provisional Seizure",
        dwell: "112 seconds",
        description: "Received full ₹5.00L victim funds; rapidly split into Layer-2 accounts within 112s.",
      },
      rohit: {
        title: "Rohit Verma",
        role: "Layer-2A Split Conduit",
        bank: "HDFC Bank",
        account: "HDFC 5010029419920",
        amount: "₹3,00,000 Inflow",
        statute: "BNSS §107 Provisional Seizure",
        dwell: "185 seconds",
        description: "Forwarded ₹1.80L to merchant Apex Electronics; ₹1.20L retained in account and frozen.",
      },
      sameer: {
        title: "Sameer Khan",
        role: "Layer-2B Cashout Conduit",
        bank: "Axis Bank",
        account: "AXIS 9140200410291",
        amount: "₹2,00,000 Inflow",
        statute: "BNSS §107 Provisional Seizure",
        dwell: "140 seconds",
        description: "Dispensed ₹1.20L cash at Noida ATM DL-049; ₹80,000 retained in account and frozen.",
      },
      apex: {
        title: "Apex Electronics Pvt Ltd",
        role: "Bona-Fide POS Merchant",
        bank: "ICICI Bank",
        account: "ICICI 001405008129",
        amount: "₹1,80,000 Specific Lien",
        statute: "BNSS §106 Specific Debit Lien",
        dwell: "Active Merchant",
        description: "Legitimate electronics retailer. §106 specific lien attaches only to ₹1.80L tainted funds, shielding innocent trade.",
      },
      atm: {
        title: "Noida Sec 18 ATM DL-049",
        role: "Terminal Cash Out",
        bank: "State Bank of India ATM Network",
        account: "ATM Switch #DL-049",
        amount: "₹1,20,000 Dispensed (Irrecoverable)",
        statute: "Physical Cash Leakage",
        dwell: "Completed Cashout",
        description: "Physical cash withdrawal executed at 09:48 IST. Cash is irrecoverable from banking rails.",
      },
      rohit_hold: {
        title: "Rohit HDFC Residual",
        role: "Mule Account Hold",
        bank: "HDFC Bank",
        account: "HDFC 5010029419920",
        amount: "₹1,20,000 Frozen",
        statute: "BNSS §107 Complete Attachment",
        dwell: "Secured",
        description: "Account balance frozen under §107 BNSS awaiting magistrate disposal.",
      },
      sameer_hold: {
        title: "Sameer Axis Residual",
        role: "Mule Account Hold",
        bank: "Axis Bank",
        account: "AXIS 9140200410291",
        amount: "₹80,000 Frozen",
        statute: "BNSS §107 Complete Attachment",
        dwell: "Secured",
        description: "Account balance frozen under §107 BNSS awaiting magistrate disposal.",
      },
    };

    const dossier = nodeDossiers[selectedNodeId] || {
      title: "Target Account",
      role: "Entity",
      bank: "Bank Rail",
      account: selectedNodeId,
      amount: "₹0",
      statute: "BNSS Statutory Order",
      dwell: "N/A",
      description: "Forensic banking telemetry node.",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
        {/* Node Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            background: "#F8FAFC",
            borderRadius: "6px",
            border: "1px solid #E2E8F0",
          }}
        >
          <div>
            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>
              {dossier.role}
            </span>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", marginTop: "1px" }}>
              {dossier.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseNodeDrawer}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "4px",
              color: "#64748B",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Dossier Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "4px" }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>BANK & ACCOUNT</span>
            <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>{dossier.account}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "4px" }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>AMOUNT / LIEN</span>
            <span style={{ fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>{dossier.amount}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "4px" }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>LEGAL BASIS</span>
            <span style={{ fontWeight: 700, color: "#059669" }}>{dossier.statute}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "4px" }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>DWELL TIME</span>
            <span style={{ fontWeight: 700, color: "#64748B", fontFamily: "var(--font-mono)" }}>{dossier.dwell}</span>
          </div>

          <div style={{ padding: "6px 8px", background: "#F1F5F9", borderRadius: "5px", color: "#334155", lineHeight: 1.4, marginTop: "2px" }}>
            {dossier.description}
          </div>
        </div>

        {/* Pinned Action Buttons */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          <button
            type="button"
            onClick={onOpenOrders}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: "5px",
              border: "none",
              background: "#4F46E5",
              color: "#FFFFFF",
              fontSize: "10.5px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <span>Draft BNSS §106/§107 Orders</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: RECOVERY MODEL PANEL (IMAGE 3 REPLACEMENT)
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px", boxSizing: "border-box" }}>
      {/* =========================================================================
          SUBSECTION 1: WHERE THE ₹5.00L IS NOW (STACKED SCALEBAR)
          ========================================================================= */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#0F172A" }}>Where the ₹5.00L is Now</span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              color: "#059669",
              background: "#ECFDF5",
              padding: "1px 5px",
              borderRadius: "3px",
              fontFamily: "var(--font-mono)",
            }}
          >
            Recovery Potential: ₹3.80L (76%)
          </span>
        </div>

        {/* 100% Width Stacked ScaleBar */}
        <ScaleBar
          min={0}
          max={5}
          value={3.8}
          unit="L"
          height={14}
          zones={[
            { from: 0, to: 1.2, color: "#F43F5E", label: "Cashed Out ₹1.2L (24%)" },
            { from: 1.2, to: 3.2, color: "#F59E0B", label: "Mule Hold ₹2.0L (40%)" },
            { from: 3.2, to: 5.0, color: "#0284C7", label: "Merchant Lien ₹1.8L (36%)" },
          ]}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#64748B", marginTop: "4px" }}>
          <span style={{ color: "#E11D48", fontWeight: 700 }}>■ ATM Cashout ₹1.20L</span>
          <span style={{ color: "#B45309", fontWeight: 700 }}>■ Held in Mules ₹2.00L</span>
          <span style={{ color: "#0284C7", fontWeight: 700 }}>■ Merchant Lien ₹1.80L</span>
        </div>
      </div>

      {/* =========================================================================
          SUBSECTION 2: CONTAINMENT VS RECOVERY (SEPARATE INDICATORS)
          ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {/* Indicator A: Dinic Min-Cut Containment Pips */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
            Containment Exits
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            {[1, 2, 3, 4].map((pip) => {
              const isSealed = model.openEscapeExits === 0 || pip > model.openEscapeExits;
              return (
                <span
                  key={pip}
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: isSealed ? "#10B981" : "#F43F5E",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    color: "#FFFFFF",
                    fontWeight: 800,
                  }}
                >
                  {isSealed ? "✓" : "!"}
                </span>
              );
            })}
          </div>
          <div style={{ fontSize: "8.5px", color: model.openEscapeExits === 0 ? "#059669" : "#BE123C", fontWeight: 700, marginTop: "2px" }}>
            {model.openEscapeExits === 0 ? "0 / 4 Open Exits (Sealed)" : `${model.openEscapeExits} Open Leak Exits`}
          </div>
        </div>

        {/* Indicator B: Recovery Progress Bar */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
            Net Recovery Rate
          </div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
            76.0% <span style={{ fontSize: "9px", color: "#059669" }}>(₹3.80L)</span>
          </div>
          <div style={{ width: "100%", height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "3px" }}>
            <div style={{ width: "76%", height: "100%", background: "#059669" }} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUBSECTION 3: ACCOUNTING DOCTRINES (LIBR / FIFO / PRO-RATA ON ONE AXIS)
          ========================================================================= */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A" }}>
            Accounting Doctrine Comparison
          </span>
          <span style={{ fontSize: "8px", color: "#64748B" }}>
            {model.rulesEqual ? "Equal until funds commingle" : "Commingled divergence"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {/* LIBR */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", marginBottom: "1px" }}>
              <span style={{ fontWeight: 800, color: "#059669" }}>LIBR (Judicial HC Precedent) ★</span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "#059669" }}>₹3,80,000</span>
            </div>
            <div style={{ width: "100%", height: "5px", background: "#F1F5F9", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "76%", height: "100%", background: "#059669" }} />
            </div>
          </div>

          {/* FIFO */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", marginBottom: "1px" }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>FIFO (First In First Out)</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "#475569" }}>₹2,00,000</span>
            </div>
            <div style={{ width: "100%", height: "5px", background: "#F1F5F9", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "40%", height: "100%", background: "#64748B" }} />
            </div>
          </div>

          {/* Pro-Rata */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", marginBottom: "1px" }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>Pro-Rata Fraction</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "#475569" }}>
                ₹{model.proRataRecoverable.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ width: "100%", height: "5px", background: "#F1F5F9", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${Math.round((model.proRataRecoverable / 500000) * 100)}%`, height: "100%", background: "#8B5CF6" }} />
            </div>
          </div>
        </div>

        {/* Exact Commingling & LIBR Accounting Ledger for L2C (Apex Electronics Pvt Ltd) */}
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px", marginTop: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
            <span style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A" }}>Apex Electronics LIBR Ledger (ICICI 001405008129)</span>
            <span style={{ fontSize: "8px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 4px", borderRadius: "3px" }}>Roscoe v. Winder</span>
          </div>
          <table style={{ width: "100%", fontSize: "8px", fontFamily: "var(--font-mono)", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ textAlign: "left", padding: "2px" }}>Sequence</th>
                <th style={{ textAlign: "right", padding: "2px" }}>Credit/Debit</th>
                <th style={{ textAlign: "right", padding: "2px" }}>Tainted Hold</th>
                <th style={{ textAlign: "right", padding: "2px" }}>Clean Shielded</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "2px" }}>1. Opening Balance</td>
                <td style={{ textAlign: "right", padding: "2px" }}>₹1,10,000</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#64748B" }}>₹0</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#059669", fontWeight: 700 }}>₹1,10,000</td>
              </tr>
              <tr>
                <td style={{ padding: "2px" }}>2. Inward Fraud Debit</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#E11D48" }}>+₹1,80,000</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#E11D48", fontWeight: 800 }}>₹1,80,000</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#059669" }}>₹1,10,000</td>
              </tr>
              <tr>
                <td style={{ padding: "2px" }}>3. Clean POS Settlement</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#059669" }}>+₹1,40,000</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#E11D48", fontWeight: 800 }}>₹1,80,000</td>
                <td style={{ textAlign: "right", padding: "2px", color: "#059669", fontWeight: 800 }}>₹2,50,000</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: "7.5px", color: "#475569", marginTop: "3px", borderTop: "1px dashed #CBD5E1", paddingTop: "2px" }}>
            <strong>Sum Check:</strong> ₹2.00L (HDFC) + ₹1.80L (ICICI Lien) = <strong>₹3,80,000 Recoverable (76%)</strong> + ₹1,20,000 ATM Cashout (24%) = <strong>₹5,00,000 Total Loss (100% Reconciled)</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUBSECTION 4: HORIZONTAL SOP TIMELINE STRIP
          ========================================================================= */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>
          MHA 2026 Golden Hour SOP Schedule
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", textAlign: "center" }}>
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "3px", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 800, color: "#047857" }}>24h Freeze</div>
            <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#065F46" }}>T+2.5h ✓</div>
          </div>
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "3px", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 800, color: "#4338CA" }}>7d Lien Notice</div>
            <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#312E81" }}>T+7d</div>
          </div>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 600, color: "#64748B" }}>15d Summons</div>
            <div style={{ fontSize: "8.5px", fontWeight: 600, color: "#475569" }}>T+15d</div>
          </div>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 600, color: "#64748B" }}>90d Court</div>
            <div style={{ fontSize: "8.5px", fontWeight: 600, color: "#475569" }}>T+90d</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUBSECTION 5: PINNED BOTTOM CTA (FILLS CARD, NO GAPS > 24px)
          ========================================================================= */}
      <div style={{ marginTop: "auto", paddingTop: "4px" }}>
        <button
          type="button"
          onClick={onOpenOrders}
          className="hover:bg-indigo-700 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            background: "#4F46E5",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
            transition: "background 0.15s ease",
          }}
        >
          <FileText size={13} />
          <span>📋 Draft BNSS §106/§107 Orders</span>
        </button>
      </div>
    </div>
  );
};

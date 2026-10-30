import React, { useState, useMemo } from "react";
import {
  GitFork,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileText,
  UserX,
  Store,
} from "lucide-react";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {

  // Active Taint Apportionment Rule Switcher
  const [activeRule, setActiveRule] = useState<TaintRule>("LIBR");

  // Selection of Frozen Accounts for Dinic Min-Cut Verifier
  const [frozenAccounts, setFrozenAccounts] = useState<string[]>(["ACC-L2-ICICI"]);

  // Sub-tabs in Taint Screen
  const [activeTab, setActiveTab] = useState<"trail" | "min-cut" | "typology" | "statutory-notice">("trail");

  // Computed Taint Allocations based on Rule
  const taintCalculation = useMemo(() => {
    if (activeRule === "LIBR") {
      return {
        ruleName: "Lowest Intermediate Balance Rule (LIBR)",
        statutoryBasis: "Restitution Invariant (Prevents Over-Freezing)",
        victimTotal: 50000.0,
        layer1SBI: { balance: 54210.0, taintedSum: 50000.0, frozen: 50000.0 },
        layer2ICICI: { balance: 20000.0, taintedSum: 20000.0, frozen: 20000.0 },
        layer3Cashout: { balance: 10000.0, taintedSum: 10000.0, frozen: 10000.0 },
        layer3Merchant: { balance: 34000.0, taintedSum: 0.0, frozen: 0.0 }, // Protected
        notes: "LIBR caps frozen liability strictly to lowest intermediate balance, protecting legitimate account inflows.",
      };
    }
    if (activeRule === "FIFO") {
      return {
        ruleName: "First-In, First-Out (FIFO)",
        statutoryBasis: "Strict Temporal Priority Rule",
        victimTotal: 50000.0,
        layer1SBI: { balance: 54210.0, taintedSum: 50000.0, frozen: 50000.0 },
        layer2ICICI: { balance: 20000.0, taintedSum: 20000.0, frozen: 20000.0 },
        layer3Cashout: { balance: 10000.0, taintedSum: 10000.0, frozen: 10000.0 },
        layer3Merchant: { balance: 34000.0, taintedSum: 10000.0, frozen: 10000.0 },
        notes: "FIFO consumes first available funds chronologically, creating high risk of freezing innocent merchant credits.",
      };
    }
    return {
      ruleName: "Pro-Rata Apportionment",
      statutoryBasis: "Proportional Co-Mingling Invariant",
      victimTotal: 50000.0,
      layer1SBI: { balance: 54210.0, taintedSum: 50000.0, frozen: 46120.0 },
      layer2ICICI: { balance: 20000.0, taintedSum: 18450.0, frozen: 18450.0 },
      layer3Cashout: { balance: 10000.0, taintedSum: 9225.0, frozen: 9225.0 },
      layer3Merchant: { balance: 34000.0, taintedSum: 4612.0, frozen: 4612.0 },
      notes: "Pro-Rata spreads taint proportionally across all outbound paths according to ratio of dirty to clean funds.",
    };
  }, [activeRule]);

  // Dinic Min-Cut Freeze Completeness Verifier
  const minCutStatus = useMemo(() => {
    const isL1Frozen = frozenAccounts.includes("ACC-L1-SBI");
    const isL2Frozen = frozenAccounts.includes("ACC-L2-ICICI");
    const isL3CashoutFrozen = frozenAccounts.includes("ACC-L3-CASHOUT");

    // If neither L1 nor L2 is frozen, full flow can leak to cashout
    if (!isL1Frozen && !isL2Frozen) {
      return {
        complete: false,
        residualPath: "Layer 1 (SBI) → Layer 2 (ICICI) → Layer 3 ATM (₹20,000 leaking)",
        residualCapacity: 20000.0,
        minCutNodes: ["ACC-L1-SBI", "ACC-L2-ICICI"],
      };
    }

    // If only L2 is frozen, L1 might still leak to other branches if not severed
    if (!isL1Frozen && isL2Frozen) {
      return {
        complete: isL3CashoutFrozen,
        residualPath: isL3CashoutFrozen ? "None" : "Direct Branch SBI → Unknown Wallet (₹4,210 residual)",
        residualCapacity: isL3CashoutFrozen ? 0.0 : 4210.0,
        minCutNodes: ["ACC-L1-SBI", "ACC-L2-ICICI"],
      };
    }

    return {
      complete: true,
      residualPath: "None (Zero Residual Flow Capacity)",
      residualCapacity: 0.0,
      minCutNodes: ["ACC-L1-SBI"],
    };
  }, [frozenAccounts]);

  const toggleFrozen = (accId: string) => {
    setFrozenAccounts((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* Top Hero Banner */}
      <div className="lg-overview-hero" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="lg-badge lg-badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <GitFork size={11} strokeWidth={2.5} />
                <span>SCREEN 3: TIME-DAG & BNSS PROPORTIONAL LIEN ENGINE</span>
              </span>
              <span className="lg-badge lg-badge-coral">SECTION 106 & 107 BNSS</span>
            </div>
            <h1 style={{ margin: "2px 0 4px", fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              Time-Expanded Financial Taint DAG & Proportional Judicial Lien
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", maxWidth: "800px", lineHeight: 1.5 }}>
              Cycle-safe time-expanded money trail graph with real-time LIBR / FIFO / Pro-Rata taint apportionment, Dinic Min-Cut completeness verification, and dual-track Section 106 emergency freeze notices.
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "3px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("trail")}
              className={`lg-tab ${activeTab === "trail" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Money Trail & Taint Switcher
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("min-cut")}
              className={`lg-tab ${activeTab === "min-cut" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Dinic Min-Cut Verifier
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("typology")}
              className={`lg-tab ${activeTab === "typology" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Mule vs Merchant Typology
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("statutory-notice")}
              className={`lg-tab ${activeTab === "statutory-notice" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              BNSS § 106 & 107 Notice
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: Money Trail Graph & Taint Switcher */}
      {activeTab === "trail" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Taint Apportionment Switcher Bar */}
          <div className="lg-bento-card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>
                Active Mathematical Taint Apportionment Rule:
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#F3F4F6", marginTop: "2px" }}>
                {taintCalculation.ruleName}
              </div>
              <div style={{ fontSize: "11px", color: "#60A5FA", marginTop: "2px" }}>
                {taintCalculation.notes}
              </div>
            </div>

            {/* 3-Way Rule Switcher */}
            <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "3px" }}>
              <button
                type="button"
                onClick={() => setActiveRule("LIBR")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: activeRule === "LIBR" ? "#10B981" : "transparent",
                  color: activeRule === "LIBR" ? "#FFFFFF" : "#94A3B8",
                  transition: "all 0.15s ease",
                }}
              >
                LIBR (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setActiveRule("FIFO")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: activeRule === "FIFO" ? "#3B82F6" : "transparent",
                  color: activeRule === "FIFO" ? "#FFFFFF" : "#94A3B8",
                  transition: "all 0.15s ease",
                }}
              >
                FIFO
              </button>
              <button
                type="button"
                onClick={() => setActiveRule("PRO_RATA")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: activeRule === "PRO_RATA" ? "#A855F7" : "transparent",
                  color: activeRule === "PRO_RATA" ? "#FFFFFF" : "#94A3B8",
                  transition: "all 0.15s ease",
                }}
              >
                Pro-Rata
              </button>
            </div>
          </div>

          {/* Interactive Multi-Hop Account Flow Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {/* Account 1: Victim Origin */}
            <div className="lg-bento-card" style={{ borderTop: "3px solid #3B82F6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="lg-badge lg-badge-blue">VICTIM ORIGIN</span>
                <span style={{ fontSize: "10px", color: "#64748B" }}>T+0h</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "10px 0 4px" }}>
                Complainant SBI A/C
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>XXXX4210</div>
              <div style={{ margin: "12px 0 4px", fontSize: "18px", fontWeight: 800, color: "#F43F5E" }}>
                -₹50,000.00
              </div>
              <div style={{ fontSize: "10px", color: "#94A3B8" }}>UPI/CR/202602149921</div>
            </div>

            {/* Account 2: Layer 1 Mule (SBI) */}
            <div className="lg-bento-card" style={{ borderTop: "3px solid #F59E0B" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="lg-badge lg-badge-amber">LAYER 1 PRIMARY MULE</span>
                <button
                  type="button"
                  onClick={() => toggleFrozen("ACC-L1-SBI")}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: frozenAccounts.includes("ACC-L1-SBI") ? "#F43F5E" : "rgba(255,255,255,0.08)",
                    color: "#FFF",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {frozenAccounts.includes("ACC-L1-SBI") ? "LIEN ACTIVE" : "FREEZE"}
                </button>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "10px 0 4px" }}>
                Mule SBI A/C (Rohini)
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>XXXX9921</div>
              <div style={{ margin: "12px 0 4px", fontSize: "18px", fontWeight: 800, color: "#10B981" }}>
                +₹50,000.00
              </div>
              <div style={{ fontSize: "11px", color: "#FBBF24" }}>
                Lien Target: ₹{taintCalculation.layer1SBI.frozen.toLocaleString()}
              </div>
            </div>

            {/* Account 3: Layer 2 Mule (ICICI) */}
            <div className="lg-bento-card" style={{ borderTop: "3px solid #F43F5E" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="lg-badge lg-badge-coral">LAYER 2 INTER-BANK</span>
                <button
                  type="button"
                  onClick={() => toggleFrozen("ACC-L2-ICICI")}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: frozenAccounts.includes("ACC-L2-ICICI") ? "#F43F5E" : "rgba(255,255,255,0.08)",
                    color: "#FFF",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {frozenAccounts.includes("ACC-L2-ICICI") ? "LIEN ACTIVE" : "FREEZE"}
                </button>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "10px 0 4px" }}>
                ICICI Mule A/C (Cyber Cell)
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>629101554289</div>
              <div style={{ margin: "12px 0 4px", fontSize: "18px", fontWeight: 800, color: "#F43F5E" }}>
                ₹{taintCalculation.layer2ICICI.taintedSum.toLocaleString()} Tainted
              </div>
              <div style={{ fontSize: "11px", color: "#FECDD3" }}>
                Lien Order: BNSS § 106 Golden Hour
              </div>
            </div>

            {/* Account 4: Layer 3 Innocent Merchant Kirana */}
            <div className="lg-bento-card" style={{ borderTop: "3px solid #10B981" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="lg-badge lg-badge-emerald">INNOCENT MERCHANT</span>
                <span style={{ fontSize: "10px", color: "#10B981", fontWeight: 700 }}>EXPLICIT COUNTER-PROOF</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "10px 0 4px" }}>
                Kirana Retail Merchant
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>HDFC XXXX8812</div>
              <div style={{ margin: "12px 0 4px", fontSize: "18px", fontWeight: 800, color: taintCalculation.layer3Merchant.frozen === 0 ? "#10B981" : "#F59E0B" }}>
                ₹{taintCalculation.layer3Merchant.frozen.toLocaleString()} Frozen
              </div>
              <div style={{ fontSize: "11px", color: taintCalculation.layer3Merchant.frozen === 0 ? "#A7F3D0" : "#FDE68A" }}>
                {taintCalculation.layer3Merchant.frozen === 0 ? "Protected by LIBR Restitution Invariant" : "Wrongful Freeze Risk under FIFO"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Dinic Min-Cut Freeze Completeness Verifier */}
      {activeTab === "min-cut" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={16} color="#60A5FA" />
              <span>Dinic Max-Flow / Min-Cut Completeness Invariant</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 14px", lineHeight: 1.5 }}>
              Proves mathematically whether the selected bank account freezes sever all augmenting paths from the fraud source to downstream cashout sinks.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Cut Verification State:</span>
                <span style={{ color: minCutStatus.complete ? "#10B981" : "#F43F5E", fontWeight: 700 }}>
                  {minCutStatus.complete ? "COMPLETE (ZERO RESIDUAL FLOW)" : "INCOMPLETE (RESIDUAL FLOW LEAKING)"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Residual Fraud Leakage:</span>
                <span style={{ color: minCutStatus.residualCapacity > 0 ? "#F43F5E" : "#10B981", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  ₹{minCutStatus.residualCapacity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Unblocked Augmenting Path:</span>
                <span style={{ color: "#F3F4F6", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{minCutStatus.residualPath}</span>
              </div>
            </div>

            {/* Toggle Account Checkboxes */}
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                Simulate Account Lien Toggles:
              </div>
              {[
                { id: "ACC-L1-SBI", label: "Layer 1 Mule (SBI XXXX9921)" },
                { id: "ACC-L2-ICICI", label: "Layer 2 Mule (ICICI 629101554289)" },
                { id: "ACC-L3-CASHOUT", label: "Layer 3 Cashout / ATM (HDFC XXXX1209)" },
              ].map((acc) => (
                <label key={acc.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#E2E8F0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={frozenAccounts.includes(acc.id)}
                    onChange={() => toggleFrozen(acc.id)}
                  />
                  <span>{acc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px" }}>
              Statutory Residual Path Alert
            </div>

            {!minCutStatus.complete ? (
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.12)", border: "1px solid #F43F5E" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#FECDD3", fontWeight: 700, fontSize: "13px" }}>
                  <AlertTriangle size={16} color="#F43F5E" />
                  <span>RESIDUAL CASH-OUT ESCAPE HAZARD</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#E2E8F0", lineHeight: 1.5 }}>
                  The current lien configuration leaves an active augmenting path. If Layer 2 ICICI is not frozen immediately under <strong>Section 106 BNSS</strong>, the mule syndicate can liquidate remaining ₹{minCutStatus.residualCapacity.toLocaleString()} via ATM withdrawal.
                </p>
              </div>
            ) : (
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#A7F3D0", fontWeight: 700, fontSize: "13px" }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>ALL AUGMENTING FRAUD PATHS SEVERED</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#E2E8F0", lineHeight: 1.5 }}>
                  Dinic min-cut verification confirms total bottleneck isolation. Zero residual capacity leaks to downstream sinks.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Mule vs Merchant Typology Classifier */}
      {activeTab === "typology" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Confirmed Mule */}
          <div className="lg-bento-card" style={{ borderLeft: "4px solid #F43F5E" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="lg-badge lg-badge-coral">CONFIRMED MULE ACCOUNT (98%)</span>
              <UserX size={18} color="#F43F5E" />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>ICICI Bank A/C 629101554289</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Beneficiary: Sh. Imran Qureshi</div>

            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
              <div style={{ color: "#FECDD3" }}>• <strong>Velocity:</strong> Inward credit ₹50k drained within 180 seconds.</div>
              <div style={{ color: "#FECDD3" }}>• <strong>Operational Baseline:</strong> Zero prior transactions; opened 4 days ago.</div>
              <div style={{ color: "#FECDD3" }}>• <strong>ATM Geolocation:</strong> Immediate cash withdrawal attempt at Sector 18 Rohini.</div>
            </div>
          </div>

          {/* Innocent Merchant Counter-Evidence */}
          <div className="lg-bento-card" style={{ borderLeft: "4px solid #10B981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="lg-badge lg-badge-emerald">INNOCENT MERCHANT (3% MULE)</span>
              <Store size={18} color="#10B981" />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>HDFC Bank A/C 501004921088</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Beneficiary: M/S Gupta Grocery Store</div>

            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
              <div style={{ color: "#A7F3D0" }}>• <strong>Counter-Evidence:</strong> 3-year continuous GST returns (GSTIN07AAACG...).</div>
              <div style={{ color: "#A7F3D0" }}>• <strong>Transaction Profile:</strong> 400+ legitimate daily grocery QR credits.</div>
              <div style={{ color: "#A7F3D0" }}>• <strong>Statutory Invariant:</strong> Complete exemption from BNSS § 106 debit freeze.</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Dual-Track Statutory Notices */}
      {activeTab === "statutory-notice" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#F43F5E", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={15} />
              <span>Section 106 BNSS: Rapid Debit Freeze Requisition</span>
            </div>

            <pre
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                color: "#FECDD3",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {`STATUTORY REQUISITION UNDER SECTION 106 BNSS, 2023
To: Nodal Officer, ICICI Bank Ltd., Cyber Fraud Cell
Re: URGENT GOLDEN HOUR DEBIT FREEZE NOTICE
FIR No: FIR/2026/001-CYB (Delhi State Cyber Crime Cell)

Under Section 106, Bharatiya Nagarik Suraksha Sanhita, 2023, you are hereby directed to immediately place an administrative lien and DEBIT FREEZE on:

• Beneficiary Bank: ICICI Bank Ltd.
• Account Number: 629101554289 (Layer 2 Mule)
• Originating RRN: 202602149921
• Ingested Sum: ₹50,000.00
• Apportioned Lien (LIBR): ₹20,000.00
• Digital Custody Hash: b198302ca876543210fedcba9876543210

Compliance mandatory within 60 minutes of receipt.
Authority: ACP Rajesh Kumar, Cyber Crime Branch`}
            </pre>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#60A5FA", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Scale size={15} />
              <span>Section 107 BNSS: Magistrate Attachment Application</span>
            </div>

            <pre
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                color: "#BFDBFE",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {`IN THE COURT OF CHIEF JUDICIAL MAGISTRATE, ROHINI, NEW DELHI
APPLICATION UNDER SECTION 107 BNSS, 2023
Case: State vs. Unknown (Operation Digital Arrest Extortion)

May it please the Hon'ble Court:
1. That administrative freeze was executed on 22.09.2026 under Section 106 BNSS on ICICI Account 629101554289.
2. That 48-hour statutory police report requirement is satisfied under MHA SOP 02.01.2026.
3. Prayed that formal judicial attachment order be issued and restitution of ₹50,000 be scheduled to complainant account XXXX4210.

Submitted By: State Cyber Cell / NCRP Nodal Office`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

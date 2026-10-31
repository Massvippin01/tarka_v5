import React, { useState, useMemo } from "react";
import {
  GitFork,
  Scale,
  Lock,
  UserX,
  Store,
  Copy,
  Check,
  Sliders,
  DollarSign,
  FileText,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { SaasExecutiveKpiCard } from "../../components/tarka/SaasExecutiveKpiCard";
import { SemiCircleGauge } from "../../components/tarka/BentoPrimitives";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Accounting Rule Selection
  const [selectedRule, setSelectedRule] = useState<TaintRule>("LIBR");

  // Freeze Budget K slider (1 to 6 accounts)
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);

  // Compute Engine State
  const engineState = useMemo(() => {
    return computeTaintEngine(mutations.injectMerchantCleanDeposit, freezeBudgetK);
  }, [mutations.injectMerchantCleanDeposit, freezeBudgetK]);

  // Active BNSS notice selection (106 vs 107)
  const [selectedNoticeType, setSelectedNoticeType] = useState<"106" | "107">("106");

  // BNSS Draft State
  const bnssDrafts = useMemo(() => {
    return generateBnssDrafts("ICICI 001405008129", "ICICI Bank", 120000);
  }, []);

  const activeDraft = useMemo(() => {
    return selectedNoticeType === "106" ? bnssDrafts.notice106 : bnssDrafts.application107;
  }, [selectedNoticeType, bnssDrafts]);

  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(activeDraft.draftText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isInjectClean = mutations.injectMerchantCleanDeposit;

  // Containment percentage for gauge
  const containmentPct = engineState.minCut.isFreezeComplete ? 100 : Math.round(((500000 - engineState.minCut.residualLeakageAmount) / 500000) * 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "16px 20px",
        gap: "14px",
        boxSizing: "border-box",
        overflowY: "auto",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* 1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (MIN-HEIGHT: 108PX) */}
      <div className="saas-kpi-row">
        <SaasExecutiveKpiCard
          label="Victim Property Loss"
          metric={`₹${(engineState.summary.initialVictimLoss / 100000).toFixed(2)}L`}
          metricColor="#E11D48"
          subtext="Capital stolen from complainant Sunil Kumar at T+0"
          statusBadge={{
            text: "FRAUD LOSS T+0",
            variant: "rose",
          }}
          icon={UserX}
          iconColor="#E11D48"
          iconBg="#FFF1F2"
        />

        <SaasExecutiveKpiCard
          label="LIBR Recoverable Taint"
          metric={`₹${(engineState.summary.librRecoverable / 100000).toFixed(2)}L`}
          metricColor="#059669"
          subtext="Protected under Roscoe v. Winder & Shree Balaji precedents"
          statusBadge={{
            text: "HC PRECEDENT CAPPED",
            variant: "emerald",
          }}
          icon={Scale}
          iconColor="#059669"
          iconBg="#ECFDF5"
        />

        <SaasExecutiveKpiCard
          label="Dinic Min-Cut Freeze"
          metric={engineState.minCut.isFreezeComplete ? `SAT (K=${freezeBudgetK})` : `LEAK (K=${freezeBudgetK})`}
          metricColor={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
          subtext={engineState.minCut.isFreezeComplete ? "100% flow sealed · Zero outward leakage to ATM exits" : `₹${(engineState.minCut.residualLeakageAmount / 100000).toFixed(2)}L escaping via Layer 2 Mule`}
          statusBadge={{
            text: engineState.minCut.isFreezeComplete ? "SEALED 100%" : "ESCAPE DETECTED",
            variant: engineState.minCut.isFreezeComplete ? "emerald" : "amber",
          }}
          icon={Lock}
          iconColor={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
          iconBg={engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB"}
        />

        <SaasExecutiveKpiCard
          label="BNSS 2023 Statutory Dual-Track"
          metric="§ 106 & § 107"
          metricColor="#4F46E5"
          subtext="Proportional lien on fraud amount; innocent merchant safe"
          statusBadge={{
            text: "MERCHANT PROTECTED",
            variant: "indigo",
          }}
          icon={GitFork}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
        />
      </div>

      {/* 2. MAIN 12-COLUMN BENTO GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 7 COLUMNS (VISUAL TE-DAG WITH BEZIER FLOW LINES + INNOCENT MERCHANT SPLIT BAR) */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 1: TIME-EXPANDED DAG (TE-DAG) MONEY TRAIL */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Header with Title & Clean Deposit Injection Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <GitFork size={16} color="#4F46E5" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                    Time-Expanded DAG Money Trail & Node Classification
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                    ZERO CYCLES
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  <strong>What this means for IO:</strong> Tracks fraud flow across layers while shielding legitimate businesses.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation("injectMerchantCleanDeposit")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: isInjectClean ? "1px solid #059669" : "1px solid #CBD5E1",
                  background: isInjectClean ? "#ECFDF5" : "#F8FAFC",
                  color: isInjectClean ? "#047857" : "#0F172A",
                  cursor: "pointer",
                }}
                title="Injects ₹2.5L clean commercial funds to demonstrate LIBR protection"
              >
                <DollarSign size={12} />
                <span>{isInjectClean ? "Clean Funds Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
              </button>
            </div>

            {/* 3-Column Node Layout with Flow Indicators */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.3fr", gap: "10px", position: "relative" }}>
              {/* Column 1: Victim & Layer 1 Mule */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Node 0: Victim */}
                <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>Victim Source</span>
                    <span style={{ fontSize: "9.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>09:30 IST</span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Sunil Kumar</div>
                  <div style={{ fontSize: "10.5px", color: "#64748B" }}>SBI 30910029101</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    -₹5,00,000.00
                  </div>
                </div>

                {/* Arrow indicator */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#4F46E5", background: "#EEF2FF", padding: "1px 6px", borderRadius: "4px" }}>
                    ₹5,00,000 Outflow ↓
                  </span>
                </div>

                {/* Node 1: Layer 1 Mule */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule Layer 1</span>
                    <span style={{ fontSize: "9px", fontWeight: 800, background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "1px 5px", borderRadius: "4px" }}>
                      § 107 DEBIT FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Vikram Shah</div>
                  <div style={{ fontSize: "10.5px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Inflow: ₹5,00,000
                  </div>
                </div>
              </div>

              {/* Column 2: Layer 2 Split Mules */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Node 2A: Split Mule A */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split A)</span>
                    <span style={{ fontSize: "9px", fontWeight: 800, background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "1px 5px", borderRadius: "4px" }}>
                      § 107 FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Rohit Verma</div>
                  <div style={{ fontSize: "10.5px", color: "#64748B" }}>HDFC 5010029419920</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    ₹3,00,000 Transferred
                  </div>
                </div>

                {/* Connecting Arrow */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B" }}>
                    Split 60% / 40%
                  </span>
                </div>

                {/* Node 2B: Split Mule B */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split B)</span>
                    <span style={{ fontSize: "9px", fontWeight: 800, background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "1px 5px", borderRadius: "4px" }}>
                      § 107 FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Sameer Khan</div>
                  <div style={{ fontSize: "10.5px", color: "#64748B" }}>AXIS 9140200410291</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    ₹2,00,000 Transferred
                  </div>
                </div>
              </div>

              {/* Column 3: Innocent Merchant (GST Protected) & ATM Cashout */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Node 3: Innocent Merchant */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #059669",
                    borderRadius: "10px",
                    padding: "10px",
                    boxShadow: "0 2px 8px rgba(5,150,105,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Store size={12} color="#059669" />
                      <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>
                        Innocent Merchant
                      </span>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: 800, background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "4px" }}>
                      § 106 LIEN ONLY
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    Apex Electronics Pvt Ltd
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    GST: 07AAACA1234F1Z8 · ICICI Bank
                  </div>

                  {/* VISUAL SPLIT BALANCE BAR: Clean Capital vs Tainted Victim Inflow */}
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
                      <span style={{ color: "#047857", fontWeight: 700 }}>Clean Capital: ₹2.50L</span>
                      <span style={{ color: "#BE123C", fontWeight: 700 }}>Tainted Lien: ₹1.20L</span>
                    </div>
                    <div style={{ width: "100%", height: "12px", background: "#E2E8F0", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                      <div style={{ width: isInjectClean ? "68%" : "0%", background: "#059669", height: "100%", transition: "width 0.3s ease" }} />
                      <div className="hatch-pattern-rose" style={{ width: isInjectClean ? "32%" : "100%", background: "#E11D48", height: "100%" }} />
                    </div>
                  </div>

                  <div style={{ fontSize: "9.5px", color: "#047857", marginTop: "4px", lineHeight: 1.3 }}>
                    ✓ <strong>High Court Mandate:</strong> Only ₹1.20L locked. Clean working capital (₹2.50L) remains liquid for payroll.
                  </div>
                </div>

                {/* Node 4: ATM Cashout Sink */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Terminal Sink</span>
                    <span style={{ fontSize: "9px", background: "#F1F5F9", color: "#475569", padding: "1px 5px", borderRadius: "4px" }}>CASH EXIT</span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Noida Sec 18 ATM DL-049</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Dispensed: ₹1,20,000 (Cash Out)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: DINIC MIN-CUT FREEZE BUDGET OPTIMIZER */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sliders size={15} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Dinic Min-Cut Freeze Budget Optimizer (Budget K = {freezeBudgetK})
                </span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: engineState.minCut.isFreezeComplete ? "#047857" : "#B45309" }}>
                {engineState.minCut.isFreezeComplete ? "100% FLOW CONTAINED" : "RESIDUAL ESCAPE DETECTED"}
              </span>
            </div>

            {/* Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>K=1</span>
              <input
                type="range"
                min={1}
                max={6}
                value={freezeBudgetK}
                onChange={(e) => setFreezeBudgetK(Number(e.target.value))}
                style={{ flex: 1, cursor: "pointer", accentColor: "#4F46E5" }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>K=6</span>
            </div>

            <div
              style={{
                fontSize: "11.5px",
                lineHeight: 1.45,
                padding: "8px 12px",
                borderRadius: "8px",
                background: engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB",
                border: engineState.minCut.isFreezeComplete ? "1px solid #A7F3D0" : "1px solid #FDE68A",
                color: engineState.minCut.isFreezeComplete ? "#065F46" : "#92400E",
              }}
            >
              {engineState.minCut.verdictDetail}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 COLUMNS (ACCOUNTING STATE MACHINE + SALEZY GAUGE + MHA NOTICE LETTERHEAD) */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 3: 3-WAY ACCOUNTING ENGINE & SALEZY-STYLE SEMI-CIRCULAR GAUGE */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale size={15} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Accounting State Machine: LIBR vs FIFO vs Pro-Rata
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                ROSCOE V. WINDER
              </span>
            </div>

            {/* Salezy-Style Semi-Circular Segmented Gauge for Flow Containment */}
            <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0" }}>
              <SemiCircleGauge
                percentage={containmentPct}
                label="Recoverable Flow Contained"
                sublabel={`Budget K = ${freezeBudgetK} Accounts`}
                summaryText={engineState.minCut.isFreezeComplete ? "100% Flow Sealed" : "Leaking to Cashout Sink"}
                color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
                size={170}
              />
            </div>

            {/* 3 Accounting Rule Comparison Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              <div
                onClick={() => setSelectedRule("LIBR")}
                style={{
                  background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "LIBR" ? "2px solid #059669" : "1px solid #E2E8F0",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#047857" }}>LIBR (HC RULE) ★</div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>Caps taint at lowest balance; clean funds safe.</div>
              </div>

              <div
                onClick={() => setSelectedRule("FIFO")}
                style={{
                  background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "FIFO" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#4F46E5" }}>FIFO (FIRST-IN)</div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>Oldest credits presumed spent first.</div>
              </div>

              <div
                onClick={() => setSelectedRule("PRO_RATA")}
                style={{
                  background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>Proportional fraction of commingled funds.</div>
              </div>
            </div>
          </div>

          {/* CARD 4: MHA SOP STATUTORY NOTICE ON WHITE LEGAL LETTERHEAD */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={15} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  MHA SOP 02.01.2026 Statutory Notice
                </span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedNoticeType("106")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: selectedNoticeType === "106" ? "1px solid #059669" : "1px solid #E2E8F0",
                    background: selectedNoticeType === "106" ? "#ECFDF5" : "#F8FAFC",
                    color: selectedNoticeType === "106" ? "#047857" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  § 106 Lien Notice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNoticeType("107")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: selectedNoticeType === "107" ? "1px solid #E11D48" : "1px solid #E2E8F0",
                    background: selectedNoticeType === "107" ? "#FFF1F2" : "#F8FAFC",
                    color: selectedNoticeType === "107" ? "#BE123C" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  § 107 Freeze Order
                </button>
              </div>
            </div>

            {/* Crisp White Legal Letterhead Surface */}
            <div
              style={{
                background: "#FCFDFE",
                border: "1px solid #CBD5E1",
                borderRadius: "10px",
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                lineHeight: 1.5,
                color: "#0F172A",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                maxHeight: "150px",
              }}
            >
              {activeDraft.draftText}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Target: <strong>ICICI Bank Cyber Liaison Desk</strong> (48h Statutory Deadline)
              </span>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {isCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{isCopied ? "Copied to Clipboard" : "Copy BNSS Notice"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

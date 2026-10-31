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
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { BentoKpiCard, SemiCircleGauge } from "../../components/tarka/BentoPrimitives";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // 1. Accounting Rule Selection
  const [selectedRule, setSelectedRule] = useState<TaintRule>("LIBR");

  // 2. Freeze Budget K Slider (1 to 6 accounts)
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);

  // 3. Clean Commercial Deposit Injection
  const isInjectClean = !!mutations.injectMerchantCleanDeposit;

  // 4. Compute Engine State
  const engineState = useMemo(() => {
    return computeTaintEngine(isInjectClean, freezeBudgetK);
  }, [isInjectClean, freezeBudgetK]);

  // 5. Active BNSS Notice Selection (106 vs 107)
  const [selectedNoticeType, setSelectedNoticeType] = useState<"106" | "107">("106");

  // 6. BNSS Draft State
  const bnssDrafts = useMemo(() => {
    return generateBnssDrafts("ICICI 001405008129", "ICICI Bank", isInjectClean ? 120000 : 180000);
  }, [isInjectClean]);

  const activeDraft = useMemo(() => {
    return selectedNoticeType === "106" ? bnssDrafts.notice106 : bnssDrafts.application107;
  }, [selectedNoticeType, bnssDrafts]);

  const [isCopied, setIsCopied] = useState(false);
  const handleCopyNotice = () => {
    navigator.clipboard.writeText(activeDraft.draftText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Containment Percentage for Gauge (100% when K>=3)
  const containmentPct = engineState.minCut.isFreezeComplete
    ? 100
    : Math.round(((500000 - engineState.minCut.residualLeakageAmount) / 500000) * 100);

  // Recoverable amount for selected accounting rule
  const ruleRecoverableAmount = useMemo(() => {
    if (selectedRule === "LIBR") return engineState.summary.librRecoverable;
    if (selectedRule === "FIFO") return engineState.summary.fifoRecoverable;
    return engineState.summary.proRataRecoverable;
  }, [selectedRule, engineState.summary]);

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
      {/* =========================================================================
          1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (BENTO-GRID-4 WITH BENTOKPICARD)
          ========================================================================= */}
      <div className="bento-grid-4">
        {/* Card 1: Defrauded Victim Loss */}
        <BentoKpiCard
          title="Defrauded Victim Loss"
          metric="₹5,00,000"
          metricColor="#E11D48"
          subtitle="Complainant Sunil Kumar (SBI A/c)"
          statusBadge={{
            text: "T+0 DEBIT",
            variant: "rose",
          }}
          delta={{
            value: "-₹5,00,000",
            isWarning: true,
            label: "09:30:15 IST",
          }}
          icon={UserX}
          iconColor="#E11D48"
          iconBg="#FFF1F2"
          sparklineData={[500, 500, 500, 500, 500, 500]}
        />

        {/* Card 2: LIBR Recoverable Lien */}
        <BentoKpiCard
          title="LIBR Recoverable Lien"
          metric={`₹${(engineState.summary.librRecoverable / 100000).toFixed(2)}L`}
          metricColor="#059669"
          subtitle="Roscoe v. Winder & Shree Balaji rule"
          statusBadge={{
            text: "HC PRECEDENT",
            variant: "emerald",
          }}
          delta={{
            value: isInjectClean ? "Clean Protected" : "100% Capped",
            isPositive: true,
            label: "Lowest Bal Rule",
          }}
          icon={Scale}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={isInjectClean ? [500, 500, 500, 480, 460, 440] : [500, 500, 500, 500, 500, 500]}
        />

        {/* Card 3: Dinic Min-Cut Freeze */}
        <BentoKpiCard
          title="Dinic Min-Cut Freeze"
          metric={`K = ${freezeBudgetK} Accounts`}
          metricColor={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
          subtitle={engineState.minCut.isFreezeComplete ? "Zero outward leakage to ATM exits" : `₹${(engineState.minCut.residualLeakageAmount / 100000).toFixed(2)}L escaping via Layer 2`}
          statusBadge={{
            text: engineState.minCut.isFreezeComplete ? "100% SEALED" : "RESIDUAL ESCAPE",
            variant: engineState.minCut.isFreezeComplete ? "emerald" : "amber",
          }}
          delta={{
            value: engineState.minCut.isFreezeComplete ? "Min-Cut SAT" : "Path Leakage",
            isPositive: engineState.minCut.isFreezeComplete,
            isWarning: !engineState.minCut.isFreezeComplete,
          }}
          icon={Lock}
          iconColor={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
          iconBg={engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB"}
          sparklineData={engineState.minCut.isFreezeComplete ? [1, 2, 3, 3, 3, 3] : [3, 2, 1, 1, 1, 1]}
        />

        {/* Card 4: Innocent Capital Saved */}
        <BentoKpiCard
          title="Innocent Capital Saved"
          metric={isInjectClean ? "₹2,50,000" : "₹0 (Clean Inflow)"}
          metricColor="#4F46E5"
          subtitle="Merchant payroll kept liquid & open"
          statusBadge={{
            text: "§ 106 LIEN ONLY",
            variant: "indigo",
          }}
          delta={{
            value: isInjectClean ? "+₹2.50L Liquid" : "Standard Lien",
            isPositive: true,
            label: "GST Protected",
          }}
          icon={Store}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={isInjectClean ? [0, 50, 100, 180, 220, 250] : [0, 0, 0, 0, 0, 0]}
        />
      </div>

      {/* =========================================================================
          2. ROW 2: INTERACTIVE CONNECTED MONEY-TRAIL DAG (8 COL) & GAUGE + LIBR (4 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flexShrink: 0 }}>
        {/* ROW 2 LEFT (8 COLUMNS): CONNECTED TIME-EXPANDED DAG WITH SVG BEZIER FLOW PIPES */}
        <div
          style={{
            gridColumn: "span 8",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header with Title & Clean Deposit Toggle Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GitFork size={16} color="#4F46E5" />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                  Connected Time-Expanded DAG Money Trail & Node Classification
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                  ZERO CYCLES
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Tracks provenance across mule layers with mathematical zero-cycle assurance while shielding innocent commercial capital.
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation("injectMerchantCleanDeposit")}
              style={{
                display: "inline-flex",
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
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
              title="Injects ₹2.5L clean commercial funds into merchant account to demonstrate LIBR protection"
            >
              <DollarSign size={12} />
              <span>{isInjectClean ? "Clean Funds Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
            </button>
          </div>

          {/* 3-Stage Connected Canvas with Explicit SVG Curved Bezier Flow Pipes */}
          <div
            style={{
              position: "relative",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr 1.35fr",
              gap: "28px",
              minHeight: "270px",
            }}
          >
            {/* SVG Connecting Flow Lines Overlay */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              <defs>
                <linearGradient id="flowEmeraldGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="flowRoseGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>

              {/* Wire 1: Victim (Bottom) to Mule L1 (Top) - Vertical dashed arrow in col 1 handled via DOM */}
              {/* Wire 2: Mule L1 (Col 1) to Mule L2A (Col 2 Top) */}
              <path
                d="M 230 195 C 265 195, 275 80, 310 80"
                fill="none"
                stroke={engineState.minCut.isFreezeComplete ? "#4F46E5" : "#E11D48"}
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />

              {/* Wire 3: Mule L1 (Col 1) to Mule L2B (Col 2 Bottom) */}
              <path
                d="M 230 205 C 265 205, 275 220, 310 220"
                fill="none"
                stroke={freezeBudgetK >= 3 ? "#4F46E5" : "#E11D48"}
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />

              {/* Wire 4: Mule L2A (Col 2 Top) to Innocent Merchant (Col 3 Top) */}
              <path
                d="M 470 80 C 505 80, 515 95, 550 95"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />

              {/* Wire 5: Mule L2B (Col 2 Bottom) to ATM Cashout (Col 3 Bottom) */}
              <path
                d="M 470 220 C 505 220, 515 225, 550 225"
                fill="none"
                stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"}
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
            </svg>

            {/* STAGE 1: Victim Source & Layer 1 Mule (Col 1) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", zIndex: 2 }}>
              {/* Node 0: Victim Source */}
              <div
                style={{
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>
                    Victim Source
                  </span>
                  <span style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>09:30:15 IST</span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Sunil Kumar</div>
                <div style={{ fontSize: "10px", color: "#64748B" }}>SBI 30910029101</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  -₹5,00,000.00
                </div>
              </div>

              {/* Connecting badge on wire between Victim & Mule L1 */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    background: "#4F46E5",
                    padding: "2px 7px",
                    borderRadius: "5px",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 1px 3px rgba(79,70,229,0.3)",
                  }}
                >
                  ₹5.0L Outflow ↓
                </span>
              </div>

              {/* Node 1: Mule Layer 1 */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 1 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule Layer 1
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 1 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 1 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 1 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "1px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {freezeBudgetK >= 1 ? "§ 107 FROZEN" : "UNFROZEN"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Vikram Shah</div>
                <div style={{ fontSize: "10px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  Inflow: ₹5,00,000
                </div>
              </div>
            </div>

            {/* STAGE 2: Layer 2 Split Mules (Col 2) */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
              {/* Node 2A: Split Mule A */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule L2 (Split A)
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 2 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 2 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "1px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Rohit Verma</div>
                <div style={{ fontSize: "10px", color: "#64748B" }}>HDFC 5010029419920</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  ₹3,00,000 (60% Flow)
                </div>
              </div>

              {/* Node 2B: Split Mule B */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 3 ? "1.5px solid #059669" : "1.5px solid #E11D48",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule L2 (Split B)
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 3 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 3 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "1px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK PATH"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>Sameer Khan</div>
                <div style={{ fontSize: "10px", color: "#64748B" }}>AXIS 9140200410291</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  ₹2,00,000 (40% Flow)
                </div>
              </div>
            </div>

            {/* STAGE 3: Innocent Merchant (Apex Electronics) & ATM Sink (Col 3) */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
              {/* Node 3: Innocent Merchant (Apex Electronics Pvt Ltd) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #059669",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 2px 8px rgba(5,150,105,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Store size={13} color="#059669" />
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
                <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                  GST: 07AAACA1234F1Z8 · ICICI Bank
                </div>

                {/* STACKED HORIZONTAL CAPITAL BAR (Clean Working Capital vs Tainted Lien) */}
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", marginBottom: "2px" }}>
                    <span style={{ color: "#047857", fontWeight: 700 }}>
                      Clean Working Capital: {isInjectClean ? "₹2.50L (UNFROZEN)" : "₹0"}
                    </span>
                    <span style={{ color: "#BE123C", fontWeight: 700 }}>
                      Tainted Inflow: ₹1.80L (§ 106 Lien)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "12px", background: "#E2E8F0", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                    <div
                      style={{
                        width: isInjectClean ? "64%" : "0%",
                        background: "#059669",
                        height: "100%",
                        transition: "width 0.3s ease",
                      }}
                      title="Clean GST Working Capital Kept Liquid & Protected"
                    />
                    <div
                      style={{
                        width: isInjectClean ? "36%" : "100%",
                        background: "#E11D48",
                        height: "100%",
                        transition: "width 0.3s ease",
                      }}
                      title="Proportional Lien on Direct Fraud Proceeds"
                    />
                  </div>
                </div>

                <div style={{ fontSize: "9px", color: "#047857", marginTop: "4px", lineHeight: 1.3 }}>
                  ✓ <strong>Rajasthan HC Rule:</strong> Only ₹1.80L locked. Clean working capital (₹2.50L) remains liquid for payroll.
                </div>
              </div>

              {/* Node 4: ATM Cashout Sink */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Building size={13} color="#64748B" />
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>
                      Terminal Sink
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2",
                      color: freezeBudgetK >= 3 ? "#475569" : "#BE123C",
                      border: freezeBudgetK >= 3 ? "1px solid #CBD5E1" : "1px solid #FECDD3",
                      padding: "1px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                  Noida Sec 18 ATM DL-049
                </div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  Dispensed: ₹1,20,000 (Cash Out)
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Dinic Min-Cut Freeze Budget Slider (K = 1 to K = 6) */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              background: engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB",
              border: engineState.minCut.isFreezeComplete ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sliders size={14} color="#4F46E5" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                  Dinic Min-Cut Freeze Budget Optimizer (Budget K = {freezeBudgetK} Accounts)
                </span>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  color: engineState.minCut.isFreezeComplete ? "#047857" : "#B45309",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {engineState.minCut.isFreezeComplete ? "100% FLOW CONTAINED ✓" : "RESIDUAL PATH LEAKAGE ALERT"}
              </span>
            </div>

            {/* Range Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748B" }}>K=1</span>
              <input
                type="range"
                min={1}
                max={6}
                value={freezeBudgetK}
                onChange={(e) => setFreezeBudgetK(Number(e.target.value))}
                style={{ flex: 1, cursor: "pointer", accentColor: "#4F46E5" }}
              />
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748B" }}>K=6</span>
            </div>

            <div style={{ fontSize: "11px", color: engineState.minCut.isFreezeComplete ? "#065F46" : "#92400E", lineHeight: 1.4 }}>
              <strong>Optimization Verdict:</strong> {engineState.minCut.verdictDetail}
            </div>
          </div>
        </div>

        {/* ROW 2 RIGHT (4 COLUMNS): SALEZY SEGMENTED GAUGE & 3-RULE COMPARISON */}
        <div
          style={{
            gridColumn: "span 4",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Scale size={15} color="#4F46E5" />
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                Recoverable Flow Containment
              </span>
            </div>
            <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: "4px" }}>
              ROSCOE V. WINDER
            </span>
          </div>

          {/* SalezySegmentedGauge (NO TEXT CLIPPING!) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <SemiCircleGauge
              percentage={containmentPct}
              label="Recoverable Flow Contained"
              sublabel={`Dinic Budget K = ${freezeBudgetK} Accounts`}
              summaryText={engineState.minCut.isFreezeComplete ? "✓ 100% Flow Sealed · No Outward Leakage" : "⚠ Residual Leakage to Terminal Cashout Sink"}
              color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
              size={210}
            />

            {/* Dual Metric Row (Matching Salezy Sales Overview) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                width: "100%",
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid #E2E8F0",
              }}
            >
              <div style={{ textAlign: "center", background: "#FFFFFF", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Victim Outflow</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>₹5,00,000</div>
              </div>
              <div style={{ textAlign: "center", background: "#FFFFFF", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Frozen in Lien</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  ₹{(500000 - engineState.minCut.residualLeakageAmount).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* 3 Accounting Rule Comparison Cards (LIBR vs FIFO vs Pro-Rata) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {/* LIBR Card */}
            <div
              onClick={() => setSelectedRule("LIBR")}
              style={{
                background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                padding: "6px 8px",
                borderRadius: "8px",
                border: selectedRule === "LIBR" ? "2px solid #059669" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 800, color: "#047857" }}>LIBR (HC) ★</div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Caps taint at lowest balance.</div>
            </div>

            {/* FIFO Card */}
            <div
              onClick={() => setSelectedRule("FIFO")}
              style={{
                background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                padding: "6px 8px",
                borderRadius: "8px",
                border: selectedRule === "FIFO" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 800, color: "#4F46E5" }}>FIFO</div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Oldest credits spent first.</div>
            </div>

            {/* Pro-Rata Card */}
            <div
              onClick={() => setSelectedRule("PRO_RATA")}
              style={{
                background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                padding: "6px 8px",
                borderRadius: "8px",
                border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Commingled fraction.</div>
            </div>
          </div>

          <div style={{ fontSize: "10px", color: "#64748B", background: "#F1F5F9", padding: "6px 8px", borderRadius: "6px" }}>
            <strong>Selected Rule:</strong> {selectedRule} · Recoverable: <strong>₹{ruleRecoverableAmount.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ROW 3: MHA SOP STATUTORY COUNTDOWN STEPPER (6 COL) & BNSS NOTICE (6 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flex: 1, minHeight: 0 }}>
        {/* ROW 3 LEFT (6 COLUMNS): MHA SOP 02.01.2026 STATUTORY TIMELINE STEPPER */}
        <div
          style={{
            gridColumn: "span 6",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={15} color="#4F46E5" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                MHA SOP 02.01.2026 Statutory Compliance Stepper
              </span>
            </div>
            <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 6px", borderRadius: "4px" }}>
              GOLDEN HOUR ACTIVE
            </span>
          </div>

          {/* 4-Step Statutory Countdown Stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Step 1: 24h Magistrate Intimation */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={15} color="#059669" />
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#065F46" }}>
                    Step 1: 24h § 106(3) Magistrate Intimation
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    Administrative lien reported to CJM Gautam Buddha Nagar
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: 800, background: "#D1FAE5", color: "#047857", padding: "2px 6px", borderRadius: "4px" }}>
                COMPLETED ✓
              </span>
            </div>

            {/* Step 2: 7-Day Account Holder Notice */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={15} color="#4F46E5" />
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1E1B4B" }}>
                    Step 2: 7-Day Account Holder Statutory Notice
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    Notice served to Nodal Officer ICICI Bank (Remaining: 4d 18h)
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: 800, background: "#E0E7FF", color: "#4338CA", padding: "2px 6px", borderRadius: "4px" }}>
                IN PROGRESS
              </span>
            </div>

            {/* Step 3: 15-Day Judicial Appearance Window */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                opacity: 0.85,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={15} color="#94A3B8" />
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
                    Step 3: 15-Day Appearance Window
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    Opportunity to show cause under § 107(2) BNSS
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "2px 6px", borderRadius: "4px" }}>
                PENDING
              </span>
            </div>

            {/* Step 4: 90-Day Restoration Order */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                opacity: 0.7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Scale size={15} color="#94A3B8" />
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
                    Step 4: 90-Day § 107 Restoration Order
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    Formal decree for victim restitution without waiting for trial
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "2px 6px", borderRadius: "4px" }}>
                SCHEDULED
              </span>
            </div>
          </div>
        </div>

        {/* ROW 3 RIGHT (6 COLUMNS): DUAL-TRACK BNSS NOTICE & APPLICATION GENERATOR */}
        <div
          style={{
            gridColumn: "span 6",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* Header with Switcher & Copy Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "4px" }}>
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
                § 106(1) Lien Notice (Merchant Safe)
              </button>
              <button
                type="button"
                onClick={() => setSelectedNoticeType("107")}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: selectedNoticeType === "107" ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                  background: selectedNoticeType === "107" ? "#EEF2FF" : "#F8FAFC",
                  color: selectedNoticeType === "107" ? "#4338CA" : "#64748B",
                  cursor: "pointer",
                }}
              >
                § 107 Attachment Order (Mule Conduit)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyNotice}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: isCopied ? "#059669" : "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              <span>{isCopied ? "Copied" : "Copy BNSS Notice"}</span>
            </button>
          </div>

          {/* White Court Document Letterhead Preview */}
          <div
            style={{
              background: "#FCFDFE",
              border: "1px solid #CBD5E1",
              borderRadius: "10px",
              padding: "12px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              lineHeight: 1.45,
              color: "#0F172A",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              maxHeight: "160px",
              flex: 1,
            }}
          >
            {activeDraft.draftText}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#64748B" }}>
            <span>Target: <strong>ICICI Bank (001405008129)</strong></span>
            <span>Statutory Window: <strong>{activeDraft.statutoryDeadlineHours} Hours</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-export as TaintLienEngineScreen for complete compatibility
export const TaintLienEngineScreen = TaintEngineScreen;

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
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard, SemiCircleGauge } from "../../components/tarka/BentoPrimitives";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

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
    toast.success("BNSS Notice text copied to clipboard!");
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
      className={`tarka-taint-root ${isCompact ? "tarka-density-compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        padding: isCompact ? "8px 12px 16px 12px" : "10px 16px 18px 16px",
        gap: isCompact ? "8px" : "10px",
        boxSizing: "border-box",
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
          statusBadge={{
            text: "T+0 DEBIT",
            variant: "rose",
          }}
          meta="09:30:15 IST"
          subtitle="Complainant Sunil Kumar (SBI A/c)"
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
          statusBadge={{
            text: "HC PRECEDENT",
            variant: "emerald",
          }}
          meta="Lowest Bal Rule"
          subtitle="Roscoe v. Winder & Shree Balaji rule"
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
          statusBadge={{
            text: engineState.minCut.isFreezeComplete ? "100% SEALED" : "RESIDUAL ESCAPE",
            variant: engineState.minCut.isFreezeComplete ? "emerald" : "amber",
          }}
          meta="Reachability SAT"
          subtitle={engineState.minCut.isFreezeComplete ? "Zero outward leakage to ATM exits" : `₹${(engineState.minCut.residualLeakageAmount / 100000).toFixed(2)}L escaping via Layer 2`}
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
          statusBadge={{
            text: "§ 106 LIEN ONLY",
            variant: "indigo",
          }}
          meta="GST Protected"
          subtitle="Merchant payroll kept liquid & open"
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
        {/* ROW 2 LEFT (8 COLUMNS): CONNECTED TIME-EXPANDED DAG WITH 5-COLUMN FLOW ARCHITECTURE */}
        <div
          style={{
            gridColumn: "span 8",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "6px" : "8px",
          }}
        >
          {/* Header with Title & Clean Deposit Toggle Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <GitFork size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                Connected Time-Expanded DAG Money Trail & Node Classification
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  color: "#059669",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                ZERO CYCLES
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation("injectMerchantCleanDeposit")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "3.5px 8px",
                borderRadius: "5px",
                border: isInjectClean ? "1px solid #059669" : "1px solid #CBD5E1",
                background: isInjectClean ? "#ECFDF5" : "#F8FAFC",
                color: isInjectClean ? "#047857" : "#0F172A",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              title="Injects ₹2.5L clean commercial funds into merchant account to demonstrate LIBR protection"
            >
              <DollarSign size={11} />
              <span>{isInjectClean ? "Clean Funds Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
            </button>
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "-3px" }}>
            Tracks provenance across mule layers with mathematical zero-cycle assurance while shielding innocent commercial capital.
          </div>

          {/* 5-Column Connected Flow Pipeline Architecture (Unbreakable, Relative Wire Conduits) */}
          <div
            style={{
              position: "relative",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "8px 10px",
              display: "grid",
              gridTemplateColumns: "1.08fr 50px 1.15fr 50px 1.4fr",
              gap: "4px",
              minHeight: "262px",
              alignItems: "stretch",
            }}
          >
            {/* =========================================================================
                COLUMN 1: STAGE 1 (Victim Source & Mule Layer 1)
                ========================================================================= */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              {/* Node 0: Victim Source */}
              <div
                style={{
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>
                    Victim Source
                  </span>
                  <span style={{ fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>09:30:15 IST</span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sunil Kumar</div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 30910029101</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                  -₹5,00,000.00
                </div>
              </div>

              {/* Connecting Downward Conduit between Victim & Mule Layer 1 */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "24px" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "repeating-linear-gradient(to bottom, #4F46E5 0, #4F46E5 3px, transparent 3px, transparent 6px)",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontSize: "8px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    background: "#4F46E5",
                    padding: "1.5px 6px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 1px 3px rgba(79,70,229,0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <span>₹5.0L Outflow ↓</span>
                </span>
              </div>

              {/* Node 1: Mule Layer 1 (Vikram Shah) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 1 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule Layer 1
                  </span>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 1 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 1 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 1 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "0.5px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {freezeBudgetK >= 1 ? "§ 107 FROZEN" : "UNFROZEN"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram Shah</div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                  Inflow: ₹5,00,000
                </div>
              </div>
            </div>

            {/* =========================================================================
                COLUMN 2: BRIDGE 1 -> 2 (Wires from Vikram L1 to Rohit L2A & Sameer L2B)
                ========================================================================= */}
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <svg width="100%" height="100%" viewBox="0 0 50 260" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                <defs>
                  <marker id="bridgeArrowIndigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4F46E5" />
                  </marker>
                  <marker id="bridgeArrowEmerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                  </marker>
                  <marker id="bridgeArrowRose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E11D48" />
                  </marker>
                </defs>

                {/* Wire from Vikram (bottom: y=195) up to Rohit (top: y=50) */}
                <path
                  d="M 0 195 C 25 195, 25 50, 48 50"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#bridgeArrowIndigo)"
                />

                {/* Wire from Vikram (bottom: y=215) across to Sameer (bottom: y=215) */}
                <path
                  d="M 0 215 C 25 215, 25 215, 48 215"
                  fill="none"
                  stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"}
                  strokeWidth="2"
                  strokeDasharray={freezeBudgetK >= 3 ? "none" : "4 2"}
                  markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"}
                />
              </svg>

              {/* Floating Flow Label Badge: ₹3.0L (60%) */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "47%",
                  transform: "translate(-50%, -50%)",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: "3px",
                  padding: "1px 3px",
                  fontSize: "7.5px",
                  fontWeight: 800,
                  color: "#4338CA",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                ₹3.0L (60%)
              </div>

              {/* Floating Flow Label Badge: ₹2.0L (40%) */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "75%",
                  transform: "translate(-50%, -50%)",
                  background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2",
                  border: freezeBudgetK >= 3 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                  borderRadius: "3px",
                  padding: "1px 3px",
                  fontSize: "7.5px",
                  fontWeight: 800,
                  color: freezeBudgetK >= 3 ? "#047857" : "#BE123C",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                ₹2.0L (40%)
              </div>
            </div>

            {/* =========================================================================
                COLUMN 3: STAGE 2 (Mule L2 Splits: Rohit Verma & Sameer Khan)
                ========================================================================= */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              {/* Node 2A: Split Mule A (Rohit Verma) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule L2 (Split A)
                  </span>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 2 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 2 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "0.5px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Rohit Verma</div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>HDFC 5010029419920</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  Inflow: +₹3,00,000
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "1px", display: "flex", gap: "4px" }}>
                  <span style={{ color: "#4F46E5" }}>→ Apex: ₹1.80L</span>
                  <span>|</span>
                  <span style={{ color: "#059669" }}>Frozen: ₹1.20L</span>
                </div>
              </div>

              {/* Node 2B: Split Mule B (Sameer Khan) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: freezeBudgetK >= 3 ? "1.5px solid #059669" : "1.5px solid #E11D48",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                    Mule L2 (Split B)
                  </span>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2",
                      color: freezeBudgetK >= 3 ? "#047857" : "#BE123C",
                      border: freezeBudgetK >= 3 ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      padding: "0.5px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK PATH"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sameer Khan</div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>AXIS 9140200410291</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  Inflow: +₹2,00,000
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "1px", display: "flex", gap: "4px" }}>
                  <span style={{ color: freezeBudgetK >= 3 ? "#64748B" : "#BE123C" }}>→ ATM: ₹1.20L</span>
                  <span>|</span>
                  <span style={{ color: "#059669" }}>Frozen: ₹80k</span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                COLUMN 4: BRIDGE 2 -> 3 (Wires to Apex Merchant & ATM Sink)
                ========================================================================= */}
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <svg width="100%" height="100%" viewBox="0 0 50 260" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {/* Wire from Rohit (top: y=50) to Apex Merchant (top: y=50) */}
                <path
                  d="M 0 50 L 48 50"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#bridgeArrowEmerald)"
                />

                {/* Wire from Sameer (bottom: y=215) to ATM Sink (bottom: y=215) */}
                <path
                  d="M 0 215 L 48 215"
                  fill="none"
                  stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"}
                  strokeWidth="2"
                  strokeDasharray={freezeBudgetK >= 3 ? "none" : "4 2"}
                  markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"}
                />
              </svg>

              {/* Floating Flow Label Badge: ₹1.80L POS */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "19.2%",
                  transform: "translate(-50%, -50%)",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "3px",
                  padding: "1px 3px",
                  fontSize: "7.5px",
                  fontWeight: 800,
                  color: "#047857",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                ₹1.80L POS
              </div>

              {/* Floating Flow Label Badge: ₹1.20L ATM */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "82.7%",
                  transform: "translate(-50%, -50%)",
                  background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2",
                  border: freezeBudgetK >= 3 ? "1px solid #CBD5E1" : "1px solid #FECDD3",
                  borderRadius: "3px",
                  padding: "1px 3px",
                  fontSize: "7.5px",
                  fontWeight: 800,
                  color: freezeBudgetK >= 3 ? "#475569" : "#BE123C",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                ₹1.20L ATM
              </div>
            </div>

            {/* =========================================================================
                COLUMN 5: STAGE 3 (Innocent Merchant & ATM Terminal Sink)
                ========================================================================= */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
              {/* Node 3: Innocent Commercial Merchant (Apex Electronics) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid #059669",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 4px rgba(5,150,105,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <Store size={12} color="#059669" />
                    <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>
                      Innocent Merchant
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 800,
                      background: "#ECFDF5",
                      color: "#047857",
                      border: "1px solid #A7F3D0",
                      padding: "0.5px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    § 106 LIEN ONLY
                  </span>
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                  Apex Electronics Pvt Ltd
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                  GST: 07AAACA1234F1Z8 · ICICI Bank
                </div>

                {/* Dual-Layer Stacked Capital Progress Bar */}
                <div style={{ marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", marginBottom: "1.5px" }}>
                    <span style={{ color: "#047857", fontWeight: 700 }}>
                      {isInjectClean ? "₹2.50L Clean (Liquid)" : "Clean Working: ₹0"}
                    </span>
                    <span style={{ color: "#BE123C", fontWeight: 700 }}>
                      ₹1.80L Specific Lien (§106)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "10px", background: "#E2E8F0", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                    <div
                      style={{
                        width: isInjectClean ? "58%" : "0%",
                        background: "#059669",
                        height: "100%",
                        transition: "width 0.3s ease",
                      }}
                      title="Clean Commercial Capital 100% Liquid"
                    />
                    <div
                      style={{
                        width: isInjectClean ? "42%" : "100%",
                        background: "#E11D48",
                        height: "100%",
                        transition: "width 0.3s ease",
                      }}
                      title="Proportional Lien on Fraud Outflow"
                    />
                  </div>
                </div>

                <div style={{ fontSize: "8px", color: isInjectClean ? "#047857" : "#B45309", marginTop: "3px", lineHeight: 1.25 }}>
                  {isInjectClean ? (
                    <span>✓ <strong>Rajasthan HC Rule:</strong> Specific §106 lien locks ₹1.80L. Clean capital (₹2.50L) stays 100% liquid for payroll.</span>
                  ) : (
                    <span>₹1.80L locked under §106 Specific Lien. Click <strong>'+ Inject Clean Deposit'</strong> to simulate commingled merchant capital.</span>
                  )}
                </div>
              </div>

              {/* Node 4: Terminal Sink (Noida Sec 18 ATM) */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                  borderRadius: "8px",
                  padding: "7px 9px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <Building size={12} color="#64748B" />
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>
                      Terminal Sink
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 800,
                      background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2",
                      color: freezeBudgetK >= 3 ? "#475569" : "#BE123C",
                      border: freezeBudgetK >= 3 ? "1px solid #CBD5E1" : "1px solid #FECDD3",
                      padding: "0.5px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                  Noida Sec 18 ATM DL-049
                </div>
                <div style={{ fontSize: "10px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#64748B" : "#E11D48", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                  Dispensed: ₹1,20,000 (Cash Out)
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Dinic Min-Cut Freeze Budget Controller with Stepped Chips */}
          <div
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              background: engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB",
              border: engineState.minCut.isFreezeComplete ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sliders size={13} color="#4F46E5" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                  Dinic Min-Cut Freeze Budget Optimizer
                </span>
                <span
                  style={{
                    fontSize: "8.5px",
                    fontWeight: 800,
                    background: engineState.minCut.isFreezeComplete ? "#D1FAE5" : "#FEE2E2",
                    color: engineState.minCut.isFreezeComplete ? "#047857" : "#B91C1C",
                    border: engineState.minCut.isFreezeComplete ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                    padding: "0.5px 5px",
                    borderRadius: "3px",
                  }}
                >
                  {engineState.minCut.isFreezeComplete ? "0 / 4 Escape Routes (100% Reachability Sealed)" : `${4 - freezeBudgetK} / 4 Escape Routes Open`}
                </span>
              </div>

              {/* Discrete Step Chips K=1 to K=6 */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                {[1, 2, 3, 4, 5, 6].map((kVal) => (
                  <button
                    key={kVal}
                    type="button"
                    onClick={() => setFreezeBudgetK(kVal)}
                    style={{
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 800,
                      cursor: "pointer",
                      border: freezeBudgetK === kVal ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                      background: freezeBudgetK === kVal ? "#4F46E5" : "#FFFFFF",
                      color: freezeBudgetK === kVal ? "#FFFFFF" : "#475569",
                      boxShadow: freezeBudgetK === kVal ? "0 1px 2px rgba(79,70,229,0.3)" : "none",
                    }}
                  >
                    K={kVal}{kVal === 3 ? " ★" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "9.5px", color: engineState.minCut.isFreezeComplete ? "#065F46" : "#92400E", lineHeight: 1.35 }}>
              <strong>Optimization Verdict:</strong> {engineState.minCut.verdictDetail}
            </div>
          </div>
        </div>

        {/* ROW 2 RIGHT (4 COLUMNS): GAUGE & 3-RULE RECOVERABLE FLOW COMPARISON */}
        <div
          style={{
            gridColumn: "span 4",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "6px" : "8px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                Recoverable Flow Containment
              </span>
            </div>
            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "3px" }}>
              ROSCOE V. WINDER
            </span>
          </div>

          {/* SemiCircleGauge Box */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "8px",
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
              size={185}
            />

            {/* Dual Metric Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                width: "100%",
                marginTop: "4px",
                paddingTop: "5px",
                borderTop: "1px solid #E2E8F0",
              }}
            >
              <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px 5px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "8px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Victim Outflow</div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>₹5,00,000</div>
              </div>
              <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px 5px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "8px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Frozen in Lien</div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  ₹{(500000 - engineState.minCut.residualLeakageAmount).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* 3 Accounting Rule Comparison Cards (LIBR vs FIFO vs Pro-Rata) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px" }}>
            {/* LIBR Card */}
            <div
              onClick={() => setSelectedRule("LIBR")}
              style={{
                background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                padding: "5px 6px",
                borderRadius: "6px",
                border: selectedRule === "LIBR" ? "2px solid #059669" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857" }}>LIBR (HC) ★</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "7.5px", color: "#64748B" }}>Caps taint at lowest bal.</div>
            </div>

            {/* FIFO Card */}
            <div
              onClick={() => setSelectedRule("FIFO")}
              style={{
                background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                padding: "5px 6px",
                borderRadius: "6px",
                border: selectedRule === "FIFO" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#4F46E5" }}>FIFO</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "7.5px", color: "#64748B" }}>Oldest credits spent first.</div>
            </div>

            {/* Pro-Rata Card */}
            <div
              onClick={() => setSelectedRule("PRO_RATA")}
              style={{
                background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                padding: "5px 6px",
                borderRadius: "6px",
                border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
              </div>
              <div style={{ fontSize: "7.5px", color: "#64748B" }}>Commingled fraction.</div>
            </div>
          </div>

          <div style={{ fontSize: "9.5px", color: "#64748B", background: "#F1F5F9", padding: "5px 7px", borderRadius: "5px" }}>
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
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "6px" : "8px",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                MHA SOP 02.01.2026 Statutory Compliance Stepper
              </span>
            </div>
            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "3px" }}>
              GOLDEN HOUR ACTIVE
            </span>
          </div>

          {/* 4-Step Statutory Countdown Stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* Step 1: 24h Magistrate Intimation */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={13} color="#059669" />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#065F46" }}>
                    Step 1: 24h § 106(3) Magistrate Intimation
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Administrative lien reported to CJM Gautam Buddha Nagar
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#D1FAE5", color: "#047857", padding: "1px 5px", borderRadius: "3px" }}>
                COMPLETED ✓
              </span>
            </div>

            {/* Step 2: 7-Day Account Holder Notice */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={13} color="#4F46E5" />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#1E1B4B" }}>
                    Step 2: 7-Day Account Holder Statutory Notice
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Notice served to Nodal Officer ICICI Bank (Remaining: 4d 18h)
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#E0E7FF", color: "#4338CA", padding: "1px 5px", borderRadius: "3px" }}>
                IN PROGRESS
              </span>
            </div>

            {/* Step 3: 15-Day Judicial Appearance Window */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                opacity: 0.85,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={13} color="#94A3B8" />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                    Step 3: 15-Day Appearance Window
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Opportunity to show cause under § 107(2) BNSS
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "8.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "1px 5px", borderRadius: "3px" }}>
                PENDING
              </span>
            </div>

            {/* Step 4: 90-Day Restoration Order */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                opacity: 0.7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale size={13} color="#94A3B8" />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                    Step 4: 90-Day § 107 Restoration Order
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Formal decree for victim restitution without waiting for trial
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "8.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "1px 5px", borderRadius: "3px" }}>
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
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "6px" : "8px",
            minHeight: 0,
          }}
        >
          {/* Statutory Escalation Path Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 7px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "5px",
              fontSize: "9px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontWeight: 800, color: "#047857" }}>Tier 0: § 106(3) BNSS Emergency Lien (24h Intimation)</span>
              <span style={{ color: "#4F46E5", fontWeight: 800 }}>⟶</span>
              <span style={{ fontWeight: 800, color: "#4338CA" }}>Tier 1: § 107 Attachment Order (Full Conduit Freeze)</span>
            </div>
            <span style={{ fontSize: "8px", fontWeight: 700, background: "#EEF2FF", color: "#4338CA", padding: "1px 4px", borderRadius: "3px" }}>
              TIME-GATED BNSS
            </span>
          </div>

          {/* Header with Switcher & Copy Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setSelectedNoticeType("106")}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: "5px",
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
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: "5px",
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
                gap: "3px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "5px",
                border: "none",
                background: isCopied ? "#059669" : "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              {isCopied ? <Check size={11} /> : <Copy size={11} />}
              <span>{isCopied ? "Copied" : "Copy BNSS Notice"}</span>
            </button>
          </div>

          {/* White Court Document Letterhead Preview */}
          <div
            style={{
              background: "#FCFDFE",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              lineHeight: 1.4,
              color: "#0F172A",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              maxHeight: "140px",
              flex: 1,
            }}
          >
            {activeDraft.draftText}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748B" }}>
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

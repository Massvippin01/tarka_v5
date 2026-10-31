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
  Printer,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard, SemiCircleGauge } from "../../components/tarka/BentoPrimitives";
import { StripeSegmentedBar, AnimatedCounter } from "../../components/ui/forensic-infographics";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";
type TaintWorkspaceMode = "dag" | "orders";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  // Active 2-Mode Workspace (Default: Mode 1 Interactive Taint DAG)
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<TaintWorkspaceMode>("dag");

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

  const handlePrintOrder = () => {
    window.print();
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
        height: "calc(100dvh - 56px)",
        maxHeight: "calc(100dvh - 56px)",
        padding: isCompact ? "8px 12px 12px 12px" : "12px 16px 16px 16px",
        gap: isCompact ? "8px" : "10px",
        boxSizing: "border-box",
        background: "var(--bento-canvas, #F4F6FB)",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (BENTO-GRID-4 WITH BENTOKPICARD)
          ========================================================================= */}
      <div className="bento-grid-4" style={{ flexShrink: 0 }}>
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
          2. WORKSPACE 2-MODE SWITCHER (PROGRESSIVE DISCLOSURE)
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "4px 8px",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", paddingLeft: "4px", letterSpacing: "0.05em" }}>
            Taint Workspace:
          </span>
          {[
            { id: "dag" as const, label: "💸 Interactive Taint DAG & Min-Cut Optimizer", icon: GitFork },
            { id: "orders" as const, label: "📜 MHA 2026 SOP Clock & BNSS Statutory Orders", icon: Scale },
          ].map((m) => {
            const Icon = m.icon;
            const isActive = activeWorkspaceMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveWorkspaceMode(m.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: isActive ? "1px solid #4F46E5" : "1px solid transparent",
                  background: isActive ? "#EEF2FF" : "transparent",
                  color: isActive ? "#4338CA" : "#64748B",
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={12} color={isActive ? "#4F46E5" : "#64748B"} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => toggleMutation("injectMerchantCleanDeposit")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "5px",
              border: isInjectClean ? "1px solid #059669" : "1px solid #CBD5E1",
              background: isInjectClean ? "#ECFDF5" : "#F8FAFC",
              color: isInjectClean ? "#047857" : "#0F172A",
              cursor: "pointer",
            }}
          >
            <DollarSign size={11} />
            <span>{isInjectClean ? "Clean Funds Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
          </button>
          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 7px", borderRadius: "4px", fontWeight: 700 }}>
            ROSCOE V. WINDER SAT ✓
          </span>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN STAGE CONTENT (FULL HEIGHT PER MODE)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            MODE 1: INTERACTIVE TAINT DAG & MIN-CUT OPTIMIZER
            ===================================================================== */}
        {activeWorkspaceMode === "dag" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "12px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* MODE 1 LEFT (8 COLUMNS): FULL-HEIGHT CONNECTED TIME-EXPANDED DAG */}
            <div
              style={{
                gridColumn: "span 8",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GitFork size={15} color="#4F46E5" />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                      Connected Time-Expanded DAG Money Trail & Node Classification
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                      Tracks provenance across mule layers with mathematical zero-cycle assurance while shielding innocent capital.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 7px", borderRadius: "4px" }}>
                    ZERO CYCLES
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleMutation("injectMerchantCleanDeposit")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "5px",
                      border: isInjectClean ? "1.5px solid #059669" : "1px solid #CBD5E1",
                      background: isInjectClean ? "#ECFDF5" : "#FFFFFF",
                      color: isInjectClean ? "#047857" : "#0F172A",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                    title="Simulate injection of clean commercial capital to test Roscoe v. Winder proportional lien isolation"
                  >
                    <DollarSign size={11} color={isInjectClean ? "#059669" : "#64748B"} />
                    <span>{isInjectClean ? "Clean Funds Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
                  </button>
                </div>
              </div>

              {/* 5-Column Connected Flow Pipeline Architecture */}
              <div
                style={{
                  height: "310px",
                  flexShrink: 0,
                  position: "relative",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "1.1fr 50px 1.15fr 50px 1.35fr",
                  gap: "6px",
                  alignItems: "stretch",
                  boxSizing: "border-box",
                }}
              >
                {/* COLUMN 1: Stage 1 (Victim & L1 Mule) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", height: "100%" }}>
                  {/* Stage 1 Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "8.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#BE123C" }} />
                    <span>Layer 1 · Fraud Inception</span>
                  </div>

                  {/* Node 0: Victim Source */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFF1F2",
                      border: "1px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>Victim Source</span>
                      <span style={{ fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>09:30:15 IST</span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sunil Kumar</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 30910029101</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      -₹5,00,000.00
                    </div>
                  </div>

                  {/* Connecting Conduit */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "18px" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, width: "2px", background: "repeating-linear-gradient(to bottom, #4F46E5 0, #4F46E5 3px, transparent 3px, transparent 6px)" }} />
                    <span style={{ position: "relative", zIndex: 1, fontSize: "8px", fontWeight: 800, color: "#FFFFFF", background: "#4F46E5", padding: "1px 5px", borderRadius: "3px", fontFamily: "var(--font-mono)" }}>
                      ₹5.0L Outflow ↓
                    </span>
                  </div>

                  {/* Node 1: Mule Layer 1 (Vikram Shah) */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: freezeBudgetK >= 1 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule Layer 1</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 1 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 1 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 1 ? "§ 107 FROZEN" : "UNFROZEN"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram Shah</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Inflow: ₹5,00,000
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", marginTop: "3px" }}>
                      Mule Typology: 98/100 · Pass-Through Conduit (Dwell: 112s)
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Bridge 1 -> 2 Wires */}
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <svg width="100%" height="100%" viewBox="0 0 50 310" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <defs>
                      <style>{`
                        @keyframes taintFlowPulse {
                          from { stroke-dashoffset: 24; }
                          to { stroke-dashoffset: 0; }
                        }
                        .wire-pulse-active {
                          animation: taintFlowPulse 1.2s linear infinite;
                        }
                        .wire-pulse-leak {
                          animation: taintFlowPulse 0.6s linear infinite;
                        }
                      `}</style>
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
                    {/* Rohit Verma Wire: Thicker (60% flow) with curve from Vikram Shah (y=210) up to Rohit Verma (y=82) */}
                    <path d="M 0 195 C 25 195, 25 82, 46 82" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5 3" className="wire-pulse-active" markerEnd="url(#bridgeArrowIndigo)" />
                    {/* Sameer Khan Wire: 40% flow horizontal bridge at y=210 */}
                    <path d="M 0 210 C 25 210, 25 210, 46 210" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2.5" strokeDasharray={freezeBudgetK >= 3 ? "none" : "5 3"} className={freezeBudgetK >= 3 ? "" : "wire-pulse-leak"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />
                  </svg>
                  <div style={{ position: "absolute", left: "50%", top: "42%", transform: "translate(-50%, -50%)", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹3.0L (60%)
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "72%", transform: "translate(-50%, -50%)", background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", border: freezeBudgetK >= 3 ? "1px solid #A7F3D0" : "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹2.0L (40%)
                  </div>
                </div>

                {/* COLUMN 3: Stage 2 (Rohit Verma & Sameer Khan) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", height: "100%" }}>
                  {/* Stage 2 Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "8.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#D97706" }} />
                    <span>Layer 2 · Split Conduits</span>
                  </div>

                  {/* Node 2A: Rohit Verma */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split A)</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 2 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Rohit Verma</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>HDFC 5010029419920</div>
                    <div style={{ fontSize: "9px", color: "#0F172A", marginTop: "2px" }}>
                      Inflow: <strong>₹3,00,000</strong> · Forwarded: <strong>₹1,80,000</strong>
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "3px", padding: "1px 4px", marginTop: "3px" }}>
                      Mule Typology: 94/100 · Split Conduit (Shared JA4 & BSSID)
                    </div>
                  </div>

                  {/* Node 2B: Sameer Khan */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: freezeBudgetK >= 3 ? "1.5px solid #059669" : "1.5px solid #E11D48",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split B)</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK ESCAPE"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sameer Khan</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>AXIS 9140200410291</div>
                    <div style={{ fontSize: "9px", color: "#0F172A", marginTop: "2px" }}>
                      Inflow: <strong>₹2,00,000</strong> · ATM Cashout: <strong>₹1,20,000</strong>
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "3px", padding: "1px 4px", marginTop: "3px" }}>
                      Mule Typology: 94/100 · Split Conduit (Shared JA4 & BSSID)
                    </div>
                  </div>
                </div>

                {/* COLUMN 4: Bridge 2 -> 3 Wires */}
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <svg width="100%" height="100%" viewBox="0 0 50 310" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <path d="M 0 82 C 25 82, 25 82, 46 82" fill="none" stroke="#059669" strokeWidth="2.5" markerEnd="url(#bridgeArrowEmerald)" />
                    <path d="M 0 210 C 25 210, 25 210, 46 210" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2.5" strokeDasharray={freezeBudgetK >= 3 ? "none" : "4 2"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />
                  </svg>
                  <div style={{ position: "absolute", left: "50%", top: "27%", transform: "translate(-50%, -50%)", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹1.80L POS
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "72%", transform: "translate(-50%, -50%)", background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", border: freezeBudgetK >= 3 ? "1px solid #CBD5E1" : "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹1.20L ATM
                  </div>
                </div>

                {/* COLUMN 5: Stage 3 (Apex Electronics & Noida ATM DL-049) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", height: "100%" }}>
                  {/* Stage 3 Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "8.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#059669" }} />
                    <span>Layer 3 · Sinks & Liens</span>
                  </div>

                  {/* Node 3: Apex Electronics (Innocent Merchant) */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #059669",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Store size={12} color="#059669" />
                        <span style={{ fontSize: "9px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>Innocent Merchant</span>
                      </div>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 5px", borderRadius: "3px" }}>
                        § 106 LIEN ONLY
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Apex Electronics Pvt Ltd</div>
                    <div style={{ fontSize: "8.5px", color: "#64748B" }}>GST: 07AAACA1234F1Z8 · ICICI Bank</div>

                    <div style={{ marginTop: "5px" }}>
                      <StripeSegmentedBar
                        height={16}
                        showLabels={true}
                        totalValue={isInjectClean ? 430000 : 180000}
                        segments={
                          isInjectClean
                            ? [
                                { id: "clean", label: "Clean GST", value: 250000, color: "#10B981" },
                                { id: "lien", label: "§106 Lien", value: 180000, isHatched: true, color: "crimson", tooltipText: "Tainted Inflow Frozen" },
                              ]
                            : [
                                { id: "lien", label: "§106 Lien (100%)", value: 180000, isHatched: true, color: "crimson", tooltipText: "100% Inflow Frozen" },
                              ]
                        }
                      />
                    </div>

                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "3px", padding: "1px 4px", marginTop: "3px" }}>
                      Mule Typology: 06/100 · Bona-Fide Merchant (Counter-Evidence: Active GSTIN)
                    </div>
                  </div>

                  {/* Node 4: Noida Sec 18 ATM */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Building size={12} color="#64748B" />
                        <span style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Terminal Sink</span>
                      </div>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Noida Sec 18 ATM DL-049</div>
                    <div style={{ fontSize: "10.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#64748B" : "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Dispensed: ₹1,20,000 (Cash Out)
                    </div>
                  </div>
                </div>
              </div>

              {/* Dinic Min-Cut Freeze Budget Controller & Real-Time Reachability Cut Matrix */}
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: engineState.minCut.isFreezeComplete ? "#ECFDF5" : "#FFFBEB",
                  border: engineState.minCut.isFreezeComplete ? "1px solid #A7F3D0" : "1px solid #FDE68A",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                {/* Top Bar: Title, Badge, K Chips */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sliders size={14} color="#4F46E5" />
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A" }}>
                      Dinic Min-Cut Freeze Budget Optimizer (Budget K = {freezeBudgetK} Accounts)
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        background: engineState.minCut.isFreezeComplete ? "#D1FAE5" : "#FEE2E2",
                        color: engineState.minCut.isFreezeComplete ? "#047857" : "#B91C1C",
                        padding: "1.5px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {engineState.minCut.isFreezeComplete
                        ? "0 / 4 Escape Routes to Unfrozen Sinks (100% Reachability Sealed)"
                        : `${4 - freezeBudgetK} / 4 Escape Routes Open to Unfrozen Sinks`}
                    </span>
                  </div>

                  {/* Discrete K Chips 1..6 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {[1, 2, 3, 4, 5, 6].map((kVal) => (
                      <button
                        key={kVal}
                        type="button"
                        onClick={() => setFreezeBudgetK(kVal)}
                        style={{
                          padding: "2.5px 8px",
                          borderRadius: "5px",
                          fontSize: "10px",
                          fontWeight: 800,
                          cursor: "pointer",
                          border: freezeBudgetK === kVal ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                          background: freezeBudgetK === kVal ? "#4F46E5" : "#FFFFFF",
                          color: freezeBudgetK === kVal ? "#FFFFFF" : "#475569",
                          boxShadow: freezeBudgetK === kVal ? "0 2px 4px rgba(79,70,229,0.3)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        K={kVal}{kVal === 3 ? " ★" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Continuous Interactive Dinic Slider Track matching Image 5 */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", boxShadow: "0 1px 2px rgba(15,23,42,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                      K=1 (Single Lien)
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: engineState.minCut.isFreezeComplete ? "#059669" : "#D97706", fontFamily: "var(--font-mono)" }}>
                      {engineState.minCut.isFreezeComplete ? "OPTIMAL CUT: K = 3 (100% FLOW CONTAINED ✓)" : `BUDGET K = ${freezeBudgetK} (LEAK DETECTED ⚠)`}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                      K=6 (Exhaustive Freeze)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={freezeBudgetK}
                    onChange={(e) => setFreezeBudgetK(parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#4F46E5",
                      cursor: "pointer",
                      height: "6px",
                      margin: "4px 0",
                    }}
                    title="Drag to simulate Dinic Min-Cut budget threshold K across mule layers"
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    <span>Unsealed</span>
                    <span>Partial (40% Leak)</span>
                    <span style={{ color: "#4F46E5", fontWeight: 800 }}>★ Min-Cut Optimal (K=3)</span>
                    <span>Redundant</span>
                    <span>Max Lien</span>
                  </div>
                </div>

                {/* Real-Time Reachability Cut Matrix (4 Routes) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
                  }}
                >
                  <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: "8px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Route 1: Apex POS</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram → Rohit → Apex</div>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#047857", marginTop: "2px" }}>✓ §106 Specific Lien Active</div>
                  </div>
                  <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: "8px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Route 2: Noida ATM</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram → Sameer → ATM</div>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", marginTop: "2px" }}>
                      {freezeBudgetK >= 3 ? "✓ §107 Account Frozen" : "⚠ Dispensing Leak"}
                    </div>
                  </div>
                  <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: "8px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Route 3: Mule Layer 2B</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>AXIS 9140200410291</div>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", marginTop: "2px" }}>
                      {freezeBudgetK >= 3 ? "✓ Min-Cut Isolated" : "⚠ 1 Leak Route Active"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Route 4: Clean GST Capital</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>07AAACA1234F1Z8</div>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>✓ Protected Working Capital</div>
                  </div>
                </div>

                {/* Optimization Verdict Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9.5px", color: engineState.minCut.isFreezeComplete ? "#065F46" : "#92400E" }}>
                  <span><strong>Optimization Verdict:</strong> {engineState.minCut.verdictDetail}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, opacity: 0.85 }}>Algorithm: Dinic O(V²E) Min-Cut</span>
                </div>
              </div>
            </div>

            {/* MODE 1 RIGHT (4 COLUMNS): GAUGE, 3-RULE COMPARATOR & TRANSITION ACTION */}
            <div
              style={{
                gridColumn: "span 4",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 16px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Scale size={14} color="#4F46E5" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                      Recoverable Flow Containment
                    </span>
                  </div>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "3px" }}>
                    ROSCOE V. WINDER
                  </span>
                </div>

                {/* Semicircle Gauge Card */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <SemiCircleGauge
                    percentage={containmentPct}
                    label="Recoverable Flow Contained"
                    sublabel={`Dinic Budget K = ${freezeBudgetK} Accounts`}
                    summaryText={engineState.minCut.isFreezeComplete ? "✓ 100% Flow Sealed · No Outward Leakage" : "⚠ Residual Leakage to Terminal Sink"}
                    color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
                    size={175}
                  />

                  {/* Dual Outflow Metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", width: "100%", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #E2E8F0" }}>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "8px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Victim Outflow</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}><AnimatedCounter value={500000} prefix="₹" duration={280} /></div>
                    </div>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "8px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Frozen in Lien</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                        <AnimatedCounter value={500000 - engineState.minCut.residualLeakageAmount} prefix="₹" duration={280} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Accounting Rules */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px", marginTop: "8px" }}>
                  <div
                    onClick={() => setSelectedRule("LIBR")}
                    style={{
                      background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                      padding: "6px",
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

                  <div
                    onClick={() => setSelectedRule("FIFO")}
                    style={{
                      background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                      padding: "6px",
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

                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                      padding: "6px",
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

                <div style={{ fontSize: "9.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 7px", borderRadius: "5px", marginTop: "4px" }}>
                  <strong>Selected Accounting Rule:</strong> {selectedRule} · Recoverable: <strong>₹{ruleRecoverableAmount.toLocaleString("en-IN")}</strong>
                </div>

                {/* Judicial Precedent & Statutory Lien Anchor Card */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Judicial Precedent & Lien Anchor
                    </span>
                    <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "0.5px 4px", borderRadius: "3px" }}>
                      BNSS §106 / §107
                    </span>
                  </div>
                  <div style={{ fontSize: "9px", color: "#475569", lineHeight: 1.35 }}>
                    <strong>Lowest Intermediate Balance Rule (LIBR):</strong> Originating in <em>Roscoe v. Winder [1915]</em>, equity presumes tainted outflows are spent first, capping lien recovery strictly at the lowest trough balance before subsequent bona-fide commercial deposits.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #CBD5E1", paddingTop: "4px", marginTop: "2px", fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    <span>PROOF REF: LIBR-2026-HC</span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>✓ ZERO INNOCENT DILUTION</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Transition to Legal Orders */}
              <button
                type="button"
                onClick={() => setActiveWorkspaceMode("orders")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "9px 12px",
                  borderRadius: "7px",
                  border: "1px solid #4F46E5",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
                }}
              >
                <span>⚖️ Open MHA SOP & BNSS Order Generator</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODE 2: MHA 2026 SOP CLOCK & BNSS STATUTORY ORDERS
            ===================================================================== */}
        {activeWorkspaceMode === "orders" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "12px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* MODE 2 LEFT (5 COLUMNS): MHA SOP STEPPER & 2-TIER ESCALATION GUIDE */}
            <div
              style={{
                gridColumn: "span 5",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={15} color="#4F46E5" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                      MHA SOP 02.01.2026 Compliance Stepper
                    </span>
                  </div>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "3px" }}>
                    GOLDEN HOUR ACTIVE
                  </span>
                </div>

                {/* 4 Steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div style={{ padding: "7px 10px", borderRadius: "6px", background: "#ECFDF5", border: "1px solid #A7F3D0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={13} color="#059669" />
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#065F46" }}>Step 1: 24h § 106(3) Magistrate Intimation</div>
                        <div style={{ fontSize: "9px", color: "#64748B" }}>Reported to CJM Gautam Buddha Nagar</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#D1FAE5", color: "#047857", padding: "1px 5px", borderRadius: "3px" }}>COMPLETED ✓</span>
                  </div>

                  <div style={{ padding: "7px 10px", borderRadius: "6px", background: "#EEF2FF", border: "1px solid #C7D2FE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={13} color="#4F46E5" />
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#1E1B4B" }}>Step 2: 7-Day Account Holder Notice</div>
                        <div style={{ fontSize: "9px", color: "#64748B" }}>Served to Nodal Officer ICICI Bank (Remaining: 4d 18h)</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#E0E7FF", color: "#4338CA", padding: "1px 5px", borderRadius: "3px" }}>IN PROGRESS</span>
                  </div>

                  <div style={{ padding: "7px 10px", borderRadius: "6px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.85 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={13} color="#94A3B8" />
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>Step 3: 15-Day Appearance Window</div>
                        <div style={{ fontSize: "9px", color: "#64748B" }}>Opportunity to show cause under § 107(2) BNSS</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "8.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "1px 5px", borderRadius: "3px" }}>PENDING</span>
                  </div>

                  <div style={{ padding: "7px 10px", borderRadius: "6px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Scale size={13} color="#94A3B8" />
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>Step 4: 90-Day § 107 Restoration Order</div>
                        <div style={{ fontSize: "9px", color: "#64748B" }}>Decree for victim restitution without waiting for trial</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "8.5px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "1px 5px", borderRadius: "3px" }}>SCHEDULED</span>
                  </div>
                </div>
              </div>

              {/* 2-Tier Statutory Escalation Card */}
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
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                  2-Tier Statutory Escalation Rule Guide
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.4 }}>
                  <strong>Tier 0 (§ 106(3) BNSS):</strong> Emergency administrative debit freeze. Valid for 24 hours until written intimation is submitted to Judicial Magistrate.<br />
                  <strong>Tier 1 (§ 107 BNSS):</strong> Formal judicial attachment & victim restoration decree issued by Sessions Court to convert administrative lien into permanent restitution.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveWorkspaceMode("dag")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#475569",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={12} />
                <span>← Back to Interactive Taint DAG</span>
              </button>
            </div>

            {/* MODE 2 RIGHT (7 COLUMNS): EXECUTIVE-SIZED COURT LETTERHEAD DOCUMENT PREVIEW */}
            <div
              style={{
                gridColumn: "span 7",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {/* Header with Switcher & Action Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedNoticeType("106")}
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "4px 9px",
                      borderRadius: "5px",
                      border: selectedNoticeType === "106" ? "1.5px solid #059669" : "1px solid #CBD5E1",
                      background: selectedNoticeType === "106" ? "#ECFDF5" : "#F8FAFC",
                      color: selectedNoticeType === "106" ? "#047857" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    § 106(1) Specific Lien Notice (Merchant Safe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNoticeType("107")}
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "4px 9px",
                      borderRadius: "5px",
                      border: selectedNoticeType === "107" ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                      background: selectedNoticeType === "107" ? "#EEF2FF" : "#F8FAFC",
                      color: selectedNoticeType === "107" ? "#4338CA" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    § 107 Attachment Order (Mule Conduit)
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handlePrintOrder}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={11} />
                    <span>Print Order</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyNotice}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "4px 10px",
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
              </div>

              {/* Court Document Letterhead Box */}
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: "220px",
                  background: "#FCFDFE",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  lineHeight: 1.5,
                  color: "#0F172A",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  boxSizing: "border-box",
                }}
              >
                {activeDraft.draftText}
              </div>

              {/* Footer Meta */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#64748B", borderTop: "1px solid #E2E8F0", paddingTop: "6px" }}>
                <span>Target: <strong>ICICI Bank (001405008129)</strong></span>
                <span>Statutory Compliance Deadline: <strong>{activeDraft.statutoryDeadlineHours} Hours</strong></span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const TaintLienEngineScreen = TaintEngineScreen;

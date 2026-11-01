import os

code = r'''import React, { useState, useMemo } from "react";
import {
  GitFork,
  Scale,
  Lock,
  Copy,
  Check,
  Sliders,
  DollarSign,
  Clock,
  ShieldCheck,
  Building,
  Printer,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  TimelineStrip,
} from "../../components/tarka/kit";
import { AnimatedCounter } from "../../components/ui/forensic-infographics";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";
type TaintWorkspaceMode = "dag" | "orders";
type FlowViewType = "sankey" | "dag";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  // Active 2-Mode Workspace (Default: Mode 1 Interactive Taint DAG)
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<TaintWorkspaceMode>("dag");
  const [flowViewType, setFlowViewType] = useState<FlowViewType>("sankey");

  // 1. Accounting Rule Selection
  const [selectedRule, setSelectedRule] = useState<TaintRule>("LIBR");

  // 2. Freeze Budget K Slider (1 to 6 accounts, default optimal K=3)
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);

  // 3. Clean Commercial Deposit Injection
  const isInjectClean = !!mutations.injectMerchantCleanDeposit;

  // 4. Compute Engine State
  const engineState = useMemo(() => {
    return computeTaintEngine(isInjectClean, freezeBudgetK);
  }, [isInjectClean, freezeBudgetK]);

  // Derived recovery math:
  // Gross loss: 5,00,000. Noida ATM DL-049 dispensed 1,20,000 cash (irrecoverable).
  // Retained in L2 Mules (Rohit 1.20L + Sameer 0.80L) = 2,00,000 (Section 107 hold).
  // Forwarded to Bona-Fide Merchant (Apex Electronics) = 1,80,000 (Section 106 specific lien).
  // Net Recoverable Sum = 2,00,000 + 1,80,000 = 3,80,000 (76.0% of stolen capital).
  const netRecoverable = 380000; // Truthful derived recovery potential

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

  return (
    <div
      className={`tarka-taint-root ${isCompact ? "tarka-density-compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: isCompact ? "6px 12px 10px 12px" : "8px 16px 12px 16px",
        gap: isCompact ? "6px" : "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      {/* STORY BANNER */}
      <StoryBanner
        screenId="taint"
        takeaway="Dinic Min-Cut freezes K=3 accounts isolating 100% of outward flow; LIBR doctrine secures ₹3,80,000 recoverable capital while shielding ₹2.50L innocent commercial revenue."
        evidenceChips={[
          { tier: "T1", label: "ICICI Finacle CBS", hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
          { tier: "T1", label: "SBI Switch RRN", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
          { tier: "T2", label: "GSTIN 07AAACA1234F1Z8", hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a" },
        ]}
      />

      {/* KPI ROW: 4 TILES WITH UNTRUNCATED LABELS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: isCompact ? "6px" : "10px",
          flexShrink: 0,
        }}
      >
        <KpiTile
          title="Victim loss"
          value="₹5,00,000"
          icon={DollarSign}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "T+0 DEBIT", variant: "rose" }}
          subtitle="09:30:15 IST · SBI Core Banking"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Total fraudulent debit from complainant Sunil Kumar (SBI A/c 30910029101)."
        />

        <KpiTile
          title="Recoverable (LIBR)"
          value="₹3,80,000"
          icon={Scale}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "HC PRECEDENT", variant: "emerald" }}
          subtitle="76.0% Max Recoverable (₹1.2L Cashed Out)"
          microVisual="ring"
          progressPct={76}
          provenanceTooltip="Judicial Lowest Intermediate Balance Rule (LIBR) caps lien at ₹3.80L after deducting ₹1.20L irreversible ATM cashout."
        />

        <KpiTile
          title="Min-cut freeze"
          value="K = 3 Accounts"
          icon={Lock}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "100% SEALED", variant: "indigo" }}
          subtitle="Dinic Min-Cut SAT · 0 Open Exits"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Dinic max-flow/min-cut theorem isolates all outward cashout sinks using optimal budget K=3 accounts."
        />

        <KpiTile
          title="Innocent capital protected"
          value={isInjectClean ? "₹2,50,000" : "₹0 (Clean Inflow)"}
          icon={ShieldCheck}
          iconColor="#0284C7"
          iconBg="#F0F9FF"
          statusBadge={{ text: isInjectClean ? "GST SHIELD ACTIVE" : "§106 LIEN ONLY", variant: isInjectClean ? "emerald" : "indigo" }}
          subtitle="Apex Electronics Pvt Ltd (Bona-Fide POS)"
          microVisual="ring"
          progressPct={isInjectClean ? 100 : 0}
          provenanceTooltip="Section 106 specific lien attaches only to ₹1.80L tainted inflow, shielding innocent working capital."
        />
      </div>

      {/* MAIN STAGE */}
      {activeWorkspaceMode === "orders" ? (
        /* =========================================================================
           MODE 2: MHA 2026 SOP CLOCK & BNSS STATUTORY ORDERS VIEW
           ========================================================================= */
        <main
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {/* LEFT 7 COLS: STATUTORY NOTICE DRAFTER */}
          <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="MHA 2026 SOP Statutory Order Drafter"
              subtitle="Dual-track statutory notices for specific debit liens (§106) vs full mule account attachment (§107)."
              icon={Building}
              iconColor="#4F46E5"
              badgeText="BNSS READY"
              badgeVariant="indigo"
              actionSlot={
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceMode("dag")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                  }}
                >
                  <ArrowLeft size={12} /> Back to Taint DAG
                </button>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
                {/* Notice Tabs */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedNoticeType("106")}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: selectedNoticeType === "106" ? "2px solid #0284C7" : "1px solid #E2E8F0",
                      background: selectedNoticeType === "106" ? "#F0F9FF" : "#FFFFFF",
                      color: selectedNoticeType === "106" ? "#0369A1" : "#64748B",
                      fontWeight: 700,
                      fontSize: "11px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    § 106(1) BNSS Specific Lien Order
                    <span style={{ display: "block", fontSize: "9px", fontWeight: 500, color: "#64748B" }}>
                      Target: Apex Electronics ICICI · ₹1,80,000 Specific Lien
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedNoticeType("107")}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: selectedNoticeType === "107" ? "2px solid #B45309" : "1px solid #E2E8F0",
                      background: selectedNoticeType === "107" ? "#FFFBEB" : "#FFFFFF",
                      color: selectedNoticeType === "107" ? "#B45309" : "#64748B",
                      fontWeight: 700,
                      fontSize: "11px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    § 107(1) BNSS Judicial Attachment
                    <span style={{ display: "block", fontSize: "9px", fontWeight: 500, color: "#64748B" }}>
                      Target: Rohit & Sameer Mule Accounts · ₹2,00,000 Complete Freeze
                    </span>
                  </button>
                </div>

                {/* Draft Text Preview */}
                <div
                  style={{
                    flex: "1 1 0%",
                    minHeight: 0,
                    overflowY: "auto",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "10px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "10.5px",
                    lineHeight: "1.45",
                    whiteSpace: "pre-wrap",
                    color: "#0F172A",
                  }}
                >
                  {activeDraft.draftText}
                </div>

                {/* Action Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>
                    Statutory Compliance Window: <strong>{activeDraft.statutoryDeadlineHours} Hours</strong> from receipt
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handlePrintOrder}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <Printer size={12} /> Print Order
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyNotice}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        border: "none",
                        background: "#4F46E5",
                        color: "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? "Copied!" : "Copy Order Draft"}
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT 5 COLS: MHA 2026 SOP STATUTORY TIMELINE */}
          <div style={{ gridColumn: "span 5", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="MHA 2026 Golden Hour SOP Schedule"
              subtitle="Statutory timelines binding Nodal Bank Officers under Sections 106 & 107 BNSS."
              icon={Clock}
              iconColor="#059669"
              badgeText="MHA COMPLIANT"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
                <TimelineStrip
                  milestones={[
                    { label: "24h §106(3) Debit Freeze", time: "T+2.5h", status: "verified" },
                    { label: "7d Specific Lien Notice", time: "T+7d", isCurrent: true },
                    { label: "15d Judicial Summons", time: "T+15d", status: "pending" },
                    { label: "90d §497/503 Restoration", time: "T+90d", status: "pending" },
                  ]}
                />

                <div style={{ background: "#F1F5F9", borderRadius: "6px", padding: "10px", fontSize: "11px", color: "#334155" }}>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                    Supreme Court / High Court Guidance:
                  </div>
                  "A blanket freeze on bona fide commercial accounts disrupts legitimate trade. Police authorities are mandated to place a specific lien strictly limited to fraudulent proceeds under § 106 BNSS, permitting unhindered operation of bona fide working capital."
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid #E2E8F0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>
                    Nodal Bank Acknowledgement Ref: <strong>RBI/DPSS/2026/914</strong>
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669" }}>
                    LEGAL ACTION READY ✓
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
        </main>
      ) : (
        /* =========================================================================
           MODE 1: HERO DATA-VISUALIZATION (8 COLS) + SUPPORT RECOVERY PANEL (4 COLS)
           ========================================================================= */
        <main
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {/* =====================================================================
              LEFT HERO CARD (8 COLUMNS): MONEY FLOW SANKEY / TIME-EXPANDED DAG
              ===================================================================== */}
          <div style={{ gridColumn: "span 8", height: "100%", minHeight: 0 }}>
            <SectionCard
              title={flowViewType === "sankey" ? "Proportional Money Flow Sankey & Lien Boundaries" : "Connected Time-Expanded DAG Money Trail"}
              subtitle={
                flowViewType === "sankey"
                  ? "Width of every flow ribbon is proportional to rupee amount. Visualizes §107 complete freezes vs §106 specific liens."
                  : "Tracks provenance across mule layers with mathematical zero-cycle assurance while shielding innocent commercial capital."
              }
              icon={flowViewType === "sankey" ? Waves : GitFork}
              iconColor="#4F46E5"
              badgeText={engineState.minCut.isFreezeComplete ? "ZERO CYCLES · SAT" : "LEAKAGE DETECTED"}
              badgeVariant={engineState.minCut.isFreezeComplete ? "emerald" : "rose"}
              provenanceTooltip="Deterministic DAG synthesized from Finacle transaction logs, NPCI switch settlement, and ICICI merchant statements."
              actionSlot={
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* View Switcher: Sankey vs DAG */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "#F1F5F9", padding: "2px", borderRadius: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setFlowViewType("sankey")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                        background: flowViewType === "sankey" ? "#FFFFFF" : "transparent",
                        color: flowViewType === "sankey" ? "#4F46E5" : "#64748B",
                        boxShadow: flowViewType === "sankey" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      🌊 Money Flow Sankey
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlowViewType("dag")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                        background: flowViewType === "dag" ? "#FFFFFF" : "transparent",
                        color: flowViewType === "dag" ? "#4F46E5" : "#64748B",
                        boxShadow: flowViewType === "dag" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      🕸️ Time-Expanded DAG
                    </button>
                  </div>

                  {/* Clean Deposit Mutator Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleMutation("injectMerchantCleanDeposit")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: isInjectClean ? "1px solid #10B981" : "1px solid #CBD5E1",
                      background: isInjectClean ? "#ECFDF5" : "#FFFFFF",
                      color: isInjectClean ? "#047857" : "#475569",
                    }}
                    title="Simulate Apex Electronics receiving ₹2.5L clean commercial deposit to test LIBR protection"
                  >
                    <Sparkles size={11} color={isInjectClean ? "#059669" : "#64748B"} />
                    {isInjectClean ? "Clean Deposit Injected (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}
                  </button>
                </div>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
                {/* HERO CANVAS VIEWPORT */}
                <div
                  style={{
                    flex: "1 1 0%",
                    minHeight: 0,
                    position: "relative",
                    background: "#FAFCFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  {flowViewType === "sankey" ? (
                    /* =============================================================
                       HERO DATA-VISUALIZATION: PROPORTIONAL MONEY FLOW SANKEY
                       ============================================================= */
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      <svg
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "absolute",
                          inset: 0,
                        }}
                        viewBox="0 0 880 340"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <defs>
                          {/* Gradient: Sunil -> Vikram (Full 5.0L) */}
                          <linearGradient id="flow-sunil-vikram" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#E11D48" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#D97706" stopOpacity="0.45" />
                          </linearGradient>

                          {/* Gradient: Vikram -> Rohit (3.0L / 60%) */}
                          <linearGradient id="flow-vikram-rohit" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D97706" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#B45309" stopOpacity="0.45" />
                          </linearGradient>

                          {/* Gradient: Vikram -> Sameer (2.0L / 40%) */}
                          <linearGradient id="flow-vikram-sameer" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D97706" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#B45309" stopOpacity="0.45" />
                          </linearGradient>

                          {/* Gradient: Rohit -> Apex (1.80L Lien) */}
                          <linearGradient id="flow-rohit-apex" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.5" />
                          </linearGradient>

                          {/* Gradient: Rohit -> Retained (1.20L Hold) */}
                          <linearGradient id="flow-rohit-hold" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
                          </linearGradient>

                          {/* Gradient: Sameer -> ATM (1.20L Cashout Sink) */}
                          <linearGradient id="flow-sameer-atm" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#E11D48" stopOpacity="0.6" />
                          </linearGradient>

                          {/* Gradient: Sameer -> Retained (80K Hold) */}
                          <linearGradient id="flow-sameer-hold" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
                          </linearGradient>

                          {/* Clean Inbound Revenue Stream */}
                          <linearGradient id="flow-clean-inflow" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
                          </linearGradient>
                        </defs>

                        {/* ================= FLOW RIBBONS ================= */}
                        {/* 1. Sunil (x:150) -> Vikram (x:270) : 5.0L (h: 36) */}
                        <path
                          d="M 150 142 C 200 142, 220 142, 270 142 L 270 178 C 220 178, 200 178, 150 178 Z"
                          fill="url(#flow-sunil-vikram)"
                        />
                        <text x="210" y="156" fill="#991B1B" fontSize="9" fontWeight="800" textAnchor="middle">
                          ₹5.00L OUTFLOW (100%)
                        </text>

                        {/* 2. Vikram (x:370) -> Rohit (x:490, y:90) : 3.0L / 60% (h: 24) */}
                        <path
                          d="M 370 145 C 420 145, 440 95, 490 95 L 490 121 C 440 121, 420 167, 370 167 Z"
                          fill="url(#flow-vikram-rohit)"
                        />
                        <text x="430" y="125" fill="#B45309" fontSize="8.5" fontWeight="700" textAnchor="middle">
                          ₹3.00L (60%)
                        </text>

                        {/* 3. Vikram (x:370) -> Sameer (x:490, y:230) : 2.0L / 40% (h: 16) */}
                        <path
                          d="M 370 167 C 420 167, 440 235, 490 235 L 490 253 C 440 253, 420 177, 370 177 Z"
                          fill="url(#flow-vikram-sameer)"
                        />
                        <text x="430" y="215" fill="#B45309" fontSize="8.5" fontWeight="700" textAnchor="middle">
                          ₹2.00L (40%)
                        </text>

                        {/* 4. Rohit (x:590) -> Apex Electronics (x:710, y:60) : 1.80L (h: 15) */}
                        <path
                          d="M 590 97 C 640 97, 660 62, 710 62 L 710 78 C 660 78, 640 111, 590 111 Z"
                          fill="url(#flow-rohit-apex)"
                        />
                        <text x="650" y="80" fill="#0369A1" fontSize="8" fontWeight="700" textAnchor="middle">
                          ₹1.80L POS Lien
                        </text>

                        {/* 5. Rohit (x:590) -> Rohit Retained (x:710, y:125) : 1.20L (h: 10) */}
                        <path
                          d="M 590 111 C 640 111, 660 128, 710 128 L 710 138 C 660 138, 640 121, 590 121 Z"
                          fill="url(#flow-rohit-hold)"
                        />
                        <text x="650" y="130" fill="#B45309" fontSize="7.5" fontWeight="700" textAnchor="middle">
                          ₹1.20L Hold
                        </text>

                        {/* 6. Sameer (x:590) -> ATM Noida (x:710, y:215) : 1.20L (h: 10) */}
                        <path
                          d="M 590 237 C 640 237, 660 218, 710 218 L 710 228 C 660 228, 640 245, 590 245 Z"
                          fill="url(#flow-sameer-atm)"
                        />
                        <text x="650" y="222" fill="#E11D48" fontSize="8" fontWeight="800" textAnchor="middle">
                          ₹1.20L Cash Out
                        </text>

                        {/* 7. Sameer (x:590) -> Sameer Retained (x:710, y:280) : 80K (h: 8) */}
                        <path
                          d="M 590 245 C 640 245, 660 282, 710 282 L 710 290 C 660 290, 640 253, 590 253 Z"
                          fill="url(#flow-sameer-hold)"
                        />
                        <text x="650" y="275" fill="#B45309" fontSize="7.5" fontWeight="700" textAnchor="middle">
                          ₹80K Hold
                        </text>

                        {/* 8. INBOUND CLEAN STREAM (When Injected) */}
                        {isInjectClean && (
                          <g>
                            <path
                              d="M 560 12 C 620 12, 650 48, 710 48 L 710 58 C 650 58, 620 22, 560 22 Z"
                              fill="url(#flow-clean-inflow)"
                            />
                            <text x="625" y="24" fill="#047857" fontSize="8" fontWeight="800" textAnchor="middle">
                              +₹2.50L CLEAN POS INFLOW (BYPASSES LIEN) 🛡️
                            </text>
                          </g>
                        )}

                        {/* ================= DINIC MIN-CUT SCISSORS CUT MARKERS ================= */}
                        {freezeBudgetK >= 3 && (
                          <g>
                            {/* Cut 1: Rohit Verma */}
                            <circle cx="490" cy="108" r="10" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="1.5" />
                            <text x="490" y="112" fill="#4F46E5" fontSize="11" fontWeight="bold" textAnchor="middle">✂</text>

                            {/* Cut 2: Sameer Khan */}
                            <circle cx="490" cy="244" r="10" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="1.5" />
                            <text x="490" y="248" fill="#4F46E5" fontSize="11" fontWeight="bold" textAnchor="middle">✂</text>

                            {/* Cut 3: Apex Electronics */}
                            <circle cx="710" cy="70" r="10" fill="#0284C7" fillOpacity="0.15" stroke="#0284C7" strokeWidth="1.5" />
                            <text x="710" y="74" fill="#0284C7" fontSize="11" fontWeight="bold" textAnchor="middle">✂</text>

                            {/* Label */}
                            <rect x="425" y="280" width="130" height="18" rx="4" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
                            <text x="490" y="292" fill="#4338CA" fontSize="8" fontWeight="800" textAnchor="middle">
                              ✂ DINIC MIN-CUT K=3 SEALED
                            </text>
                          </g>
                        )}
                      </svg>

                      {/* ================= INTERACTIVE NODE CARDS ON CANVAS ================= */}
                      {/* Node 1: Victim Origin */}
                      <div
                        style={{
                          position: "absolute",
                          left: "20px",
                          top: "135px",
                          width: "130px",
                          background: "#FFFFFF",
                          border: "1px solid #FECDD3",
                          borderLeft: "4px solid #E11D48",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ fontSize: "8px", fontWeight: 800, color: "#E11D48", textTransform: "uppercase" }}>
                          VICTIM ORIGIN
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
                          Sunil Kumar
                        </div>
                        <div style={{ fontSize: "9px", color: "#64748B" }}>SBI · 30910029101</div>
                        <div style={{ fontSize: "10px", fontWeight: 800, color: "#E11D48", marginTop: "2px" }}>
                          −₹5,00,000.00
                        </div>
                      </div>

                      {/* Node 2: Layer-1 Conduit */}
                      <div
                        style={{
                          position: "absolute",
                          left: "270px",
                          top: "135px",
                          width: "100px",
                          background: "#FFFFFF",
                          border: "1px solid #FDE68A",
                          borderLeft: "4px solid #D97706",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 800, color: "#D97706" }}>MULE L1</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, padding: "1px 3px", borderRadius: "3px", background: "#FEF3C7", color: "#B45309" }}>§107</span>
                        </div>
                        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
                          Vikram Shah
                        </div>
                        <div style={{ fontSize: "8.5px", color: "#64748B" }}>Dwell: 112s (Pass)</div>
                        <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#B45309", marginTop: "2px" }}>
                          Inflow: ₹5.00L
                        </div>
                      </div>

                      {/* Node 3A: Rohit Verma */}
                      <div
                        style={{
                          position: "absolute",
                          left: "490px",
                          top: "70px",
                          width: "100px",
                          background: "#FFFFFF",
                          border: "1px solid #FDE68A",
                          borderLeft: "4px solid #B45309",
                          borderRadius: "6px",
                          padding: "5px 7px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 800, color: "#B45309" }}>L2A SPLIT</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, padding: "1px 3px", borderRadius: "3px", background: "#FEF3C7", color: "#B45309" }}>§107</span>
                        </div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A" }}>Rohit Verma</div>
                        <div style={{ fontSize: "8px", color: "#64748B" }}>HDFC · ₹3.00L</div>
                        <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#047857" }}>Forward: ₹1.8L</div>
                      </div>

                      {/* Node 3B: Sameer Khan */}
                      <div
                        style={{
                          position: "absolute",
                          left: "490px",
                          top: "215px",
                          width: "100px",
                          background: "#FFFFFF",
                          border: "1px solid #FDE68A",
                          borderLeft: "4px solid #B45309",
                          borderRadius: "6px",
                          padding: "5px 7px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 800, color: "#B45309" }}>L2B SPLIT</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, padding: "1px 3px", borderRadius: "3px", background: "#FEF3C7", color: "#B45309" }}>§107</span>
                        </div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A" }}>Sameer Khan</div>
                        <div style={{ fontSize: "8px", color: "#64748B" }}>Axis · ₹2.00L</div>
                        <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#E11D48" }}>Cashout: ₹1.2L</div>
                      </div>

                      {/* Node 4A: Apex Electronics (Merchant) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "710px",
                          top: "40px",
                          width: "155px",
                          background: "#FFFFFF",
                          border: "1px solid #BAE6FD",
                          borderLeft: "4px solid #0284C7",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 800, color: "#0369A1" }}>BONA-FIDE MERCHANT</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, padding: "1px 3px", borderRadius: "3px", background: "#E0F2FE", color: "#0284C7" }}>§106 LIEN</span>
                        </div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A" }}>Apex Electronics Pvt Ltd</div>
                        <div style={{ fontSize: "8px", color: "#64748B" }}>GSTIN: 07AAACA1234F1Z8</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#0284C7" }}>Lien: ₹1,80,000</span>
                          {isInjectClean && (
                            <span style={{ fontSize: "8px", fontWeight: 800, color: "#059669" }}>+₹2.5L Clean ✓</span>
                          )}
                        </div>
                      </div>

                      {/* Node 4B: Rohit Retained Hold */}
                      <div
                        style={{
                          position: "absolute",
                          left: "710px",
                          top: "120px",
                          width: "155px",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderLeft: "4px solid #D97706",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 700, color: "#64748B" }}>ROHIT HDFC RESIDUAL</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, color: "#B45309" }}>§107 ATTACH</span>
                        </div>
                        <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#B45309" }}>₹1,20,000.00 Retained & Frozen</div>
                      </div>

                      {/* Node 4C: Terminal Cashout Sink (Noida ATM) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "710px",
                          top: "205px",
                          width: "155px",
                          background: "#FFF1F2",
                          border: "1px solid #FECDD3",
                          borderLeft: "4px solid #E11D48",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 800, color: "#E11D48" }}>TERMINAL CASHOUT SINK</span>
                          <span style={{ fontSize: "7px", fontWeight: 800, padding: "1px 3px", borderRadius: "3px", background: "#FFE4E6", color: "#E11D48" }}>SEALED EXIT</span>
                        </div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#991B1B" }}>Noida Sec 18 ATM DL-049</div>
                        <div style={{ fontSize: "9px", fontWeight: 800, color: "#E11D48" }}>Dispensed: ₹1,20,000 (Irrecoverable)</div>
                      </div>

                      {/* Node 4D: Sameer Retained Hold */}
                      <div
                        style={{
                          position: "absolute",
                          left: "710px",
                          top: "270px",
                          width: "155px",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderLeft: "4px solid #D97706",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", fontWeight: 700, color: "#64748B" }}>SAMEER AXIS RESIDUAL</span>
                          <span style={{ fontSize: "7px", fontWeight: 700, color: "#B45309" }}>§107 ATTACH</span>
                        </div>
                        <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#B45309" }}>₹80,000.00 Retained & Frozen</div>
                      </div>
                    </div>
                  ) : (
                    /* =============================================================
                       TIME-EXPANDED DAG VIEW
                       ============================================================= */
                    <div style={{ padding: "12px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {/* Layer 0 & 1 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 0 & 1 · Fraud Inception
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FECDD3", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#E11D48" }}>VICTIM · 09:30:15 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Sunil Kumar</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 30910029101</div>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#E11D48" }}>-₹5,00,000.00</div>
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#D97706" }}>MULE L1 · 09:34:58 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Vikram Shah</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 41088291083 · Dwell: 112s</div>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#B45309" }}>Inflow: ₹5,00,000</div>
                          </div>
                        </div>

                        {/* Layer 2 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 2 · Split Conduits
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#B45309" }}>MULE L2A · 09:38:20 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Rohit Verma</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>HDFC 5010029419920</div>
                            <div style={{ fontSize: "9px", color: "#0F172A" }}>Inflow: ₹3.00L | Retained: ₹1.20L</div>
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#B45309" }}>MULE L2B · 09:41:05 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Sameer Khan</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>AXIS 9140200410291</div>
                            <div style={{ fontSize: "9px", color: "#0F172A" }}>Inflow: ₹2.00L | Retained: ₹80,000</div>
                          </div>
                        </div>

                        {/* Layer 3 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 3 · Sinks & Liens
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #BAE6FD", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#0284C7" }}>MERCHANT · §106 LIEN ONLY</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Apex Electronics Pvt Ltd</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>GST: 07AAACA1234F1Z8</div>
                            <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0284C7" }}>Specific Lien: ₹1,80,000</div>
                          </div>
                          <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#E11D48" }}>ATM SINK · 09:44:00 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#991B1B" }}>Noida Sec 18 ATM DL-049</div>
                            <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#E11D48" }}>Cash Out: ₹1,20,000</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DOCKED BOTTOM CONTROL: DINIC MIN-CUT FREEZE BUDGET */}
                <div
                  style={{
                    marginTop: "8px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sliders size={13} color="#4F46E5" />
                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                        Dinic Min-Cut Freeze Budget (Budget K = {freezeBudgetK} Accounts)
                      </div>
                      <div style={{ fontSize: "9px", color: "#64748B" }}>
                        {engineState.minCut.isFreezeComplete
                          ? "Open Escape Routes to Unfrozen Sinks: 0 / 4 (100% Reachability Sealed ✓)"
                          : `Residual Outward Leakage: ₹${(engineState.minCut.residualLeakageAmount).toLocaleString()} / ₹5,00,000`}
                      </div>
                    </div>
                  </div>

                  {/* K Button Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFreezeBudgetK(k)}
                        style={{
                          width: "26px",
                          height: "22px",
                          borderRadius: "4px",
                          border: freezeBudgetK === k ? "2px solid #4F46E5" : "1px solid #CBD5E1",
                          background: freezeBudgetK === k ? "#4F46E5" : "#FFFFFF",
                          color: freezeBudgetK === k ? "#FFFFFF" : "#475569",
                          fontSize: "10px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {k === 3 ? "★3" : k}
                      </button>
                    ))}
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", marginLeft: "4px" }}>
                      {freezeBudgetK === 3 ? "(OPTIMAL CUT)" : freezeBudgetK > 3 ? "(EXHAUSTIVE)" : "(LEAKING)"}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* =====================================================================
              RIGHT SUPPORT PANEL (4 COLUMNS): RECOVERY WATERFALL + 3-RULE COMPARISON
              ===================================================================== */}
          <div
            style={{
              gridColumn: "span 4",
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflow: "hidden",
            }}
          >
            {/* CARD 1: DUAL CONTAINMENT & RECOVERY WATERFALL */}
            <SectionCard
              title="Dual Containment & Recovery Waterfall"
              subtitle="Measures outward graph leakage and net recoverable funds after irreversible cashouts."
              icon={Scale}
              iconColor="#059669"
              badgeText="ROSCOE V. WINDER"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
                {/* Metric Summary Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#166534" }}>FLOW CONTAINMENT</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#15803D" }}>
                      <AnimatedCounter value={containmentPct} suffix="%" />
                    </div>
                    <div style={{ fontSize: "8px", color: "#166534" }}>
                      {engineState.minCut.isFreezeComplete ? "0 Open Escape Routes ✓" : "Outward Leakage"}
                    </div>
                  </div>

                  <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#0369A1" }}>NET RECOVERABLE</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#0284C7" }}>
                      <AnimatedCounter value={netRecoverable} prefix="₹" />
                    </div>
                    <div style={{ fontSize: "8px", color: "#0369A1" }}>76.0% Held under Liens</div>
                  </div>
                </div>

                {/* Horizontal Recovery Waterfall */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Rupee Recovery Waterfall:
                  </div>
                  <div style={{ display: "flex", height: "14px", borderRadius: "3px", overflow: "hidden", gap: "1px" }}>
                    {/* Cashed Out: 24% */}
                    <div style={{ width: "24%", background: "#F43F5E" }} title="ATM Cashout: ₹1,20,000 (Irrecoverable)" />
                    {/* Mule Retained: 40% */}
                    <div style={{ width: "40%", background: "#F59E0B" }} title="Mule §107 Hold: ₹2,00,000 (Frozen)" />
                    {/* Merchant Lien: 36% */}
                    <div style={{ width: "36%", background: "#0284C7" }} title="Merchant §106 Lien: ₹1,80,000 (Specific)" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "8px", color: "#64748B" }}>
                    <span style={{ color: "#E11D48", fontWeight: 700 }}>−₹1.2L Cashout (24%)</span>
                    <span style={{ color: "#B45309", fontWeight: 700 }}>₹2.0L Mule Hold (40%)</span>
                    <span style={{ color: "#0284C7", fontWeight: 700 }}>₹1.8L §106 Lien (36%)</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* CARD 2: SHARED-AXIS 3-RULE COMPARISON */}
            <SectionCard
              title="3-Rule Shared-Axis Accounting Comparison"
              subtitle="LIBR vs FIFO vs Pro-Rata plotted on a single ₹0 to ₹5.0L rupee axis."
              icon={Sliders}
              iconColor="#4F46E5"
              badgeText="CAPITAL SHIELD"
              badgeVariant="indigo"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px", justifyContent: "center" }}>
                {/* 3 Bars on Shared Axis */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* LIBR */}
                  <div
                    onClick={() => setSelectedRule("LIBR")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "LIBR" ? "#ECFDF5" : "transparent",
                      border: selectedRule === "LIBR" ? "1px solid #A7F3D0" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#047857" }}>LIBR (Lowest Intermediate Balance) ★</span>
                      <span style={{ color: "#047857" }}>₹3,80,000 (Clean Capital 100% Saved)</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: "76%", height: "100%", background: "#10B981", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* FIFO */}
                  <div
                    onClick={() => setSelectedRule("FIFO")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "FIFO" ? "#EEF2FF" : "transparent",
                      border: selectedRule === "FIFO" ? "1px solid #C7D2FE" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#4338CA" }}>FIFO (First In, First Out)</span>
                      <span style={{ color: "#4338CA" }}>₹2,00,000 (Withdrawals Deplete Taint)</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: "40%", height: "100%", background: "#6366F1", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* Pro-Rata */}
                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "transparent",
                      border: selectedRule === "PRO_RATA" ? "1px solid #FDE68A" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#B45309" }}>Pro-Rata (Proportional Commingling)</span>
                      <span style={{ color: "#B45309" }}>{isInjectClean ? "₹2,74,000 (Commingled Fraction)" : "₹3,80,000"}</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: isInjectClean ? "54.8%" : "76%", height: "100%", background: "#F59E0B", borderRadius: "4px" }} />
                    </div>
                  </div>
                </div>

                {/* Shared Axis Ruler Line */}
                <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: "3px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#94A3B8" }}>
                  <span>₹0</span>
                  <span>₹1.0L</span>
                  <span>₹2.0L</span>
                  <span>₹3.0L</span>
                  <span>₹4.0L</span>
                  <span>₹5.0L</span>
                </div>
              </div>
            </SectionCard>

            {/* CARD 3: MHA 2026 SOP CLOCK & UNCLIPPED CTA */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A" }}>
                  MHA 2026 SOP Clock (§106 → §107)
                </span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669" }}>
                  SLA: T+2.5h (ACTIVE)
                </span>
              </div>

              <TimelineStrip
                milestones={[
                  { label: "24h §106(3)", time: "T+2.5h", status: "verified" },
                  { label: "7d Notice", time: "T+7d", isCurrent: true },
                  { label: "15d Appear", time: "T+15d", status: "pending" },
                  { label: "90d §107 Restore", time: "T+90d", status: "pending" },
                ]}
              />

              {/* UNCLIPPED FULL-WIDTH CTA */}
              <button
                type="button"
                onClick={() => setActiveWorkspaceMode("orders")}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
                  marginTop: "2px",
                }}
              >
                <span>Open MHA SOP & BNSS Order Generator</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export { TaintEngineScreen as TaintLienEngineScreen };
'''

with open('src/pages/v5/TaintEngineScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('TaintEngineScreen.tsx written cleanly!')

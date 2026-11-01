import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";
import { SemiCircleGauge } from "../../components/tarka/BentoPrimitives";
import React, { useState, useMemo } from "react";
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
  Store,
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
                    <MoneyFlowSankeyGraph
                      freezeBudgetK={freezeBudgetK}
                      onFreezeBudgetKChange={setFreezeBudgetK}
                      isInjectClean={isInjectClean}
                      onToggleInjectClean={() => toggleMutation("injectMerchantCleanDeposit")}
                      selectedRule={selectedRule}
                    />) : (
                    /* =============================================================
                       CONNECTED 5-COLUMN TIME-EXPANDED DAG VIEW (MATCHING IMAGE 3)
                       ============================================================= */
                    <div style={{ padding: "10px", height: "100%", overflowY: "auto", display: "grid", gridTemplateColumns: "1.2fr 45px 1.2fr 45px 1.4fr", gap: "4px", alignItems: "stretch", boxSizing: "border-box" }}>
                      {/* COLUMN 1: Victim Source & Mule Layer 1 */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 0: Victim Source */}
                        <div style={{ background: "#FFFFFF", border: "1.5px solid #FECDD3", borderRadius: "8px", padding: "8px 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>Victim Source</span>
                            <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>09:30:15 IST</span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sunil Kumar</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>SBI 30910029101</div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            -₹5,00,000.00
                          </div>
                        </div>

                        {/* Node 1: Mule Layer 1 (Vikram Shah) */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #059669",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule Layer 1</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 4px", borderRadius: "3px" }}>
                              § 107 FROZEN
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram Shah</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                          <div style={{ fontSize: "11px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            Inflow: ₹5,00,000
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 2: Bridge 1 -> 2 Wires */}
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <svg width="100%" height="100%" viewBox="0 0 45 220" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                          <path d="M 0 170 C 22 170, 22 45, 43 45" fill="none" stroke="#4F46E5" strokeWidth="2" strokeDasharray="3 2" />
                          <path d="M 0 185 C 22 185, 22 175, 43 175" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "3 2"} />
                        </svg>
                        <div style={{ position: "absolute", left: "50%", top: "35%", transform: "translate(-50%, -50%)", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "3px", padding: "1px 3px", fontSize: "7px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                          ₹3.0L Outflow ↓
                        </div>
                      </div>

                      {/* COLUMN 3: Stage 2 (Rohit Verma & Sameer Khan) */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 2A: Rohit Verma */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split A)</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 2 ? "#047857" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Rohit Verma</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>HDFC 5010029419920</div>
                          <div style={{ fontSize: "8.5px", color: "#0F172A", marginTop: "2px" }}>
                            Inflow: <strong>₹3,00,000</strong> | Forwarded to Apex: <strong>₹1,80,000</strong> | Retained & Frozen (§107): <strong>₹1,20,000</strong>
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
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split B)</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK ESCAPE"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sameer Khan</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>AXIS 9140200410291</div>
                          <div style={{ fontSize: "8.5px", color: "#0F172A", marginTop: "2px" }}>
                            Inflow: <strong>₹2,00,000</strong> | ATM Cashout: <strong>₹1,20,000</strong> | Retained & Frozen (§107): <strong>₹80,000</strong>
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 4: Bridge 2 -> 3 Wires */}
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <svg width="100%" height="100%" viewBox="0 0 45 220" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                          <path d="M 0 45 C 22 45, 22 45, 43 45" fill="none" stroke="#059669" strokeWidth="2" />
                          <path d="M 0 175 C 22 175, 22 175, 43 175" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "3 2"} />
                        </svg>
                      </div>

                      {/* COLUMN 5: Stage 3 (Apex Electronics & Noida ATM DL-049) */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 3: Apex Electronics (Innocent Merchant) */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #059669",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Store size={12} color="#059669" />
                              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>Innocent Merchant</span>
                            </div>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 4px", borderRadius: "3px" }}>
                              § 106 LIEN ONLY
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Apex Electronics Pvt Ltd</div>
                          <div style={{ fontSize: "8px", color: "#64748B" }}>GST: 07AAACA1234F1Z8 · ICICI Bank</div>

                          <div style={{ marginTop: "3px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginBottom: "1px" }}>
                              <span style={{ color: "#047857", fontWeight: 700 }}>{isInjectClean ? "₹2.50L Clean" : "Clean Working Capital: ₹0"}</span>
                              <span style={{ color: "#BE123C", fontWeight: 700 }}>Tainted Inflow: ₹1.80L (§ 106 Lien)</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                              <div style={{ width: isInjectClean ? "58%" : "0%", background: "#059669", height: "100%" }} />
                              <div style={{ width: isInjectClean ? "42%" : "100%", background: "#E11D48", height: "100%" }} />
                            </div>
                          </div>
                          <div style={{ fontSize: "7.5px", color: "#E11D48", marginTop: "2px" }}>
                            100% Tainted Inflow (₹1.80L) locked under §106 Specific Lien. Click '+ Inject Clean Deposit' to simulate commingled merchant working capital.
                          </div>
                        </div>

                        {/* Node 4: Noida Sec 18 ATM */}
                        <div
                          style={{
                            background: "#F8FAFC",
                            border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                            borderRadius: "8px",
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Building size={12} color="#64748B" />
                              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Terminal Sink</span>
                            </div>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Noida Sec 18 ATM DL-049</div>
                          <div style={{ fontSize: "10px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#BE123C" : "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            Dispensed: ₹1,20,000 (Cash Out)
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
              RIGHT SUPPORT PANEL (4 COLUMNS): RECOVERABLE FLOW CONTAINMENT (IMAGE 3)
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
            <SectionCard
              title="Recoverable Flow Containment"
              subtitle="Measures outward graph leakage and net recoverable funds under judicial doctrines."
              icon={Scale}
              iconColor="#059669"
              badgeText="ROSCOE V. WINDER"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
                {/* Semicircle Gauge Card matching Image 3 */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <SemiCircleGauge
                    percentage={containmentPct}
                    label="Recoverable Flow Contained"
                    sublabel={`Dinic Budget K = ${freezeBudgetK} Accounts`}
                    summaryText={engineState.minCut.isFreezeComplete ? "✓ 100% Flow Sealed · No Outward Leakage" : "⚠ Residual Leakage to Terminal Sink"}
                    color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
                    size={160}
                  />

                  {/* Dual Outflow Metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", width: "100%", marginTop: "4px", paddingTop: "6px", borderTop: "1px solid #E2E8F0" }}>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "7.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Victim Outflow</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>₹5,00,000</div>
                    </div>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "7.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Frozen in Lien</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                        ₹{(500000 - engineState.minCut.residualLeakageAmount).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Accounting Rule Cards matching Image 3 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px" }}>
                  <div
                    onClick={() => setSelectedRule("LIBR")}
                    style={{
                      background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "LIBR" ? "2px solid #059669" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#047857" }}>LIBR (HC) ★</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Caps taint at lowest bal.</div>
                  </div>

                  <div
                    onClick={() => setSelectedRule("FIFO")}
                    style={{
                      background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "FIFO" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#4F46E5" }}>FIFO</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Oldest credits spent first.</div>
                  </div>

                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Commingled fraction.</div>
                  </div>
                </div>

                <div style={{ fontSize: "8.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 8px", borderRadius: "5px" }}>
                  <strong>Selected Rule:</strong> {selectedRule} · Recoverable: <strong style={{ color: "#0F172A" }}>₹{(selectedRule === "LIBR" ? engineState.summary.librRecoverable : selectedRule === "FIFO" ? engineState.summary.fifoRecoverable : engineState.summary.proRataRecoverable).toLocaleString("en-IN")}</strong>
                </div>

                {/* Transition to Statutory Orders View */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceMode("orders")}
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    width: "100%",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#059669",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <span>📋 Draft BNSS §106/§107 Orders</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </SectionCard>
          </div>
        </main>
      )}
    </div>
  );
};

export { TaintEngineScreen as TaintLienEngineScreen };

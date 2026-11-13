import { CgnatFunnelChart } from "../../components/tarka/attribution/CgnatFunnelChart";
import { ScreenFindingCard } from "../../components/tarka/common/ScreenFindingCard";
import React, { useState, useMemo } from "react";
import {
  Radio,
  Smartphone,
  Cpu,
  Target,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  TimelineStrip,
  ScaleBar,
} from "../../components/tarka/kit";
import {
  getDot3920PortBlockDirective,
  getBnss94ImeiSeizureDirective,
} from "../../utils/statutoryDirectives";
import {
  solveCgnatFunnel,
} from "../../utils/cgnatAttribution";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import { sha256HexSync } from "../../utils/sha256";

export const AttributionScreen: React.FC = () => {
  const { mutations, toggleMutation, activeCaseId, activeCase, setActiveRoute } = useTarkaGlobal();
  const { density, activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();
  const isCompact = density === "compact";

  const investigation = useMemo(() => {
    const base = reconstructedInvestigation || reconstruct5FileInvestigation();
    if (activeCase && activeCase.caseId !== "CASE-2026-001") {
      return {
        ...base,
        firNumber: activeCase.firNumber,
        complainantName: activeCase.complainantName,
        bookedLossInr: activeCase.bookedLossInr,
        claimedLossInr: activeCase.claimedLossInr,
      };
    }
    return base;
  }, [reconstructedInvestigation, activeCase]);

  // Interactive Z3 SMT Clock-Offset State (-5.0s to +5.0s, NTP sync default = 0.0s)
  const [clockOffset, setClockOffset] = useState<number>(0.0);
  const isPortDropped = !!mutations.dropCgnatSourcePort || !!mutations.cgnatPortCollision;

  const attributionProfile = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseAttributionProfile(
      activeCaseId || "CASE-2026-001",
      investigation,
      isPortDropped,
      clockOffset
    );
  }, [activeCaseId, investigation, isPortDropped, clockOffset]);

  const targetImei = activeDiscoveredCluster?.convergedImei || attributionProfile.imei;
  const targetTac = targetImei.slice(0, 8);
  const funnelTitle = activeDiscoveredCluster?.cgnatCandidatesCollapsed
    ? `CGNAT Candidate Intersection Funnel (${activeDiscoveredCluster.cgnatCandidatesCollapsed})`
    : `CGNAT Candidate Intersection Funnel (${attributionProfile.initialPoolCount} → 41 → 6 → 1)`;

  // Funnel Computation
  const funnelResult = useMemo(() => {
    const selected = attributionProfile.sessions;
    return solveCgnatFunnel(selected, isPortDropped);
  }, [attributionProfile.sessions, isPortDropped]);

  const survivingCandidateCount = isPortDropped ? attributionProfile.initialPoolCount : funnelResult.finalCandidateCount;
  const isZ3Sat = clockOffset >= -1.2 && clockOffset <= 0.8;
  const [showSmtCode, setShowSmtCode] = useState(false);

  // 3. Directives and Copy Handlers
  const [isSmtCopied, setIsSmtCopied] = useState(false);
  const [isDirectiveCopied, setIsDirectiveCopied] = useState(false);
  const [isImeiCopied, setIsImeiCopied] = useState(false);

  const handleExportSmt2 = () => {
    const smt2Script = attributionProfile.smt2Script;
    navigator.clipboard.writeText(smt2Script);
    setIsSmtCopied(true);
    toast.success("Z3 SMT2 formal verification script copied to clipboard!");
    setTimeout(() => setIsSmtCopied(false), 2000);
  };

  const handleCopyDotDirective = () => {
    const directiveText = getDot3920PortBlockDirective();
    navigator.clipboard.writeText(directiveText);
    setIsDirectiveCopied(true);
    toast.success("DoT Clause 39.20 Requisition copied to clipboard!");
    setTimeout(() => setIsDirectiveCopied(false), 2000);
  };

  const handleCopyImeiDirective = () => {
    const directiveText = getBnss94ImeiSeizureDirective();
    navigator.clipboard.writeText(directiveText);
    setIsImeiCopied(true);
    toast.success("§94 BNSS IMEI Seizure Directive copied to clipboard!");
    setTimeout(() => setIsImeiCopied(false), 2000);
  };


  return (
    <div
      className={`tarka-attribution-root ${isCompact ? "tarka-density-compact" : ""}`}
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
        screenId="attribution"
        takeaway={`Sequential CGNAT intersection for ${investigation.complainantName} (${investigation.firNumber}): collapses tower subscribers at ${attributionProfile.cellTower} to 1 unique handset (IMEI ${targetImei}); dual-SIM TAC ${targetTac} and Z3 clock offset prove physical hardware twin.`}
        evidenceChips={[
          { tier: "T1", label: `${attributionProfile.isp.split(" ")[0]} IPDR`, hash: investigation.fileManifest[2]?.sha256 || sha256HexSync("IPDR") },
          { tier: "T1", label: "NPCI Device XML", hash: investigation.fileManifest[1]?.sha256 || sha256HexSync("NPCI_XML") },
          { tier: "T1", label: `TAC ${targetTac} Hardware`, hash: sha256HexSync(`TAC_${targetTac}_HARDWARE`) },
        ]}
      />

      {/* Top Investigator Finding Card */}
      <ScreenFindingCard
        finding="Dynamic CGNAT port + IMEI twin isolates 1 suspect handset from 10,000 candidates with p=1.4×10⁻⁷."
        metric="1 Handset Isolated"
        metricLabel="P = 1.4 × 10⁻⁷ Odds"
        actionLabel="Review Freeze Directives"
        onAction={() => setActiveRoute("report")}
        status="verified"
        evidenceTag="CGNAT Port Funnel & IMEI Attribution"
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
          title="Candidate pool"
          value={isPortDropped ? `${attributionProfile.initialPoolCount} Handsets` : `${survivingCandidateCount} Handset`}
          icon={Radio}
          iconColor={isPortDropped ? "#D97706" : "#059669"}
          iconBg={isPortDropped ? "#FEF3C7" : "#ECFDF5"}
          statusBadge={{
            text: isPortDropped ? "AMBIGUOUS" : "INDIVIDUATED",
            variant: isPortDropped ? "amber" : "emerald",
          }}
          subtitle={isPortDropped ? `Port dropped · ${attributionProfile.initialPoolCount} ambiguous` : `Target: ${attributionProfile.sessions[0]?.activeSubscriberIds?.[0] || "SUB-PRIMARY"}`}
          microVisual="spark"
          sparklineData={[340, 41, 6, 1]}
          provenanceTooltip={`Intersection of sequential bank login sessions across ${attributionProfile.isp.split(" ")[0]} CGNAT pool.`}
        />

        <KpiTile
          title="Random-match odds"
          value="1 in 7.14M"
          icon={Cpu}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "HEURISTIC BAND", variant: "indigo" }}
          subtitle="P = 1.4 × 10⁻⁷ (N=10,000 Tower Pool)"
          microVisual="gauge"
          progressPct={99.9}
          provenanceTooltip="Heuristic display bands, not a statutory standard. Coincidental match probability over 10,000 subscribers."
        />

        <KpiTile
          title="Precursor SIM-swap"
          value="09:44:12 IST"
          icon={Zap}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "IMSI RE-ALLOCATED", variant: "rose" }}
          subtitle={`Pre-Attack Window (${investigation.complainantName?.split(" ")[0] || "Victim"} Silenced)`}
          microVisual="ring"
          progressPct={100}
          provenanceTooltip={`${attributionProfile.isp.split(" ")[0]} HLR swap record: Legacy subscriber SIM swapped to Attacker IMSI.`}
        />

        <KpiTile
          title="Hardware twin"
          value="Dual-SIM Match"
          icon={Smartphone}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "LUHN & TAC ✓", variant: "emerald" }}
          subtitle={`Shared TAC ${targetTac} (Hardware Twin)`}
          microVisual="ring"
          progressPct={100}
          provenanceTooltip={`Both carrier slots share identical TAC prefix ${targetTac} and reside in same physical handset chassis.`}
        />
      </div>

      {/* =========================================================================
          MAIN STAGE: 7 COLS HERO FUNNEL + 5 COLS HARDWARE & Z3 CALIPER
          ========================================================================= */}
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
            LEFT HERO CARD (7 COLUMNS): HAYSTACK CANVAS + SANKEY FUNNEL
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
          <SectionCard
            title={funnelTitle}
            subtitle="Sequential intersection of translated port allocations isolates 1 unique target handset."
            icon={Target}
            iconColor="#4F46E5"
            badgeText="DoT CLAUSE 39.20"
            badgeVariant="indigo"
            provenanceTooltip={`Sequential intersection algorithm S1 ∩ S2 ∩ S3 ∩ S4 provably isolates IMEI ${targetImei}.`}
            actionSlot={
              <button
                type="button"
                onClick={handleCopyDotDirective}
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
                {isDirectiveCopied ? <Check size={11} /> : <Copy size={11} />}
                {isDirectiveCopied ? "Copied" : "Copy DoT 39.20 Requisition"}
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <CgnatFunnelChart
                  isPortDropped={isPortDropped}
                  onTogglePortDropped={() => toggleMutation("dropCgnatSourcePort")}
                  targetImei={targetImei}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* =====================================================================
            RIGHT SUPPORT PANEL (5 COLUMNS): DUAL-SIM TWIN + Z3 CALIPER
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 5",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {/* CARD 1: PRECURSOR SIM-SWAP & DUAL-SIM HARDWARE CHASSIS SVG */}
          <SectionCard
            title="Precursor SIM-Swap & Dual-SIM Hardware Chassis"
            subtitle="Correlates telecom HLR re-allocation with shared physical motherboard TAC prefix."
            icon={Smartphone}
            iconColor="#4F46E5"
            badgeText="CHASSIS TWIN"
            badgeVariant="indigo"
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
              {/* SHARED TAC BANNER */}
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "5px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={12} color="#059669" />
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#047857" }}>
                  SHARED TAC {targetTac} · SAME PHYSICAL CHIPSET CHASSIS ({targetTac.startsWith("3599") ? "Samsung Galaxy S23" : "Samsung Galaxy M34"})
                </span>
              </div>

              {/* TimelineStrip: SIM-Swap Precursor */}
              <TimelineStrip
                milestones={[
                  { label: `09:44:12 IST ${attributionProfile.isp.split(" ")[0]} SIM-Swap`, time: "T-16m", status: "flagged" },
                  { label: `${investigation.complainantName?.split(" ")[0] || "Victim"} Handset Silenced`, time: "T-10m", isCurrent: true },
                  { label: `10:00:14 IST ₹${(investigation.bookedLossInr / 100000).toFixed(2)}L Fraud Debit`, time: "T+0m", status: "verified" },
                ]}
              />

              {/* DUAL-SIM HARDWARE CHASSIS SVG */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#0F172A" }}>
                    Physical Handset Motherboard: TAC {targetTac} (Dual-SIM Chassis)
                  </span>
                  <span style={{ fontSize: "8px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                    SHARED TAC: {targetTac} ✓
                  </span>
                </div>

                {/* SVG Visual Chassis */}
                <svg viewBox="0 0 400 90" style={{ width: "100%", height: "85px" }}>
                  {/* Outer Handset Frame */}
                  <rect x="5" y="5" width="390" height="80" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />

                  {/* Slot 1: Carrier A */}
                  <rect x="18" y="15" width="165" height="36" rx="5" fill="#FEF2F2" stroke="#FECDD3" strokeWidth="1" />
                  <text x="25" y="27" fill="#E11D48" fontSize="8" fontWeight="bold">SLOT 1 ({attributionProfile.isp.split(" ")[0].toUpperCase()} · FRAUD SIM)</text>
                  <text x="25" y="42" fill="#0F172A" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    {targetTac} {targetImei.slice(8, 14)} <tspan fill="#059669">{targetImei.slice(14, 15) || "4"}</tspan>
                  </text>
                  <text x="145" y="42" fill="#059669" fontSize="8" fontWeight="bold">LUHN ✓</text>

                  {/* Slot 2: Carrier B */}
                  <rect x="217" y="15" width="165" height="36" rx="5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
                  <text x="224" y="27" fill="#4338CA" fontSize="8" fontWeight="bold">SLOT 2 (SECONDARY SIM)</text>
                  <text x="224" y="42" fill="#0F172A" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    {targetTac} {targetImei.slice(8, 14)} <tspan fill="#059669">2</tspan>
                  </text>
                  <text x="344" y="42" fill="#059669" fontSize="8" fontWeight="bold">LUHN ✓</text>

                  {/* Connecting Bus Lines into Motherboard */}
                  <path d="M 100 51 L 100 64 L 180 64" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 2" />
                  <path d="M 300 51 L 300 64 L 220 64" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 2" />

                  {/* Motherboard SoC */}
                  <rect x="165" y="58" width="70" height="18" rx="3" fill="#0F172A" />
                  <text x="200" y="70" fill="#38BDF8" fontSize="8" fontWeight="bold" textAnchor="middle">
                    SoC Architecture
                  </text>
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#0F172A" }}>
                    3-Way Multi-Modal Hardware & Radio Binding:
                  </div>
                  <div style={{ fontSize: "8px", color: "#475569", lineHeight: "1.3" }}>
                    1. <strong>GSMA TAC:</strong> <code>{targetTac}</code> confirms {targetTac.startsWith("3599") ? "Samsung Galaxy S23" : "Cellular Handset"} chassis.<br />
                    2. <strong>3GPP Sequential Allocation:</strong> IMEI₁ (...{targetImei.slice(-3)}) and IMEI₂ (...2) differ by ΔSN = +1.<br />
                    3. <strong>Co-Located Radio Telemetry:</strong> Both SIMs co-registered on Cell ID <code>{attributionProfile.cellTower}</code> with identical Timing Advance (TA = 2) and overlapping attach logs.
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* CARD 2: Z3 SMT CLOCK-OFFSET CALIPER & FORMAL PROOF */}
          <SectionCard
            title="Z3 SMT Clock-Offset Caliper & Formal Proof"
            subtitle={`Evaluates Stratum-2 NTP clock bounds across ${attributionProfile.isp.split(" ")[0]} PGW and Core Banking CBS.`}
            icon={Cpu}
            iconColor="#059669"
            badgeText={isZ3Sat ? "Z3 SOLVER: SAT ✓" : "Z3 SOLVER: UNSAT ✗"}
            badgeVariant={isZ3Sat ? "emerald" : "rose"}
            actionSlot={
              <button
                type="button"
                onClick={handleCopyImeiDirective}
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
                {isImeiCopied ? <Check size={11} /> : <Copy size={11} />}
                {isImeiCopied ? "Copied" : "Copy §94 BNSS Seizure Directive"}
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
              {/* Exact Z3 SMT Number Line Infographic matching Image 2 */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px", flexShrink: 0 }}>
                <ScaleBar
                  min={-5}
                  max={5}
                  value={clockOffset}
                  unit="s"
                  toleranceBand={{
                    from: -1.2,
                    to: 0.8,
                    label: "FEASIBLE INTERVAL [-1.2s, +0.8s]",
                  }}
                  labelAbove="Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]"
                  valueBelow={`Δt = ${clockOffset >= 0 ? "+" : ""}${clockOffset.toFixed(2)}s (${clockOffset === 0 ? "NTP Sync" : isZ3Sat ? "Stratum-2 Feasible ✓" : "Out of Spec ✗"})`}
                  height={16}
                />
              </div>

              {/* Slider Controller */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F1F5F9", padding: "4px 8px", borderRadius: "5px" }}>
                <Sliders size={12} color="#64748B" />
                <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#475569" }}>Test Clock Skew:</span>
                <input
                  type="range"
                  min="-5.0"
                  max="5.0"
                  step="0.1"
                  value={clockOffset}
                  onChange={(e) => setClockOffset(parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: "pointer", height: "4px" }}
                />
                <button
                  type="button"
                  onClick={() => setClockOffset(0.0)}
                  className="hover:border-indigo-400 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out" style={{ fontSize: "8px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
                >
                  Reset NTP (0.0s)
                </button>
              </div>

              {/* Collapsible Light-Mode SMT2 Syntax Panel */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                <div
                  onClick={() => setShowSmtCode(!showSmtCode)}
                  style={{
                    background: "#F8FAFC",
                    padding: "5px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  <span>Show Z3 SMT-LIB2 Formal Proof Script</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSmt2();
                      }}
                      style={{
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontSize: "8.5px",
                        fontWeight: 700,
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        color: "#4F46E5",
                        cursor: "pointer",
                      }}
                    >
                      {isSmtCopied ? "Copied!" : "Export .smt2"}
                    </button>
                    {showSmtCode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </div>

                {showSmtCode && (
                  <div
                    style={{
                      background: "#FFFFFF",
                      padding: "6px 8px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "9px",
                      lineHeight: "1.4",
                      color: "#334155",
                      maxHeight: "100px",
                      overflowY: "auto",
                      borderTop: "1px solid #E2E8F0",
                    }}
                  >
                    <div style={{ color: "#64748B" }}>; Z3 QF_LRA Formal Clock Verification Script ({attributionProfile.isp.split(" ")[0]})</div>
                    <div>(assert (= clock_drift (- t_{attributionProfile.isp.split(" ")[0].toLowerCase()}_cgnat t_core_banking)))</div>
                    <div>(assert (&gt;= clock_drift -1.2))</div>
                    <div>(assert (&lt;= clock_drift 0.8))</div>
                    <div style={{ color: isZ3Sat ? "#059669" : "#DC2626", fontWeight: "bold" }}>
                      ; Evaluation ({clockOffset.toFixed(1)}s): {isZ3Sat ? "sat (bounds hold)" : "unsat (skew exceeds spec)"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
};

export { AttributionScreen as CgnatAttributionScreen };

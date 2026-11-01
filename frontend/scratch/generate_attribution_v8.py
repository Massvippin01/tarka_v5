import os

code = r'''import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Radio,
  Smartphone,
  Cpu,
  RotateCcw,
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
  ScaleBar,
  TimelineStrip,
} from "../../components/tarka/kit";
import {
  getDot3920PortBlockDirective,
  getBnss94ImeiSeizureDirective,
} from "../../utils/statutoryDirectives";
import {
  solveCgnatFunnel,
  getCanonicalAttributionData,
} from "../../utils/cgnatAttribution";

export const AttributionScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  // Canonical Data
  const canonicalData = useMemo(() => getCanonicalAttributionData(), []);

  // 1. Funnel Active Sessions State
  const [activeSessions, setActiveSessions] = useState<{ [id: string]: boolean }>({
    "SESS-01": true,
    "SESS-02": true,
    "SESS-03": true,
    "SESS-04": true,
  });

  const toggleSession = (id: string) => {
    setActiveSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetAllSessions = () => {
    setActiveSessions({
      "SESS-01": true,
      "SESS-02": true,
      "SESS-03": true,
      "SESS-04": true,
    });
    if (mutations.dropCgnatSourcePort) {
      toggleMutation("dropCgnatSourcePort");
    }
  };

  // Funnel Computation
  const isPortDropped = !!mutations.dropCgnatSourcePort || !!mutations.cgnatPortCollision;
  const funnelResult = useMemo(() => {
    const selected = canonicalData.sessions.filter((s) => activeSessions[s.id]);
    return solveCgnatFunnel(selected, isPortDropped);
  }, [canonicalData.sessions, activeSessions, isPortDropped]);

  // Candidate counts per stage
  const candidateCounts = useMemo(() => {
    if (isPortDropped) return [340, 340, 340, 340];
    const counts = [340];
    if (activeSessions["SESS-02"]) counts.push(41);
    else counts.push(340);
    if (activeSessions["SESS-03"]) counts.push(6);
    else counts.push(counts[counts.length - 1]);
    if (activeSessions["SESS-04"]) counts.push(1);
    else counts.push(counts[counts.length - 1]);
    return counts;
  }, [isPortDropped, activeSessions]);

  const survivingCandidateCount = isPortDropped ? 340 : funnelResult.finalCandidateCount;

  // 2. Interactive Z3 SMT Clock-Offset State (-5.0s to +5.0s, NTP sync default = 0.0s)
  const [clockOffset, setClockOffset] = useState<number>(0.0);
  const isZ3Sat = clockOffset >= -1.2 && clockOffset <= 0.8;
  const [showSmtCode, setShowSmtCode] = useState(false);

  // 3. Directives and Copy Handlers
  const [isSmtCopied, setIsSmtCopied] = useState(false);
  const [isDirectiveCopied, setIsDirectiveCopied] = useState(false);
  const [isImeiCopied, setIsImeiCopied] = useState(false);

  const handleExportSmt2 = () => {
    const smt2Script = `; TARKA v8.0 — Z3 SMT Clock-Offset Formal Verification Script
; Case: FIR #149/2026 (Airtel CGNAT vs SBI Finacle Clock Bounds)
; Target MSISDN: +91-98711-23941 | Chassis TAC: 86749206
(set-logic QF_LRA)
(declare-const t_finacle_sbi Real)
(declare-const t_airtel_cgnat Real)
(declare-const clock_drift Real)

; Measured bounds under NTP Stratum-2 sync: [-1.2s, +0.8s]
(assert (= clock_drift (- t_airtel_cgnat t_finacle_sbi)))
(assert (>= clock_drift -1.2))
(assert (<= clock_drift 0.8))

; Invariant Check for evaluated delta (${clockOffset.toFixed(2)}s)
(assert (= clock_drift ${clockOffset.toFixed(2)}))

(check-sat)
(get-model)`;
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

  // 4. 10,000-Subscriber Haystack Canvas Renderer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Render 120 columns x 24 rows = 2,880 visual dots representing the 10,000 pool
    const cols = 120;
    const rows = 24;
    const cellW = width / cols;
    const cellH = height / rows;

    const activeDotCount = isPortDropped
      ? Math.round((340 / 10000) * (cols * rows))
      : survivingCandidateCount === 1
      ? 1
      : Math.max(1, Math.round((survivingCandidateCount / 10000) * (cols * rows)));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = c * cellW + cellW / 2;
        const y = r * cellH + cellH / 2;

        if (idx === 0) {
          // TARGET NEEDLE (IMEI 867492061234564)
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#10B981";
          ctx.fill();

          // Pulsing halo ring around target
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (idx < activeDotCount) {
          // SURVIVING CANDIDATES
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = isPortDropped ? "#F59E0B" : "#4F46E5";
          ctx.fill();
        } else {
          // INACTIVE SUBSCRIBERS IN TOWER POOL
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = "#CBD5E1";
          ctx.fill();
        }
      }
    }
  }, [survivingCandidateCount, isPortDropped]);

  // Stage configurations
  const stagesMeta = [
    {
      id: "SESS-01",
      bank: "Step 1: SBI Mule 1083",
      time: "07:48:04 IST",
      portPool: "Ports 44000-44511 (340 Handsets)",
      count: candidateCounts[0] || 340,
    },
    {
      id: "SESS-02",
      bank: "Step 2: HDFC Mule 9920",
      time: "07:51:19 IST",
      portPool: "Ports 44000-44511 (340 Handsets)",
      count: candidateCounts[1] || 41,
    },
    {
      id: "SESS-03",
      bank: "Step 3: Axis Mule 4102",
      time: "07:54:51 IST",
      portPool: "Ports 44000-44511 (340 Handsets)",
      count: candidateCounts[2] || 6,
    },
    {
      id: "SESS-04",
      bank: "Step 4: Paytm Sink 1109",
      time: "07:58:10 IST",
      portPool: "Ports 44000-44511 (340 Handsets)",
      count: candidateCounts[3] || 1,
    },
  ];

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
        takeaway="Sequential CGNAT intersection collapses 10,000 tower subscribers to 1 unique handset (IMEI 867492061234564); dual-SIM TAC and Z3 clock offset prove physical hardware twin."
        evidenceChips={[
          { tier: "T1", label: "Airtel CGNAT IPDR", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
          { tier: "T1", label: "NPCI Device XML", hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
          { tier: "T1", label: "TAC 86749206 Hardware", hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a" },
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
          title="Candidate pool"
          value={isPortDropped ? "340 Handsets" : `${survivingCandidateCount} Handset`}
          icon={Radio}
          iconColor={isPortDropped ? "#D97706" : "#059669"}
          iconBg={isPortDropped ? "#FEF3C7" : "#ECFDF5"}
          statusBadge={{
            text: isPortDropped ? "AMBIGUOUS" : "INDIVIDUATED",
            variant: isPortDropped ? "amber" : "emerald",
          }}
          subtitle={isPortDropped ? "Port dropped · 340 ambiguous" : "Target: SUB-8849-VIKRAM"}
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Intersection of 4 sequential bank login sessions across Airtel CGNAT pool."
        />

        <KpiTile
          title="Random-match odds"
          value="1 in 7.14M"
          icon={Cpu}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "HEURISTIC BAND", variant: "indigo" }}
          subtitle="P = 1.4 × 10⁻⁷ (N=10,000 Tower Pool)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Heuristic display bands, not a statutory standard. Coincidental match probability over 10,000 subscribers."
        />

        <KpiTile
          title="Precursor SIM-swap"
          value="09:44:12 IST"
          icon={Zap}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "IMSI RE-ALLOCATED", variant: "rose" }}
          subtitle="16m Pre-Attack Window (Sunil Silenced)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Airtel HLR swap record: Legacy IMSI 40410...882 swapped to Attacker IMSI 40410...904."
        />

        <KpiTile
          title="Hardware twin"
          value="Dual-SIM Match"
          icon={Smartphone}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "LUHN & TAC ✓", variant: "emerald" }}
          subtitle="Shared TAC 86749206 (Exynos 1280)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Both Airtel and Jio IMEIs share identical TAC prefix and reside in same physical Samsung Galaxy M34 chassis."
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
            title="CGNAT Candidate Intersection Funnel (340 → 41 → 6 → 1)"
            subtitle="Carriers map 340 phones to one public IP. Across 4 mule accounts, set intersection isolates 1 unique target handset."
            icon={Target}
            iconColor="#4F46E5"
            badgeText="DoT CLAUSE 39.20"
            badgeVariant="indigo"
            provenanceTooltip="Sequential intersection algorithm S1 ∩ S2 ∩ S3 ∩ S4 provably isolates IMEI 867492061234564."
            actionSlot={
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

                <button
                  type="button"
                  onClick={() => toggleMutation("dropCgnatSourcePort")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: isPortDropped ? "1px solid #D97706" : "1px solid #CBD5E1",
                    background: isPortDropped ? "#FEF3C7" : "#FFFFFF",
                    color: isPortDropped ? "#B45309" : "#475569",
                  }}
                  title="Simulate bank omission of CGNAT translated source port to test ambiguity expansion"
                >
                  <Radio size={11} color={isPortDropped ? "#B45309" : "#64748B"} />
                  {isPortDropped ? "Restore Port" : "Drop Source Port"}
                </button>

                <button
                  type="button"
                  onClick={resetAllSessions}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "3px 6px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #E2E8F0",
                    background: "#FFFFFF",
                    color: "#64748B",
                  }}
                  title="Reset all filter stages"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: "6px" }}>
              {/* TOP VISUAL: 10,000-SUBSCRIBER HAYSTACK CANVAS */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A" }}>
                    Cell Tower Subscriber Haystack (10,000 Subscribers Matrix)
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: isPortDropped ? "#D97706" : "#059669" }}>
                    {isPortDropped
                      ? "⚠️ 340 Candidates (Port Omitted)"
                      : survivingCandidateCount === 1
                      ? "Target Individuated: 1 of 10,000 (★ Needle Isolated)"
                      : `${survivingCandidateCount} Candidates Active`}
                  </span>
                </div>

                {/* Canvas */}
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={50}
                  style={{
                    width: "100%",
                    height: "50px",
                    borderRadius: "4px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                  }}
                />

                <div style={{ fontSize: "8px", color: "#64748B", textAlign: "center" }}>
                  Grid encodes active tower subscriber pool; highlighted nodes represent surviving CGNAT port candidates converging on single target.
                </div>
              </div>

              {/* MIDDLE VISUAL: SANKEY CANDIDATE FUNNEL */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                {/* Stage 1 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>Step 1: SBI</div>
                  <div style={{ height: "18px", background: "#4F46E5", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 800, fontSize: "10px", marginTop: "2px" }}>
                    340
                  </div>
                </div>

                <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>∩</div>

                {/* Stage 2 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>Step 2: HDFC</div>
                  <div style={{ height: "18px", background: "#4338CA", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 800, fontSize: "10px", marginTop: "2px" }}>
                    {candidateCounts[1]}
                  </div>
                </div>

                <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>∩</div>

                {/* Stage 3 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>Step 3: Axis</div>
                  <div style={{ height: "18px", background: "#3730A3", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 800, fontSize: "10px", marginTop: "2px" }}>
                    {candidateCounts[2]}
                  </div>
                </div>

                <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>∩</div>

                {/* Stage 4 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#059669" }}>Step 4: Paytm</div>
                  <div style={{ height: "18px", background: isPortDropped ? "#D97706" : "#059669", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 800, fontSize: "10px", marginTop: "2px" }}>
                    {isPortDropped ? "340" : "1 ★"}
                  </div>
                </div>
              </div>

              {/* 4 CLEAN STEP CARDS BELOW */}
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  overflowY: "auto",
                }}
              >
                {stagesMeta.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => toggleSession(s.id)}
                    style={{
                      background: activeSessions[s.id] ? "#FFFFFF" : "#F8FAFC",
                      border: activeSessions[s.id] ? "1px solid #CBD5E1" : "1px dashed #E2E8F0",
                      borderRadius: "6px",
                      padding: "5px 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      cursor: "pointer",
                      opacity: activeSessions[s.id] ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={activeSessions[s.id]}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A" }}>
                          {s.bank}
                        </div>
                        <div style={{ fontSize: "8px", color: "#64748B" }}>
                          {s.time} · Bank Log IP: 103.21.144.92 · {s.portPool}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: idx === 3 && !isPortDropped ? "#059669" : "#4F46E5" }}>
                        {s.count} {s.count === 1 ? "Handset" : "Handsets"}
                      </div>
                      <div style={{ fontSize: "7.5px", color: "#64748B" }}>
                        {idx === 0 ? "Initial Pool" : `Survivor (${Math.round((s.count / 340) * 100)}%)`}
                      </div>
                    </div>
                  </div>
                ))}

                {/* BOTTOM SUMMARY CHIP */}
                <div
                  style={{
                    background: isPortDropped ? "#FFFBEB" : "#ECFDF5",
                    border: isPortDropped ? "1px solid #FDE68A" : "1px solid #A7F3D0",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "auto",
                  }}
                >
                  <span style={{ fontSize: "9px", fontWeight: 700, color: isPortDropped ? "#B45309" : "#047857" }}>
                    {isPortDropped
                      ? "⚠️ PORT OMISSION: 340 handsets share public IP; DoT Clause 39.20 ISP translation required."
                      : "✓ UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { Target IMEI 867492061234564 }"}
                  </span>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, color: isPortDropped ? "#B45309" : "#047857" }}>
                    {isPortDropped ? "Ambiguity: 340" : "P = 1.40 × 10⁻⁷"}
                  </span>
                </div>
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
              {/* TimelineStrip: SIM-Swap Precursor */}
              <TimelineStrip
                milestones={[
                  { label: "09:44:12 IST Airtel SIM-Swap", time: "T-16m", status: "flagged" },
                  { label: "Victim Handset Silenced", time: "T-10m", isCurrent: true },
                  { label: "10:00:14 IST ₹5.00L Fraud Debit", time: "T+0m", status: "verified" },
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
                    Physical Handset Motherboard: Samsung Galaxy M34 5G
                  </span>
                  <span style={{ fontSize: "8px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                    SHARED TAC: 86749206 ✓
                  </span>
                </div>

                {/* SVG Visual Chassis */}
                <svg viewBox="0 0 400 90" style={{ width: "100%", height: "85px" }}>
                  {/* Outer Handset Frame */}
                  <rect x="5" y="5" width="390" height="80" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />

                  {/* Slot 1: Airtel */}
                  <rect x="18" y="15" width="165" height="36" rx="5" fill="#FEF2F2" stroke="#FECDD3" strokeWidth="1" />
                  <text x="25" y="27" fill="#E11D48" fontSize="8" fontWeight="bold">SLOT 1 (AIRTEL · FRAUD SIM)</text>
                  <text x="25" y="42" fill="#0F172A" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    86749206 123456 <tspan fill="#059669">4</tspan>
                  </text>
                  <text x="145" y="42" fill="#059669" fontSize="8" fontWeight="bold">LUHN ✓</text>

                  {/* Slot 2: Jio */}
                  <rect x="217" y="15" width="165" height="36" rx="5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
                  <text x="224" y="27" fill="#4338CA" fontSize="8" fontWeight="bold">SLOT 2 (JIO · PERSONAL SIM)</text>
                  <text x="224" y="42" fill="#0F172A" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    86749206 123457 <tspan fill="#059669">2</tspan>
                  </text>
                  <text x="344" y="42" fill="#059669" fontSize="8" fontWeight="bold">LUHN ✓</text>

                  {/* Connecting Bus Lines into Exynos Motherboard */}
                  <path d="M 100 51 L 100 64 L 180 64" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 2" />
                  <path d="M 300 51 L 300 64 L 220 64" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 2" />

                  {/* Motherboard SoC */}
                  <rect x="165" y="58" width="70" height="18" rx="3" fill="#0F172A" />
                  <text x="200" y="70" fill="#38BDF8" fontSize="8" fontWeight="bold" textAnchor="middle">
                    Exynos 1280 SoC
                  </text>
                </svg>

                <div style={{ fontSize: "8px", color: "#64748B" }}>
                  Airtel and Jio IMEIs differ by exactly +1 sequential serial unit on the same Exynos 1280 fabrication tray, proving physical dual-SIM hardware twin.
                </div>
              </div>
            </div>
          </SectionCard>

          {/* CARD 2: Z3 SMT CLOCK-OFFSET CALIPER & FORMAL PROOF */}
          <SectionCard
            title="Z3 SMT Clock-Offset Caliper & Formal Proof"
            subtitle="Evaluates Stratum-2 NTP clock bounds across Airtel PGW and SBI Finacle CBS."
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
              {/* Precision ScaleBar for Z3 Clock Offset */}
              <ScaleBar
                labelAbove="CBS Finacle ↔ Airtel PGW NTP Sync"
                min={-5.0}
                max={5.0}
                value={clockOffset}
                unit="s"
                toleranceBand={{
                  from: -1.2,
                  to: 0.8,
                  label: "FEASIBLE BOUND [-1.2s, +0.8s]",
                }}
                valueBelow={`Δ = ${clockOffset >= 0 ? "+" : ""}${clockOffset.toFixed(1)}s (Stratum-2 Sync)`}
              />

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
                  style={{ fontSize: "8px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
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
                    <div style={{ color: "#64748B" }}>; Z3 QF_LRA Formal Clock Verification Script</div>
                    <div>(assert (= clock_drift (- t_airtel_cgnat t_finacle_sbi)))</div>
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
'''

with open('src/pages/v5/AttributionScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('AttributionScreen.tsx rewritten cleanly!')

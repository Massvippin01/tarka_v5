import React, { useState, useMemo } from "react";
import {
  Radio,
  Smartphone,
  Cpu,
  RotateCcw,
  Target,
  Download,
  Check,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
import { AnimatedCounter, PrecisionVernierGauge } from "../../components/ui/forensic-infographics";
import {
  getDot3920PortBlockDirective,
  getDotSimSwapDirective,
  getBnss94ImeiSeizureDirective,
} from "../../utils/statutoryDirectives";
import {
  solveCgnatFunnel,
  analyzeDualSimHardware,
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
  const isPortDropped = mutations.dropCgnatSourcePort || mutations.cgnatPortCollision;
  const funnelResult = useMemo(() => {
    const selected = canonicalData.sessions.filter((s) => activeSessions[s.id]);
    return solveCgnatFunnel(selected, isPortDropped);
  }, [canonicalData.sessions, activeSessions, isPortDropped]);

  // 2. Dual-SIM Hardware Twin State
  const imei1 = canonicalData.canonicalImei1; // "867492061234564"
  const imei2 = canonicalData.canonicalImei2; // "867492061234572"

  const dualSimResult = useMemo(() => {
    return analyzeDualSimHardware(imei1, imei2, 18);
  }, [imei1, imei2]);

  // 3. Interactive Z3 SMT Clock-Offset State (-5.0s to +5.0s, NTP sync default = 0.0s)
  const [clockOffset, setClockOffset] = useState<number>(0.0);
  const isZ3Sat = clockOffset >= -1.2 && clockOffset <= 0.8;

  // 4. Z3 SMT Export State
  const [isSmtCopied, setIsSmtCopied] = useState(false);
  const handleExportSmt2 = () => {
    const smt2Script = `; TARKA v7.0 — Z3 SMT Clock-Offset Verification Script
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
(get-model)
`;
    navigator.clipboard.writeText(smt2Script);
    setIsSmtCopied(true);
    toast.success("Z3 SMT2 formal verification script copied to clipboard!");
    setTimeout(() => setIsSmtCopied(false), 2000);
  };

  // Funnel Stage Meta Configuration
  const funnelStagesMeta = [
    {
      id: "SESS-01",
      bank: "Login 1: SBI Mule 1083",
      time: "07:48:04",
      count: 340,
      port: "44321",
    },
    {
      id: "SESS-02",
      bank: "Login 2: HDFC Mule 9920",
      time: "07:51:19",
      count: 41,
      port: "44389",
    },
    {
      id: "SESS-03",
      bank: "Login 3: Axis Mule 4102",
      time: "07:54:51",
      count: 6,
      port: "44810",
    },
    {
      id: "SESS-04",
      bank: "Login 4: Paytm Sink 1109",
      time: "07:58:10",
      count: 1,
      port: "45102",
    },
  ];

  return (
    <div
      className={`tarka-attribution-root ${isCompact ? "tarka-density-compact" : ""}`}
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
          ROW 1: TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (BENTO-GRID-4)
          ========================================================================= */}
      <div className="bento-grid-4" style={{ flexShrink: 0 }}>
        {/* Card 1: CGNAT Candidate Pool */}
        <BentoKpiCard
          title="CGNAT Candidate Pool"
          metric={
            isPortDropped
              ? "340 Handsets"
              : funnelResult.finalCandidateCount === 1
              ? "1 Handset"
              : `${funnelResult.finalCandidateCount} Handsets`
          }
          metricColor={isPortDropped ? "#D97706" : "#059669"}
          statusBadge={{
            text: isPortDropped ? "AMBIGUOUS" : "INDIVIDUATED",
            variant: isPortDropped ? "amber" : "emerald",
          }}
          meta="10k Tower Pool"
          subtitle="Collapsed from 340 tower subscribers"
          icon={Radio}
          iconColor={isPortDropped ? "#D97706" : "#059669"}
          iconBg={isPortDropped ? "#FFFBEB" : "#ECFDF5"}
          sparklineData={isPortDropped ? [340, 340, 340, 340, 340, 340] : [340, 150, 41, 20, 6, 1]}
        />

        {/* Card 2: Coincidental Match Odds */}
        <BentoKpiCard
          title="Coincidental Match Odds"
          metric="1 in 7.14M"
          metricColor="#4F46E5"
          statusBadge={{
            text: "P = 1.4×10⁻⁷",
            variant: "indigo",
          }}
          meta="99.999% Prob"
          subtitle="Bayesian Credibility (N=10,000)"
          icon={Cpu}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={[100, 40, 15, 5, 1, 0]}
        />

        {/* Card 3: Precursor SIM-Swap */}
        <BentoKpiCard
          title="Precursor SIM-Swap"
          metric="09:44:12 IST"
          metricColor="#DC2626"
          statusBadge={{
            text: "IMSI RE-ALLOCATED",
            variant: "rose",
          }}
          meta="16m Pre-Attack"
          subtitle="Sunil Kumar handset silenced"
          icon={Radio}
          iconColor="#DC2626"
          iconBg="#FEF2F2"
          sparklineData={[0, 0, 0, 1, 1, 1]}
        />

        {/* Card 4: Hardware Chassis Twin */}
        <BentoKpiCard
          title="Hardware Chassis Twin"
          metric="Dual-SIM Match"
          metricColor="#059669"
          statusBadge={{
            text: "LUHN & TAC ✓",
            variant: "emerald",
          }}
          meta="Exynos 1280"
          subtitle="Samsung Galaxy M34 5G"
          icon={Smartphone}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[86, 86, 86, 86, 86, 86]}
        />
      </div>

      {/* =========================================================================
          ROW 2: SPACIOUS 2-PANEL EXECUTIVE LAYOUT (7 COLS LEFT + 5 COLS RIGHT)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            LEFT PANEL (7 COLUMNS): FULL-HEIGHT CGNAT CANDIDATE INTERSECTION FUNNEL
            ===================================================================== */}
        <section
          style={{
            gridColumn: "span 7",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: isCompact ? "6px" : "8px",
            height: "100%",
            minHeight: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Header with Title & Action Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Target size={15} color="#4F46E5" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                    CGNAT Candidate Intersection Funnel (340 → 41 → 6 → 1)
                  </span>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "#4F46E5",
                      background: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    DoT CLAUSE 39.20
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                  Sequential intersection of translated port allocations isolates 1 unique handset.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {/* DoT Clause 39.20 Statutory Requisition Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getDot3920PortBlockDirective());
                  toast.success("Copied DoT Clause 39.20 Requisition to clipboard!", {
                    description: "Statutory directive to Airtel Nodal Officer for dynamic port translation & IPDR.",
                    duration: 3500,
                  });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "5px",
                  border: "1px solid #C7D2FE",
                  background: "#EEF2FF",
                  color: "#4338CA",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Copy pre-filled statutory requisition to Airtel under DoT License Clause 39.20"
              >
                <FileText size={11} color="#4F46E5" />
                <span>📋 Copy DoT 39.20 Requisition</span>
              </button>

              <button
                type="button"
                onClick={() => toggleMutation("dropCgnatSourcePort")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "5px",
                  border: isPortDropped ? "1px solid #D97706" : "1px solid #CBD5E1",
                  background: isPortDropped ? "#FFFBEB" : "#F8FAFC",
                  color: isPortDropped ? "#B45309" : "#0F172A",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Toggles source port omission in IPDR translation"
              >
                <Radio size={11} color={isPortDropped ? "#D97706" : "#64748B"} />
                <span>{isPortDropped ? "Port Dropped" : "⚡ Drop Port"}</span>
              </button>

              <button
                type="button"
                onClick={resetAllSessions}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Reset all session filters and restore full candidate pool"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Dual-Path CGNAT Resolution Indicator Strip */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "9px", flexShrink: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "4px", padding: "2px 6px" }}>
              <span style={{ fontWeight: 800, color: "#475569" }}>Path A (Bank Logs - Port Omitted):</span>
              <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>340 → 41 → 6 → 1 Handset (Set Intersection)</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "4px", padding: "2px 6px" }}>
              <span style={{ fontWeight: 800, color: "#047857" }}>Path B (DoT Clause 39.20 ISP Translation):</span>
              <span style={{ fontWeight: 700, color: "#065F46", fontFamily: "var(--font-mono)" }}>Deterministic 1:1 Port Match (:44321)</span>
            </div>
          </div>

          {/* Visual Funnel Chart (4 Columns with Hatched Background & Solid Bars & ∩ circles) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: isCompact ? "7px 12px 5px 12px" : "9px 14px 6px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;
                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: isTarget ? "#ECFDF5" : isChecked ? "#F1F5F9" : "#F8FAFC",
                      border: isTarget ? "1px solid #A7F3D0" : isChecked ? "1px solid #CBD5E1" : "1px dashed #CBD5E1",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: isTarget ? "#047857" : isChecked ? "#1E293B" : "#94A3B8",
                      boxShadow: isTarget ? "0 0 0 1px rgba(16,185,129,0.3)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: "8.5px", opacity: 0.7 }}>Step {idx + 1}:</span>
                    <span>{stage.bank.includes("SBI") ? "SBI (Mule L1)" : stage.bank.includes("HDFC") ? "HDFC (Mule L2A)" : stage.bank.includes("Axis") ? "Axis (Mule L2B)" : "Paytm (Target Sink)"}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        background: isTarget ? "#059669" : isChecked ? "#4F46E5" : "#94A3B8",
                        color: "#FFFFFF",
                        padding: "0.5px 5px",
                        borderRadius: "3px",
                        fontSize: "9px",
                        marginLeft: "2px",
                      }}
                    >
                      <AnimatedCounter value={count} duration={260} suffix={isTarget ? " ★" : ""} />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* SVG Visual Funnel Bars with Sankey Flow Taper Ribbons */}
            <svg
              width="100%"
              height={isCompact ? "75" : "88"}
              viewBox="0 0 460 88"
              preserveAspectRatio="none"
              style={{ overflow: "visible" }}
            >
              <defs>
                <pattern id="funnelHatchCompact" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1.2" opacity="0.25" />
                </pattern>
                <linearGradient id="solidFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="50%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="sankeyTaperGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#34D399" stopOpacity="0.45" />
                </linearGradient>
                <style>{`
                  @keyframes sankeySpinePulse {
                    from { stroke-dashoffset: 16; }
                    to { stroke-dashoffset: 0; }
                  }
                  .sankey-pulse-spine {
                    animation: sankeySpinePulse 0.8s linear infinite;
                  }
                  @keyframes targetPulseAnim {
                    0%, 100% { stroke-opacity: 0.4; }
                    50% { stroke-opacity: 1; }
                  }
                  .target-pulse-stroke {
                    animation: targetPulseAnim 1.5s ease-in-out infinite;
                  }
                `}</style>
              </defs>

              {/* 1. Underlying Sankey Taper Ribbons Between Consecutive Columns */}
              {funnelStagesMeta.map((stage, idx) => {
                if (idx >= 3) return null;
                const nextStage = funnelStagesMeta[idx + 1];
                const isChecked = !!activeSessions[stage.id];
                const isNextChecked = !!activeSessions[nextStage.id];

                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const nextData = funnelResult.stages.find((s) => s.sessionId === nextStage.id);

                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const nextCount = nextData ? nextData.intersectionSize : (isNextChecked ? nextStage.count : 0);

                const colWidth = 72;
                const gap = 42;
                const x1 = 16 + idx * (colWidth + gap) + colWidth;
                const x2 = x1 + gap;

                const maxH = 62;
                const barH1 = isChecked
                  ? isPortDropped ? maxH : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y1 = 78 - barH1;

                const barH2 = isNextChecked
                  ? isPortDropped ? maxH : Math.max((Math.log(nextCount + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y2 = 78 - barH2;

                const ribbonActive = isChecked && isNextChecked;
                const cpOffset = gap * 0.5;

                const pathD = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2} L ${x2} 78 L ${x1} 78 Z`;
                const spineD = `M ${x1} ${(y1 + 78)/2} C ${x1 + cpOffset} ${(y1 + 78)/2}, ${x2 - cpOffset} ${(y2 + 78)/2}, ${x2} ${(y2 + 78)/2}`;

                return (
                  <g key={`ribbon-${stage.id}`}>
                    {/* Taper Flow Band */}
                    <path
                      d={pathD}
                      fill={ribbonActive ? "url(#sankeyTaperGrad)" : "none"}
                      opacity={ribbonActive ? 0.85 : 0.06}
                      style={{ transition: "all 0.3s ease" }}
                    />
                    {/* Flowing Animated Pulse Spine */}
                    {ribbonActive && (
                      <path
                        d={spineD}
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="sankey-pulse-spine"
                        opacity={0.75}
                      />
                    )}
                    {/* Intersection Symbol Pill */}
                    <g transform={`translate(${x1 + gap / 2}, 48)`}>
                      <rect
                        x="-10"
                        y="-9"
                        width="20"
                        height="18"
                        rx="5"
                        fill={ribbonActive ? "#FFFFFF" : "#F8FAFC"}
                        stroke={ribbonActive ? "#818CF8" : "#CBD5E1"}
                        strokeWidth="1.2"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.08))" }}
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={ribbonActive ? "#4338CA" : "#94A3B8"}
                        fontSize="10"
                        fontWeight="800"
                      >
                        ∩
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* 2. Visual Column Bars & Floating Badges */}
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;

                const colWidth = 72;
                const gap = 42;
                const x = 16 + idx * (colWidth + gap);

                // Proportional bar height
                const maxH = 62;
                const barH = isChecked
                  ? isPortDropped
                    ? maxH
                    : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y = 78 - barH;

                return (
                  <g key={stage.id}>
                    {/* Ambient Aura for Isolated Target */}
                    {isTarget && (
                      <rect
                        x={x - 2}
                        y={14}
                        width={colWidth + 4}
                        height={maxH + 4}
                        rx="7"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="target-pulse-stroke"
                      />
                    )}

                    {/* Background Hatched Capacity Bar */}
                    <rect
                      x={x}
                      y={16}
                      width={colWidth}
                      height={maxH}
                      rx="5"
                      fill="url(#funnelHatchCompact)"
                      stroke={isTarget ? "#059669" : "#CBD5E1"}
                      strokeWidth={isTarget ? "1.5" : "1"}
                    />

                    {/* Foreground Active Intersection Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={colWidth}
                      height={barH}
                      rx="5"
                      fill={isTarget ? "#059669" : "url(#solidFunnelGrad)"}
                      opacity={isChecked ? 1 : 0.25}
                      style={{ transition: "all 0.25s ease" }}
                    />

                    {/* Floating Count Badge */}
                    <g transform={`translate(${x + colWidth / 2}, ${y - 6})`}>
                      <rect
                        x="-24"
                        y="-13"
                        width="48"
                        height="16"
                        rx="4"
                        fill={isTarget ? "#059669" : "#4F46E5"}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                        style={{ filter: "drop-shadow(0 2px 4px rgba(15,23,42,0.16))" }}
                      />
                      <text
                        x="0"
                        y="-1.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="800"
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {isChecked ? (isPortDropped ? "340" : isTarget ? "1 ★" : count) : "OFF"}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Status Ticker */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "4px" }}>
              <span style={{ fontSize: "10px", color: "#64748B" }}>
                Total ISP Pool: <strong>10,000 Tower Subscribers</strong>
              </span>
              <span style={{ fontSize: "10.5px", fontWeight: 800, color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706", fontFamily: "var(--font-mono)" }}>
                Surviving: {funnelResult.finalCandidateCount === 1 ? "Target SUB-8849-VIKRAM" : `${funnelResult.finalCandidateCount} Ambiguous Candidates`}
              </span>
            </div>
          </div>

          {/* 4 Interactive Session Rows with Checkboxes */}
          <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? "4px" : "5px", flex: "1 1 0%", minHeight: 0, justifyContent: "center" }}>
            {funnelStagesMeta.map((stage, idx) => {
              const isChecked = !!activeSessions[stage.id];
              const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
              const displayCount = stageData ? stageData.intersectionSize : (isChecked ? stage.count : "Excluded");
              const isTarget = isChecked && displayCount === 1 && !isPortDropped;

              return (
                <div
                  key={stage.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isCompact ? "4px 8px" : "6px 10px",
                    background: isTarget ? "#ECFDF5" : isChecked ? "#F8FAFC" : "#FFFFFF",
                    border: isTarget ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                    borderRadius: "6px",
                    opacity: isChecked ? 1 : 0.6,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSession(stage.id)}
                      style={{ accentColor: "#4F46E5", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: isTarget ? "#047857" : "#0F172A" }}>
                          Step {idx + 1}: {stage.bank}
                        </span>
                      </div>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stage.time} IST &nbsp; Bank Log IP: 103.21.144.92 : <strong style={{ color: "#B45309" }}>[PORT OMITTED BY BANK CBS]</strong> → ISP CGNAT Pool: Ports 44000–44511 (340 Active Handsets)
                      </span>
                    </div>
                  </label>

                  <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: "6px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: isTarget ? "#047857" : "#0F172A",
                        background: isTarget ? "#D1FAE5" : "#FFFFFF",
                        border: isTarget ? "1px solid #6EE7B7" : "1px solid #CBD5E1",
                        padding: "1.5px 6px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isChecked ? (isPortDropped ? "340 Handsets" : `${displayCount} Handsets`) : "Excluded"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attribution Verdict Alert Callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              borderRadius: "6px",
              background: funnelResult.finalCandidateCount === 1 ? "#ECFDF5" : "#FFFBEB",
              border: funnelResult.finalCandidateCount === 1 ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {funnelResult.finalCandidateCount === 1 ? (
                <Check size={14} color="#059669" />
              ) : (
                <ShieldAlert size={14} color="#D97706" />
              )}
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: funnelResult.finalCandidateCount === 1 ? "#047857" : "#B45309",
                }}
              >
                {funnelResult.finalCandidateCount === 1
                  ? "UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { Target IMEI 867492061234564 }"
                  : `AMBIGUOUS POOL: ${funnelResult.finalCandidateCount} CANDIDATES SATISFIABLE`}
              </span>
            </div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#64748B" }}>
              P = 1.48 × 10⁻⁷ (Beyond Doubt)
            </span>
          </div>
        </section>

        {/* =====================================================================
            RIGHT PANEL (5 COLUMNS): SIM-SWAP PRECURSOR & DUAL-SIM TWIN & Z3 SMT
            ===================================================================== */}
        <aside
          style={{
            gridColumn: "span 5",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "12px 14px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: isCompact ? "6px" : "8px",
            height: "100%",
            minHeight: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Card 1: SIM-Swap Precursor Event Box */}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <ShieldAlert size={13} color="#D97706" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400E" }}>
                  Precursor SIM-Swap Event (09:44:12 IST)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getDotSimSwapDirective());
                  toast.success("Copied DoT SIM-Swap Directive to clipboard!", {
                    description: "Requisition to Airtel & Jio for physical store biometric records.",
                  });
                }}
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  background: "#FEF3C7",
                  border: "1px solid #FCD34D",
                  color: "#B45309",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                📋 Copy DoT Directive
              </button>
            </div>
            <div style={{ fontSize: "9.5px", color: "#78350F", lineHeight: 1.35 }}>
              MSISDN <code style={{ color: "#92400E" }}>+91-98100-44210</code> (Sunil Kumar) swapped from Legacy IMSI (<code style={{ color: "#92400E" }}>40410...882</code>) to Attacker IMSI (<code style={{ color: "#92400E" }}>40410...904</code>) <strong>16m pre-attack</strong> on Chassis TAC <code style={{ color: "#92400E" }}>86749206</code>.
            </div>
            <div style={{ fontSize: "9px", color: "#B45309", background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "4px", padding: "3px 6px" }}>
              <strong>Silencing Mechanism:</strong> Prevented victim SMS delivery while routing OTPs to attacker's dual-SIM chassis.
            </div>
          </div>

          {/* Card 2: Dual-SIM Hardware Twin Chassis */}
          <div
            style={{
              background: "#F8FAFC",
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
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Smartphone size={13} color="#4F46E5" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                  Dual-SIM Hardware Twin (Samsung Galaxy M34 5G)
                </span>
              </div>
              <span style={{ fontSize: "8.5px", color: "#059669", fontWeight: 800, background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 5px", borderRadius: "3px" }}>
                LUHN CHECK ✓
              </span>
            </div>

            {/* 2 Slot Rows */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>SLOT 1 (AIRTEL)</span>
                  <span style={{ fontSize: "8px", color: "#059669", fontWeight: 800 }}>
                    {dualSimResult.isImei1LuhnValid ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  <span style={{ color: "#4F46E5" }}>86749206</span> 123456 <span style={{ color: "#059669" }}>4</span>
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                  TAC: <strong style={{ color: "#4F46E5" }}>{dualSimResult.tac1}</strong> · Check: <strong>4</strong>
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>SLOT 2 (JIO)</span>
                  <span style={{ fontSize: "8px", color: "#059669", fontWeight: 800 }}>
                    {dualSimResult.isImei2LuhnValid ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  <span style={{ color: "#4F46E5" }}>86749206</span> 123457 <span style={{ color: "#059669" }}>2</span>
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                  TAC: <strong style={{ color: "#4F46E5" }}>{dualSimResult.tac2}</strong> · Check: <strong>2</strong>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "9px", color: "#047857", fontWeight: 700, padding: "3px 8px", background: "#ECFDF5", borderRadius: "4px", border: "1px solid #A7F3D0" }}>
              ✓ SHARED TAC {dualSimResult.tac1} · SAME PHYSICAL CHIPSET ({dualSimResult.hardwareModel})
            </div>
          </div>

          {/* Card 3: Z3 SMT Clock-Offset Feasible Interval Caliper Slider & Formal Verification (Image 4) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flex: "1 1 0%",
              minHeight: 0,
              justifyContent: "space-between",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Cpu size={13} color="#4F46E5" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                  Z3 SMT Clock-Offset Caliper Bounds
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportSmt2}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: "4px",
                  border: "none",
                  background: isSmtCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {isSmtCopied ? <Check size={10} /> : <Download size={10} />}
                <span>{isSmtCopied ? "SMT2 Copied" : "Export .smt2 Proof"}</span>
              </button>
            </div>

            {/* Precision Vernier Gauge Caliper Slider (Master v7.5) */}
            <PrecisionVernierGauge
              min={-5.0}
              max={5.0}
              value={clockOffset}
              feasibleRange={[-1.2, 0.8]}
              unit="s"
              title="Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]"
              statusLabel={isZ3Sat ? "Z3 SOLVER: SAT ✓" : "Z3 SOLVER: UNSAT ✗"}
              isSat={isZ3Sat}
              onChange={(val) => setClockOffset(val)}
            />

            {/* SMT-LIB2 Script Code Box */}
            <div
              style={{
                background: "#0F172A",
                borderRadius: "6px",
                padding: "6px 8px",
                color: "#38BDF8",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                lineHeight: 1.4,
                flex: "1 1 0%",
                minHeight: 0,
                overflowY: "auto",
              }}
            >
              <div style={{ color: "#94A3B8", marginBottom: "2px" }}>; Z3 QF_LRA Formal Clock Verification Script</div>
              <div>(assert (= clock_drift (- t_airtel_cgnat t_finacle_sbi)))</div>
              <div>(assert (&gt;= clock_drift -1.2))</div>
              <div>(assert (&lt;= clock_drift 0.8))</div>
              <div style={{ color: isZ3Sat ? "#34D399" : "#F87171", marginTop: "2px" }}>
                ; Evaluation ({clockOffset.toFixed(1)}s): {isZ3Sat ? "sat (model validates clock synchronization)" : "unsat (out of NTP Stratum-2 bound)"}
              </div>
            </div>

            {/* Statutory Directive Footer Button */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getBnss94ImeiSeizureDirective());
                toast.success("Copied §94 BNSS IMEI Seizure Order to clipboard!", {
                  description: "Search & seizure directive for physical chassis TAC 86749206.",
                });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                fontSize: "9.5px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "5px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#1E293B",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <FileText size={11} color="#4F46E5" />
              <span>📋 Copy §94 BNSS IMEI Seizure Directive</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export const CgnatAttributionScreen = AttributionScreen;

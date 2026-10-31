import React, { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Smartphone,
  Cpu,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Target,
  Download,
  Check,
  CheckCircle2,
  Lock,
  FileText,
  Copy,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
import { getDot3920PortBlockDirective } from "../../utils/statutoryDirectives";
import {
  solveCgnatFunnel,
  analyzeDualSimHardware,
  detectHotspotCollision,
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

  // 2. Hotspot State
  const isHotspotActive = !!mutations.triggerHotspotCollision;
  const hotspotResult = useMemo(() => {
    const observed = isHotspotActive ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [isHotspotActive]);

  // 3. Dual-SIM Hardware Twin State
  const imei1 = canonicalData.canonicalImei1; // "867492061234564"
  const imei2 = canonicalData.canonicalImei2; // "867492061234572"

  const dualSimResult = useMemo(() => {
    return analyzeDualSimHardware(imei1, imei2, 18);
  }, [imei1, imei2]);

  // 4. Z3 SMT Export State
  const [isSmtCopied, setIsSmtCopied] = useState(false);
  const handleExportSmt2 = () => {
    const smt2Script = `; TARKA v5.0 — Z3 SMT Clock-Offset Verification Script
; Case: CASE-2026-001 (Airtel CGNAT vs SBI Finacle Clock Bounds)
(set-logic QF_LRA)
(declare-const t_finacle_sbi Real)
(declare-const t_airtel_cgnat Real)
(declare-const clock_drift Real)

; Measured bounds under NTP Stratum-2 sync
(assert (= clock_drift (- t_airtel_cgnat t_finacle_sbi)))
(assert (>= clock_drift -1.2))
(assert (<= clock_drift 0.8))

(check-sat)
(get-model)
`;
    navigator.clipboard.writeText(smt2Script);
    setIsSmtCopied(true);
    toast.success("Z3 SMT2 formal verification script copied to clipboard!");
    setTimeout(() => setIsSmtCopied(false), 2000);
  };

  // 5. Copy Device XML State
  const [isXmlCopied, setIsXmlCopied] = useState(false);
  const handleCopyXml = () => {
    const xml = `<Device mobile="919871123941" geocode="28.5355,77.3910" location="Noida Sector 18" ip="103.21.144.92" app="com.sbi.upi" capability="0001" />`;
    navigator.clipboard.writeText(xml);
    setIsXmlCopied(true);
    toast.success("UPI 2.0 <Device> XML snippet copied!");
    setTimeout(() => setIsXmlCopied(false), 2000);
  };

  // Funnel Stage Meta Configuration
  const funnelStagesMeta = [
    {
      id: "SESS-01",
      bank: "Login 1: SBI Mule 1083",
      shortBank: "SBI Mule",
      time: "07:48:04",
      count: 340,
      port: "44321",
      sessionPool: "340 Handsets",
    },
    {
      id: "SESS-02",
      bank: "Login 2: HDFC Mule 9920",
      shortBank: "HDFC Mule",
      time: "07:51:19",
      count: 41,
      port: "44389",
      sessionPool: "41 Handsets",
    },
    {
      id: "SESS-03",
      bank: "Login 3: Axis Mule 4102",
      shortBank: "Axis Mule",
      time: "07:54:51",
      count: 6,
      port: "44810",
      sessionPool: "6 Handsets",
    },
    {
      id: "SESS-04",
      bank: "Login 4: Paytm Sink 1109",
      shortBank: "Paytm Sink",
      time: "07:58:10",
      count: 1,
      port: "45102",
      sessionPool: "1 Unique Handset ★",
    },
  ];

  return (
    <div
      className={`tarka-attribution-root ${isCompact ? "tarka-density-compact" : ""}`}
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

        {/* Card 3: Packet Hop Telemetry */}
        <BentoKpiCard
          title="Packet Hop Telemetry"
          metric={hotspotResult.isHotspotDetected ? "TTL = 63" : "TTL = 64"}
          metricColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "TETHERED AP" : "DIRECT 4G/5G",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
          }}
          meta="Airtel PGW"
          subtitle="Ingress hop count at PGW base"
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
          sparklineData={
            hotspotResult.isHotspotDetected
              ? [64, 64, 64, 63, 63, 63]
              : [64, 64, 64, 64, 64, 64]
          }
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
          2. ROW 2: INTERACTIVE CGNAT FUNNEL (7 COL) & HOTSPOT TOPOLOGY (5 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flexShrink: 0 }}>
        {/* ROW 2 LEFT (7 COLUMNS): INTERACTIVE CGNAT CANDIDATE INTERSECTION FUNNEL */}
        <div
          style={{
            gridColumn: "span 7",
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
          {/* Header with Title & Action Controls */}
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
                <Target size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                CGNAT Candidate Intersection Funnel
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

            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
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
                  padding: "3.5px 7px",
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
                  padding: "3.5px 7px",
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
                  padding: "3.5px 7px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Reset all session filters"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Visual Funnel Chart (Crisp Convergent Funnel with Flowing Stream Ribbons & Set Nodes) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "7px 10px 5px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {/* Unified Column Headers with Bank Brand Badges & Live Counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", alignItems: "center" }}>
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;

                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isTarget ? "#ECFDF5" : isChecked ? "#FFFFFF" : "#F1F5F9",
                      border: isTarget ? "1px solid #A7F3D0" : isChecked ? "1px solid #E2E8F0" : "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "2.5px 6px",
                      boxShadow: isChecked ? "0 1px 2px rgba(15,23,42,0.03)" : "none",
                      opacity: isChecked ? 1 : 0.6,
                    }}
                  >
                    <span style={{ fontSize: "9.5px", fontWeight: 700, color: isTarget ? "#047857" : "#0F172A", whiteSpace: "nowrap" }}>
                      {idx + 1}. {stage.shortBank}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: isTarget ? "#047857" : isChecked ? "#4338CA" : "#64748B",
                        background: isTarget ? "#D1FAE5" : isChecked ? "#EEF2FF" : "#F1F5F9",
                        border: isTarget ? "1px solid #6EE7B7" : isChecked ? "1px solid #C7D2FE" : "1px solid #CBD5E1",
                        padding: "0.5px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      {isChecked ? (isPortDropped ? "340" : isTarget ? "1 ★" : count) : "OFF"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* SVG Visual Funnel with Convergent Flowing Stream Ribbons */}
            <svg
              width="100%"
              height={isCompact ? "74" : "80"}
              viewBox="0 0 520 80"
              preserveAspectRatio="none"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* Diagonal Sieve Pattern for Silo Capacity */}
                <pattern id="siloGridPattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1" opacity="0.22" />
                </pattern>

                {/* Primary Silo Gradient (Indigo to Cyan) */}
                <linearGradient id="funnelSiloGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4338CA" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>

                {/* Target Silo Gradient (Emerald to Teal) */}
                <linearGradient id="funnelTargetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                {/* Translucent Connecting Stream Ribbon Gradient */}
                <linearGradient id="streamRibbonGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.20" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.18" />
                </linearGradient>
              </defs>

              {/* Draw 3 Convergent Flowing Stream Ribbons between sequential silos */}
              {funnelStagesMeta.slice(0, 3).map((stage, idx) => {
                const nextStage = funnelStagesMeta[idx + 1];
                const isChecked1 = !!activeSessions[stage.id];
                const isChecked2 = !!activeSessions[nextStage.id];
                const bothActive = isChecked1 && isChecked2;

                const stageData1 = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count1 = stageData1 ? stageData1.intersectionSize : (isChecked1 ? stage.count : 0);

                const stageData2 = funnelResult.stages.find((s) => s.sessionId === nextStage.id);
                const count2 = stageData2 ? stageData2.intersectionSize : (isChecked2 ? nextStage.count : 0);

                const colW = 76;
                const col1X = 14 + idx * (colW + 68);
                const col2X = col1X + colW + 68;

                const maxH = 54;
                const baseY = 68;

                const h1 = isChecked1 ? (isPortDropped ? maxH : Math.max((Math.log(count1 + 1) / Math.log(341)) * maxH, 8)) : 3;
                const h2 = isChecked2 ? (isPortDropped ? maxH : Math.max((Math.log(count2 + 1) / Math.log(341)) * maxH, 8)) : 3;

                const y1 = baseY - h1;
                const y2 = baseY - h2;

                const midX = (col1X + colW + col2X) / 2;

                // Bezier curve points for fluid connecting ribbon
                const ribbonPath = `M ${col1X + colW},${y1} C ${midX},${y1} ${midX},${y2} ${col2X},${y2} L ${col2X},${baseY} L ${col1X + colW},${baseY} Z`;
                const topCurvePath = `M ${col1X + colW},${y1} C ${midX},${y1} ${midX},${y2} ${col2X},${y2}`;

                // Calculate drop delta percentage
                const reductionPct = count1 > 0 ? Math.round(((count1 - count2) / count1) * 100) : 0;

                return (
                  <g key={`ribbon-${idx}`}>
                    {/* Connecting Ribbon Stream Body */}
                    <path
                      d={ribbonPath}
                      fill="url(#streamRibbonGrad)"
                      opacity={bothActive ? 1 : 0.12}
                      style={{ transition: "all 0.3s ease" }}
                    />
                    {/* Glowing Top Hairline Guide */}
                    <path
                      d={topCurvePath}
                      fill="none"
                      stroke={bothActive ? "#6366F1" : "#CBD5E1"}
                      strokeWidth={bothActive ? "1.5" : "1"}
                      strokeDasharray={bothActive ? "none" : "3 3"}
                      opacity={bothActive ? 0.6 : 0.25}
                      style={{ transition: "all 0.3s ease" }}
                    />

                    {/* Circular Set Intersection Badge ∩ with Entropy Delta */}
                    <g transform={`translate(${midX}, 42)`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="9"
                        fill="#FFFFFF"
                        stroke={bothActive ? "#C7D2FE" : "#E2E8F0"}
                        strokeWidth="1.2"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.06))" }}
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={bothActive ? "#4338CA" : "#94A3B8"}
                        fontSize="10"
                        fontWeight="900"
                        fontFamily="system-ui, sans-serif"
                      >
                        ∩
                      </text>

                      {/* Entropy reduction pill tag */}
                      {bothActive && !isPortDropped && reductionPct > 0 && (
                        <g transform="translate(0, 16)">
                          <rect
                            x="-15"
                            y="-5.5"
                            width="30"
                            height="11"
                            rx="3"
                            fill="#EEF2FF"
                            stroke="#C7D2FE"
                            strokeWidth="0.8"
                          />
                          <text
                            x="0"
                            y="2.5"
                            textAnchor="middle"
                            fill="#4F46E5"
                            fontSize="7"
                            fontWeight="800"
                            fontFamily="var(--font-mono)"
                          >
                            -{reductionPct}%
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* Draw 4 Cylindrical Silo Columns with Levels */}
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;

                const colW = 76;
                const colX = 14 + idx * (colW + 68);
                const maxH = 54;
                const baseY = 68;

                const barH = isChecked
                  ? isPortDropped
                    ? maxH
                    : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 8)
                  : 3;
                const barY = baseY - barH;

                return (
                  <g key={stage.id}>
                    {/* Background Silo Frame with Diagonal Sieve */}
                    <rect
                      x={colX}
                      y={baseY - maxH}
                      width={colW}
                      height={maxH}
                      rx="5"
                      fill="url(#siloGridPattern)"
                      stroke={isChecked ? "#CBD5E1" : "#E2E8F0"}
                      strokeWidth="1"
                    />

                    {/* Silo Capacity Ruler Tick Marks (25%, 50%, 75%) */}
                    <line x1={colX + 2} y1={baseY - maxH * 0.75} x2={colX + 7} y2={baseY - maxH * 0.75} stroke="#94A3B8" strokeWidth="1" opacity="0.35" />
                    <line x1={colX + 2} y1={baseY - maxH * 0.50} x2={colX + 10} y2={baseY - maxH * 0.50} stroke="#94A3B8" strokeWidth="1" opacity="0.35" />
                    <line x1={colX + 2} y1={baseY - maxH * 0.25} x2={colX + 7} y2={baseY - maxH * 0.25} stroke="#94A3B8" strokeWidth="1" opacity="0.35" />

                    {/* Active Fluid Intersection Volume Bar */}
                    <rect
                      x={colX}
                      y={barY}
                      width={colW}
                      height={barH}
                      rx="5"
                      fill={isTarget ? "url(#funnelTargetGrad)" : "url(#funnelSiloGrad)"}
                      opacity={isChecked ? 1 : 0.25}
                      style={{ transition: "all 0.3s ease" }}
                    />

                    {/* Glossy Specular Highlight on Bar Top Edge */}
                    {isChecked && barH > 5 && (
                      <line
                        x1={colX + 3}
                        y1={barY + 1.2}
                        x2={colX + colW - 3}
                        y2={barY + 1.2}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.6"
                      />
                    )}

                    {/* Step 4 Target Reticle Radar Beacon */}
                    {isTarget && (
                      <g transform={`translate(${colX + colW / 2}, ${barY + barH / 2})`}>
                        <circle cx="0" cy="0" r="12" fill="none" stroke="#A7F3D0" strokeWidth="1" strokeDasharray="2 2" />
                        <circle cx="0" cy="0" r="4" fill="#047857" />
                        <path d="M-6,0 L-3,0 M3,0 L6,0 M0,-6 L0,-3 M0,3 L0,6" stroke="#047857" strokeWidth="1.2" />
                      </g>
                    )}

                    {/* Stage Subscript Label ($S_1$, $S_1 \cap S_2$, etc.) */}
                    <text
                      x={colX + colW / 2}
                      y={baseY + 10}
                      textAnchor="middle"
                      fill={isTarget ? "#047857" : isChecked ? "#475569" : "#94A3B8"}
                      fontSize="8.5"
                      fontWeight="800"
                      fontFamily="var(--font-mono)"
                    >
                      {idx === 0 ? "S₁ (Pool)" : idx === 1 ? "S₁ ∩ S₂" : idx === 2 ? "S₁..S₃" : "S_TARGET ★"}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Status Ticker */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #E2E8F0",
                paddingTop: "3px",
                fontSize: "9.5px",
              }}
            >
              <span style={{ color: "#64748B" }}>
                Total ISP Pool: <strong>10,000 Tower Subscribers</strong> (Rohini Sec 4)
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {funnelResult.finalCandidateCount === 1
                  ? "✓ Isolated Target: SUB-8849-VIKRAM (IMEI 867492061234564)"
                  : `Ambiguous Pool: ${funnelResult.finalCandidateCount} Surviving Candidates`}
              </span>
            </div>
          </div>

          {/* 4 Interactive Session Rows with Clear Technical Hierarchy */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                    padding: "4px 9px",
                    borderRadius: "6px",
                    background: isTarget ? "#ECFDF5" : isChecked ? "#F8FAFC" : "#F1F5F9",
                    border: isTarget ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                    opacity: isChecked ? 1 : 0.5,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSession(stage.id)}
                      style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "#4F46E5", margin: 0, flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap" }}>
                        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                          Step {idx + 1}: {stage.bank}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            background: "#F1F5F9",
                            padding: "0.5px 4px",
                            borderRadius: "3px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stage.time} IST
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          color: "#475569",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {isPortDropped ? (
                          <>
                            Bank Log IP: 103.21.144.92 :{" "}
                            <span style={{ color: "#B45309", fontWeight: 700 }}>[PORT OMITTED BY BANK CBS — AMBIGUOUS 340 HANDSETS]</span>
                          </>
                        ) : (
                          <>
                            Airtel IPDR Src Port: <strong style={{ color: "#4F46E5" }}>{stage.port}</strong> → {idx === 0 ? "S₁ Pool" : idx === 1 ? "S₁ ∩ S₂ Pool" : idx === 2 ? "S₁ ∩ S₂ ∩ S₃" : "Target Isolation"}: {stage.sessionPool} (Public IP: 103.21.144.92)
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, marginLeft: "6px" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 800,
                        color: isTarget ? "#047857" : "#0F172A",
                        background: isTarget ? "#D1FAE5" : "#FFFFFF",
                        border: isTarget ? "1px solid #6EE7B7" : "1px solid #E2E8F0",
                        padding: "1.5px 6px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      {isChecked ? (isPortDropped ? "340 Handsets" : `${displayCount} Handsets`) : "Excluded"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verdict Callout Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4.5px 9px",
              borderRadius: "6px",
              background: funnelResult.finalCandidateCount === 1 ? "#ECFDF5" : "#FFFBEB",
              border: funnelResult.finalCandidateCount === 1 ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
              {funnelResult.finalCandidateCount === 1 ? <ShieldCheck size={13} color="#059669" /> : <ShieldAlert size={13} color="#D97706" />}
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: funnelResult.finalCandidateCount === 1 ? "#047857" : "#B45309",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {funnelResult.finalCandidateCount === 1
                  ? "UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { Target IMEI 867492061234564 }"
                  : `AMBIGUOUS POOL: ${funnelResult.finalCandidateCount} CANDIDATES SATISFIABLE`}
              </span>
            </div>
            <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>
              P = 1.40 × 10⁻⁷ (Beyond Doubt)
            </span>
          </div>
        </div>

        {/* ROW 2 RIGHT (5 COLUMNS): WI-FI HOTSPOT TETHERING & FORENSIC PACKET INSPECTION */}
        <div
          style={{
            gridColumn: "span 5",
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
          {/* Header with Title & Simulator Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wifi size={13} color={isHotspotActive ? "#E11D48" : "#059669"} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                Wi-Fi Hotspot Tethering Topology (TTL)
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation("triggerHotspotCollision")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 7px",
                borderRadius: "5px",
                border: isHotspotActive ? "1px solid #E11D48" : "1px solid #CBD5E1",
                background: isHotspotActive ? "#FFF1F2" : "#F8FAFC",
                color: isHotspotActive ? "#BE123C" : "#0F172A",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{isHotspotActive ? "Tethering Active" : "⚡ Simulate Hotspot"}</span>
            </button>
          </div>

          {/* 3-Node Topology Flow with Connecting Links */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "9px",
              padding: "7px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {/* Node 1: Burner Mule Phone */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "7px",
                padding: "5px 9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Smartphone size={12} color="#4F46E5" />
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                    Burner Mule Handset (Target)
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Samsung M34 5G · UPI &lt;Device&gt; IMEI-1
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 800, background: "#EEF2FF", color: "#4F46E5", padding: "1px 5px", borderRadius: "3px", fontFamily: "var(--font-mono)" }}>
                Init TTL: 64
              </span>
            </div>

            {/* Connecting Pipe Indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  padding: "1.5px 7px",
                  borderRadius: "4px",
                  fontSize: "9px",
                  fontWeight: 700,
                  background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                  color: isHotspotActive ? "#BE123C" : "#047857",
                  border: isHotspotActive ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>{isHotspotActive ? "▼ 802.11n Wi-Fi Hotspot (-1 TTL Hop Decrement)" : "▼ Direct 4G LTE Carrier Link (0 Hop Decrement)"}</span>
              </div>
            </div>

            {/* Node 2: Intermediate Accomplice Hotspot Gateway */}
            <div
              style={{
                background: isHotspotActive ? "#FFF1F2" : "#FFFFFF",
                border: isHotspotActive ? "1px solid #E11D48" : "1px dashed #CBD5E1",
                borderRadius: "7px",
                padding: "5px 9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: isHotspotActive ? "#FFE4E6" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wifi size={12} color={isHotspotActive ? "#E11D48" : "#94A3B8"} />
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: isHotspotActive ? "#BE123C" : "#64748B" }}>
                    {isHotspotActive ? "Accomplice Personal Gateway" : "No Intermediate Gateway"}
                  </div>
                  <div style={{ fontSize: "9px", color: isHotspotActive ? "#9F1239" : "#94A3B8" }}>
                    {isHotspotActive ? "Poco X5 5G · +91-9811409281 · BSSID 74:DA:38:A2:11:BC" : "Direct cellular RF link to base station"}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  background: isHotspotActive ? "#FFE4E6" : "#F1F5F9",
                  color: isHotspotActive ? "#BE123C" : "#94A3B8",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {isHotspotActive ? "Observed TTL: 63" : "Bypassed"}
              </span>
            </div>

            {/* Node 3: Airtel Cell Tower Base Station */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "7px",
                padding: "5px 9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Radio size={12} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                    Airtel Cell Tower DL-TWR-891
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    Sector 4 Rohini, Delhi · Public IP: 103.21.144.92
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                  color: isHotspotActive ? "#BE123C" : "#047857",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                PGW Ingress: {isHotspotActive ? "TTL=63" : "TTL=64"}
              </span>
            </div>
          </div>

          {/* High-Definition Forensic Packet Hop Dissector (Zero Dead Space!) */}
          <div
            style={{
              background: "#0F172A",
              borderRadius: "7px",
              padding: "7px 9px",
              color: "#F8FAFC",
              fontFamily: "var(--font-mono)",
              fontSize: "9.5px",
              lineHeight: 1.4,
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "2px" }}>
              <span style={{ color: "#38BDF8", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <Terminal size={10} /> PGW INGRESS IPv4 HEADER TELEMETRY
              </span>
              <span style={{ color: isHotspotActive ? "#F43F5E" : "#34D399", fontWeight: 800, fontSize: "8.5px" }}>
                {isHotspotActive ? "PROXIED VIA BSSID" : "DIRECT RF LINK"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 6px", fontSize: "9px" }}>
              <div><span style={{ color: "#94A3B8" }}>Ver / IHL:</span> 4 / 20 Bytes</div>
              <div><span style={{ color: "#94A3B8" }}>Flags / DF:</span> 0x02 (Don't Fragment)</div>
              <div><span style={{ color: "#94A3B8" }}>Total Len:</span> 1480 Bytes</div>
              <div>
                <span style={{ color: "#94A3B8" }}>TTL Field:</span>{" "}
                <strong style={{ color: isHotspotActive ? "#F43F5E" : "#34D399" }}>
                  {isHotspotActive ? "63 (Hop Decremented)" : "64 (Unmodified Base)"}
                </strong>
              </div>
              <div><span style={{ color: "#94A3B8" }}>Protocol:</span> TCP (0x06)</div>
              <div><span style={{ color: "#94A3B8" }}>Src Addr:</span> 10.128.42.19:44321</div>
            </div>
          </div>

          {/* Forensic Anomaly Proof Box */}
          <div
            style={{
              fontSize: "10px",
              lineHeight: 1.3,
              padding: "4px 7px",
              borderRadius: "5px",
              background: isHotspotActive ? "#FFF1F2" : "#F1F5F9",
              color: isHotspotActive ? "#9F1239" : "#334155",
              border: isHotspotActive ? "1px solid #FECDD3" : "1px solid #E2E8F0",
            }}
          >
            <strong>Forensic Proof:</strong> {hotspotResult.anomalySummary}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ROW 3: UPI DEVICE XML & JA4 (6 COL) & DUAL-SIM + Z3 SMT (6 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flex: 1, minHeight: 0 }}>
        {/* ROW 3 LEFT (6 COLUMNS): UPI 2.0 <Device> XML & JA4 TLS DUAL-ANCHOR INSPECTOR */}
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
            gap: isCompact ? "6px" : "7px",
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
                <Lock size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                UPI 2.0 &lt;Device&gt; XML & JA4 Client TLS Fingerprint
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                NPCI CENTRAL SWITCH
              </span>
              <button
                type="button"
                onClick={handleCopyXml}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "9.5px",
                  fontWeight: 600,
                  padding: "1.5px 5px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#334155",
                  cursor: "pointer",
                }}
                title="Copy UPI 2.0 <Device> XML snippet"
              >
                {isXmlCopied ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                <span>{isXmlCopied ? "Copied" : "Copy XML"}</span>
              </button>
            </div>
          </div>

          {/* Clean Light Syntax-Highlighted XML Pill */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              padding: "7px 10px",
              borderRadius: "7px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              lineHeight: 1.4,
              color: "#0F172A",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#4F46E5", fontWeight: 700 }}>&lt;Device</span>{" "}
            <span style={{ color: "#059669" }}>mobile=</span><span style={{ color: "#0284C7" }}>"919871123941"</span>{" "}
            <span style={{ color: "#059669" }}>geocode=</span><span style={{ color: "#0284C7" }}>"28.5355,77.3910"</span>{" "}
            <span style={{ color: "#059669" }}>location=</span><span style={{ color: "#0284C7" }}>"Noida Sector 18"</span>{" "}
            <span style={{ color: "#059669" }}>ip=</span><span style={{ color: "#0284C7" }}>"103.21.144.92"</span>{" "}
            <span style={{ color: "#059669" }}>app=</span><span style={{ color: "#0284C7" }}>"com.sbi.upi"</span>{" "}
            <span style={{ color: "#059669" }}>capability=</span><span style={{ color: "#0284C7" }}>"0001"</span>{" "}
            <span style={{ color: "#4F46E5", fontWeight: 700 }}>/&gt;</span>
          </div>

          {/* 4-Card Visual Anchor Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Registered MSISDN</span>
                <CheckCircle2 size={11} color="#059669" />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "1.5px 0" }}>
                {canonicalData.deviceXml.mobile}
              </div>
              <div style={{ fontSize: "8.5px", color: "#059669" }}>SIM Binding Verified SAT ✓</div>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Tower Geocode</span>
                <CheckCircle2 size={11} color="#059669" />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "1.5px 0" }}>
                {canonicalData.deviceXml.geocode}
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Noida Sec 18 Azimuth 120°</div>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Handset Chassis</span>
                <CheckCircle2 size={11} color="#059669" />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", margin: "1.5px 0" }}>
                SM-M346B/DS
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Samsung M34 5G Biometric SAT ✓</div>
            </div>

            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#047857", textTransform: "uppercase", fontWeight: 800 }}>JA4 TLS Fingerprint</span>
                <CheckCircle2 size={11} color="#059669" />
              </div>
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "1.5px 0" }}>
                t13d1516h2_8daaf6...
              </div>
              <div style={{ fontSize: "8.5px", color: "#059669" }}>Bank Switch TLS 1.3 Match ✓</div>
            </div>
          </div>

          {/* Dual-Anchor Confirmation Badge */}
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #6EE7B7",
              borderRadius: "6px",
              padding: "4px 7px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "9.5px",
              fontWeight: 700,
              color: "#047857",
            }}
          >
            <CheckCircle2 size={12} color="#059669" style={{ flexShrink: 0 }} />
            <span>
              ✓ DUAL-ANCHOR CONFIRMED: Handset IMEI (86749206...) + TLS JA4 Fingerprint (t13d1516h2...) Match Across All 4 Bank Sessions (Rules Out Passive IMEI Cloning)
            </span>
          </div>
        </div>

        {/* ROW 3 RIGHT (6 COLUMNS): DUAL-SIM IMEI LUHN TWIN & Z3 CLOCK-OFFSET RANGE CHART */}
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
            gap: isCompact ? "5px" : "7px",
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
                <Smartphone size={13} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                Dual-SIM IMEI Luhn Twin & Z3 SMT Bounds
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportSmt2}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 7px",
                borderRadius: "5px",
                border: "none",
                background: isSmtCopied ? "#059669" : "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isSmtCopied ? <Check size={10} /> : <Download size={10} />}
              <span>{isSmtCopied ? "SMT2 Copied" : "Export .smt2 Proof"}</span>
            </button>
          </div>

          {/* Side-by-Side Dual-SIM Slots */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
            {/* Slot 1: Airtel */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>SLOT 1 (AIRTEL)</span>
                <span style={{ fontSize: "8px", color: "#059669", fontWeight: 800, background: "#ECFDF5", padding: "0.5px 4px", borderRadius: "3px" }}>
                  {dualSimResult.isImei1LuhnValid ? "LUHN PASS ✓" : "LUHN FAIL ✗"}
                </span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "1.5px 0" }}>
                <span style={{ color: "#4F46E5" }}>86749206</span> 123456 <span style={{ color: "#059669" }}>4</span>
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                TAC: <strong style={{ color: "#4F46E5" }}>86749206</strong> · Check Digit: <strong>4</strong>
              </div>
            </div>

            {/* Slot 2: Jio */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "5px 7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>SLOT 2 (JIO)</span>
                <span style={{ fontSize: "8px", color: "#059669", fontWeight: 800, background: "#ECFDF5", padding: "0.5px 4px", borderRadius: "3px" }}>
                  {dualSimResult.isImei2LuhnValid ? "LUHN PASS ✓" : "LUHN FAIL ✗"}
                </span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "1.5px 0" }}>
                <span style={{ color: "#4F46E5" }}>86749206</span> 123457 <span style={{ color: "#059669" }}>2</span>
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                TAC: <strong style={{ color: "#4F46E5" }}>86749206</strong> · Check Digit: <strong>2</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "9px",
              color: "#059669",
              fontWeight: 700,
              padding: "3.5px 7px",
              background: "#ECFDF5",
              borderRadius: "5px",
              border: "1px solid #A7F3D0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            ✓ {dualSimResult.verdict === "HARDWARE_TWIN_CONFIRMED" ? "SHARED TAC 86749206 · SAME PHYSICAL CHIPSET CHASSIS" : "TAC MISMATCH"} ({dualSimResult.hardwareModel.split(" ")[0]} {dualSimResult.hardwareModel.split(" ")[1]} {dualSimResult.hardwareModel.split(" ")[2]})
          </div>

          {/* Visual Z3 SMT Clock-Offset Vernier Caliper Infographic (-5.0s to +5.0s) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "6px 10px 5px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            {/* Header with Equation & Solver SAT Status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                  Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]
                </span>
                <span
                  style={{
                    fontSize: "8.5px",
                    fontFamily: "var(--font-mono)",
                    color: "#475569",
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    padding: "0.5px 4px",
                    borderRadius: "3px",
                  }}
                >
                  |Δt| ≤ 1.2s
                </span>
              </div>
              <span
                style={{
                  fontSize: "8.5px",
                  color: "#047857",
                  fontWeight: 800,
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                Z3 SOLVER: SAT (0.42ms) ✓
              </span>
            </div>

            {/* Mathematically Strict Vernier Caliper Scale SVG */}
            <svg
              width="100%"
              height="40"
              viewBox="0 0 500 40"
              preserveAspectRatio="none"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* Feasible Zone Luminous Emerald Gradient */}
                <linearGradient id="feasibleEnvelopeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
                </linearGradient>

                {/* Diagonal Inadmissible Desync Stripe */}
                <pattern id="desyncStripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#94A3B8" strokeWidth="1" opacity="0.2" />
                </pattern>
              </defs>

              {/* 1. Full Scale Track (0s to 500px spanning -5.0s to +5.0s) */}
              {/* Left Out-of-Bounds Track (x: 0 to 190) */}
              <rect
                x="0"
                y="10"
                width="190"
                height="14"
                rx="3"
                fill="url(#desyncStripe)"
                stroke="#E2E8F0"
                strokeWidth="1"
              />

              {/* Right Out-of-Bounds Track (x: 290 to 500) */}
              <rect
                x="290"
                y="10"
                width="210"
                height="14"
                rx="3"
                fill="url(#desyncStripe)"
                stroke="#E2E8F0"
                strokeWidth="1"
              />

              {/* Feasible Interval Admissible Envelope (x: 190 to 290 = [-1.2s, +0.8s]) */}
              <rect
                x="190"
                y="10"
                width="100"
                height="14"
                rx="3"
                fill="url(#feasibleEnvelopeGrad)"
                stroke="#10B981"
                strokeWidth="1.2"
                style={{ filter: "drop-shadow(0 1px 3px rgba(16,185,129,0.25))" }}
              />

              {/* In-Envelope Text Watermark */}
              <text
                x="240"
                y="20.5"
                textAnchor="middle"
                fill="#047857"
                fontSize="7"
                fontWeight="800"
                letterSpacing="0.04em"
                fontFamily="var(--font-mono)"
                opacity="0.85"
              >
                FEASIBLE ENVELOPE (2.0s)
              </text>

              {/* 2. Precision Calipers & Brackets */}
              {/* Left Caliper Bracket at x=190 (-1.2s) */}
              <path d="M 194,3.5 L 190,3.5 L 190,25.5 L 194,25.5" fill="none" stroke="#047857" strokeWidth="1.2" />
              <text
                x="190"
                y="2.5"
                textAnchor="middle"
                fill="#047857"
                fontSize="7.5"
                fontWeight="800"
                fontFamily="var(--font-mono)"
              >
                -1.2s
              </text>

              {/* Right Caliper Bracket at x=290 (+0.8s) */}
              <path d="M 286,3.5 L 290,3.5 L 290,25.5 L 286,25.5" fill="none" stroke="#047857" strokeWidth="1.2" />
              <text
                x="290"
                y="2.5"
                textAnchor="middle"
                fill="#047857"
                fontSize="7.5"
                fontWeight="800"
                fontFamily="var(--font-mono)"
              >
                +0.8s
              </text>

              {/* 3. Vernier Ruler Tick Marks */}
              {/* Ruler baseline */}
              <line x1="0" y1="24" x2="500" y2="24" stroke="#94A3B8" strokeWidth="1" opacity="0.5" />

              {/* Major ticks every 1.0s (every 50px) */}
              {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500].map((tx) => (
                <line
                  key={`major-${tx}`}
                  x1={tx}
                  y1="24"
                  x2={tx}
                  y2={tx === 250 ? "30" : "28"}
                  stroke={tx === 250 ? "#047857" : "#64748B"}
                  strokeWidth={tx === 250 ? "1.5" : "1"}
                />
              ))}

              {/* Minor sub-ticks every 0.5s (every 25px) */}
              {[25, 75, 125, 175, 225, 275, 325, 375, 425, 475].map((tx) => (
                <line
                  key={`minor-${tx}`}
                  x1={tx}
                  y1="24"
                  x2={tx}
                  y2="26.5"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              ))}

              {/* Center NTP Reference Axis Line at x=250 */}
              <line
                x1="250"
                y1="4"
                x2="250"
                y2="24"
                stroke="#047857"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />

              {/* 4. Active Measured Drift Target Pin at x=250 (Δt = 0.0s) */}
              <circle cx="250" cy="17" r="6" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.6" />
              <circle cx="250" cy="17" r="3.5" fill="#047857" stroke="#FFFFFF" strokeWidth="1.2" />

              {/* 5. Axis Labels strictly at mathematical coordinates */}
              <text x="5" y="36" textAnchor="start" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">
                -5.0s
              </text>
              <text x="125" y="36" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">
                -2.5s
              </text>
              <text
                x="250"
                y="36"
                textAnchor="middle"
                fill="#047857"
                fontSize="8.5"
                fontWeight="800"
                fontFamily="var(--font-mono)"
              >
                Δt = 0.0s (NTP Stratum-2 Sync)
              </text>
              <text x="375" y="36" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">
                +2.5s
              </text>
              <text x="495" y="36" textAnchor="end" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">
                +5.0s
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-export as CgnatAttributionScreen for complete compatibility
export const CgnatAttributionScreen = AttributionScreen;

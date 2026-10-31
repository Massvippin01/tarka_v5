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

; Measured bounds under NTP sync
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
      time: "07:48:04 IST",
      count: 340,
      port: "44321",
      sessionPool: "340 Handsets",
    },
    {
      id: "SESS-02",
      bank: "Login 2: HDFC Mule 9920",
      time: "07:51:19 IST",
      count: 41,
      port: "44389",
      sessionPool: "41 Handsets",
    },
    {
      id: "SESS-03",
      bank: "Login 3: Axis Mule 4102",
      time: "07:54:51 IST",
      count: 6,
      port: "44810",
      sessionPool: "6 Handsets",
    },
    {
      id: "SESS-04",
      bank: "Login 4: Paytm Sink 1109",
      time: "07:58:10 IST",
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
        padding: isCompact ? "10px 14px 20px 14px" : "14px 18px 24px 18px",
        gap: isCompact ? "10px" : "12px",
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
            padding: isCompact ? "12px 16px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "8px" : "10px",
          }}
        >
          {/* Header with Title & Action Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: "#EEF2FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Target size={14} color="#4F46E5" />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                  CGNAT Candidate Intersection Funnel
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#4F46E5",
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    padding: "1.5px 6px",
                    borderRadius: "4px",
                    letterSpacing: "0.02em",
                  }}
                >
                  DoT CLAUSE 39.20
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                Sequential intersection of translated port allocations isolates <strong>1 unique handset</strong>.
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
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #C7D2FE",
                  background: "#EEF2FF",
                  color: "#4338CA",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Copy pre-filled statutory requisition to Airtel under DoT License Clause 39.20"
              >
                <FileText size={12} color="#4F46E5" />
                <span>📋 Copy DoT 39.20 Requisition</span>
              </button>

              <button
                type="button"
                onClick={() => toggleMutation("dropCgnatSourcePort")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: isPortDropped ? "1px solid #D97706" : "1px solid #CBD5E1",
                  background: isPortDropped ? "#FFFBEB" : "#F8FAFC",
                  color: isPortDropped ? "#B45309" : "#0F172A",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Toggles source port omission in IPDR translation"
              >
                <Radio size={12} color={isPortDropped ? "#D97706" : "#64748B"} />
                <span>{isPortDropped ? "Port Dropped" : "⚡ Drop Port"}</span>
              </button>

              <button
                type="button"
                onClick={resetAllSessions}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Reset all session filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Visual Funnel Chart (Crisp, Proportional Bars with Set Intersection Connectors) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: isCompact ? "8px 12px" : "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", fontWeight: 700 }}>
              <span>Step 1: SBI (340)</span>
              <span>Step 2: HDFC (41)</span>
              <span>Step 3: Axis (6)</span>
              <span>Step 4: Paytm (1 ★)</span>
            </div>

            {/* SVG Visual Funnel Bars */}
            <svg
              width="100%"
              height={isCompact ? "85" : "95"}
              viewBox="0 0 460 95"
              preserveAspectRatio="none"
              style={{ overflow: "visible" }}
            >
              <defs>
                <pattern id="funnelHatchCompact" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1.2" opacity="0.25" />
                </pattern>
                <linearGradient id="solidFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;

                const colWidth = 72;
                const gap = 42;
                const x = 16 + idx * (colWidth + gap);

                // Proportional bar height
                const maxH = 68;
                const barH = isChecked
                  ? isPortDropped
                    ? maxH
                    : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y = 82 - barH;

                return (
                  <g key={stage.id}>
                    {/* Background Hatched Capacity Bar */}
                    <rect
                      x={x}
                      y={14}
                      width={colWidth}
                      height={maxH}
                      rx="5"
                      fill="url(#funnelHatchCompact)"
                      stroke="#CBD5E1"
                      strokeWidth="1"
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
                        x="-22"
                        y="-13"
                        width="44"
                        height="16"
                        rx="4"
                        fill={isTarget ? "#059669" : "#4F46E5"}
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
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

                    {/* Set Intersection Connector ∩ between sequential stages */}
                    {idx < 3 && (
                      <g transform={`translate(${x + colWidth + gap / 2}, 48)`}>
                        <circle cx="0" cy="0" r="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#4F46E5"
                          fontSize="9.5"
                          fontWeight="900"
                          fontFamily="system-ui, sans-serif"
                        >
                          ∩
                        </text>
                      </g>
                    )}
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
                paddingTop: "4px",
              }}
            >
              <span style={{ fontSize: "10px", color: "#64748B" }}>
                Total ISP Pool: <strong>10,000 Tower Subscribers</strong>
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Surviving: {funnelResult.finalCandidateCount === 1 ? "Target SUB-8849-VIKRAM" : `${funnelResult.finalCandidateCount} Ambiguous Candidates`}
              </span>
            </div>
          </div>

          {/* 4 Interactive Session Rows with Clear Technical Hierarchy */}
          <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? "4px" : "6px" }}>
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
                    padding: isCompact ? "5px 10px" : "6px 12px",
                    borderRadius: "7px",
                    background: isTarget ? "#ECFDF5" : isChecked ? "#F8FAFC" : "#F1F5F9",
                    border: isTarget ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                    opacity: isChecked ? 1 : 0.5,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSession(stage.id)}
                      style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#4F46E5", margin: 0, flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                          Step {idx + 1}: {stage.bank}
                        </span>
                        <span
                          style={{
                            fontSize: "9.5px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            background: "#F1F5F9",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stage.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
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

                  <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: isTarget ? "#047857" : "#0F172A",
                        background: isTarget ? "#D1FAE5" : "#FFFFFF",
                        border: isTarget ? "1px solid #6EE7B7" : "1px solid #E2E8F0",
                        padding: "2px 7px",
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
              padding: isCompact ? "5px 10px" : "6px 12px",
              borderRadius: "7px",
              background: funnelResult.finalCandidateCount === 1 ? "#ECFDF5" : "#FFFBEB",
              border: funnelResult.finalCandidateCount === 1 ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              {funnelResult.finalCandidateCount === 1 ? <ShieldCheck size={14} color="#059669" /> : <ShieldAlert size={14} color="#D97706" />}
              <span
                style={{
                  fontSize: "11px",
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
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>
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
            padding: isCompact ? "12px 16px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "8px" : "10px",
          }}
        >
          {/* Header with Title & Simulator Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wifi size={14} color={isHotspotActive ? "#E11D48" : "#059669"} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
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
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "3.5px 8px",
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
              borderRadius: "10px",
              padding: isCompact ? "8px 10px" : "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {/* Node 1: Burner Mule Phone */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Smartphone size={13} color="#4F46E5" />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    Burner Mule Handset (Target)
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                    Samsung M34 5G · UPI &lt;Device&gt; IMEI-1
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "9.5px", fontWeight: 800, background: "#EEF2FF", color: "#4F46E5", padding: "1.5px 6px", borderRadius: "4px", fontFamily: "var(--font-mono)" }}>
                Init TTL: 64
              </span>
            </div>

            {/* Connecting Pipe Indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
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
                borderRadius: "8px",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: isHotspotActive ? "#FFE4E6" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wifi size={13} color={isHotspotActive ? "#E11D48" : "#94A3B8"} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: isHotspotActive ? "#BE123C" : "#64748B" }}>
                    {isHotspotActive ? "Accomplice Personal Gateway" : "No Intermediate Gateway"}
                  </div>
                  <div style={{ fontSize: "9.5px", color: isHotspotActive ? "#9F1239" : "#94A3B8" }}>
                    {isHotspotActive ? "Poco X5 5G · +91-9811409281 · BSSID 74:DA:38:A2:11:BC" : "Direct cellular RF link to base station"}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  background: isHotspotActive ? "#FFE4E6" : "#F1F5F9",
                  color: isHotspotActive ? "#BE123C" : "#94A3B8",
                  padding: "1.5px 6px",
                  borderRadius: "4px",
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
                borderRadius: "8px",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Radio size={13} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    Airtel Cell Tower DL-TWR-891
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                    Sector 4 Rohini, Delhi · Public IP: 103.21.144.92
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                  color: isHotspotActive ? "#BE123C" : "#047857",
                  padding: "1.5px 6px",
                  borderRadius: "4px",
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
              borderRadius: "8px",
              padding: "8px 10px",
              color: "#F8FAFC",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              lineHeight: 1.45,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "3px" }}>
              <span style={{ color: "#38BDF8", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <Terminal size={11} /> PGW INGRESS IPv4 HEADER TELEMETRY
              </span>
              <span style={{ color: isHotspotActive ? "#F43F5E" : "#34D399", fontWeight: 800, fontSize: "9px" }}>
                {isHotspotActive ? "PROXIED VIA BSSID" : "DIRECT RF LINK"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "9.5px" }}>
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
              fontSize: "10.5px",
              lineHeight: 1.35,
              padding: "5px 8px",
              borderRadius: "6px",
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
            padding: isCompact ? "12px 16px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "7px" : "9px",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={14} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                UPI 2.0 &lt;Device&gt; XML & JA4 Client TLS Fingerprint
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1.5px 6px",
                  borderRadius: "4px",
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
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#334155",
                  cursor: "pointer",
                }}
                title="Copy UPI 2.0 <Device> XML snippet"
              >
                {isXmlCopied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                <span>{isXmlCopied ? "Copied" : "Copy XML"}</span>
              </button>
            </div>
          </div>

          {/* Clean Light Syntax-Highlighted XML Pill */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              padding: "8px 12px",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              lineHeight: 1.45,
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Registered MSISDN</span>
                <CheckCircle2 size={12} color="#059669" />
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {canonicalData.deviceXml.mobile}
              </div>
              <div style={{ fontSize: "9px", color: "#059669" }}>SIM Binding Verified SAT ✓</div>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Tower Geocode</span>
                <CheckCircle2 size={12} color="#059669" />
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {canonicalData.deviceXml.geocode}
              </div>
              <div style={{ fontSize: "9px", color: "#64748B" }}>Noida Sec 18 Azimuth 120°</div>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Handset Chassis</span>
                <CheckCircle2 size={12} color="#059669" />
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", margin: "2px 0" }}>
                SM-M346B/DS
              </div>
              <div style={{ fontSize: "9px", color: "#64748B" }}>Samsung M34 5G Biometric SAT ✓</div>
            </div>

            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#047857", textTransform: "uppercase", fontWeight: 800 }}>JA4 TLS Fingerprint</span>
                <CheckCircle2 size={12} color="#059669" />
              </div>
              <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                t13d1516h2_8daaf6...
              </div>
              <div style={{ fontSize: "9px", color: "#059669" }}>Bank Switch TLS 1.3 Match ✓</div>
            </div>
          </div>

          {/* Dual-Anchor Confirmation Badge */}
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #6EE7B7",
              borderRadius: "7px",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#047857",
            }}
          >
            <CheckCircle2 size={13} color="#059669" style={{ flexShrink: 0 }} />
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
            padding: isCompact ? "12px 16px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "7px" : "9px",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smartphone size={14} color="#4F46E5" />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
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
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "3.5px 8px",
                borderRadius: "5px",
                border: "none",
                background: isSmtCopied ? "#059669" : "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isSmtCopied ? <Check size={11} /> : <Download size={11} />}
              <span>{isSmtCopied ? "SMT2 Copied" : "Export .smt2 Proof"}</span>
            </button>
          </div>

          {/* Side-by-Side Dual-SIM Slots */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {/* Slot 1: Airtel */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#64748B", fontWeight: 700 }}>SLOT 1 (AIRTEL)</span>
                <span style={{ fontSize: "8.5px", color: "#059669", fontWeight: 800, background: "#ECFDF5", padding: "1px 4px", borderRadius: "3px" }}>
                  {dualSimResult.isImei1LuhnValid ? "LUHN PASS ✓" : "LUHN FAIL ✗"}
                </span>
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                <span style={{ color: "#4F46E5" }}>86749206</span> 123456 <span style={{ color: "#059669" }}>4</span>
              </div>
              <div style={{ fontSize: "9px", color: "#64748B" }}>
                TAC: <strong style={{ color: "#4F46E5" }}>86749206</strong> · Check Digit: <strong>4</strong>
              </div>
            </div>

            {/* Slot 2: Jio */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "6px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#64748B", fontWeight: 700 }}>SLOT 2 (JIO)</span>
                <span style={{ fontSize: "8.5px", color: "#059669", fontWeight: 800, background: "#ECFDF5", padding: "1px 4px", borderRadius: "3px" }}>
                  {dualSimResult.isImei2LuhnValid ? "LUHN PASS ✓" : "LUHN FAIL ✗"}
                </span>
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                <span style={{ color: "#4F46E5" }}>86749206</span> 123457 <span style={{ color: "#059669" }}>2</span>
              </div>
              <div style={{ fontSize: "9px", color: "#64748B" }}>
                TAC: <strong style={{ color: "#4F46E5" }}>86749206</strong> · Check Digit: <strong>2</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "9.5px",
              color: "#059669",
              fontWeight: 700,
              padding: "4px 8px",
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

          {/* Visual Z3 SMT Clock-Offset Number Line Infographic (-5.0s to +5.0s) */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#334155" }}>
                Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]
              </span>
              <span style={{ fontSize: "9px", color: "#059669", fontWeight: 800, background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                Z3 SOLVER: SAT ✓
              </span>
            </div>

            {/* Number Line Track */}
            <div style={{ position: "relative", height: "14px", background: "#E2E8F0", borderRadius: "7px", overflow: "hidden", margin: "3px 0" }}>
              {/* Feasible Interval Shading: [-1.2s, +0.8s] spanning 38% to 58% of 10s range */}
              <div style={{ position: "absolute", left: "38%", width: "20%", top: 0, bottom: 0, background: "rgba(16, 185, 129, 0.45)", borderRadius: "3px" }} />
              {/* Center Line: 0.0s */}
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "#64748B", zIndex: 2 }} />
              {/* Active Marker */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "2px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#059669",
                  border: "2px solid #FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  zIndex: 5,
                  transform: "translateX(-50%)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              <span>-5.0s</span>
              <span>-1.2s</span>
              <span style={{ fontWeight: 800, color: "#059669" }}>Δt = 0.0s (NTP Sync)</span>
              <span>+0.8s</span>
              <span>+5.0s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-export as CgnatAttributionScreen for complete compatibility
export const CgnatAttributionScreen = AttributionScreen;

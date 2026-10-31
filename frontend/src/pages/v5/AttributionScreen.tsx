import React, { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Smartphone,
  Cpu,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Target,
  Layers,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  solveCgnatFunnel,
  analyzeDualSimHardware,
  detectHotspotCollision,
  getCanonicalAttributionData,
} from "../../utils/cgnatAttribution";

export const AttributionScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

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
  };

  // Funnel Computation
  const isPortDropped = mutations.dropCgnatSourcePort || mutations.cgnatPortCollision;
  const funnelResult = useMemo(() => {
    const selected = canonicalData.sessions.filter((s) => activeSessions[s.id]);
    return solveCgnatFunnel(selected, isPortDropped);
  }, [canonicalData.sessions, activeSessions, isPortDropped]);

  // 2. Hotspot State
  const hotspotResult = useMemo(() => {
    const observed = mutations.triggerHotspotCollision ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [mutations.triggerHotspotCollision]);

  // 3. Dual-SIM Hardware Twin State
  const imei1 = canonicalData.canonicalImei1;
  const imei2 = canonicalData.canonicalImei2;

  const dualSimResult = useMemo(() => {
    return analyzeDualSimHardware(imei1, imei2, 18);
  }, [imei1, imei2]);

  // Visual funnel bar configuration
  const funnelStagesMeta = [
    { id: "SESS-01", bank: "SBI Mule L1", time: "02:18:04 UTC", ip: "100.72.14.89:44321", count: 340, widthPct: 100, color: "#64748B", bg: "rgba(100,116,139,0.12)" },
    { id: "SESS-02", bank: "HDFC Mule L2", time: "02:21:19 UTC", ip: "100.72.14.89:44389", count: 41, widthPct: 42, color: "#3B82F6", bg: "rgba(59,130,246,0.14)" },
    { id: "SESS-03", bank: "Axis Mule L3", time: "02:24:51 UTC", ip: "100.72.14.89:44810", count: 6, widthPct: 18, color: "#6366F1", bg: "rgba(99,102,241,0.15)" },
    { id: "SESS-04", bank: "Paytm Sink", time: "02:28:10 UTC", ip: "100.72.14.89:45102", count: 1, widthPct: 8, color: "#059669", bg: "rgba(5,150,105,0.18)" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "10px 14px",
        gap: "10px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 1. SINGLE-LINE 4-PILL TELEMETRY STRIP (HEIGHT: 38PX, NO VERTICAL SCROLL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          height: "38px",
          flexShrink: 0,
        }}
      >
        {/* Pill 1: CGNAT Candidate Isolation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: funnelResult.finalCandidateCount === 1 ? "1px solid rgba(5,150,105,0.3)" : "1px solid rgba(217,119,6,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Radio size={14} color={funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              CGNAT CANDIDATES
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706",
              background: funnelResult.finalCandidateCount === 1 ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {funnelResult.finalCandidateCount === 1 ? "1 UNIQUE SUBSCRIBER ★" : `${funnelResult.finalCandidateCount} AMBIGUOUS`}
          </span>
        </div>

        {/* Pill 2: Coincidental Match Probability */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu size={14} color="#6366F1" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              COINCIDENTAL ODDS
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#4F46E5",
              background: "rgba(79,70,229,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {funnelResult.coincidentalRatio} (1-in-7.14M)
          </span>
        </div>

        {/* Pill 3: Hotspot Tethering (TTL) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: hotspotResult.isHotspotDetected ? "1px solid rgba(225,29,72,0.3)" : "1px solid rgba(5,150,105,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Wifi size={14} color={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              HOTSPOT TETHER (TTL)
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: hotspotResult.isHotspotDetected ? "#E11D48" : "#059669",
              background: hotspotResult.isHotspotDetected ? "rgba(225,29,72,0.1)" : "rgba(5,150,105,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {hotspotResult.isHotspotDetected ? "TTL 63 (COLLISION DETECTED)" : "TTL 64 (DIRECT 4G/5G)"}
          </span>
        </div>

        {/* Pill 4: Dual-SIM Hardware Twin */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: dualSimResult.isHardwareTwin ? "1px solid rgba(5,150,105,0.3)" : "1px solid rgba(225,29,72,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Smartphone size={14} color={dualSimResult.isHardwareTwin ? "#059669" : "#E11D48"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              DUAL-SIM HARDWARE TWIN
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: dualSimResult.isHardwareTwin ? "#059669" : "#E11D48",
              background: dualSimResult.isHardwareTwin ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {dualSimResult.isHardwareTwin ? "TAC 35891110 (M34 5G)" : "MISMATCH"}
          </span>
        </div>
      </div>

      {/* 2. MAIN 12-COLUMN BENTO INFOGRAPHIC WORKSPACE (HEIGHT: CALC(100% - 48PX), OVERFLOW: HIDDEN) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 7 COLS (CGNAT FUNNEL + UPI DEVICE XML / JA4) */}
        <div
          style={{
            gridColumn: "span 7",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 1: PROGRESSIVE CGNAT CANDIDATE INTERSECTION FUNNEL (340 -> 41 -> 6 -> 1) */}
          <div
            style={{
              flex: "1 1 58%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            {/* Header with Title and Simulation Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Target size={15} color="#4F46E5" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Interactive CGNAT Candidate Intersection Funnel
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#4F46E5",
                      background: "rgba(79,70,229,0.08)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    DOT CLAUSE 39.20
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted, #94A3B8)" }}>
                  Mathematical candidate collapse: Tower IP pool intersection across 4 mule logins.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => toggleMutation("dropCgnatSourcePort")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: isPortDropped ? "1px solid #D97706" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: isPortDropped ? "rgba(217,119,6,0.12)" : "var(--bento-canvas-subtle, #F8FAFC)",
                    color: isPortDropped ? "#B45309" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                  title="Simulates ISP omitting source port in IPDR, leaving ambiguous pool of 340 subscribers"
                >
                  <Radio size={11} />
                  <span>{isPortDropped ? "Port Dropped (Ambiguous)" : "Drop Source Port"}</span>
                </button>

                <button
                  type="button"
                  onClick={resetAllSessions}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: "var(--bento-canvas-subtle, #F8FAFC)",
                    color: "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                  title="Reset all 4 login sessions"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* 4 Funnel Horizontal Bars */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flex: 1,
                justifyContent: "space-around",
              }}
            >
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const displayCount = stageData ? stageData.intersectionSize : (isChecked ? stage.count : "Excluded");
                const isTarget = isChecked && displayCount === 1;

                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: isTarget ? "rgba(5,150,105,0.06)" : (isChecked ? "var(--bento-canvas-subtle, #F8FAFC)" : "rgba(0,0,0,0.01)"),
                      border: isTarget ? "1px solid rgba(5,150,105,0.3)" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                      opacity: isChecked ? 1 : 0.45,
                    }}
                  >
                    {/* Session Checkbox & Step Label */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSession(stage.id)}
                      style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#4F46E5", margin: 0 }}
                      title="Include/Exclude this mule login session"
                    />

                    <div style={{ width: "135px", flexShrink: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                        Step {idx + 1}: {stage.bank}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                        {stage.time}
                      </div>
                    </div>

                    {/* Proportional Funnel Bar */}
                    <div style={{ flex: 1, position: "relative", height: "20px", background: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden", display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${isChecked ? (isPortDropped ? 100 : stage.widthPct) : 0}%`,
                          background: isTarget ? "linear-gradient(90deg, #10B981 0%, #059669 100%)" : stage.color,
                          borderRadius: "4px",
                          transition: "width 0.3s ease",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          left: "8px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: (isChecked && stage.widthPct > 25) ? "#FFFFFF" : "var(--bento-text-primary, #0F172A)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {isChecked ? `${displayCount} Handsets` : "Session Inactive"}
                      </span>
                    </div>

                    {/* IP & Tower Details */}
                    <div style={{ width: "160px", textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)", fontFamily: "var(--font-mono)" }}>
                        {stage.ip}
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)" }}>
                        DL-TWR-891 · Sector 4 Rohini
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Mathematical Invariant Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: funnelResult.finalCandidateCount === 1 ? "rgba(5,150,105,0.07)" : "rgba(217,119,6,0.07)",
                border: funnelResult.finalCandidateCount === 1 ? "1px solid rgba(5,150,105,0.25)" : "1px solid rgba(217,119,6,0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {funnelResult.finalCandidateCount === 1 ? <ShieldCheck size={14} color="#059669" /> : <ShieldAlert size={14} color="#D97706" />}
                <span style={{ fontSize: "11px", fontWeight: 700, color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#B45309" }}>
                  {funnelResult.finalCandidateCount === 1
                    ? "UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { IMEI 358911104829104 }"
                    : `AMBIGUOUS SUBSCRIBER POOL: ${funnelResult.finalCandidateCount} CANDIDATES SATISFIABLE`}
                </span>
              </div>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
                P = 1.40 × 10⁻⁷ (Beyond Reasonable Doubt)
              </span>
            </div>
          </div>

          {/* CARD 2: UPI 2.0 <Device> XML & JA4 TLS CLIENT FINGERPRINT DUAL-ANCHOR */}
          <div
            style={{
              flex: "1 1 42%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={14} color="#4F46E5" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  UPI 2.0 &lt;Device&gt; XML & JA4 TLS Fingerprint Dual-Anchor
                </span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  NPCI CENTRAL LOG
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                Cryptographic App-to-Network Anchor
              </span>
            </div>

            {/* XML Snippet Box */}
            <div
              style={{
                background: "#0F172A",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #1E293B",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase", marginBottom: "2px", fontWeight: 700 }}>
                NPCI UPI 2.0 Decrypted Switch Payload:
              </div>
              <code style={{ fontSize: "10px", color: "#38BDF8", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                {canonicalData.deviceXml.rawXml}
              </code>
            </div>

            {/* 4 Metadata Badges in Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "6px",
                flex: 1,
                alignItems: "center",
              }}
            >
              <div style={{ background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
                <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>Registered MSISDN</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.mobile}
                </div>
              </div>

              <div style={{ background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
                <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>Switch Tower Geocode</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.geocode}
                </div>
              </div>

              <div style={{ background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
                <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>Identified Handset</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  {canonicalData.deviceXml.deviceModel}
                </div>
              </div>

              <div style={{ background: "rgba(5,150,105,0.06)", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(5,150,105,0.25)" }}>
                <div style={{ fontSize: "9px", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>JA4 Client Fingerprint</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#059669", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.ja4Fingerprint.slice(0, 14)}... (MATCH)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 COLS (HOTSPOT TETHERING DIAGRAM + DUAL-SIM TAC TWIN / Z3 SMT) */}
        <div
          style={{
            gridColumn: "span 5",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 3: WI-FI HOTSPOT TETHERING COLLISION DETECTOR (TTL DIAGRAM) */}
          <div
            style={{
              flex: "1 1 50%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Wifi size={15} color={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  Wi-Fi Hotspot Tethering Collision
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation("triggerHotspotCollision")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: hotspotResult.isHotspotDetected ? "1px solid #E11D48" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: hotspotResult.isHotspotDetected ? "rgba(225,29,72,0.12)" : "var(--bento-canvas-subtle, #F8FAFC)",
                  color: hotspotResult.isHotspotDetected ? "#BE123C" : "var(--bento-text-secondary, #475569)",
                  cursor: "pointer",
                }}
              >
                <span>{hotspotResult.isHotspotDetected ? "Tethering Active" : "Simulate Hotspot"}</span>
              </button>
            </div>

            {/* Visual TTL Hop Infographic */}
            <div
              style={{
                flex: 1,
                background: "var(--bento-canvas-subtle, #F8FAFC)",
                borderRadius: "8px",
                border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 0,
              }}
            >
              {/* Network Packet Hop Diagram */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                {/* Device 1: Fraudster Handset */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>Fraud Handset</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>Samsung M34</div>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#3B82F6", fontFamily: "var(--font-mono)" }}>Init TTL: 64</div>
                </div>

                {/* Hop Arrow with Tethering Badge */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <span
                    style={{
                      fontSize: "8px",
                      fontWeight: 800,
                      color: hotspotResult.isHotspotDetected ? "#E11D48" : "#64748B",
                      background: hotspotResult.isHotspotDetected ? "rgba(225,29,72,0.1)" : "rgba(0,0,0,0.05)",
                      padding: "1px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    {hotspotResult.isHotspotDetected ? "Wi-Fi AP (-1 TTL)" : "Direct Link"}
                  </span>
                  <ArrowRight size={14} color={hotspotResult.isHotspotDetected ? "#E11D48" : "#94A3B8"} />
                </div>

                {/* Device 2: Accomplice Gateway (If Detected) */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>
                    {hotspotResult.isHotspotDetected ? "Accomplice Proxy" : "Cellular Gateway"}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: hotspotResult.isHotspotDetected ? "#E11D48" : "var(--bento-text-primary, #0F172A)" }}>
                    {hotspotResult.isHotspotDetected ? hotspotResult.accompliceHandset : "Direct 4G Link"}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    {hotspotResult.isHotspotDetected ? hotspotResult.bssid : "No Proxy"}
                  </div>
                </div>

                {/* Hop Arrow to Tower */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <ArrowRight size={14} color="#94A3B8" />
                </div>

                {/* Tower Node */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase" }}>Airtel Tower</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>DL-TWR-891</div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: hotspotResult.isHotspotDetected ? "#E11D48" : "#059669",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Observed: {hotspotResult.ttlObserved}
                  </div>
                </div>
              </div>

              {/* Anomaly Summary Alert */}
              <div
                style={{
                  fontSize: "10px",
                  lineHeight: 1.4,
                  padding: "5px 8px",
                  borderRadius: "6px",
                  background: hotspotResult.isHotspotDetected ? "rgba(225,29,72,0.08)" : "rgba(5,150,105,0.08)",
                  border: hotspotResult.isHotspotDetected ? "1px solid rgba(225,29,72,0.2)" : "1px solid rgba(5,150,105,0.2)",
                  color: hotspotResult.isHotspotDetected ? "#9F1239" : "#065F46",
                }}
              >
                {hotspotResult.anomalySummary}
              </div>
            </div>
          </div>

          {/* CARD 4: DUAL-SIM HARDWARE TWIN & Z3 SMT CLOCK-OFFSET TIMELINE */}
          <div
            style={{
              flex: "1 1 50%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Smartphone size={15} color="#4F46E5" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  Dual-SIM Hardware Twin & Z3 SMT
                </span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                15-DIGIT LUHN CHECK
              </span>
            </div>

            {/* Side-by-Side Dual-SIM Slots */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Slot 1 */}
              <div style={{ background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                  <span style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontWeight: 700 }}>SLOT 1 (AIRTEL)</span>
                  <span style={{ fontSize: "9px", color: "#059669", fontWeight: 800 }}>LUHN VALID ✓</span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)", fontFamily: "var(--font-mono)" }}>
                  {imei1}
                </div>
                <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", marginTop: "2px" }}>
                  TAC: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{dualSimResult.tac1}</strong>
                </div>
              </div>

              {/* Slot 2 */}
              <div style={{ background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                  <span style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontWeight: 700 }}>SLOT 2 (JIO)</span>
                  <span style={{ fontSize: "9px", color: "#059669", fontWeight: 800 }}>LUHN VALID ✓</span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)", fontFamily: "var(--font-mono)" }}>
                  {imei2}
                </div>
                <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", marginTop: "2px" }}>
                  TAC: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{dualSimResult.tac2}</strong>
                </div>
              </div>
            </div>

            {/* Z3 SMT Clock-Offset Graphic */}
            <div
              style={{
                flex: 1,
                background: "var(--bento-canvas-subtle, #F8FAFC)",
                borderRadius: "8px",
                border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
                  Z3 SMT Clock-Offset Bound: [-1.2s, +0.8s]
                </span>
                <span style={{ fontSize: "9px", color: "#059669", fontWeight: 700 }}>
                  SATISFIABLE (CONGRUENT)
                </span>
              </div>

              {/* Offset Visual Bar */}
              <div style={{ position: "relative", height: "12px", background: "#E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                {/* Center 0 Line */}
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "#64748B", zIndex: 2 }} />
                {/* SMT Bound Window */}
                <div
                  style={{
                    position: "absolute",
                    left: "38%",
                    width: "24%",
                    top: 0,
                    bottom: 0,
                    background: "rgba(16, 185, 129, 0.45)",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                <span>-2.0s</span>
                <span>Δt = 0.0s (NTP Synchronized)</span>
                <span>+2.0s</span>
              </div>

              <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #94A3B8)", lineHeight: 1.3 }}>
                SIM-swap occurred <strong style={{ color: "#E11D48" }}>18 minutes</strong> prior to first transaction; device IMEI and JA4 fingerprint remained physically identical.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

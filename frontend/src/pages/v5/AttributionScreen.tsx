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
import { SaasExecutiveKpiCard } from "../../components/tarka/SaasExecutiveKpiCard";
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
    { id: "SESS-01", bank: "SBI Mule L1", time: "02:18:04 UTC", ip: "100.72.14.89:44321", count: 340, widthPct: 100, color: "#64748B" },
    { id: "SESS-02", bank: "HDFC Mule L2", time: "02:21:19 UTC", ip: "100.72.14.89:44389", count: 41, widthPct: 42, color: "#3B82F6" },
    { id: "SESS-03", bank: "Axis Mule L3", time: "02:24:51 UTC", ip: "100.72.14.89:44810", count: 6, widthPct: 18, color: "#6366F1" },
    { id: "SESS-04", bank: "Paytm Sink", time: "02:28:10 UTC", ip: "100.72.14.89:45102", count: 1, widthPct: 8, color: "#059669" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "16px 20px",
        gap: "14px",
        boxSizing: "border-box",
        overflowY: "auto",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* 1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (MIN-HEIGHT: 108PX) */}
      <div className="saas-kpi-row">
        <SaasExecutiveKpiCard
          label="CGNAT Candidates"
          metric={funnelResult.finalCandidateCount === 1 ? "1 Handset ★" : `${funnelResult.finalCandidateCount} Ambiguous`}
          metricColor={funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706"}
          subtext={funnelResult.finalCandidateCount === 1 ? "Collapsed from 340 handsets across 4 towers" : "Missing source port prevents exact candidate convergence"}
          statusBadge={{
            text: funnelResult.finalCandidateCount === 1 ? "INDIVIDUATED" : "AMBIGUOUS POOL",
            variant: funnelResult.finalCandidateCount === 1 ? "emerald" : "amber",
          }}
          icon={Radio}
          iconColor={funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706"}
          iconBg={funnelResult.finalCandidateCount === 1 ? "#ECFDF5" : "#FFFBEB"}
        />

        <SaasExecutiveKpiCard
          label="Coincidental Odds"
          metric={funnelResult.coincidentalRatio}
          metricColor="#4F46E5"
          subtext="P = 1.4 × 10⁻⁷ multi-mule login concurrency"
          statusBadge={{
            text: "BEYOND DOUBT",
            variant: "indigo",
          }}
          icon={Cpu}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
        />

        <SaasExecutiveKpiCard
          label="Hotspot Tethering (TTL)"
          metric={hotspotResult.isHotspotDetected ? "TTL = 63" : "TTL = 64"}
          metricColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          subtext={hotspotResult.isHotspotDetected ? "1-hop decrement detected through accomplice phone" : "Direct cellular 4G/5G connection to base station"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "PROXY DETECTED" : "DIRECT LINK",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
          }}
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
        />

        <SaasExecutiveKpiCard
          label="Dual-SIM Hardware Twin"
          metric={dualSimResult.hardwareModel}
          metricColor="#059669"
          subtext="TAC 35891110 matches Slots 1 & 2 on same chipset"
          statusBadge={{
            text: "TAC TWIN CONFIRMED",
            variant: "emerald",
          }}
          icon={Smartphone}
          iconColor="#059669"
          iconBg="#ECFDF5"
        />
      </div>

      {/* 2. MAIN 12-COLUMN BENTO GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 7 COLUMNS (CGNAT FUNNEL + UPI DEVICE XML / JA4) */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 1: INTERACTIVE CGNAT CANDIDATE INTERSECTION FUNNEL (340 -> 41 -> 6 -> 1) */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* Header with Title, Badge, and Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Target size={16} color="#4F46E5" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                    Interactive CGNAT Candidate Intersection Funnel (340 → 41 → 6 → 1)
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", padding: "2px 6px", borderRadius: "4px" }}>
                    DOT CLAUSE 39.20
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  <strong>What this means for IO:</strong> Mobile carriers assign the same IP to 340 phones simultaneously. But across 4 bank logins, only <strong>1 unique handset</strong> was active.
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
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: isPortDropped ? "1px solid #D97706" : "1px solid #CBD5E1",
                    background: isPortDropped ? "#FFFBEB" : "#F8FAFC",
                    color: isPortDropped ? "#B45309" : "#0F172A",
                    cursor: "pointer",
                  }}
                  title="Simulates ISP omitting source port in IPDR"
                >
                  <Radio size={12} />
                  <span>{isPortDropped ? "Source Port Dropped" : "Drop Source Port"}</span>
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
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#0F172A",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* 4 Funnel Rows with Diagonal Hatched Background + Solid Gradient Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                      gap: "12px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: isTarget ? "#ECFDF5" : isChecked ? "#F8FAFC" : "#F1F5F9",
                      border: isTarget ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                      opacity: isChecked ? 1 : 0.5,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSession(stage.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#4F46E5", margin: 0 }}
                    />

                    {/* Step Info */}
                    <div style={{ width: "130px", flexShrink: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                        Step {idx + 1}: {stage.bank}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                        {stage.time}
                      </div>
                    </div>

                    {/* Proportional Bar with Hatched Pattern */}
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        height: "24px",
                        background: "#E2E8F0",
                        borderRadius: "6px",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                      }}
                      className="hatch-pattern"
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${isChecked ? (isPortDropped ? 100 : stage.widthPct) : 0}%`,
                          background: isTarget ? "linear-gradient(90deg, #10B981 0%, #059669 100%)" : "linear-gradient(90deg, #4F46E5 0%, #3B82F6 100%)",
                          borderRadius: "6px",
                          transition: "width 0.3s ease",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          left: "10px",
                          fontSize: "11px",
                          fontWeight: 800,
                          color: (isChecked && stage.widthPct > 25) ? "#FFFFFF" : "#0F172A",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {isChecked ? `${displayCount} Handsets` : "Session Inactive"}
                      </span>
                    </div>

                    {/* Public CGNAT IP & Location */}
                    <div style={{ width: "170px", textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                        {stage.ip}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748B" }}>
                        Airtel DL-TWR-891 · Vasant Kunj
                      </div>
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
                padding: "8px 12px",
                borderRadius: "8px",
                background: funnelResult.finalCandidateCount === 1 ? "#ECFDF5" : "#FFFBEB",
                border: funnelResult.finalCandidateCount === 1 ? "1px solid #A7F3D0" : "1px solid #FDE68A",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {funnelResult.finalCandidateCount === 1 ? <ShieldCheck size={16} color="#059669" /> : <ShieldAlert size={16} color="#D97706" />}
                <span style={{ fontSize: "12px", fontWeight: 700, color: funnelResult.finalCandidateCount === 1 ? "#047857" : "#B45309" }}>
                  {funnelResult.finalCandidateCount === 1
                    ? "UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { Target IMEI 358911104829104 }"
                    : `AMBIGUOUS POOL: ${funnelResult.finalCandidateCount} CANDIDATES SATISFIABLE`}
                </span>
              </div>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#475569" }}>
                P = 1.40 × 10⁻⁷ (Beyond Reasonable Doubt)
              </span>
            </div>
          </div>

          {/* CARD 2: UPI 2.0 <Device> XML & JA4 TLS FINGERPRINT DUAL-ANCHOR */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={15} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  UPI 2.0 &lt;Device&gt; XML & JA4 Client TLS Fingerprint Dual-Anchor
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                NPCI CENTRAL SWITCH
              </span>
            </div>

            {/* Clean Light Syntax-Highlighted XML Pill */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "10px 14px",
                borderRadius: "10px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                lineHeight: 1.5,
                color: "#0F172A",
              }}
            >
              <span style={{ color: "#4F46E5", fontWeight: 700 }}>&lt;Device</span>{" "}
              <span style={{ color: "#059669" }}>mobile=</span><span style={{ color: "#0284C7" }}>"+919871234567"</span>{" "}
              <span style={{ color: "#059669" }}>geocode=</span><span style={{ color: "#0284C7" }}>"28.5244,77.1588"</span>{" "}
              <span style={{ color: "#059669" }}>location=</span><span style={{ color: "#0284C7" }}>"Sector 4 Rohini DL"</span>{" "}
              <span style={{ color: "#059669" }}>ip=</span><span style={{ color: "#0284C7" }}>"100.72.14.89"</span>{" "}
              <span style={{ color: "#059669" }}>app=</span><span style={{ color: "#0284C7" }}>"org.npci.mule"</span>{" "}
              <span style={{ color: "#4F46E5", fontWeight: 700 }}>/&gt;</span>
            </div>

            {/* 4 Identity Anchors in Clean White Sub-Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>Registered MSISDN</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.mobile}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>Switch Tower Geocode</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.geocode}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>Device Model</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                  {canonicalData.deviceXml.deviceModel}
                </div>
              </div>

              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#047857", textTransform: "uppercase", fontWeight: 700 }}>JA4 TLS Fingerprint</div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  {canonicalData.deviceXml.ja4Fingerprint.slice(0, 14)}... (MATCH)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 COLUMNS (HOTSPOT DIAGRAM + DUAL-SIM TWIN) */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 3: WI-FI HOTSPOT TETHERING COLLISION (VISUAL 3-NODE SIGNAL DIAGRAM) */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Wifi size={15} color={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"} />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Wi-Fi Hotspot Tethering Collision (TTL Analysis)
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
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: hotspotResult.isHotspotDetected ? "1px solid #E11D48" : "1px solid #CBD5E1",
                  background: hotspotResult.isHotspotDetected ? "#FFF1F2" : "#F8FAFC",
                  color: hotspotResult.isHotspotDetected ? "#BE123C" : "#0F172A",
                  cursor: "pointer",
                }}
              >
                <span>{hotspotResult.isHotspotDetected ? "Tethering Active" : "Simulate Hotspot Tethering"}</span>
              </button>
            </div>

            {/* Visual 3-Node Signal Flow Diagram */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Node 1: Fraudster Handset */}
                <div style={{ textAlign: "center", flex: 1, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Fraud Handset</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>Samsung M34</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)" }}>Init TTL: 64</div>
                </div>

                {/* Signal Hop 1 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: hotspotResult.isHotspotDetected ? "#E11D48" : "#64748B", background: hotspotResult.isHotspotDetected ? "#FFE4E6" : "#E2E8F0", padding: "1px 5px", borderRadius: "3px" }}>
                    {hotspotResult.isHotspotDetected ? "Wi-Fi (-1 Hop)" : "Direct 4G"}
                  </span>
                  <ArrowRight size={14} color={hotspotResult.isHotspotDetected ? "#E11D48" : "#94A3B8"} />
                </div>

                {/* Node 2: Accomplice Gateway (or Direct Link) */}
                <div
                  style={{
                    textAlign: "center",
                    flex: 1,
                    background: hotspotResult.isHotspotDetected ? "#FFF1F2" : "#FFFFFF",
                    border: hotspotResult.isHotspotDetected ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                >
                  <div style={{ fontSize: "10px", color: hotspotResult.isHotspotDetected ? "#BE123C" : "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                    {hotspotResult.isHotspotDetected ? "Accomplice AP" : "Direct Link"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: hotspotResult.isHotspotDetected ? "#BE123C" : "#0F172A" }}>
                    {hotspotResult.isHotspotDetected ? hotspotResult.accompliceHandset : "Cellular Direct"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    {hotspotResult.isHotspotDetected ? hotspotResult.bssid : "No Gateway"}
                  </div>
                </div>

                {/* Signal Hop 2 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 6px" }}>
                  <ArrowRight size={14} color="#94A3B8" />
                </div>

                {/* Node 3: Airtel Tower */}
                <div style={{ textAlign: "center", flex: 1, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Airtel Tower</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>DL-TWR-891</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: hotspotResult.isHotspotDetected ? "#E11D48" : "#059669", fontFamily: "var(--font-mono)" }}>
                    Observed: {hotspotResult.ttlObserved}
                  </div>
                </div>
              </div>

              {/* Anomaly Callout Box */}
              <div
                style={{
                  fontSize: "11.5px",
                  lineHeight: 1.45,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5",
                  border: hotspotResult.isHotspotDetected ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                  color: hotspotResult.isHotspotDetected ? "#9F1239" : "#065F46",
                }}
              >
                {hotspotResult.anomalySummary}
              </div>
            </div>
          </div>

          {/* CARD 4: DUAL-SIM HARDWARE TWIN & Z3 SMT CLOCK-OFFSET */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Smartphone size={15} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Dual-SIM Hardware Twin & Z3 SMT Bounds
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                15-DIGIT MOD-10 LUHN
              </span>
            </div>

            {/* Side-by-Side Dual-SIM Slots */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700 }}>SLOT 1 (AIRTEL)</span>
                  <span style={{ fontSize: "10px", color: "#059669", fontWeight: 800 }}>LUHN VALID ✓</span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {imei1}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748B", marginTop: "2px" }}>
                  TAC: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{dualSimResult.tac1}</strong>
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700 }}>SLOT 2 (JIO)</span>
                  <span style={{ fontSize: "10px", color: "#059669", fontWeight: 800 }}>LUHN VALID ✓</span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {imei2}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748B", marginTop: "2px" }}>
                  TAC: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{dualSimResult.tac2}</strong>
                </div>
              </div>
            </div>

            {/* Z3 SMT Clock-Offset Graphic */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                  Z3 SMT Clock-Offset Tolerance: [-1.2s, +0.8s]
                </span>
                <span style={{ fontSize: "10px", color: "#059669", fontWeight: 800 }}>
                  SATISFIABLE ✓
                </span>
              </div>

              {/* Offset Visual Bar */}
              <div style={{ position: "relative", height: "14px", background: "#E2E8F0", borderRadius: "7px", overflow: "hidden", marginBottom: "4px" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "#64748B", zIndex: 2 }} />
                <div style={{ position: "absolute", left: "38%", width: "24%", top: 0, bottom: 0, background: "rgba(16, 185, 129, 0.45)", borderRadius: "4px" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                <span>-2.0s</span>
                <span>Δt = 0.0s (NTP Synchronized)</span>
                <span>+2.0s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

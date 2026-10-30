import React, { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Smartphone,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  BentoKpiCard,
  SegmentedPillSwitcher,
} from "../../components/tarka/BentoPrimitives";
import {
  solveCgnatFunnel,
  analyzeDualSimHardware,
  detectHotspotCollision,
  getCanonicalAttributionData,
} from "../../utils/cgnatAttribution";

export const AttributionScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<"funnel" | "device-ja4" | "hotspot" | "dual-sim">("funnel");

  // Canonical Data
  const canonicalData = useMemo(() => getCanonicalAttributionData(), []);

  // Funnel Session Toggles
  const [activeSessions, setActiveSessions] = useState<{ [id: string]: boolean }>({
    "SESS-01": true,
    "SESS-02": true,
    "SESS-03": true,
    "SESS-04": true,
  });

  const toggleSession = (id: string) => {
    setActiveSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute CGNAT Funnel Result
  const funnelResult = useMemo(() => {
    const selectedSessions = canonicalData.sessions.filter((s) => activeSessions[s.id]);
    return solveCgnatFunnel(
      selectedSessions,
      mutations.dropCgnatSourcePort || mutations.cgnatPortCollision
    );
  }, [canonicalData.sessions, activeSessions, mutations.dropCgnatSourcePort, mutations.cgnatPortCollision]);

  // Dual-SIM State
  const [imei1, setImei1] = useState<string>(canonicalData.canonicalImei1);
  const [imei2, setImei2] = useState<string>(canonicalData.canonicalImei2);

  const dualSimResult = useMemo(() => {
    return analyzeDualSimHardware(imei1, imei2, 18);
  }, [imei1, imei2]);

  // Hotspot Collision State
  const hotspotResult = useMemo(() => {
    const observed = mutations.triggerHotspotCollision ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [mutations.triggerHotspotCollision]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* 1. Header & Tab Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="bento-badge bento-badge-blue">
              <Radio size={11} /> SCREEN 2: CELLULAR & DEVICE ATTRIBUTION
            </span>
            <span className="bento-badge bento-badge-neutral font-mono-tabular">
              DOT CLAUSE 39.20 & BSA § 63
            </span>
          </div>
          <h1 style={{ margin: "2px 0 4px", fontSize: "22px", fontWeight: 700, color: "var(--bento-text-main)", letterSpacing: "-0.5px" }}>
            Interactive CGNAT Intersection Funnel & Telecom Engine
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--bento-text-muted)", maxWidth: "800px", lineHeight: 1.5 }}>
            Cryptographic isolation of single subscribers across Carrier Grade NAT pools (<code className="font-mono-tabular">340 → 41 → 6 → 1</code>), UPI 2.0 &lt;Device&gt; XML parsing, Wi-Fi hotspot TTL detection, and dual-SIM TAC matching.
          </p>
        </div>

        <SegmentedPillSwitcher
          options={[
            { id: "funnel", label: "Candidate Funnel" },
            { id: "device-ja4", label: "UPI Device XML & JA4" },
            { id: "hotspot", label: "Hotspot Collision" },
            { id: "dual-sim", label: "Dual-SIM Hardware Twin" },
          ]}
          activeId={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </div>

      {/* 2. Top 4 Bento KPI Cards */}
      <div className="bento-grid-4">
        <BentoKpiCard
          title="CGNAT INTERSECTION CANDIDATES"
          metric={funnelResult.finalCandidateCount.toString()}
          metricColor={funnelResult.finalCandidateCount === 1 ? "var(--bento-emerald)" : "var(--bento-amber)"}
          delta={{
            value: funnelResult.finalCandidateCount === 1 ? "UNIQUE ATTRIBUTED" : "AMBIGUOUS POOL",
            isPositive: funnelResult.finalCandidateCount === 1,
            isWarning: funnelResult.finalCandidateCount > 1,
            label: funnelResult.sourcePortDropped ? "Port dropped" : "Exact NAT translation",
          }}
          subtitle="Progressive Tower Intersection"
          icon={Radio}
          iconColor={funnelResult.finalCandidateCount === 1 ? "var(--bento-emerald)" : "var(--bento-amber)"}
          iconBg={funnelResult.finalCandidateCount === 1 ? "var(--bento-emerald-subtle)" : "var(--bento-amber-subtle)"}
        />

        <BentoKpiCard
          title="COINCIDENTAL PROBABILITY"
          metric={funnelResult.coincidentalRatio}
          metricColor="var(--bento-indigo)"
          delta={{
            value: `${(funnelResult.coincidentalProbability * 100).toExponential(2)}%`,
            isPositive: funnelResult.finalCandidateCount === 1,
            label: "Beyond Reasonable Doubt",
          }}
          subtitle="Multi-Mule Login Concurrency"
          icon={Cpu}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />

        <BentoKpiCard
          title="HOTSPOT TETHERING (TTL)"
          metric={hotspotResult.isHotspotDetected ? "COLLISION DETECTED" : "DIRECT 4G/5G"}
          metricColor={hotspotResult.isHotspotDetected ? "var(--bento-crimson)" : "var(--bento-emerald)"}
          delta={{
            value: `TTL = ${hotspotResult.ttlObserved} (Expected 64)`,
            isWarning: hotspotResult.isHotspotDetected,
            label: hotspotResult.isHotspotDetected ? "1 Hop Decrement" : "Direct cellular link",
          }}
          subtitle="Accomplice Handset Gateway"
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "var(--bento-crimson)" : "var(--bento-emerald)"}
          iconBg={hotspotResult.isHotspotDetected ? "var(--bento-crimson-subtle)" : "var(--bento-emerald-subtle)"}
        />

        <BentoKpiCard
          title="DUAL-SIM HARDWARE TWIN"
          metric={dualSimResult.isHardwareTwin ? "TWIN CONFIRMED" : "MISMATCH"}
          metricColor={dualSimResult.isHardwareTwin ? "var(--bento-emerald)" : "var(--bento-crimson)"}
          delta={{
            value: `TAC ${dualSimResult.tac1}`,
            isPositive: dualSimResult.isHardwareTwin,
            label: "Samsung Galaxy M34 5G",
          }}
          subtitle="15-Digit Luhn & TAC Verification"
          icon={Smartphone}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />
      </div>

      {/* 3. SUB-TAB 1: Candidate Intersection Funnel */}
      {activeTab === "funnel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Alert Banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: funnelResult.finalCandidateCount === 1 ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: funnelResult.finalCandidateCount === 1 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {funnelResult.finalCandidateCount === 1 ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <AlertTriangle size={24} color="#F59E0B" />
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: funnelResult.finalCandidateCount === 1 ? "#059669" : "#D97706" }}>
                  {funnelResult.finalCandidateCount === 1
                    ? "INDIVIDUAL SUBSCRIBER ATTRIBUTED (BEYOND REASONABLE DOUBT)"
                    : `AMBIGUOUS POOL: ${funnelResult.finalCandidateCount} CANDIDATE SUBSCRIBERS REMAIN`}
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginTop: "2px" }}>
                  Cumulative Coincidental Probability: <strong className="font-mono-tabular">{funnelResult.coincidentalRatio}</strong> | Attributed Target: <strong className="font-mono-tabular">{funnelResult.attributedSubscriberId || "None (Ambiguous)"}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation("dropCgnatSourcePort")}
              className={`bento-btn bento-btn-sm ${mutations.dropCgnatSourcePort ? "bento-btn-primary" : "bento-btn-secondary"}`}
              style={{
                background: mutations.dropCgnatSourcePort ? "#D97706" : undefined,
                borderColor: mutations.dropCgnatSourcePort ? "#D97706" : undefined,
              }}
            >
              <Radio size={13} />
              <span>{mutations.dropCgnatSourcePort ? "Restore Source Ports" : "Drop CGNAT Source Port (Simulate Ambiguity)"}</span>
            </button>
          </div>

          {/* Interactive Step-by-Step Funnel Pipeline */}
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Progressive 4-Stage Mule Login Intersection Pipeline
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Toggle individual bank mule sessions on/off to see how set intersection narrows candidates from 340 handsets down to 1.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSessions({ "SESS-01": true, "SESS-02": true, "SESS-03": true, "SESS-04": true })}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                <RotateCcw size={12} />
                <span>Reset All 4 Sessions</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {canonicalData.sessions.map((sess, idx) => {
                const isIncluded = !!activeSessions[sess.id];
                const stage = funnelResult.stages.find((s) => s.sessionId === sess.id);
                const count = stage ? stage.intersectionSize : "-";

                return (
                  <div
                    key={sess.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "10px",
                      border: isIncluded ? "1px solid var(--bento-border-subtle)" : "1px dashed var(--bento-border-subtle)",
                      background: isIncluded ? "var(--bento-card-bg)" : "rgba(0,0,0,0.02)",
                      opacity: isIncluded ? 1 : 0.6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => toggleSession(sess.id)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563EB" }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                          Step {idx + 1}: {sess.bankName}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }} className="font-mono-tabular">
                          {sess.loginTimeIST} | Public CGNAT IP: {sess.publicIp} | Tower Population: {sess.towerPoolCount}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "10px", color: "var(--bento-text-muted)", textTransform: "uppercase" }}>
                          Candidates Remaining
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: count === 1 ? "#059669" : "#2563EB" }} className="font-mono-tabular">
                          {count} {count === 1 ? "★" : ""}
                        </div>
                      </div>

                      {stage && (
                        <div style={{ textAlign: "right", minWidth: "120px" }}>
                          <div style={{ fontSize: "10px", color: "var(--bento-text-muted)", textTransform: "uppercase" }}>
                            Coincidence Odds
                          </div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-main)" }} className="font-mono-tabular">
                            {stage.coincidentalRatioStr}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: UPI Device XML & JA4 */}
      {activeTab === "device-ja4" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "4px" }}>
              UPI 2.0 &lt;Device&gt; XML & JA4 TLS Fingerprint Dual-Anchor
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Cryptographically binds telecom Carrier-Grade NAT translation with application-layer NPCI UPI switch telemetry.
            </p>

            <div style={{ background: "#0F172A", padding: "14px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "6px" }}>
                Raw Decrypted UPI 2.0 Switch XML Payload:
              </div>
              <code style={{ fontSize: "12px", color: "#38BDF8", fontFamily: "var(--font-mono)" }}>
                {canonicalData.deviceXml.rawXml}
              </code>
            </div>

            <div className="bento-grid-4">
              <div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Registered MSISDN</div>
                <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                  {canonicalData.deviceXml.mobile}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Tower Geocode</div>
                <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                  {canonicalData.deviceXml.geocode}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Tower Location</div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                  {canonicalData.deviceXml.location}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>JA4 Client TLS Fingerprint</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }} className="font-mono-tabular">
                  {canonicalData.deviceXml.ja4Fingerprint} (MATCHED)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: Hotspot Collision */}
      {activeTab === "hotspot" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Wi-Fi Hotspot Tethering Collision Detector (TTL Hop Analysis)
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Detects unauthorized network bridging where fraudster tethers their handset through an accomplice device.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation("triggerHotspotCollision")}
                className={`bento-btn bento-btn-sm ${mutations.triggerHotspotCollision ? "bento-btn-primary" : "bento-btn-secondary"}`}
                style={{
                  background: mutations.triggerHotspotCollision ? "#2563EB" : undefined,
                  borderColor: mutations.triggerHotspotCollision ? "#2563EB" : undefined,
                }}
              >
                <Wifi size={13} />
                <span>{mutations.triggerHotspotCollision ? "Revert TTL (Direct 64)" : "Simulate Hotspot Tethering (TTL 63)"}</span>
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: hotspotResult.isHotspotDetected ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)",
                border: hotspotResult.isHotspotDetected ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className={`bento-badge ${hotspotResult.isHotspotDetected ? "bento-badge-coral" : "bento-badge-emerald"}`}>
                  {hotspotResult.isHotspotDetected ? "TETHERING COLLISION DETECTED" : "DIRECT HANDSET CONNECTION"}
                </span>
                <span style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Observed TTL: <strong className="font-mono-tabular">{hotspotResult.ttlObserved}</strong> (Default Android: <strong className="font-mono-tabular">64</strong>)
                </span>
              </div>

              <div style={{ fontSize: "13px", color: "var(--bento-text-main)", lineHeight: 1.5, marginBottom: "12px" }}>
                {hotspotResult.anomalySummary}
              </div>

              {hotspotResult.isHotspotDetected && (
                <div className="bento-grid-4">
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Accomplice BSSID MAC</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }} className="font-mono-tabular">
                      {hotspotResult.bssid}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Broadcast SSID</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }} className="font-mono-tabular">
                      {hotspotResult.ssid}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Accomplice Gateway Handset</div>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>
                      {hotspotResult.accompliceHandset}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: Dual-SIM Hardware Twin */}
      {activeTab === "dual-sim" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "6px" }}>
              Dual-SIM IMEI 15-Digit Luhn Check & Hardware Twin Dissector
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Verifies whether two IMEIs share the identical 8-digit Type Allocation Code (TAC) and pass the mathematical mod-10 Luhn checksum.
            </p>

            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted)", display: "block", marginBottom: "4px" }}>
                  SLOT 1 IMEI (15 DIGITS)
                </label>
                <input
                  type="text"
                  value={imei1}
                  onChange={(e) => setImei1(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "var(--bento-card-bg)",
                    color: "var(--bento-text-main)",
                    fontSize: "14px",
                  }}
                  className="font-mono-tabular"
                />
              </div>

              <div style={{ flex: 1, minWidth: "240px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted)", display: "block", marginBottom: "4px" }}>
                  SLOT 2 IMEI (15 DIGITS)
                </label>
                <input
                  type="text"
                  value={imei2}
                  onChange={(e) => setImei2(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "var(--bento-card-bg)",
                    color: "var(--bento-text-main)",
                    fontSize: "14px",
                  }}
                  className="font-mono-tabular"
                />
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: dualSimResult.isHardwareTwin ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                border: dualSimResult.isHardwareTwin ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className={`bento-badge ${dualSimResult.isHardwareTwin ? "bento-badge-emerald" : "bento-badge-coral"}`}>
                  {dualSimResult.verdict}
                </span>
                <span style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Shared TAC: <strong className="font-mono-tabular">{dualSimResult.tac1}</strong>
                </span>
              </div>

              <div className="bento-grid-4">
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Slot 1 Luhn Status</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: dualSimResult.isImei1LuhnValid ? "#059669" : "#DC2626" }} className="font-mono-tabular">
                    {dualSimResult.isImei1LuhnValid ? "VALID MOD-10" : "INVALID CHECKSUM"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Slot 2 Luhn Status</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: dualSimResult.isImei2LuhnValid ? "#059669" : "#DC2626" }} className="font-mono-tabular">
                    {dualSimResult.isImei2LuhnValid ? "VALID MOD-10" : "INVALID CHECKSUM"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Identified Model</div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>
                    {dualSimResult.hardwareModel}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Z3 Clock Offset Bound</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#2563EB" }} className="font-mono-tabular">
                    [{dualSimResult.clockOffsetBound[0]}s, +{dualSimResult.clockOffsetBound[1]}s]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

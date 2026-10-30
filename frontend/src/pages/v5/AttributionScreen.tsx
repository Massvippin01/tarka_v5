import React, { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Smartphone,
  Cpu,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const AttributionScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Active sub-view in Attribution Screen
  const [activeTab, setActiveTab] = useState<"funnel" | "device-ja4" | "dual-sim" | "z3-clock">("funnel");

  // Funnel Filter Toggles
  const [filterCarrier, setFilterCarrier] = useState<boolean>(true);
  const [filterWhatsapp, setFilterWhatsapp] = useState<boolean>(true);
  const [filterNetbanking, setFilterNetbanking] = useState<boolean>(true);
  const [filterDeviceXml, setFilterDeviceXml] = useState<boolean>(true);

  // Candidate Funnel Count Calculation
  const funnelState = useMemo(() => {
    // If CGNAT Port Collision mutation is active, the NetBanking step doesn't narrow to 1, stays at 6
    if (mutations.cgnatPortCollision) {
      return {
        stage1: 340,
        stage2: 41,
        stage3: 6,
        stage4: 6, // Collision prevents narrowing to 1
        isolatedSuspect: null,
        collisionAlert: true,
      };
    }


    return {
      stage1: 340,
      stage2: filterWhatsapp ? 41 : 340,
      stage3: filterNetbanking ? 6 : (filterWhatsapp ? 41 : 340),
      stage4: filterDeviceXml ? 1 : (filterNetbanking ? 6 : 41),
      isolatedSuspect: filterDeviceXml
        ? {
            name: "Imran Qureshi (Alias: Insp. Rajesh Verma)",
            msisdn: "+91-98711-23941",
            imei1: "864920041289100",
            imei2: "864920041289108",
            device: "OnePlus 11 5G (Dual-SIM)",
            cgnatPort: 49210,
            tower: "DEL-TWR-4011 (Sector 18 Rohini)",
          }
        : null,
      collisionAlert: false,
    };
  }, [filterCarrier, filterWhatsapp, filterNetbanking, filterDeviceXml, mutations.cgnatPortCollision]);

  // Luhn IMEI Validator State
  const [imeiInput, setImeiInput] = useState<string>("864920041289100");
  const luhnResult = useMemo(() => {
    const raw = imeiInput.trim().replace(/\D/g, "");
    if (raw.length !== 15) {
      return {
        valid: false,
        error: "IMEI must be exactly 15 digits (14 digits + 1 Luhn check digit)",
        tac: raw.substring(0, 8),
        model: "Unknown Device",
      };
    }

    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(raw[i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const computedCheckDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(raw[14], 10);
    const valid = computedCheckDigit === providedCheckDigit;

    // TAC lookup
    const tac = raw.substring(0, 8);
    const model = tac === "86492004" ? "OnePlus 11 5G (CPH2449 Global)" : "Generic GSM Handset";

    return {
      valid,
      computedCheckDigit,
      providedCheckDigit,
      tac,
      model,
      error: valid ? null : `Luhn check digit mismatch (Expected: ${computedCheckDigit}, Found: ${providedCheckDigit})`,
    };
  }, [imeiInput]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* Top Hero Banner */}
      <div className="lg-overview-hero" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="lg-badge lg-badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Radio size={11} strokeWidth={2.5} />
                <span>SCREEN 2: CGNAT & HOTSPOT ENGINE</span>
              </span>
              <span className="lg-badge lg-badge-emerald">CRIMINAL IDENTIFIER ATTRIBUTION</span>
            </div>
            <h1 style={{ margin: "2px 0 4px", fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              Multi-Anchor Cellular CGNAT, Dual-SIM IMEI & Z3 Clock Attribution
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", maxWidth: "800px", lineHeight: 1.5 }}>
              Deterministic cross-service correlation intersecting shared Carrier CGNAT pools, UPI 2.0 Device XML, JA4 TLS fingerprints, dual-SIM Luhn hardware twins, and Z3 clock desync solvers.
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "3px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("funnel")}
              className={`lg-tab ${activeTab === "funnel" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              CGNAT Funnel (340→1)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("device-ja4")}
              className={`lg-tab ${activeTab === "device-ja4" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              UPI &lt;Device&gt; & JA4
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dual-sim")}
              className={`lg-tab ${activeTab === "dual-sim" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Dual-SIM IMEI Luhn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("z3-clock")}
              className={`lg-tab ${activeTab === "z3-clock" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Z3 Clock Solver & SIM Swap
            </button>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: Interactive CGNAT Candidate Intersection Funnel */}
      {activeTab === "funnel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Funnel Controls & Mutation Status */}
          <div className="lg-bento-card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Filter size={16} color="#60A5FA" />
                  <span>Interactive Multi-Service Intersection Funnel</span>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                  Toggle independent evidence layers to watch candidate subscriber pool narrow deterministically.
                </div>
              </div>

              {/* CGNAT Collision Mutation Trigger */}
              <button
                type="button"
                onClick={() => toggleMutation("cgnatPortCollision")}
                className={`lg-mutator-btn ${mutations.cgnatPortCollision ? "active-amber" : ""}`}
                style={{ padding: "6px 14px" }}
              >
                <AlertTriangle size={13} />
                <span>{mutations.cgnatPortCollision ? "Revert Port Collision" : "Simulate Port Collision (Widen to 6)"}</span>
              </button>
            </div>

            {/* Toggle Buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: "#F3F4F6" }}>
                <input type="checkbox" checked={filterCarrier} onChange={(e) => setFilterCarrier(e.target.checked)} />
                <span>1. Airtel CGNAT Public Pool (103.21.144.92)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: "#F3F4F6" }}>
                <input type="checkbox" checked={filterWhatsapp} onChange={(e) => setFilterWhatsapp(e.target.checked)} />
                <span>2. WhatsApp Extortion Call (10:48 IST Session)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: "#F3F4F6" }}>
                <input type="checkbox" checked={filterNetbanking} onChange={(e) => setFilterNetbanking(e.target.checked)} />
                <span>3. SBI NetBanking Source Port (Port 49210)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: "#F3F4F6" }}>
                <input type="checkbox" checked={filterDeviceXml} onChange={(e) => setFilterDeviceXml(e.target.checked)} />
                <span>4. UPI 2.0 &lt;Device&gt; XML Fingerprint</span>
              </label>
            </div>
          </div>

          {/* Visual Funnel Progression */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {/* Stage 1 */}
            <div className="lg-bento-card" style={{ textAlign: "center", borderTop: "3px solid #3B82F6" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>Stage 1: CGNAT Pool</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#60A5FA", margin: "8px 0" }}>{funnelState.stage1}</div>
              <div style={{ fontSize: "11px", color: "#CBD5E1" }}>Total Public IPv4 Subscribers</div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px" }}>Airtel Delhi Gateway</div>
            </div>

            {/* Stage 2 */}
            <div className="lg-bento-card" style={{ textAlign: "center", borderTop: "3px solid #A855F7" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>Stage 2: WhatsApp Call</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#C084FC", margin: "8px 0" }}>{funnelState.stage2}</div>
              <div style={{ fontSize: "11px", color: "#CBD5E1" }}>Active Voice Call Peers</div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px" }}>Temporal Window ±15s</div>
            </div>

            {/* Stage 3 */}
            <div className="lg-bento-card" style={{ textAlign: "center", borderTop: "3px solid #F59E0B" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>Stage 3: Bank Source Port</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#FBBF24", margin: "8px 0" }}>{funnelState.stage3}</div>
              <div style={{ fontSize: "11px", color: "#CBD5E1" }}>Port 49210 Mapped Sessions</div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px" }}>SBI CBS Inbound NAT</div>
            </div>

            {/* Stage 4 */}
            <div
              className="lg-bento-card"
              style={{
                textAlign: "center",
                borderTop: funnelState.stage4 === 1 ? "3px solid #10B981" : "3px solid #F43F5E",
                background: funnelState.stage4 === 1 ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>Stage 4: Unified Suspect</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: funnelState.stage4 === 1 ? "#10B981" : "#F43F5E", margin: "8px 0" }}>
                {funnelState.stage4}
              </div>
              <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
                {funnelState.stage4 === 1 ? "Sole Suspect Isolated" : "Ambiguous Candidates Trapped"}
              </div>
              <div style={{ fontSize: "10px", color: funnelState.stage4 === 1 ? "#34D399" : "#F87171", marginTop: "4px" }}>
                {funnelState.stage4 === 1 ? "100% Attribution Certainty" : "Port Collision Triggered"}
              </div>
            </div>
          </div>

          {/* Isolated Suspect Card */}
          {funnelState.isolatedSuspect && (
            <div
              className="lg-bento-card"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#A7F3D0" }}>
                    Court-Admissible Attribution Target Isolated under BSA § 63
                  </span>
                </div>
                <span className="lg-badge lg-badge-emerald">ZERO AMBIGUITY RESIDUAL</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", fontSize: "12px" }}>
                <div>
                  <div style={{ color: "#94A3B8" }}>Suspect Identity:</div>
                  <div style={{ color: "#F3F4F6", fontWeight: 700, marginTop: "2px" }}>{funnelState.isolatedSuspect.name}</div>
                </div>
                <div>
                  <div style={{ color: "#94A3B8" }}>Normalized MSISDN:</div>
                  <div style={{ color: "#60A5FA", fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {funnelState.isolatedSuspect.msisdn}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94A3B8" }}>Hardware Handset:</div>
                  <div style={{ color: "#F3F4F6", fontWeight: 600, marginTop: "2px" }}>{funnelState.isolatedSuspect.device}</div>
                </div>
                <div>
                  <div style={{ color: "#94A3B8" }}>SIM 1 IMEI:</div>
                  <div style={{ color: "#A7F3D0", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{funnelState.isolatedSuspect.imei1}</div>
                </div>
                <div>
                  <div style={{ color: "#94A3B8" }}>SIM 2 Twin IMEI:</div>
                  <div style={{ color: "#A7F3D0", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{funnelState.isolatedSuspect.imei2}</div>
                </div>
                <div>
                  <div style={{ color: "#94A3B8" }}>Serving Cellular CGI:</div>
                  <div style={{ color: "#FBBF24", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{funnelState.isolatedSuspect.tower}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: UPI 2.0 <Device> XML + JA4 WAF Dual-Anchor */}
      {activeTab === "device-ja4" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Smartphone size={16} color="#60A5FA" />
              <span>NPCI UPI 2.0 Common Library &lt;Device&gt; XML Payload</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Cryptographically signed XML payload captured at the NPCI UPI switch during transaction authentication.
            </p>

            <pre
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                color: "#93C5FD",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                overflowX: "auto",
              }}
            >
              {`<Device
  app="com.sbi.upi"
  capability="01"
  geocode="28.7041,77.1025"
  id="DEV_ONEPLUS_86492004"
  ip="10.142.88.19"
  location="Delhi, IN"
  mobileId="MOB-86492004"
  os="Android 14 (OxygenOS 14.0)"
  simSerial="8991002341"
  telecom="Airtel Delhi NCR"
  deviceFingerprint="72a819bcca44"
/>`}
            </pre>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Wifi size={16} color="#10B981" />
              <span>JA4 TLS Fingerprint & Hotspot Tethering Collision</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Dual-anchored network layer fingerprints proving the suspect bridged the victim call via a local Wi-Fi hotspot.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div style={{ padding: "10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ color: "#94A3B8", fontSize: "11px" }}>JA4 WAF Client Fingerprint:</div>
                <div style={{ color: "#A7F3D0", fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: "2px" }}>
                  t13d1516h2_8daaf6152771_b0098492019a
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>Matched: Official SBI Yono Android App TLS Stack</div>
              </div>

              <div style={{ padding: "10px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                <div style={{ color: "#FDE68A", fontSize: "11px", fontWeight: 700 }}>Wi-Fi Hotspot Tethering Collision Detected:</div>
                <div style={{ color: "#F3F4F6", marginTop: "4px", fontSize: "11px", lineHeight: 1.5 }}>
                  IP Packet TTL decrement observed ($64 \to 63$). BSSID <code>78:8A:20:94:BC:11</code> (Airtel 5G Hotspot) collision connects suspect handset directly to victim WhatsApp session.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Dual-SIM IMEI Luhn/TAC Twin Detector */}
      {activeTab === "dual-sim" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={16} color="#60A5FA" />
              <span>Luhn Check Digit Algorithm Inspector</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Validates international 15-digit IMEI mod-10 check digit algorithms to filter synthetic or hallucinated IMEIs.
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "#94A3B8" }}>Type Allocation Code (TAC):</span>
                <span style={{ color: "#60A5FA", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{luhnResult.tac}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "#94A3B8" }}>Hardware Device Model:</span>
                <span style={{ color: "#F3F4F6", fontWeight: 600 }}>{luhnResult.model}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "#94A3B8" }}>Luhn Algorithm Check:</span>
                <span style={{ color: luhnResult.valid ? "#10B981" : "#F43F5E", fontWeight: 700 }}>
                  {luhnResult.valid ? "VALID (MOD-10 SATISFIED)" : "INVALID (CHECKSUM FAILED)"}
                </span>
              </div>
            </div>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Smartphone size={16} color="#10B981" />
              <span>Baseband Radio Dual-SIM Twin Detection</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              In modern dual-SIM handsets, SIM 1 and SIM 2 share identical TAC (first 8 digits) and differ only in sequential serial bytes.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#93C5FD" }}>Slot 1 (Extortion VoIP Call):</span>
                  <span className="lg-badge lg-badge-blue">ACTIVE AIRTEL</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#FFFFFF" }}>86492004 128910 0</div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>MSISDN: +91-98711-23941</div>
              </div>

              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#A7F3D0" }}>Slot 2 (Bank OTP Gateway):</span>
                  <span className="lg-badge lg-badge-emerald">ACTIVE JIO</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#FFFFFF" }}>86492004 128910 8</div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>MSISDN: +91-98100-99210 (Linked to Mule A/C)</div>
              </div>

              <div style={{ fontSize: "11px", color: "#34D399", fontWeight: 600 }}>
                ✓ Co-Location Conclusively Proven: Both SIMs operating in identical radio baseband.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Z3 Clock-Offset Solver & SIM-Swap Timeline */}
      {activeTab === "z3-clock" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} color="#F59E0B" />
              <span>Microsoft Z3 SMT Clock-Offset Solver [Δt_min, Δt_max]</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Computes formal difference logic bounds between cellular base station Stratum-1 NTP clocks and suspect handset RTC crystals.
            </p>

            {/* Tamper Alert if mutation active */}
            {mutations.clockSkewTamper ? (
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.12)", border: "1px solid #F43F5E", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#FECDD3", fontWeight: 700, fontSize: "13px" }}>
                  <ShieldAlert size={16} color="#F43F5E" />
                  <span>IMPLAUSIBLE_CLOCK_OFFSET TAMPER DETECTED</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#E2E8F0", lineHeight: 1.5 }}>
                  Z3 SMT Invariant proved UNSAT: Handset clock has been rolled back by <strong>-14.2 minutes</strong>. Physical hardware RTC drift cannot exceed ±5 minutes over 30 days without manual user time manipulation.
                </p>
              </div>
            ) : (
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#A7F3D0", fontWeight: 700, fontSize: "13px" }}>
                  <ShieldCheck size={16} color="#10B981" />
                  <span>NORMAL CLOCK SYNCHRONIZATION (SATISFIABLE)</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#E2E8F0", lineHeight: 1.5 }}>
                  All event timestamps reconcile within nominal Stratum-1 cellular NTP tolerance: <code>Δt ∈ [-1.2s, +0.8s]</code>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleMutation("clockSkewTamper")}
              className={`lg-mutator-btn ${mutations.clockSkewTamper ? "active-coral" : ""}`}
            >
              <AlertTriangle size={13} />
              <span>{mutations.clockSkewTamper ? "Revert Clock Tamper" : "Simulate -14m Clock Rollback Tamper"}</span>
            </button>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px" }}>
              SIM-Swap vs Extortion Timeline
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px" }}>
              <div style={{ borderLeft: "2px solid #3B82F6", paddingLeft: "10px" }}>
                <div style={{ color: "#60A5FA", fontWeight: 700 }}>08:15:00 IST (T-1h 15m)</div>
                <div style={{ color: "#F3F4F6" }}>Unauthorized SIM-Swap Executed</div>
                <div style={{ color: "#94A3B8" }}>Vendor Stall: Gurugram Sector 29 (Forged Aadhaar)</div>
              </div>

              <div style={{ borderLeft: "2px solid #F59E0B", paddingLeft: "10px" }}>
                <div style={{ color: "#FBBF24", fontWeight: 700 }}>09:30:00 IST (T+0h)</div>
                <div style={{ color: "#F3F4F6" }}>Victim 1930 NCRP Portal Helpline Intake</div>
                <div style={{ color: "#94A3B8" }}>Extortion Threats via WhatsApp VoIP Call Initiated</div>
              </div>

              <div style={{ borderLeft: "2px solid #F43F5E", paddingLeft: "10px" }}>
                <div style={{ color: "#F87171", fontWeight: 700 }}>10:14:02 IST (Claimed Screenshot)</div>
                <div style={{ color: "#F3F4F6" }}>Fabricated Payment Receipt Claim Created</div>
                <div style={{ color: "#94A3B8" }}>Precedes demand time (Causal Inversion Anomaly)</div>
              </div>

              <div style={{ borderLeft: "2px solid #10B981", paddingLeft: "10px" }}>
                <div style={{ color: "#34D399", fontWeight: 700 }}>10:35:00 IST (T+1h 5m)</div>
                <div style={{ color: "#F3F4F6" }}>SBI Core Banking CBS Settlement (₹50,000.00)</div>
                <div style={{ color: "#94A3B8" }}>Actual money arrival under RRN 202602149921</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

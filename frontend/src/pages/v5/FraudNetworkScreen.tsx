import React, { useState, useMemo } from "react";
import {
  Network,
  Wifi,
  Cpu,
  Share2,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
import { detectHotspotCollision } from "../../utils/cgnatAttribution";

export const FraudNetworkScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  const isHotspotActive = !!mutations.triggerHotspotCollision;
  const hotspotResult = useMemo(() => {
    const observed = isHotspotActive ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [isHotspotActive]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>("NODE-KP");
  const [isCopied, setIsCopied] = useState(false);
  const [isXmlCopied, setIsXmlCopied] = useState(false);

  const handleCopyI4cReport = () => {
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===
Case Ref: FIR #149/2026 Cyber Crime PS Noida
Generated: 2026-09-22 10:30:00 IST | Classification: LAW ENFORCEMENT SENSITIVE

[SYNDICATE INFRASTRUCTURE CLUSTER LINKAGE]
Primary Infrastructure Controller:
• Accomplice Wi-Fi Hotspot BSSID: 74:DA:38:A2:11:BC (Poco X5 Pro AP)
• Ingress Gateway: Airtel PGW (103.21.144.92) | Decremented TTL: 63 (Hop Count = 2)
• Client TLS Anchor: JA4 = t13d1516h2_8daaf6 (Identical across 4 Bank Sessions)

[CONTROLLED MULE ENTITIES (4 TARGETS)]
1. Vikram Shah (SBI A/c 41088291083) — L1 Primary Inflow Receiver (₹5,00,000)
2. Rohit Verma (HDFC A/c 5010029419920) — L2A Split Conduit (₹3,00,000)
3. Sameer Khan (AXIS A/c 9140200410291) — L2B Cashout Conduit (₹2,00,000)
4. Paytm Merchant Pool Sink (Sink #1109) — Terminal Escrow

[INTER-STATE CORRELATION]
Blind Index HMAC-SHA256 Match across 14 FIRs (UP, MH, KA, GJ, DL)
Total Syndicate Transaction Exposure: ₹10,42,18,900.00`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    toast.success("I4C Samanvaya Syndicate Link Report copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyXml = () => {
    const xml = `<Device mobile="919871123941" geocode="28.5355,77.3910" location="Noida Sector 18" ip="103.21.144.92" app="com.sbi.upi" capability="0001" bssid="74:DA:38:A2:11:BC" tls_ja4="t13d1516h2_8daaf6" />`;
    navigator.clipboard.writeText(xml);
    setIsXmlCopied(true);
    toast.success("UPI 2.0 <Device> XML stanza copied!");
    setTimeout(() => setIsXmlCopied(false), 2000);
  };

  return (
    <div
      className={`tarka-fraud-network-root ${isCompact ? "tarka-density-compact" : ""}`}
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
          ROW 1: TOP 4 EXECUTIVE KPI METRIC CARDS
          ========================================================================= */}
      <div className="bento-grid-4" style={{ flexShrink: 0 }}>
        <BentoKpiCard
          title="Syndicate Actors Linked"
          metric="4 Mules → 1 Cluster"
          metricColor="#4F46E5"
          statusBadge={{ text: "MULTI-MODAL GRAPH", variant: "indigo" }}
          meta="Infrastructure Core"
          subtitle="Common Hotspot & TLS Controller"
          icon={Network}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={[1, 2, 3, 4, 4, 4]}
        />

        <BentoKpiCard
          title="Packet Tethering Proof"
          metric={hotspotResult.isHotspotDetected ? "TTL = 63 (Tethered)" : "TTL = 64 (Direct)"}
          metricColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "TETHERED AP" : "DIRECT 4G/5G",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
          }}
          meta="BSSID 74:DA:38..."
          subtitle="Poco X5 Portable Wi-Fi AP"
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
          sparklineData={hotspotResult.isHotspotDetected ? [64, 64, 64, 63, 63, 63] : [64, 64, 64, 64, 64, 64]}
        />

        <BentoKpiCard
          title="App-Layer TLS Anchor"
          metric="JA4 Match (4/4)"
          metricColor="#059669"
          statusBadge={{ text: "TLS 1.3 PASS", variant: "emerald" }}
          meta="t13d1516h2_8daaf6"
          subtitle="Identical banking client binary"
          icon={Cpu}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[1, 2, 3, 4, 4, 4]}
        />

        <BentoKpiCard
          title="Inter-State I4C Linkage"
          metric="14 FIRs (5 States)"
          metricColor="#B45309"
          statusBadge={{ text: "₹10.42 CR POOL", variant: "amber" }}
          meta="UP, MH, KA, GJ, DL"
          subtitle="Pratibimb Blind-Index Cross Match"
          icon={Share2}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          sparklineData={[2, 5, 8, 11, 14, 14]}
        />
      </div>

      {/* =========================================================================
          ROW 2: 2-PANEL EXECUTIVE STAGE (LEFT 7 COLS GRAPH + RIGHT 5 COLS DISSECTOR)
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
            LEFT HERO CANVAS (7 COLUMNS): INTERACTIVE FRAUD-NETWORK TOPOLOGY
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 7",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            height: "100%",
            minHeight: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Header & Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Network size={15} color="#4F46E5" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                  Fraud-Network & Actor Relationship Topology Graph
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                  Discovers hidden structural links tying 4 disparate mule accounts to 1 kingpin infrastructure cluster.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => toggleMutation("triggerHotspotCollision")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "3.5px 8px",
                  borderRadius: "5px",
                  border: isHotspotActive ? "1.5px solid #E11D48" : "1px solid #CBD5E1",
                  background: isHotspotActive ? "#FFF1F2" : "#F8FAFC",
                  color: isHotspotActive ? "#BE123C" : "#0F172A",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <Zap size={11} color={isHotspotActive ? "#E11D48" : "#64748B"} />
                <span>{isHotspotActive ? "Hotspot Active (TTL=63)" : "⚡ Simulate Hotspot (TTL=63)"}</span>
              </button>
            </div>
          </div>

          {/* Interactive Multi-Edge Network Diagram */}
          <div
            style={{
              flex: "1 1 0%",
              minHeight: "220px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "12px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* Top Node: Kingpin Hotspot AP */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                onClick={() => setSelectedNodeId("NODE-KP")}
                style={{
                  background: selectedNodeId === "NODE-KP" ? "#FFF1F2" : "#FFFFFF",
                  border: selectedNodeId === "NODE-KP" ? "2px solid #E11D48" : "1px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  boxShadow: "0 2px 6px rgba(225,29,72,0.12)",
                  cursor: "pointer",
                  textAlign: "center",
                  maxWidth: "340px",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>
                    Kingpin Controller Cluster
                  </span>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#FFE4E6", color: "#BE123C", padding: "1px 5px", borderRadius: "3px" }}>
                    TETHERED BSSID
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>
                  Poco X5 Portable Wi-Fi AP (74:DA:38:A2:11:BC)
                </div>
                <div style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", color: "#BE123C", marginTop: "1px" }}>
                  Airtel Cell Tower DL-TWR-891 · PGW Ingress TTL: {isHotspotActive ? "63 (Hop Decrement)" : "64"}
                </div>
              </div>
            </div>

            {/* SVG Connecting Flow Lines with 4 Color-Coded Edge Types */}
            <svg
              width="100%"
              height="100"
              viewBox="0 0 520 100"
              preserveAspectRatio="none"
              style={{ overflow: "visible", margin: "4px 0" }}
            >
              <defs>
                <marker id="netArrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B5CF6" />
                </marker>
                <marker id="netArrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6" />
                </marker>
                <marker id="netArrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                </marker>
              </defs>

              {/* Edge to Mule 1 (Vikram) */}
              <path d="M 260 0 C 260 40, 70 40, 70 95" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray={isHotspotActive ? "4 2" : "none"} markerEnd="url(#netArrowPurple)" />
              {/* Edge to Mule 2A (Rohit) */}
              <path d="M 260 0 C 260 40, 200 40, 200 95" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#netArrowBlue)" />
              {/* Edge to Mule 2B (Sameer) */}
              <path d="M 260 0 C 260 40, 330 40, 330 95" fill="none" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#netArrowBlue)" />
              {/* Edge to Mule 3 (Paytm Sink) */}
              <path d="M 260 0 C 260 40, 460 40, 460 95" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#netArrowAmber)" />
            </svg>

            {/* Bottom Row: 4 Mule Nodes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {/* Mule 1 */}
              <div
                onClick={() => setSelectedNodeId("NODE-M1")}
                style={{
                  background: selectedNodeId === "NODE-M1" ? "#EEF2FF" : "#FFFFFF",
                  border: selectedNodeId === "NODE-M1" ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#BE123C" }}>L1 MULE</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Vikram Shah</div>
                <div style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>SBI · ₹5.00L In</div>
                <div style={{ fontSize: "8px", color: "#8B5CF6", fontWeight: 700, marginTop: "2px" }}>🟣 BSSID Tether</div>
              </div>

              {/* Mule 2A */}
              <div
                onClick={() => setSelectedNodeId("NODE-M2A")}
                style={{
                  background: selectedNodeId === "NODE-M2A" ? "#EEF2FF" : "#FFFFFF",
                  border: selectedNodeId === "NODE-M2A" ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309" }}>L2A MULE</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Rohit Verma</div>
                <div style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>HDFC · ₹3.00L</div>
                <div style={{ fontSize: "8px", color: "#3B82F6", fontWeight: 700, marginTop: "2px" }}>🔵 JA4 TLS Match</div>
              </div>

              {/* Mule 2B */}
              <div
                onClick={() => setSelectedNodeId("NODE-M2B")}
                style={{
                  background: selectedNodeId === "NODE-M2B" ? "#EEF2FF" : "#FFFFFF",
                  border: selectedNodeId === "NODE-M2B" ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309" }}>L2B MULE</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Sameer Khan</div>
                <div style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>AXIS · ₹2.00L</div>
                <div style={{ fontSize: "8px", color: "#3B82F6", fontWeight: 700, marginTop: "2px" }}>🔵 JA4 + Azimuth</div>
              </div>

              {/* Sink */}
              <div
                onClick={() => setSelectedNodeId("NODE-SINK")}
                style={{
                  background: selectedNodeId === "NODE-SINK" ? "#EEF2FF" : "#FFFFFF",
                  border: selectedNodeId === "NODE-SINK" ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  padding: "6px 8px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857" }}>TERMINAL</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Paytm Sink 1109</div>
                <div style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>Escrow Cache</div>
                <div style={{ fontSize: "8px", color: "#F59E0B", fontWeight: 700, marginTop: "2px" }}>🟠 Shared Introducer</div>
              </div>
            </div>
          </div>

          {/* Forensic Linkage Summary Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              fontSize: "10.5px",
              color: "#312E81",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color="#4F46E5" />
              <span>
                <strong>Syndicate Discovery SAT:</strong> All 4 account sessions share JA4 fingerprint <code>t13d1516h2_8daaf6</code> and are co-located at BSSID <code>74:DA:38:A2:11:BC</code> (TTL={isHotspotActive ? "63" : "64"}).
              </span>
            </div>
            <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#4338CA" }}>
              P &lt; 1.4 × 10⁻⁷
            </span>
          </div>
        </div>

        {/* =====================================================================
            RIGHT INSPECTOR DOCK (5 COLUMNS): UPI XML & I4C SAMANVAYA EXPORT
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 5",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "14px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "10px",
            height: "100%",
            minHeight: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Card 1: UPI 2.0 <Device> XML Dissector */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                UPI 2.0 &lt;Device&gt; XML & JA4 TLS Anchor
              </span>
              <button
                type="button"
                onClick={handleCopyXml}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2.5px 7px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                {isXmlCopied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                <span>{isXmlCopied ? "XML Copied" : "Copy XML"}</span>
              </button>
            </div>

            {/* XML Snippet */}
            <div
              style={{
                background: "#0F172A",
                color: "#38BDF8",
                borderRadius: "6px",
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                lineHeight: 1.4,
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#F43F5E" }}>&lt;Device</span>{" "}
              <span style={{ color: "#34D399" }}>mobile=</span><span style={{ color: "#FCD34D" }}>"919871123941"</span>{" "}
              <span style={{ color: "#34D399" }}>geocode=</span><span style={{ color: "#FCD34D" }}>"28.5355,77.3910"</span>{" "}
              <span style={{ color: "#34D399" }}>bssid=</span><span style={{ color: "#FCD34D" }}>"74:DA:38:A2:11:BC"</span>{" "}
              <span style={{ color: "#34D399" }}>tls_ja4=</span><span style={{ color: "#FCD34D" }}>"t13d1516h2_8daaf6"</span>{" "}
              <span style={{ color: "#F43F5E" }}>/&gt;</span>
            </div>

            {/* 4 Anchor Points */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <span style={{ color: "#64748B" }}>REGISTERED MSISDN:</span>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>+91-98711-23941</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <span style={{ color: "#64748B" }}>TOWER GEOCODE:</span>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>28.5355° N, 77.3910° E</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <span style={{ color: "#64748B" }}>HANDSET CHASSIS:</span>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>SM-M346B/DS (Galaxy M34)</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <span style={{ color: "#64748B" }}>JA4 CLIENT HASH:</span>
                <div style={{ fontWeight: 700, color: "#4F46E5", fontFamily: "var(--font-mono)" }}>t13d1516h2...</div>
              </div>
            </div>
          </div>

          {/* Card 2: 4-Edge Relationship Legend */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", marginBottom: "2px" }}>
              Cross-Actor Relationship Edges:
            </span>
            <div style={{ fontSize: "9.5px", color: "#334155" }}>
              🟣 <strong>Edge 1 (Wi-Fi Tethering):</strong> TTL 64 &rarr; 63 decrement isolates common router hardware.
            </div>
            <div style={{ fontSize: "9.5px", color: "#334155" }}>
              🔵 <strong>Edge 2 (JA4 TLS 1.3):</strong> Exact hash across 4 CBS sessions confirms single modified app client.
            </div>
            <div style={{ fontSize: "9.5px", color: "#334155" }}>
              🟠 <strong>Edge 3 (Guarantor / CAF):</strong> Shared telecom retailer introducer in Nuh/Mewat corridor.
            </div>
            <div style={{ fontSize: "9.5px", color: "#334155" }}>
              🔴 <strong>Edge 4 (C2 Telegram Webhook):</strong> Intercepted victim OTP forwarded to bot <code>@c2_bot</code>.
            </div>
          </div>

          {/* Card 3: Actionable I4C Samanvaya Export */}
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#4338CA" }}>
                I4C Samanvaya / Pratibimb Export
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#4F46E5", background: "#E0E7FF", padding: "1px 5px", borderRadius: "3px" }}>
                INTER-STATE DOSSIER
              </span>
            </div>

            <div style={{ fontSize: "9.5px", color: "#3730A3", lineHeight: 1.35 }}>
              Generates standardized statutory intelligence memo linking this FIR to 14 active cases in UP, MH, KA, GJ, and DL.
            </div>

            <button
              type="button"
              onClick={handleCopyI4cReport}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "none",
                background: isCopied ? "#059669" : "#4F46E5",
                color: "#FFFFFF",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
              }}
            >
              {isCopied ? <Check size={12} /> : <FileText size={12} />}
              <span>{isCopied ? "Report Copied" : "📋 Copy Inter-State Syndicate Report (I4C Format)"}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

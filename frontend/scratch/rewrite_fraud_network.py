import sys

path = "src/pages/v5/FraudNetworkScreen.tsx"

new_code = '''import React, { useState, useMemo } from "react";
import {
  Network,
  Wifi,
  Cpu,
  Share2,
  FileText,
  Copy,
  Check,
  Zap,
  Radio,
  Layers,
  CircleDot,
  Shield,
  Smartphone,
  Server,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
  useFocusStore,
} from "../../components/tarka/kit";
import { detectHotspotCollision } from "../../utils/cgnatAttribution";

type EdgeType = "all" | "tether" | "ja4" | "caf" | "c2";
type LayoutMode = "layered" | "radial";

export const FraudNetworkScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  const isHotspotActive = !!mutations.triggerHotspotCollision;
  const hotspotResult = useMemo(() => {
    const observed = isHotspotActive ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [isHotspotActive]);

  const { selectedNodeId, setSelectedNodeId } = useFocusStore();
  const [edgeFilter, setEdgeFilter] = useState<EdgeType>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("layered");
  const [isCopied, setIsCopied] = useState(false);
  const [isXmlCopied, setIsXmlCopied] = useState(false);

  const handleCopyI4cReport = () => {
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===
Case Ref: FIR #149/2026 Cyber Crime PS Noida
Generated: 2026-09-22 10:30:00 IST | Classification: LAW ENFORCEMENT SENSITIVE

[SYNDICATE INFRASTRUCTURE CLUSTER LINKAGE]
Primary Infrastructure Controller:
• Accomplice Wi-Fi Hotspot BSSID: 74:DA:38:A2:11:BC (Poco X5 Pro AP)
• Ingress Gateway: Airtel PGW (103.21.144.92) | Decremented TTL: ${isHotspotActive ? "63 (Hop Count = 2)" : "64 (Direct)"}
• Client TLS Anchor: JA4 = t13d1516h2_8daaf6 (Identical across 4 Bank Sessions)

[CONTROLLED MULE ENTITIES (4 TARGETS)]
1. Vikram Shah (SBI A/c 41088291083) — L1 Primary Inflow Receiver (₹5,00,000)
2. Rohit Verma (HDFC A/c 5010029419920) — L2A Split Conduit (₹3,00,000)
3. Sameer Khan (AXIS A/c 9140200410291) — L2B Cashout Conduit (₹2,00,000)
4. Paytm Merchant Pool Sink (Sink #1109) — Terminal Escrow

[INTER-STATE CORRELATION]
Blind Index HMAC-SHA256 Match across 14 FIRs (UP, MH, KA, GJ, DL)
Total Syndicate Transaction Exposure: ₹10,42,18,900.00 (Exceeds CBI Mandate ₹10.00 Cr)`;

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

  // Node Positions Definition for Layered Layout (viewBox 0 0 740 340)
  const layeredNodes: Record<string, { x: number; y: number; title: string; subtitle: string; tag: string; color: string; icon: any }> = {
    "NODE-TWR": { x: 90, y: 35, title: "Airtel DL-TWR-891", subtitle: "Rohini Sec 4 · Azimuth 120°", tag: "CELL TOWER", color: "#0284C7", icon: Radio },
    "NODE-KP": { x: 370, y: 35, title: "Poco X5 AP (74:DA:38:A2:11:BC)", subtitle: isHotspotActive ? "TTL=63 Tethered (-1 Hop)" : "TTL=64 Direct Cellular", tag: "KINGPIN CONTROLLER", color: "#E11D48", icon: Smartphone },
    "NODE-C2": { x: 650, y: 35, title: "Telegram C2 @c2_bot", subtitle: "IP: 103.21.144.92 · Port 443", tag: "C2 WEBHOOK", color: "#BE123C", icon: Server },
    "NODE-JA4": { x: 230, y: 145, title: "JA4 Client TLS Anchor", subtitle: "t13d1516h2_8daaf6 · 4/4 Match", tag: "TLS 1.3 PASS", color: "#10B981", icon: Cpu },
    "NODE-CAF": { x: 510, y: 145, title: "Shared CAF Introducer", subtitle: "Mewat Telecom Retailer #4401", tag: "SIM SYNDICATE", color: "#F59E0B", icon: Building },
    "NODE-M1": { x: 80, y: 265, title: "Vikram Shah (L1)", subtitle: "SBI · Inflow ₹5,00,000", tag: "§107 FROZEN", color: "#8B5CF6", icon: Shield },
    "NODE-M2A": { x: 270, y: 265, title: "Rohit Verma (L2A)", subtitle: "HDFC · Fwd ₹1,80,000", tag: "§107 FROZEN", color: "#6366F1", icon: Shield },
    "NODE-M2B": { x: 470, y: 265, title: "Sameer Khan (L2B)", subtitle: "AXIS · ATM ₹1,20,000", tag: "§107 FROZEN", color: "#F59E0B", icon: Shield },
    "NODE-SINK": { x: 660, y: 265, title: "Paytm Sink #1109", subtitle: "Terminal Escrow Cache", tag: "SEALED EXIT", color: "#059669", icon: Shield },
  };

  // Radial Node Positions (Center at 370, 170, Radius 130)
  const radialNodes: Record<string, { x: number; y: number; title: string; subtitle: string; tag: string; color: string; icon: any }> = {
    "NODE-KP": { x: 370, y: 170, title: "Poco X5 AP (74:DA:38:A2:11:BC)", subtitle: isHotspotActive ? "TTL=63 Tethered" : "TTL=64 Direct", tag: "KINGPIN CLUSTER", color: "#E11D48", icon: Smartphone },
    "NODE-TWR": { x: 370, y: 35, title: "DL-TWR-891", subtitle: "Airtel Tower", tag: "TOWER", color: "#0284C7", icon: Radio },
    "NODE-C2": { x: 550, y: 65, title: "Telegram @c2_bot", subtitle: "C2 Webhook", tag: "C2", color: "#BE123C", icon: Server },
    "NODE-CAF": { x: 600, y: 170, title: "CAF Introducer", subtitle: "Mewat SIM Pool", tag: "CAF", color: "#F59E0B", icon: Building },
    "NODE-SINK": { x: 550, y: 275, title: "Paytm #1109", subtitle: "Terminal Sink", tag: "SINK", color: "#059669", icon: Shield },
    "NODE-M2B": { x: 370, y: 305, title: "Sameer Khan", subtitle: "AXIS Mule", tag: "L2B", color: "#F59E0B", icon: Shield },
    "NODE-M2A": { x: 190, y: 275, title: "Rohit Verma", subtitle: "HDFC Mule", tag: "L2A", color: "#6366F1", icon: Shield },
    "NODE-M1": { x: 140, y: 170, title: "Vikram Shah", subtitle: "SBI Mule L1", tag: "L1", color: "#8B5CF6", icon: Shield },
    "NODE-JA4": { x: 190, y: 65, title: "JA4 TLS Anchor", subtitle: "t13d1516h2", tag: "JA4", color: "#10B981", icon: Cpu },
  };

  const activeNodes = layoutMode === "layered" ? layeredNodes : radialNodes;

  // Edge Specifications
  const edges = [
    { from: "NODE-TWR", to: "NODE-KP", type: "tether" as EdgeType, color: "#0284C7", label: "Cell Link (TTL 64)", width: 2.5, dashed: false },
    { from: "NODE-KP", to: "NODE-M1", type: "tether" as EdgeType, color: "#8B5CF6", label: isHotspotActive ? "TTL 64→63 (-1 Hop)" : "TTL 64 Direct", width: 3, dashed: isHotspotActive },
    { from: "NODE-KP", to: "NODE-M2A", type: "tether" as EdgeType, color: "#8B5CF6", label: isHotspotActive ? "TTL 64→63" : "Direct", width: 2.5, dashed: isHotspotActive },
    { from: "NODE-KP", to: "NODE-M2B", type: "tether" as EdgeType, color: "#8B5CF6", label: isHotspotActive ? "TTL 64→63" : "Direct", width: 2.5, dashed: isHotspotActive },
    { from: "NODE-KP", to: "NODE-C2", type: "c2" as EdgeType, color: "#BE123C", label: "OTP Forwarded", width: 2, dashed: true },
    { from: "NODE-JA4", to: "NODE-M1", type: "ja4" as EdgeType, color: "#10B981", label: "JA4 4/4 Match", width: 2.5, dashed: false },
    { from: "NODE-JA4", to: "NODE-M2A", type: "ja4" as EdgeType, color: "#10B981", label: "JA4 4/4 Match", width: 2.5, dashed: false },
    { from: "NODE-JA4", to: "NODE-M2B", type: "ja4" as EdgeType, color: "#10B981", label: "JA4 4/4 Match", width: 2.5, dashed: false },
    { from: "NODE-JA4", to: "NODE-SINK", type: "ja4" as EdgeType, color: "#10B981", label: "JA4 4/4 Match", width: 2, dashed: false },
    { from: "NODE-CAF", to: "NODE-M2B", type: "caf" as EdgeType, color: "#F59E0B", label: "Same CAF Introducer", width: 2, dashed: true },
    { from: "NODE-CAF", to: "NODE-SINK", type: "caf" as EdgeType, color: "#F59E0B", label: "Same Introducer", width: 2, dashed: true },
  ];

  return (
    <div
      className={`tarka-fraud-network-root ${isCompact ? "tarka-density-compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: isCompact ? "6px 12px 10px 12px" : "8px 14px 12px 14px",
        gap: isCompact ? "6px" : "8px",
        boxSizing: "border-box",
        background: "#F8FAFC",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          ROW 0: STORY BANNER (PASSES 5-SECOND TEST)
          ========================================================================= */}
      <StoryBanner
        takeaway={
          <span>
            <strong>Kingpin Handset (Samsung M34 · IMEI 86749206...)</strong> physically tethered 4 mule bank accounts across Delhi/Noida cell sectors via shared portable Wi-Fi AP & identical JA4 TLS client fingerprint.
          </span>
        }
        evidenceChips={[
          { tier: "T1", label: "Airtel PGW IPDR", hash: "63a9b18204e112aa894451299cbf", detail: "Packet hop inspection confirming TTL=63 hotspot decrement" },
          { tier: "T1", label: "NPCI Device XML", hash: "89c20491823091ffeed891241aa", detail: "BSSID 74:DA:38:A2:11:BC captured in bank session telemetry" },
          { tier: "T1", label: "Tower DL-TWR-891", hash: "339109bbcf12498214aa8823190", detail: "Sector 4 Rohini cell tower coverage radius" },
        ]}
      />

      {/* =========================================================================
          ROW 1: TOP 4 EXECUTIVE KPI TILES (FULL UNTRUNCATED LABELS)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <KpiTile
          title="Actors linked"
          value="4 Mules → 1 Cluster"
          icon={Network}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "MULTI-MODAL GRAPH", variant: "indigo" }}
          subtitle="Common Hotspot & TLS Controller"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Deterministic set-intersection of BSSID, JA4 TLS, and cell tower coordinates."
        />

        <KpiTile
          title="Tethering proof"
          value={hotspotResult.isHotspotDetected ? "TTL = 63 (Hotspot AP)" : "TTL = 64 (Direct Cellular)"}
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "TETHERED AP" : "DIRECT 4G/5G",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
            dot: true,
          }}
          subtitle={hotspotResult.isHotspotDetected ? "Hop Count: 2 (-1 PGW Decrement)" : "Single Hop Direct Cellular"}
          microVisual="ring"
          progressPct={hotspotResult.isHotspotDetected ? 100 : 80}
          provenanceTooltip="DoT Clause 39.20 IPDR packet inspection at Airtel PGW Gateway 103.21.144.92."
        />

        <KpiTile
          title="TLS fingerprint match"
          value="JA4 Match 4/4"
          icon={Cpu}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "TLS 1.3 PASS", variant: "emerald" }}
          subtitle="t13d1516h2_8daaf6 Client Binary"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Exact JA4 hash match across all 4 CBS banking sessions proves same modified app."
        />

        <KpiTile
          title="Inter-state linkage"
          value="14 FIRs · 5 States"
          icon={Share2}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          statusBadge={{ text: "₹10.42 CR POOL", variant: "amber" }}
          subtitle="UP, MH, KA, GJ, DL (Exceeds CBI Mandate)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="I4C Samanvaya HMAC blind-index correlation crossing CBI ₹10.00 Cr statutory threshold."
        />
      </div>

      {/* =========================================================================
          ROW 2: MAIN STAGE (7 COLS HERO TOPOLOGY + 5 COLS DISSECTOR)
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
            LEFT HERO CARD (7 COLUMNS): CONNECTED ACTOR TOPOLOGY GRAPH
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
          <SectionCard
            title="Connected Multi-Layer Actor Topology Graph"
            subtitle="Discovers hidden physical links tying 4 disparate mule accounts to 1 kingpin infrastructure cluster."
            icon={Network}
            iconColor="#4F46E5"
            badgeText={layoutMode === "layered" ? "3-TIER LAYERED" : "RADIAL ORBIT"}
            badgeVariant="indigo"
            provenanceTooltip="Synthesized graph joining Airtel CDR, NPCI Switch logs, and BSSID telemetry."
            actionSlot={
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {/* Edge Filter Chips */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", background: "#F1F5F9", padding: "2px", borderRadius: "6px" }}>
                  {(["all", "tether", "ja4", "caf", "c2"] as EdgeType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEdgeFilter(type)}
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "9px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                        background: edgeFilter === type ? "#FFFFFF" : "transparent",
                        color: edgeFilter === type ? "#0F172A" : "#64748B",
                        boxShadow: edgeFilter === type ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        textTransform: "uppercase",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Layout Mode Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "#F1F5F9", padding: "2px", borderRadius: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("layered")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background: layoutMode === "layered" ? "#FFFFFF" : "transparent",
                      color: layoutMode === "layered" ? "#4F46E5" : "#64748B",
                      boxShadow: layoutMode === "layered" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                    title="Switch to 3-tier layered architecture"
                  >
                    <Layers size={10} />
                    <span>Layered</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("radial")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background: layoutMode === "radial" ? "#FFFFFF" : "transparent",
                      color: layoutMode === "radial" ? "#4F46E5" : "#64748B",
                      boxShadow: layoutMode === "radial" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                    title="Switch to radial orbit view"
                  >
                    <CircleDot size={10} />
                    <span>Radial</span>
                  </button>
                </div>

                {/* Hotspot Simulation Mutator */}
                <button
                  type="button"
                  onClick={() => toggleMutation("triggerHotspotCollision")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "5px",
                    border: isHotspotActive ? "1.5px solid #E11D48" : "1px solid #CBD5E1",
                    background: isHotspotActive ? "#FFF1F2" : "#FFFFFF",
                    color: isHotspotActive ? "#BE123C" : "#0F172A",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                  title="Simulate TTL decrement (TTL=63) from Wi-Fi Hotspot tethering"
                >
                  <Zap size={11} color={isHotspotActive ? "#E11D48" : "#64748B"} />
                  <span>{isHotspotActive ? "Hotspot Active (TTL=63)" : "⚡ Simulate Hotspot"}</span>
                </button>
              </div>
            }
          >
            {/* The Responsive Topology SVG & Interactive Node Canvas */}
            <div
              style={{
                flex: "1 1 0%",
                minHeight: 0,
                position: "relative",
                background: "#F8FAFC",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* SVG Connecting Flow Lines (Physically Connecting Handles) */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 740 340"
                preserveAspectRatio="none"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
              >
                <defs>
                  <style>{`
                    @keyframes netEdgePulse {
                      from { stroke-dashoffset: 24; }
                      to { stroke-dashoffset: 0; }
                    }
                    .edge-dash-stream {
                      animation: netEdgePulse 1.2s linear infinite;
                    }
                  `}</style>
                  <marker id="netArrowIndigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4F46E5" />
                  </marker>
                  <marker id="netArrowPurple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B5CF6" />
                  </marker>
                  <marker id="netArrowEmerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                  </marker>
                  <marker id="netArrowAmber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                  </marker>
                  <marker id="netArrowRose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E11D48" />
                  </marker>
                </defs>

                {/* Render Edges */}
                {edges.map((e, idx) => {
                  if (edgeFilter !== "all" && edgeFilter !== e.type) return null;

                  const src = activeNodes[e.from];
                  const dst = activeNodes[e.to];
                  if (!src || !dst) return null;

                  const x1 = src.x;
                  const y1 = src.y;
                  const x2 = dst.x;
                  const y2 = dst.y;

                  // Smooth cubic bezier with midpoint label
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const cp1x = x1 + dx * 0.2;
                  const cp1y = y1 + dy * 0.5;
                  const cp2x = x2 - dx * 0.2;
                  const cp2y = y2 - dy * 0.5;

                  const pathD = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

                  const isEdgeActive = selectedNodeId === e.from || selectedNodeId === e.to;
                  const markerId =
                    e.color === "#10B981"
                      ? "url(#netArrowEmerald)"
                      : e.color === "#F59E0B"
                      ? "url(#netArrowAmber)"
                      : e.color === "#E11D48" || e.color === "#BE123C"
                      ? "url(#netArrowRose)"
                      : e.color === "#8B5CF6"
                      ? "url(#netArrowPurple)"
                      : "url(#netArrowIndigo)";

                  return (
                    <g key={idx}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={e.color}
                        strokeWidth={isEdgeActive ? e.width + 1 : e.width}
                        strokeDasharray={e.dashed || isHotspotActive ? "6 3" : undefined}
                        className={isHotspotActive ? "edge-dash-stream" : undefined}
                        opacity={isEdgeActive ? 1 : 0.75}
                        markerEnd={markerId}
                        style={{ transition: "all 0.25s ease" }}
                      />
                      {/* Edge Label Chip */}
                      <g transform={`translate(${mx}, ${my})`}>
                        <rect
                          x="-28"
                          y="-8"
                          width="56"
                          height="16"
                          rx="4"
                          fill="#FFFFFF"
                          stroke={e.color}
                          strokeWidth="1"
                          style={{ filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.06))" }}
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={e.color}
                          fontSize="7.5"
                          fontWeight="800"
                          fontFamily="var(--font-mono, monospace)"
                        >
                          {e.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* DOM Node Cards */}
              {Object.entries(activeNodes).map(([nodeId, n]) => {
                const isSelected = selectedNodeId === nodeId;
                const IconComponent = n.icon;

                return (
                  <div
                    key={nodeId}
                    onClick={() => setSelectedNodeId(nodeId)}
                    style={{
                      position: "absolute",
                      left: `${(n.x / 740) * 100}%`,
                      top: `${(n.y / 340) * 100}%`,
                      transform: "translate(-50%, -50%)",
                      background: isSelected ? "#FFFFFF" : "#FFFFFF",
                      border: isSelected ? `2px solid ${n.color}` : "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "6px 9px",
                      boxShadow: isSelected ? `0 0 0 3px ${n.color}25, 0 4px 10px rgba(0,0,0,0.08)` : "0 1px 3px rgba(15,23,42,0.04)",
                      cursor: "pointer",
                      zIndex: isSelected ? 20 : 10,
                      minWidth: "120px",
                      maxWidth: "180px",
                      boxSizing: "border-box",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <IconComponent size={11} color={n.color} />
                        <span style={{ fontSize: "7.5px", fontWeight: 800, color: n.color, textTransform: "uppercase" }}>
                          {n.tag}
                        </span>
                      </div>
                      {isSelected && (
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: n.color }} />
                      )}
                    </div>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "0.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Ticker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                fontSize: "10.5px",
                color: "#312E81",
                marginTop: "6px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={13} color="#4F46E5" />
                <span style={{ fontWeight: 700 }}>
                  Syndicate Discovery SAT: All 4 account sessions share JA4 client hash <code>t13d1516h2_8daaf6</code> and co-locate at BSSID <code>74:DA:38:A2:11:BC</code>.
                </span>
              </div>
              <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#4F46E5" }}>
                P &lt; 1.4 × 10⁻⁷
              </span>
            </div>
          </SectionCard>
        </div>

        {/* =====================================================================
            RIGHT SUPPORT PANEL (5 COLUMNS): LIGHT-MODE XML & I4C SAMANVAYA BAR
            ===================================================================== */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "10px", height: "100%", minHeight: 0 }}>
          {/* Card 1: Light-Mode <Device> XML & Telemetry Provenance */}
          <SectionCard
            title="UPI 2.0 <Device> XML & Provenance"
            subtitle="NPCI Central Switch telemetry stanza linking handset to network"
            icon={FileText}
            iconColor="#4F46E5"
            badgeText="NPCI SWITCH T1"
            badgeVariant="emerald"
            actionSlot={
              <button
                type="button"
                onClick={handleCopyXml}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: isXmlCopied ? "#ECFDF5" : "#F8FAFC",
                  color: isXmlCopied ? "#047857" : "#0F172A",
                  cursor: "pointer",
                }}
              >
                {isXmlCopied ? <Check size={11} /> : <Copy size={11} />}
                <span>{isXmlCopied ? "Copied" : "Copy XML"}</span>
              </button>
            }
          >
            {/* Light-Mode Syntax Highlighted Code Box */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "8px 10px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "10px",
                lineHeight: 1.5,
                color: "#1E293B",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <span style={{ color: "#4338CA" }}>&lt;Device </span>
              <span style={{ color: "#047857" }}>mobile</span>=<span style={{ color: "#B45309" }}>"919871123941"</span>{" "}
              <span style={{ color: "#047857" }}>geocode</span>=<span style={{ color: "#B45309" }}>"28.5355,77.3910"</span>{" "}
              <span style={{ color: "#047857" }}>bssid</span>=<span style={{ color: "#E11D48", fontWeight: 700 }}>"74:DA:38:A2:11:BC"</span>{" "}
              <span style={{ color: "#047857" }}>tls_ja4</span>=<span style={{ color: "#4338CA", fontWeight: 700 }}>"t13d1516h2_8daaf6"</span>{" "}
              <span style={{ color: "#4338CA" }}>/&gt;</span>
            </div>

            {/* Explicit Provenance Chips Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>REGISTERED MSISDN</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>NPCI T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "1px", fontFamily: "var(--font-mono)" }}>+91-98711-23941</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>TOWER GEOCODE</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TOWER T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "1px", fontFamily: "var(--font-mono)" }}>28.5355° N, 77.3910° E</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>TETHERED BSSID</span>
                  <span style={{ fontSize: "7.5px", background: "#EEF2FF", color: "#4338CA", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TLS T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#BE123C", marginTop: "1px", fontFamily: "var(--font-mono)" }}>74:DA:38:A2:11:BC</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>JA4 CLIENT HASH</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TLS T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#4F46E5", marginTop: "1px", fontFamily: "var(--font-mono)" }}>t13d1516h2...</div>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: Cross-State Exposure & I4C Samanvaya Bar */}
          <SectionCard
            title="Cross-State Syndicate & I4C Samanvaya"
            subtitle="Blind-index correlation across 14 FIRs in 5 states (Exceeds CBI Mandate)"
            icon={Share2}
            iconColor="#B45309"
            badgeText="₹10.42 CR SYNDICATE"
            badgeVariant="amber"
          >
            {/* Stacked Horizontal State Exposure ScaleBar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <ScaleBar
                min={0}
                max={12}
                value={10.42}
                unit=" Cr"
                labelAbove="Inter-State Exposure vs CBI Mandate (₹10.00 Cr)"
                valueBelow="Syndicate Total: ₹10.42 Cr (CBI Requisition SAT)"
                thresholdLine={{ value: 10.0, label: "₹10.00 Cr CBI Mandate", color: "#DC2626" }}
                zones={[
                  { from: 0, to: 3.85, color: "#3B82F6", label: "UP: ₹3.85Cr (5 FIRs)" },
                  { from: 3.85, to: 6.45, color: "#6366F1", label: "MH: ₹2.60Cr (3 FIRs)" },
                  { from: 6.45, to: 8.40, color: "#8B5CF6", label: "KA: ₹1.95Cr (3 FIRs)" },
                  { from: 8.40, to: 9.62, color: "#F59E0B", label: "GJ: ₹1.22Cr (2 FIRs)" },
                  { from: 9.62, to: 10.42, color: "#10B981", label: "DL: ₹0.80Cr (1 FIR)" },
                ]}
                height={16}
              />

              {/* State Chips Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", marginTop: "4px" }}>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#3B82F6" }}>UP (5)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹3.85Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#6366F1" }}>MH (3)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹2.60Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#8B5CF6" }}>KA (3)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹1.95Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#F59E0B" }}>GJ (2)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹1.22Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#10B981" }}>DL (1)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹0.80Cr</div>
                </div>
              </div>
            </div>

            {/* Action Button: Copy I4C Report */}
            <div style={{ marginTop: "auto", paddingTop: "8px" }}>
              <button
                type="button"
                onClick={handleCopyI4cReport}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
                  transition: "background 0.15s ease",
                }}
              >
                {isCopied ? <Check size={12} /> : <FileText size={12} />}
                <span>{isCopied ? "Report Copied to Clipboard" : "📋 Copy Inter-State Syndicate Report (I4C Format)"}</span>
              </button>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
};
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(new_code)

print("FraudNetworkScreen.tsx rewritten successfully!")

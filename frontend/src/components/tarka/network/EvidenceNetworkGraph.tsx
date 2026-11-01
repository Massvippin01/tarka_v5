import React, { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Smartphone,
  Server,
  Wifi,
  Cpu,
  Building,
  Shield,
  Table as TableIcon,
  Play,
  Pause,
  Zap,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useFocusStore } from "../kit";

export type EdgeFilterType = "all" | "tether" | "ja4" | "caf" | "c2";
export type GraphLayoutMode = "layered" | "radial";

interface EvidenceNetworkGraphProps {
  isHotspotActive: boolean;
  onToggleHotspot: () => void;
  edgeFilter: EdgeFilterType;
  onEdgeFilterChange: (filter: EdgeFilterType) => void;
  layoutMode: GraphLayoutMode;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
}

export const EvidenceNetworkGraph: React.FC<EvidenceNetworkGraphProps> = ({
  isHotspotActive,
  onToggleHotspot,
  edgeFilter,
  onEdgeFilterChange,
  layoutMode,
  onLayoutModeChange,
}) => {
  const { selectedNodeId, setSelectedNodeId } = useFocusStore();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredBus, setHoveredBus] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);
  const [evidenceSheetItem, setEvidenceSheetItem] = useState<{
    id: string;
    title: string;
    type: string;
    tier: string;
    sha256: string;
    statutoryBasis: string;
    description: string;
  } | null>(null);

  // Discovery Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(6); // 1 to 6 (6 = all visible)

  useEffect(() => {
    let timer: any;
    if (isReplaying) {
      if (replayStep < 6) {
        timer = setTimeout(() => {
          setReplayStep((prev) => prev + 1);
        }, 850);
      } else {
        setIsReplaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isReplaying, replayStep]);

  const handleStartReplay = () => {
    setReplayStep(1);
    setIsReplaying(true);
  };

  // Register dev hook
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.network = {
        stats: () => ({
          nodeCount: 8,
          edgeCount: 5,
          activeFilter: edgeFilter,
          isHotspotActive,
          busCount: 5,
        }),
      };
    }
  }, [edgeFilter, isHotspotActive]);

  // Node Definitions
  const nodes = useMemo(() => [
    {
      id: "node-tower",
      label: "Airtel DL-TWR-891",
      sublabel: "Sector 4 Rohini · Az 120°",
      tier: "Tier-1 IPDR",
      category: "controller",
      icon: Radio,
      color: "#0284C7",
      x: 35,
      y: 28,
      w: 150,
      h: 52,
      radialX: 85,
      radialY: 70,
    },
    {
      id: "node-kp",
      label: "Poco X5 AP (Kingpin)",
      sublabel: isHotspotActive ? "TTL=63 (Tethered -1 Hop)" : "TTL=64 Direct Cellular",
      bssid: "74:DA:38:A2:11:BC",
      tier: "Tier-1 Switch",
      category: "kingpin",
      icon: Smartphone,
      color: "#E11D48",
      x: 260,
      y: 24,
      w: 240,
      h: 58,
      radialX: 380,
      radialY: 175, // center
    },
    {
      id: "node-c2",
      label: "Telegram C2 @c2_bot",
      sublabel: "IP: 103.21.144.92:443",
      tier: "Tier-2 Telemetry",
      category: "controller",
      icon: Server,
      color: "#BE123C",
      x: 580,
      y: 28,
      w: 155,
      h: 52,
      radialX: 675,
      radialY: 70,
    },
    {
      id: "node-hub-tether",
      label: "Wi-Fi Tether AP",
      sublabel: "BSSID 74:DA:38... · 4/4 Match",
      tier: "Tier-1 Switch",
      category: "hub",
      icon: Wifi,
      color: "#8B5CF6",
      x: 230,
      y: 135,
      w: 42,
      h: 42,
      radialX: 295,
      radialY: 175,
      strength: "4/4",
    },
    {
      id: "node-hub-ja4",
      label: "JA4 TLS Anchor",
      sublabel: "t13d1516h2_8daaf6 · 4/4 Match",
      tier: "Tier-1 Audit",
      category: "hub",
      icon: Cpu,
      color: "#10B981",
      x: 380,
      y: 135,
      w: 42,
      h: 42,
      radialX: 380,
      radialY: 90,
      strength: "4/4",
    },
    {
      id: "node-hub-caf",
      label: "Shared CAF Retailer",
      sublabel: "Mewat Retailer #4401 · 2/4 Mules",
      tier: "Tier-1 Telco",
      category: "hub",
      icon: Building,
      color: "#F59E0B",
      x: 530,
      y: 135,
      w: 42,
      h: 42,
      radialX: 465,
      radialY: 175,
      strength: "2/4",
    },
    {
      id: "node-m1",
      label: "Vikram Shah (L1)",
      sublabel: "SBI · Inflow ₹5,00,000",
      role: "L1 Primary Mule",
      tier: "Tier-1 HSM",
      category: "account",
      icon: Shield,
      color: "#8B5CF6",
      x: 18,
      y: 268,
      w: 170,
      h: 54,
      radialX: 110,
      radialY: 285,
    },
    {
      id: "node-m2a",
      label: "Rohit Verma (L2A)",
      sublabel: "HDFC · Fwd ₹1,80,000",
      role: "L2A Split Conduit",
      tier: "Tier-1 HSM",
      category: "account",
      icon: Shield,
      color: "#6366F1",
      x: 204,
      y: 268,
      w: 170,
      h: 54,
      radialX: 290,
      radialY: 295,
    },
    {
      id: "node-m2b",
      label: "Sameer Khan (L2B)",
      sublabel: "AXIS · ATM ₹1,20,000",
      role: "L2B Cashout Conduit",
      tier: "Tier-1 HSM",
      category: "account",
      icon: Shield,
      color: "#F59E0B",
      x: 390,
      y: 268,
      w: 170,
      h: 54,
      radialX: 470,
      radialY: 295,
    },
    {
      id: "node-sink",
      label: "Paytm Sink #1109",
      sublabel: "Escrow Reserve Cache",
      role: "Terminal Escrow",
      tier: "Tier-1 Escrow",
      category: "account",
      icon: Shield,
      color: "#059669",
      x: 576,
      y: 268,
      w: 170,
      h: 54,
      radialX: 650,
      radialY: 285,
    },
  ], [isHotspotActive]);

  // Determine active visibility of buses based on edgeFilter and replayStep
  const showTether = (edgeFilter === "all" || edgeFilter === "tether") && replayStep >= 4;
  const showJa4 = (edgeFilter === "all" || edgeFilter === "ja4") && replayStep >= 3;
  const showCaf = (edgeFilter === "all" || edgeFilter === "caf") && replayStep >= 4;
  const showC2 = (edgeFilter === "all" || edgeFilter === "c2") && replayStep >= 2;
  const showIngress = replayStep >= 1;

  // Dimming logic for nodes based on hover
  const getNodeOpacity = (nodeId: string) => {
    if (!hoveredNodeId && !hoveredBus) return 1;
    if (hoveredNodeId) {
      if (nodeId === hoveredNodeId) return 1;
      if (hoveredNodeId === "node-kp") return 1; // Kingpin connects to everything
      if (hoveredNodeId === "node-tower" && (nodeId === "node-kp" || nodeId === "node-tower")) return 1;
      if (hoveredNodeId === "node-c2" && (nodeId === "node-kp" || nodeId === "node-c2")) return 1;
      if (hoveredNodeId.startsWith("node-hub-")) {
        if (nodeId === "node-kp") return 1;
        if (hoveredNodeId === "node-hub-tether" && (nodeId.startsWith("node-m") || nodeId === "node-sink")) return 1;
        if (hoveredNodeId === "node-hub-ja4" && (nodeId.startsWith("node-m") || nodeId === "node-sink")) return 1;
        if (hoveredNodeId === "node-hub-caf" && (nodeId === "node-m2b" || nodeId === "node-sink")) return 1;
      }
      if (nodeId.startsWith("node-hub-")) return 0.8;
      return 0.2;
    }
    if (hoveredBus) {
      if (hoveredBus === "tether" && (nodeId === "node-kp" || nodeId === "node-hub-tether" || nodeId.startsWith("node-m") || nodeId === "node-sink")) return 1;
      if (hoveredBus === "ja4" && (nodeId === "node-kp" || nodeId === "node-hub-ja4" || nodeId.startsWith("node-m") || nodeId === "node-sink")) return 1;
      if (hoveredBus === "caf" && (nodeId === "node-kp" || nodeId === "node-hub-caf" || nodeId === "node-m2b" || nodeId === "node-sink")) return 1;
      if (hoveredBus === "c2" && (nodeId === "node-kp" || nodeId === "node-c2")) return 1;
      return 0.2;
    }
    return 1;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* TOOLBAR HEADER ROW: Title, Filter Chips, Mode Switcher, Replay, Table */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          padding: "6px 10px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "11px",
        }}
      >
        {/* Left: Mode Badge & Filter Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#EEF2FF",
              color: "#4338CA",
              border: "1px solid #C7D2FE",
              fontFamily: "var(--font-mono)",
            }}
          >
            {layoutMode === "layered" ? "3-TIER LAYERED BUS" : "RADIAL ORBIT"}
          </span>

          {/* Filter Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "3px", background: "#F1F5F9", padding: "2px", borderRadius: "6px" }}>
            {(["all", "tether", "ja4", "caf", "c2"] as EdgeFilterType[]).map((f) => {
              const active = edgeFilter === f;
              const labels: Record<EdgeFilterType, string> = {
                all: "ALL (5)",
                tether: "TETHER (4/4)",
                ja4: "JA4 (4/4)",
                caf: "CAF (2/4)",
                c2: "C2 WEBHOOK",
              };
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onEdgeFilterChange(f)}
                  style={{
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "9.5px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#0F172A" : "#64748B",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions (Hotspot, Replay, Layout, View as Table) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Hotspot Toggle */}
          <button
            type="button"
            onClick={onToggleHotspot}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "5px",
              border: isHotspotActive ? "1.5px solid #E11D48" : "1px solid #CBD5E1",
              background: isHotspotActive ? "#FFF1F2" : "#FFFFFF",
              color: isHotspotActive ? "#BE123C" : "#0F172A",
              cursor: "pointer",
            }}
            title="Simulate TTL decrement (TTL=63) from Wi-Fi Hotspot tethering"
          >
            <Zap size={11} color={isHotspotActive ? "#E11D48" : "#64748B"} />
            <span>{isHotspotActive ? "Hotspot Active (TTL=63)" : "Simulate Hotspot (TTL 64→63)"}</span>
          </button>

          {/* Replay Discovery Button */}
          <button
            type="button"
            onClick={handleStartReplay}
            disabled={isReplaying}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: isReplaying ? "#FEF3C7" : "#FFFFFF",
              color: isReplaying ? "#B45309" : "#475569",
              cursor: isReplaying ? "default" : "pointer",
            }}
          >
            {isReplaying ? <Pause size={10} /> : <Play size={10} />}
            <span>{isReplaying ? `Replaying (${replayStep}/6)` : "Replay Discovery"}</span>
          </button>

          {/* Layered vs Radial Switcher */}
          <div style={{ display: "flex", gap: "2px", background: "#F1F5F9", padding: "2px", borderRadius: "5px" }}>
            <button
              type="button"
              onClick={() => onLayoutModeChange("layered")}
              style={{
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "9px",
                fontWeight: layoutMode === "layered" ? 700 : 500,
                border: "none",
                background: layoutMode === "layered" ? "#FFFFFF" : "transparent",
                color: layoutMode === "layered" ? "#4F46E5" : "#64748B",
                cursor: "pointer",
              }}
            >
              Layered
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange("radial")}
              style={{
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "9px",
                fontWeight: layoutMode === "radial" ? 700 : 500,
                border: "none",
                background: layoutMode === "radial" ? "#FFFFFF" : "transparent",
                color: layoutMode === "radial" ? "#4F46E5" : "#64748B",
                cursor: "pointer",
              }}
            >
              Radial
            </button>
          </div>

          {/* Table Toggle */}
          <button
            type="button"
            onClick={() => setIsTableView(!isTableView)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "5px",
              border: "1px solid #E2E8F0",
              background: isTableView ? "#EEF2FF" : "#FFFFFF",
              color: isTableView ? "#4338CA" : "#64748B",
              cursor: "pointer",
            }}
            title="Toggle between Graph view and Accessible Table view"
          >
            <TableIcon size={11} />
            <span>{isTableView ? "Graph View" : "View as Table"}</span>
          </button>
        </div>
      </div>

      {/* DISCOVERY REPLAY SCRUBBER (Visible when Replaying) */}
      {isReplaying && (
        <div
          style={{
            background: "#FFFBEB",
            borderBottom: "1px solid #FDE68A",
            padding: "4px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#92400E",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Discovery Step {replayStep} of 6:</span>
            <span>
              {replayStep === 1 && "Airtel PGW Ingress IPDR logged at DL-TWR-891 (TTL=64)"}
              {replayStep === 2 && "Kingpin Portable AP registered on cell tower (BSSID 74:DA:38:A2:11:BC)"}
              {replayStep === 3 && "JA4 Client TLS Fingerprint matched across bank API requests"}
              {replayStep === 4 && "Accomplice Wi-Fi Hotspot BSSID isolates 4 co-located accounts"}
              {replayStep === 5 && "Shared Mewat CAF retailer introducer links L2B & Paytm Sink"}
              {replayStep === 6 && "Syndicate discovery complete: 4 accounts tied to 1 physical infrastructure"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setIsReplaying(false); setReplayStep(6); }}
            style={{ fontSize: "9px", fontWeight: 700, background: "none", border: "none", color: "#B45309", cursor: "pointer" }}
          >
            Skip to End ✕
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT: TABLE OR INTERACTIVE GRAPH */}
      {isTableView ? (
        <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", padding: "12px", background: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B" }}>
                <th style={{ padding: "6px 8px" }}>Evidence Type</th>
                <th style={{ padding: "6px 8px" }}>Source Infrastructure</th>
                <th style={{ padding: "6px 8px" }}>Target Mule Accounts</th>
                <th style={{ padding: "6px 8px" }}>Strength</th>
                <th style={{ padding: "6px 8px" }}>Statutory Admissibility</th>
                <th style={{ padding: "6px 8px" }}>SHA-256 Provenance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "8px", fontWeight: 700, color: "#8B5CF6" }}>Wi-Fi AP Tethering</td>
                <td style={{ padding: "8px" }}>Poco X5 AP (74:DA:38:A2:11:BC)</td>
                <td style={{ padding: "8px" }}>Vikram Shah, Rohit Verma, Sameer Khan, Paytm Sink</td>
                <td style={{ padding: "8px", fontWeight: 700 }}>4 / 4 Accounts</td>
                <td style={{ padding: "8px", color: "#059669" }}>Tier-1 Switch Attestation</td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)", fontSize: "9px" }}>e4b7c1290a...</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "8px", fontWeight: 700, color: "#10B981" }}>JA4 Client TLS</td>
                <td style={{ padding: "8px" }}>t13d1516h2_8daaf6</td>
                <td style={{ padding: "8px" }}>Vikram Shah, Rohit Verma, Sameer Khan, Paytm Sink</td>
                <td style={{ padding: "8px", fontWeight: 700 }}>4 / 4 Accounts</td>
                <td style={{ padding: "8px", color: "#059669" }}>Tier-1 Gateway Audit</td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)", fontSize: "9px" }}>9a18d402fe...</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "8px", fontWeight: 700, color: "#F59E0B" }}>Shared CAF Retailer</td>
                <td style={{ padding: "8px" }}>Mewat Telecom Retailer #4401</td>
                <td style={{ padding: "8px" }}>Sameer Khan (L2B), Paytm Sink #1109</td>
                <td style={{ padding: "8px", fontWeight: 700 }}>2 / 4 Accounts</td>
                <td style={{ padding: "8px", color: "#059669" }}>Tier-1 Telco CAF File</td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)", fontSize: "9px" }}>3c5f882109...</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "8px", fontWeight: 700, color: "#BE123C" }}>C2 Webhook Exfil</td>
                <td style={{ padding: "8px" }}>Telegram C2 @c2_bot</td>
                <td style={{ padding: "8px" }}>Kingpin Handset (Poco X5)</td>
                <td style={{ padding: "8px", fontWeight: 700 }}>Active C2 Stream</td>
                <td style={{ padding: "8px", color: "#B45309" }}>Tier-2 Intercept Log</td>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono)", fontSize: "9px" }}>71da902318...</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* INTERACTIVE SVG + HTML CANVAS */
        <div
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            position: "relative",
            background: "#FAFCFF",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* SVG TRUNK-AND-BRANCH BUS ROUTING LAYER */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 760 360"
            preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto" }}
          >
            <defs>
              {/* Animated Dashed Stream for Active Hotspot */}
              <style>{`
                @keyframes busDash {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                .bus-active-dash {
                  animation: busDash 1.2s linear infinite;
                }
                @keyframes kingpinBorderBeam {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>

              <marker id="arrowIndigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B5CF6" />
              </marker>
              <marker id="arrowEmerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
              </marker>
              <marker id="arrowAmber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
              </marker>
              <marker id="arrowSky" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284C7" />
              </marker>
              <marker id="arrowRose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E11D48" />
              </marker>
            </defs>

            {layoutMode === "layered" ? (
              <>
                {/* ============================================================
                    BUS 1: CELL INGRESS (Tower -> Kingpin)
                    ============================================================ */}
                {showIngress && (
                  <g style={{ transition: "opacity 0.2s ease" }}>
                    {/* White Halo Bridge */}
                    <line x1="185" y1="54" x2="260" y2="54" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                    <line
                      x1="185"
                      y1="54"
                      x2="260"
                      y2="54"
                      stroke="#0284C7"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowSky)"
                    />
                    {/* Label */}
                    <rect x="195" y="44" width="56" height="18" rx="3" fill="#E0F2FE" stroke="#BAE6FD" />
                    <text x="223" y="56" fill="#0369A1" fontSize="8" fontWeight="800" textAnchor="middle">
                      {isHotspotActive ? "TTL=63 ⚠️" : "TTL=64 ✓"}
                    </text>
                  </g>
                )}

                {/* ============================================================
                    BUS 2: C2 WEBHOOK EXFIL (Kingpin -> C2 Webhook)
                    ============================================================ */}
                {showC2 && (
                  <g style={{ transition: "opacity 0.2s ease" }}>
                    <line x1="500" y1="54" x2="580" y2="54" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
                    <line
                      x1="500"
                      y1="54"
                      x2="580"
                      y2="54"
                      stroke="#E11D48"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      className="bus-active-dash"
                      markerEnd="url(#arrowRose)"
                    />
                    <rect x="515" y="44" width="50" height="18" rx="3" fill="#FFE4E6" stroke="#FECDD3" />
                    <text x="540" y="56" fill="#BE123C" fontSize="8" fontWeight="800" textAnchor="middle">
                      OTP Exfil
                    </text>
                  </g>
                )}

                {/* ============================================================
                    BUS 3: TETHER BUS (Kingpin -> Hub -> Mules 1, 2A, 2B, Sink)
                    ============================================================ */}
                {showTether && (
                  <g
                    style={{
                      opacity: hoveredBus && hoveredBus !== "tether" ? 0.15 : 1,
                      cursor: "pointer",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={() => setHoveredBus("tether")}
                    onMouseLeave={() => setHoveredBus(null)}
                    onClick={() =>
                      setEvidenceSheetItem({
                        id: "EVID-TETHER",
                        title: "Accomplice Wi-Fi Hotspot BSSID: 74:DA:38:A2:11:BC",
                        type: "802.11 Wi-Fi BSSID Broadcast",
                        tier: "Tier-1 UPI 2.0 XML Device Attestation",
                        sha256: "e4b7c1290a5f82d1c678391b8a90234f9a0c12e8",
                        statutoryBasis: "Section 94 BNSS & Telecom Ingress Records",
                        description:
                          "All 4 fraud mule login sessions across SBI, HDFC, Axis, and Paytm originated from identical BSSID 74:DA:38:A2:11:BC. Decremented TTL=63 confirms physical packet routing through the accomplice handset.",
                      })
                    }
                  >
                    {/* Kingpin to Hub line */}
                    <path d="M 330 82 L 330 110 L 251 110 L 251 135" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path
                      d="M 330 82 L 330 110 L 251 110 L 251 135"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />

                    {/* Hub bottom to Main Trunk at y=208 */}
                    <path d="M 251 177 L 251 208" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 251 177 L 251 208" fill="none" stroke="#8B5CF6" strokeWidth="3" />

                    {/* Main Horizontal Trunk line at y=208 */}
                    <path d="M 103 208 L 661 208" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 103 208 L 661 208" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />

                    {/* Vertical Drops into Mules at y=208 -> y=268 */}
                    {/* Drop 1: M1 (x=103) */}
                    <path d="M 103 208 L 103 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 103 208 L 103 268" fill="none" stroke="#8B5CF6" strokeWidth="3" markerEnd="url(#arrowIndigo)" />

                    {/* Drop 2: M2A (x=289) */}
                    <path d="M 289 208 L 289 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 289 208 L 289 268" fill="none" stroke="#8B5CF6" strokeWidth="3" markerEnd="url(#arrowIndigo)" />

                    {/* Drop 3: M2B (x=475) */}
                    <path d="M 475 208 L 475 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 475 208 L 475 268" fill="none" stroke="#8B5CF6" strokeWidth="3" markerEnd="url(#arrowIndigo)" />

                    {/* Drop 4: Sink (x=661) */}
                    <path d="M 661 208 L 661 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 661 208 L 661 268" fill="none" stroke="#8B5CF6" strokeWidth="3" markerEnd="url(#arrowIndigo)" />

                    {/* Single Central Badge on Tether Trunk */}
                    <rect x="305" y="198" width="150" height="20" rx="4" fill="#F5F3FF" stroke="#DDD6FE" />
                    <text x="380" y="211" fill="#6D28D9" fontSize="8.5" fontWeight="800" textAnchor="middle">
                      BSSID Tether Bus (4/4 Mules)
                    </text>
                  </g>
                )}

                {/* ============================================================
                    BUS 4: JA4 TLS BUS (Kingpin -> Hub -> Mules 1, 2A, 2B, Sink)
                    ============================================================ */}
                {showJa4 && (
                  <g
                    style={{
                      opacity: hoveredBus && hoveredBus !== "ja4" ? 0.15 : 1,
                      cursor: "pointer",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={() => setHoveredBus("ja4")}
                    onMouseLeave={() => setHoveredBus(null)}
                    onClick={() =>
                      setEvidenceSheetItem({
                        id: "EVID-JA4",
                        title: "JA4 TLS Client Fingerprint: t13d1516h2_8daaf6",
                        type: "Cryptographic TLS 1.3 Client Hello Signature",
                        tier: "Tier-1 Cloudflare / NPCI Switch Ingress",
                        sha256: "9a18d402fe33b190c4d281a4b901a88c42b0124a",
                        statutoryBasis: "Section 63(4) BSA Digital Evidence Certificate",
                        description:
                          "Unique 36-character TLS client fingerprint invariant across all 4 bank sessions. Proves single custom automated payment client was executed on the same device runtime.",
                      })
                    }
                  >
                    {/* Kingpin to Hub line */}
                    <path d="M 380 82 L 380 135" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 380 82 L 380 135" fill="none" stroke="#10B981" strokeWidth="3" />

                    {/* Hub bottom to Main Trunk at y=230 */}
                    <path d="M 401 177 L 401 230" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 401 177 L 401 230" fill="none" stroke="#10B981" strokeWidth="3" />

                    {/* Main Horizontal Trunk line at y=230 */}
                    <path d="M 125 230 L 639 230" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 125 230 L 639 230" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

                    {/* Vertical Drops into Mules at y=230 -> y=268 */}
                    {/* Drop 1: M1 (x=125) */}
                    <path d="M 125 230 L 125 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 125 230 L 125 268" fill="none" stroke="#10B981" strokeWidth="3" markerEnd="url(#arrowEmerald)" />

                    {/* Drop 2: M2A (x=311) */}
                    <path d="M 311 230 L 311 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 311 230 L 311 268" fill="none" stroke="#10B981" strokeWidth="3" markerEnd="url(#arrowEmerald)" />

                    {/* Drop 3: M2B (x=453) */}
                    <path d="M 453 230 L 453 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 453 230 L 453 268" fill="none" stroke="#10B981" strokeWidth="3" markerEnd="url(#arrowEmerald)" />

                    {/* Drop 4: Sink (x=639) */}
                    <path d="M 639 230 L 639 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 639 230 L 639 268" fill="none" stroke="#10B981" strokeWidth="3" markerEnd="url(#arrowEmerald)" />

                    {/* Single Central Badge on JA4 Trunk */}
                    <rect x="305" y="220" width="150" height="20" rx="4" fill="#ECFDF5" stroke="#A7F3D0" />
                    <text x="380" y="233" fill="#047857" fontSize="8.5" fontWeight="800" textAnchor="middle">
                      JA4 TLS Client Bus (4/4 Match)
                    </text>
                  </g>
                )}

                {/* ============================================================
                    BUS 5: CAF SIM SYNDICATE BUS (Hub -> Sameer L2B & Paytm Sink)
                    ============================================================ */}
                {showCaf && (
                  <g
                    style={{
                      opacity: hoveredBus && hoveredBus !== "caf" ? 0.15 : 1,
                      cursor: "pointer",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={() => setHoveredBus("caf")}
                    onMouseLeave={() => setHoveredBus(null)}
                    onClick={() =>
                      setEvidenceSheetItem({
                        id: "EVID-CAF",
                        title: "Shared CAF Introducer: Mewat Telecom Retailer #4401",
                        type: "Customer Acquisition Form (CAF) Cross-Reference",
                        tier: "Tier-1 Telco Master Subscriber Database",
                        sha256: "3c5f8821098bb2e04f1128a8d902e88a7c10b904",
                        statutoryBasis: "Section 94 BNSS Production Order",
                        description:
                          "Physical SIM cards for Sameer Khan (Axis L2B) and Paytm Merchant Sink were issued by the exact same POS retailer agent #4401 in Nuh/Mewat corridor on forged Aadhaar documents.",
                      })
                    }
                  >
                    {/* Kingpin to Hub */}
                    <path d="M 430 82 L 430 110 L 551 110 L 551 135" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path
                      d="M 430 82 L 430 110 L 551 110 L 551 135"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    />

                    {/* Hub bottom to CAF Trunk at y=250 */}
                    <path d="M 551 177 L 551 250" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path d="M 551 177 L 551 250" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4 3" />

                    {/* CAF Trunk from x=510 to x=617 */}
                    <path d="M 510 250 L 617 250" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                    <path
                      d="M 510 250 L 617 250"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                    />

                    {/* Drops into Sameer L2B (x=510) and Sink (x=617) */}
                    <path d="M 510 250 L 510 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path
                      d="M 510 250 L 510 268"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrowAmber)"
                    />

                    <path d="M 617 250 L 617 268" fill="none" stroke="#FFFFFF" strokeWidth="8" />
                    <path
                      d="M 617 250 L 617 268"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrowAmber)"
                    />

                    {/* Badge */}
                    <rect x="520" y="240" width="130" height="19" rx="4" fill="#FFFBEB" stroke="#FDE68A" />
                    <text x="585" y="253" fill="#B45309" fontSize="8" fontWeight="800" textAnchor="middle">
                      Shared Introducer #4401 (2/4)
                    </text>
                  </g>
                )}
              </>
            ) : (
              /* RADIAL ORBIT LAYOUT BUSES */
              <g style={{ transition: "all 0.3s ease" }}>
                {/* Spoke lines from Center Kingpin to Hubs and Peripheral Nodes */}
                {nodes
                  .filter((n) => n.id !== "node-kp")
                  .map((n) => (
                    <g key={n.id}>
                      <line
                        x1="380"
                        y1="175"
                        x2={n.radialX}
                        y2={n.radialY}
                        stroke="#E2E8F0"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    </g>
                  ))}
              </g>
            )}

            {/* ============================================================
                SVG NODES LAYER (LOCKED TO EXACT 0 0 760 360 COORDINATE SYSTEM)
                ============================================================ */}
            {nodes.map((node) => {
              const isKingpin = node.category === "kingpin";
              const isHub = node.category === "hub";
                            const posX = layoutMode === "layered" ? node.x : node.radialX - node.w / 2;
              const posY = layoutMode === "layered" ? node.y : node.radialY - node.h / 2;
              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedNodeId === node.id;
              const opacity = getNodeOpacity(node.id);

              if (isHub) {
                // 42PX CIRCULAR HUB NODE
                return (
                  <g
                    key={node.id}
                    transform={`translate(${posX}, ${posY})`}
                    onClick={() =>
                      setEvidenceSheetItem({
                        id: node.id,
                        title: node.label,
                        type: node.tier,
                        tier: node.tier,
                        sha256: "9a18d402fe33b190c4d281a4b901a88c42b0124a",
                        statutoryBasis: "Section 63(4) BSA / Section 94 BNSS",
                        description: node.sublabel,
                      })
                    }
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="20"
                      fill="#FFFFFF"
                      stroke={node.color}
                      strokeWidth={isHovered ? "2.5" : "2"}
                    />
                    <text x="21" y="26" textAnchor="middle" fontSize="14">
                      {node.id === "node-hub-tether" ? "📶" : node.id === "node-hub-ja4" ? "⚡" : "🏢"}
                    </text>
                    {/* Strength Badge */}
                    <rect x="24" y="24" width="22" height="14" rx="7" fill={node.color} />
                    <text x="35" y="34" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" fontFamily="var(--font-mono)">
                      {node.strength}
                    </text>
                    <text x="21" y="52" textAnchor="middle" fill="#0F172A" fontSize="8.5" fontWeight="700">
                      {node.label}
                    </text>
                  </g>
                );
              }

              if (isKingpin) {
                // HERO KINGPIN CARD
                return (
                  <g
                    key={node.id}
                    transform={`translate(${posX}, ${posY})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                  >
                    <rect
                      width={node.w}
                      height={node.h}
                      rx="8"
                      fill="#FFFFFF"
                      stroke={isSelected ? "#E11D48" : isHovered ? "#BE123C" : isHotspotActive ? "#BE123C" : "#E11D48"}
                      strokeWidth={isSelected || isHovered ? "2" : "1.5"}
                    />
                    <rect x="8" y="9" width="38" height="40" rx="6" fill="#FFE4E6" />
                    <text x="27" y="34" textAnchor="middle" fontSize="18">📱</text>
                    <text x="54" y="26" fill="#0F172A" fontSize="11" fontWeight="800">
                      {node.label}
                    </text>
                    <rect x="178" y="14" width="50" height="16" rx="3" fill="#FFE4E6" />
                    <text x="203" y="25" textAnchor="middle" fill="#BE123C" fontSize="7.5" fontWeight="800">KINGPIN</text>
                    <text x="54" y="44" fill={isHotspotActive ? "#BE123C" : "#64748B"} fontSize="9" fontWeight="600">
                      {node.sublabel}
                    </text>
                  </g>
                );
              }

              // ACCOUNT & PERIPHERAL CARDS (170x54)
              return (
                <g
                  key={node.id}
                  transform={`translate(${posX}, ${posY})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                >
                  <rect
                    width={node.w}
                    height={node.h}
                    rx="6"
                    fill="#FFFFFF"
                    stroke={isSelected ? node.color : isHovered ? node.color : "#CBD5E1"}
                    strokeWidth={isSelected ? "2" : "1"}
                  />
                  <rect x="6" y="8" width="34" height="38" rx="5" fill={`${node.color}15`} />
                  <text x="23" y="32" textAnchor="middle" fontSize="16">
                    {node.category === "account" ? "🛡️" : node.id === "node-tower" ? "📡" : "🤖"}
                  </text>
                  <text x="46" y="24" fill="#0F172A" fontSize="10" fontWeight="700">
                    {node.label}
                  </text>
                  <text x="46" y="40" fill="#64748B" fontSize="8.5">
                    {node.sublabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
{/* EVIDENCE SHEET DIALOG (MODAL / SLIDE-OVER) */}
      <Dialog.Root open={!!evidenceSheetItem} onOpenChange={(open) => !open && setEvidenceSheetItem(null)}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 998 }} />
          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "480px",
              maxWidth: "92vw",
              background: "#FFFFFF",
              borderRadius: "10px",
              padding: "18px 20px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              zIndex: 999,
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <Dialog.Title style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                  {evidenceSheetItem?.title}
                </Dialog.Title>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                  {evidenceSheetItem?.type} · <span style={{ fontWeight: 700, color: "#059669" }}>{evidenceSheetItem?.tier}</span>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    color: "#94A3B8",
                  }}
                >
                  ✕
                </button>
              </Dialog.Close>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                FORENSIC BITSTREAM SHA-256 HASH
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#0F172A" }}>
                  {evidenceSheetItem?.sha256}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    if (evidenceSheetItem) {
                      navigator.clipboard.writeText(evidenceSheetItem.sha256);
                      toast.success("SHA-256 hash copied!");
                    }
                  }}
                  style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "4px", padding: "2px 6px", fontSize: "9px", cursor: "pointer" }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "12px", fontSize: "11px", color: "#334155", lineHeight: 1.4 }}>
              <strong>Evidentiary Proof: </strong>
              {evidenceSheetItem?.description}
            </div>

            <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "6px", padding: "8px 10px", marginBottom: "16px", fontSize: "10px", color: "#3730A3" }}>
              <strong>Statutory Basis: </strong>
              {evidenceSheetItem?.statutoryBasis}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setEvidenceSheetItem(null)}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success("Navigating to Entity Resolution Profile...");
                  setEvidenceSheetItem(null);
                }}
                style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, border: "none", background: "#4F46E5", color: "#FFFFFF", cursor: "pointer" }}
              >
                Open in Entities (ENT-02) →
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

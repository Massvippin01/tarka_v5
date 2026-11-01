import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  Smartphone,
  Server,
  Wifi,
  Cpu,
  Building,
  Shield,
  Play,
  RotateCcw,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { layoutNetwork, type NetworkEdgeLayout } from "./layoutNetwork";
import { lintViz } from "../../../utils/lintViz";

export type EdgeFilterType = "all" | "tether" | "ja4" | "caf" | "c2";

interface EvidenceNetworkGraphProps {
  isHotspotActive: boolean;
  onToggleHotspot: () => void;
  edgeFilter: EdgeFilterType;
  onEdgeFilterChange: (filter: EdgeFilterType) => void;
}

interface EvidenceSheetData {
  title: string;
  category: string;
  source: string;
  sha256: string;
  statutoryBasis: string;
  details: string;
  linkedEntities: string[];
}

export const EvidenceNetworkGraph: React.FC<EvidenceNetworkGraphProps> = ({
  isHotspotActive,
  onToggleHotspot,
  edgeFilter,
  onEdgeFilterChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 820,
    height: 480,
  });

  const [viewMode, setViewMode] = useState<"graph" | "matrix" | "table">("graph");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<EvidenceSheetData | null>(null);

  // Replay discovery animation
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(4); // 1 to 4 (4 = all visible)

  // Measure container using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(760, Math.floor(width)),
            height: Math.max(440, Math.floor(height)),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute pure layout
  const layout = useMemo(() => {
    return layoutNetwork(dimensions.width, dimensions.height, isHotspotActive, edgeFilter);
  }, [dimensions.width, dimensions.height, isHotspotActive, edgeFilter]);

  // Replay step timer
  useEffect(() => {
    let timer: any;
    if (isReplaying) {
      if (replayStep < 4) {
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

  // Run geometry linter on canvas
  useEffect(() => {
    if (canvasRef.current) {
      const result = lintViz(canvasRef.current);
      console.log("LINT VIZ VIOLATIONS:", result.violations);
      if (canvasRef.current.parentElement) {
        canvasRef.current.parentElement.setAttribute("data-lint", result.passed ? "pass" : "fail");
      }
    }
  }, [layout, viewMode]);

  // Expose dev stats
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.network = {
        stats: () => ({
          nodeCount: layout.nodes.length,
          edgeCount: layout.edges.length,
          activeFilter: edgeFilter,
          isHotspotActive,
          busCount: 0,
        }),
      };
    }
  }, [layout, edgeFilter, isHotspotActive, viewMode]);

  // Opacity dimming on hover
  const getNodeOpacity = (nodeId: string) => {
    if (!hoveredNodeId) return 1;
    if (nodeId === hoveredNodeId) return 1;
    // Hero node connects to everything
    if (hoveredNodeId === "node-hero") return 1;
    if (nodeId === "node-hero") return 0.9;
    // Highlight neighborhood
    const relatedEdge = layout.edges.find(
      (e) =>
        (e.sourceId === hoveredNodeId && e.targetId === nodeId) ||
        (e.targetId === hoveredNodeId && e.sourceId === nodeId)
    );
    return relatedEdge ? 1 : 0.15;
  };

  const getEdgeOpacity = (edge: NetworkEdgeLayout) => {
    // If replaying, show edges matching discovery step
    if (isReplaying) {
      if (edge.type === "tower" && replayStep < 1) return 0;
      if (edge.type === "c2" && replayStep < 2) return 0;
      if (edge.type === "ja4" && replayStep < 3) return 0;
      if (edge.type === "tether" && replayStep < 4) return 0;
      if (edge.type === "caf" && replayStep < 4) return 0;
    }

    if (!hoveredNodeId) return 0.85;
    if (edge.sourceId === hoveredNodeId || edge.targetId === hoveredNodeId) return 1;
    return 0.12;
  };

  const openEvidenceSheet = (sheet: EvidenceSheetData) => {
    setSelectedSheet(sheet);
  };

  return (
    <div
      ref={containerRef}
      className="hero-canvas-container"
      data-testid="hero-canvas"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 460,
        width: "100%",
        position: "relative",
        background: "#FAFCFF",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          TOOLBAR STRIP (44px, SEPARATE ROW, NEVER OVERLAYS CANVAS)
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          height: 44,
          padding: "0 12px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          zIndex: 10,
          flexShrink: 0,
          gap: "8px",
        }}
      >
        {/* Left: Filter Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", marginRight: "4px" }}>
            FILTER:
          </span>
          {(
            [
              { id: "all", label: "ALL" },
              { id: "tether", label: "TETHER (Wi-Fi)" },
              { id: "ja4", label: "JA4 TLS" },
              { id: "caf", label: "CAF" },
              { id: "c2", label: "C2 BOT" },
            ] as const
          ).map((tab) => {
            const isActive = edgeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onEdgeFilterChange(tab.id)}
                className="hover:border-indigo-300 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  fontSize: "10.5px",
                  fontWeight: isActive ? 700 : 500,
                  padding: "4px 8px",
                  borderRadius: "5px",
                  border: isActive ? "1px solid #C7D2FE" : "1px solid #E2E8F0",
                  background: isActive ? "#EEF2FF" : "#FFFFFF",
                  color: isActive ? "#4338CA" : "#64748B",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Controls & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Simulate Hotspot Toggle */}
          <button
            type="button"
            onClick={onToggleHotspot}
            className="hover:bg-slate-100 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10.5px",
              fontWeight: 700,
              padding: "4px 9px",
              borderRadius: "5px",
              border: isHotspotActive ? "1px solid #FCA5A5" : "1px solid #CBD5E1",
              background: isHotspotActive ? "#FFF1F2" : "#F8FAFC",
              color: isHotspotActive ? "#E11D48" : "#475569",
              cursor: "pointer",
            }}
          >
            <Wifi size={12} color={isHotspotActive ? "#E11D48" : "#64748B"} />
            <span>{isHotspotActive ? "Hotspot: TTL=63 (Tethered)" : "Hotspot: TTL=64 (Direct)"}</span>
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
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: isReplaying ? "#FEF3C7" : "#FFFFFF",
              color: isReplaying ? "#B45309" : "#334155",
              cursor: isReplaying ? "default" : "pointer",
            }}
          >
            {isReplaying ? <RotateCcw size={12} className="animate-spin" /> : <Play size={12} />}
            <span>{isReplaying ? `Replaying (${replayStep}/4)` : "Replay"}</span>
          </button>

          {/* Graph | Matrix Switcher */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              background: "#F1F5F9",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              style={{
                fontSize: "10.5px",
                fontWeight: viewMode === "graph" ? 700 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "graph" ? "#FFFFFF" : "transparent",
                color: viewMode === "graph" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "graph" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              style={{
                fontSize: "10.5px",
                fontWeight: viewMode === "matrix" ? 700 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "matrix" ? "#FFFFFF" : "transparent",
                color: viewMode === "matrix" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "matrix" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                fontSize: "10.5px",
                fontWeight: viewMode === "table" ? 700 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "table" ? "#FFFFFF" : "transparent",
                color: viewMode === "table" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "table" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: PURE SVG + HTML TOPOLOGY CANVAS
          ========================================================================= */}
      {viewMode === "graph" && (
        <div
          ref={canvasRef}
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            position: "relative",
            width: "100%",
            height: "calc(100% - 44px)",
            overflow: "hidden",
          }}
        >
          {/* Background Grid Pattern */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <defs>
              <pattern id="net-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="0.75" fill="#CBD5E1" />
              </pattern>

              {/* Arrow Markers for vertical bezier endpoints */}
              <marker
                id="arrow-blue"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
              </marker>
              <marker
                id="arrow-rose"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#BE123C" />
              </marker>
              <marker
                id="arrow-violet"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
              </marker>
              <marker
                id="arrow-emerald"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
              </marker>
            </defs>

            <rect width="100%" height="100%" fill="url(#net-grid)" />

            {/* Render Edges: Halo Layer First, then Color Path (ZERO Edge Labels at Rest) */}
            {layout.edges.map((edge) => (
              <path
                key={`halo-${edge.id}`}
                d={edge.haloPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={5.5}
                strokeLinecap="round"
                opacity={getEdgeOpacity(edge) > 0 ? 0.95 : 0}
                style={{ transition: "opacity 0.2s ease" }}
              />
            ))}

            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                className="network-edge"
                d={edge.path}
                fill="none"
                stroke={edge.color}
                strokeWidth={2.25}
                strokeDasharray={edge.dashed ? "5,4" : undefined}
                markerEnd={`url(#${edge.arrowhead})`}
                opacity={getEdgeOpacity(edge)}
                style={{
                  transition: "opacity 0.2s ease, stroke-width 0.15s ease",
                  cursor: "pointer",
                }}
                onClick={() =>
                  openEvidenceSheet({
                    title: `Link: ${edge.sourceId} → ${edge.targetId}`,
                    category: edge.type.toUpperCase(),
                    source: "Network Correlation Engine",
                    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    statutoryBasis: "BSA §63(4) Electronic Record Admissibility",
                    details: `Deterministic evidence link correlating network session telemetry under type [${edge.type}].`,
                    linkedEntities: [edge.sourceId, edge.targetId],
                  })
                }
              />
            ))}
          </svg>

          {/* =====================================================================
              ROW A: CONTROLLER DEVICE CLUSTER (HERO) & SATELLITES
              ===================================================================== */}
          {layout.nodes
            .filter((n) => n.category === "controller" || n.category === "hero")
            .map((node) => {
              const isHero = node.category === "hero";
              const opacity = getNodeOpacity(node.id);

              return (
                <div
                  key={node.id}
                  className="node-card"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() =>
                    openEvidenceSheet({
                      title: node.label,
                      category: isHero ? "Controller Device Cluster" : "Network Ingress",
                      source: isHero ? "Airtel PGW & Samsung TAC 86749206" : "Rohini Sector 4 BTS",
                      sha256: "89c20491823091ffeed891241aa44591aefc48201",
                      statutoryBasis: "BSA §63 & DoT License Clause 39.20",
                      details: node.sublabel,
                      linkedEntities: ["Vikram Shah (L1)", "Rohit Verma (L2A)", "Sameer Khan (L2B)", "Paytm Sink #1109"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    border: isHero ? "1.5px solid #F43F5E" : "1px solid #CBD5E1",
                    boxShadow: isHero
                      ? "0 0 16px -2px rgba(244, 63, 94, 0.35), 0 4px 12px rgba(15, 23, 42, 0.08)"
                      : "0 1px 3px rgba(15, 23, 42, 0.06)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: isHero ? "8px 12px" : "6px 10px",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    opacity,
                    transition: "opacity 0.2s ease, transform 0.15s ease",
                    zIndex: isHero ? 5 : 4,
                  }}
                >
                  {/* Top Badge for Hero */}
                  {isHero && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          color: "#E11D48",
                          textTransform: "uppercase",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#E11D48",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                        Controller Device Cluster
                      </span>
                      <span
                        style={{
                          fontSize: "8px",
                          fontWeight: 700,
                          background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                          color: isHotspotActive ? "#E11D48" : "#047857",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          border: isHotspotActive ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                        }}
                      >
                        {isHotspotActive ? "TTL=63 Tethered" : "TTL=64 Direct"}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {node.id === "node-tower" && <Radio size={14} color="#0284C7" />}
                    {isHero && <Smartphone size={15} color="#E11D48" />}
                    {node.id === "node-c2" && <Server size={14} color="#BE123C" />}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: isHero ? "12px" : "11px",
                          fontWeight: 800,
                          color: "#0F172A",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.label}
                      </div>
                      <div
                        style={{
                          fontSize: isHero ? "9.5px" : "9px",
                          color: "#64748B",
                          fontFamily: "var(--font-mono)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.sublabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* =====================================================================
              ROW B: THREE EVIDENCE HUBS (56px CIRCLES WITH 40px CLEAR ZONE)
              ===================================================================== */}
          {layout.nodes
            .filter((n) => n.category === "hub")
            .map((hub) => {
              const opacity = getNodeOpacity(hub.id);

              return (
                <div
                  key={hub.id}
                  className="evidence-hub"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredNodeId(hub.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() =>
                    openEvidenceSheet({
                      title: hub.label,
                      category: "Corroborative Evidence Hub",
                      source: hub.id === "hub-tether" ? "Airtel BSSID Telemetry" : hub.id === "hub-ja4" ? "JA4 TLS Fingerprint" : "Mewat CAF Retailer Logs",
                      sha256: "339109bbcf12498214aa88231908812c3f19a03b",
                      statutoryBasis: "BSA §63 Admissibility Protocol",
                      details: `Coverage: ${hub.strength} accounts correlated under this evidence vector.`,
                      linkedEntities: hub.id === "hub-caf" ? ["Sameer Khan (L2B)", "Paytm Sink #1109"] : ["All 4 Mule Accounts"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: hub.x,
                    top: hub.y,
                    width: hub.w,
                    height: hub.h,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    border: `2px solid ${hub.color}`,
                    boxShadow: `0 0 12px -2px ${hub.color}40, 0 2px 6px rgba(15,23,42,0.06)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity,
                    transition: "opacity 0.2s ease, transform 0.15s ease",
                    zIndex: 4,
                  }}
                >
                  {hub.id === "hub-tether" && <Wifi size={22} color={hub.color} />}
                  {hub.id === "hub-ja4" && <Cpu size={22} color={hub.color} />}
                  {hub.id === "hub-caf" && <Building size={22} color={hub.color} />}

                  {/* Two-Line Caption BELOW Hub (12px with White Halo, 40px clear zone) */}
                  <div
                    style={{
                      position: "absolute",
                      top: hub.h + 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 140,
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#0F172A",
                        textShadow: "0 0 3px #FFFFFF, 0 0 6px #FFFFFF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hub.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: hub.color,
                        fontFamily: "var(--font-mono)",
                        textShadow: "0 0 3px #FFFFFF, 0 0 6px #FFFFFF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hub.strength} Match
                    </div>
                  </div>
                </div>
              );
            })}

          {/* =====================================================================
              ROW C: FOUR ACCOUNT CARDS (176x64, 3 EXPLICIT TOP PORTS)
              ===================================================================== */}
          {layout.nodes
            .filter((n) => n.category === "account")
            .map((node) => {
              const opacity = getNodeOpacity(node.id);

              return (
                <div
                  key={node.id}
                  className="node-card"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() =>
                    openEvidenceSheet({
                      title: node.label,
                      category: "Controlled Mule Account",
                      source: "Core Banking Ledger & Cyber Crime Freeze",
                      sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                      statutoryBasis: "BNSS §107 Provisional Seizure Order",
                      details: `${node.role || "Mule Account"} · ${node.sublabel}`,
                      linkedEntities: ["Controller Device Cluster"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderRadius: "6px",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    opacity,
                    transition: "opacity 0.2s ease, transform 0.15s ease",
                    zIndex: 4,
                  }}
                >
                  {/* Top Edge Port Markers (-44, 0, +44) */}
                  <div
                    style={{
                      position: "absolute",
                      top: -3,
                      left: 0,
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      gap: "38px",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#8B5CF6" }} />
                    <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#10B981" }} />
                    <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#F59E0B" }} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Shield size={13} color={node.color} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#0F172A",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.label}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#64748B",
                          fontFamily: "var(--font-mono)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.sublabel}
                      </div>
                    </div>
                  </div>

                  {/* Role / Status Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "8.5px",
                      borderTop: "1px solid #F1F5F9",
                      paddingTop: "3px",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        color: "#475569",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {node.role}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        color: "#059669",
                        fontWeight: 800,
                        background: "#ECFDF5",
                        padding: "0.5px 3.5px",
                        borderRadius: "2px",
                      }}
                    >
                      §107 Frozen
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: EVIDENCE MATRIX VIEW
          ========================================================================= */}
      {viewMode === "matrix" && (
        <div
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#FFFFFF",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0" }}>
              Multi-Source Evidence Correlation Matrix
            </h3>
            <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>
              Shows cross-session intersection of physical hardware, network IPDR, and CAF vectors linking 4 accounts to 1 cluster.
            </p>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Evidence Vector</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Vikram Shah (L1)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Rohit Verma (L2A)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Sameer Khan (L2B)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Paytm Sink</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Strength</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Statutory Admissibility</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  vector: "Wi-Fi Tether AP (74:DA:38:A2:11:BC)",
                  type: "Hardware Tether",
                  m1: true,
                  m2a: true,
                  m2b: true,
                  sink: true,
                  strength: "4/4 (Deterministic)",
                  color: "#8B5CF6",
                  basis: "BSA §63(4) Electronic Stanza",
                },
                {
                  vector: "JA4 TLS Fingerprint (t13d1516h2_8daaf6)",
                  type: "App Binary Hash",
                  m1: true,
                  m2a: true,
                  m2b: true,
                  sink: true,
                  strength: "4/4 (Deterministic)",
                  color: "#10B981",
                  basis: "ISO/IEC 27037 Telemetry",
                },
                {
                  vector: "Shared CAF Retailer (Mewat #4401)",
                  type: "SIM Registration",
                  m1: false,
                  m2a: false,
                  m2b: true,
                  sink: true,
                  strength: "2/4 (Corroborative)",
                  color: "#F59E0B",
                  basis: "DoT Clause 39.20 CAF",
                },
                {
                  vector: "Telegram C2 Exfiltration (@c2_bot)",
                  type: "C2 Telemetry",
                  m1: true,
                  m2a: true,
                  m2b: true,
                  sink: true,
                  strength: "4/4 (Deterministic)",
                  color: "#BE123C",
                  basis: "CERT-In Ingress Log",
                },
                {
                  vector: "Cell Tower Azimuth (DL-TWR-891 Sec 4)",
                  type: "Geographic Co-location",
                  m1: true,
                  m2a: true,
                  m2b: true,
                  sink: true,
                  strength: "4/4 (100% Sector)",
                  color: "#0284C7",
                  basis: "Airtel BTS Stratum-2",
                },
              ].map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #E2E8F0",
                    background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    openEvidenceSheet({
                      title: row.vector,
                      category: row.type,
                      source: "Multi-Source Correlator",
                      sha256: "4a2b918374c810dfaa291882410a8ef183c0",
                      statutoryBasis: row.basis,
                      details: `Deterministic match across targeted accounts with score ${row.strength}.`,
                      linkedEntities: ["Vikram Shah", "Rohit Verma", "Sameer Khan", "Paytm Sink"],
                    })
                  }
                >
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: row.color }} />
                      <span>{row.vector}</span>
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {row.m1 ? <span style={{ color: "#059669", fontWeight: 800 }}>● MATCH</span> : <span style={{ color: "#94A3B8" }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {row.m2a ? <span style={{ color: "#059669", fontWeight: 800 }}>● MATCH</span> : <span style={{ color: "#94A3B8" }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {row.m2b ? <span style={{ color: "#059669", fontWeight: 800 }}>● MATCH</span> : <span style={{ color: "#94A3B8" }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {row.sink ? <span style={{ color: "#059669", fontWeight: 800 }}>● MATCH</span> : <span style={{ color: "#94A3B8" }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 800, color: row.color }}>{row.strength}</td>
                  <td style={{ padding: "8px 10px", color: "#475569", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                    {row.basis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: VIEW AS TABLE
          ========================================================================= */}
      {viewMode === "table" && (
        <div
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#FFFFFF",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Node ID</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Label</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Category</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Sublabel / Telemetry</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {layout.nodes.map((node, i) => (
                <tr key={node.id} style={{ borderBottom: "1px solid #E2E8F0", background: i % 2 === 0 ? "#FFF" : "#F8FAFC" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#334155" }}>
                    {node.id}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>{node.label}</td>
                  <td style={{ padding: "8px 10px", color: "#64748B", textTransform: "capitalize" }}>{node.category}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{node.sublabel}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        color: "#059669",
                        background: "#ECFDF5",
                        padding: "1px 5px",
                        borderRadius: "3px",
                      }}
                    >
                      Active Link
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          EVIDENCE SHEET SLIDE-OVER / DIALOG
          ========================================================================= */}
      {selectedSheet && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            bottom: 0,
            width: 320,
            background: "#FFFFFF",
            borderLeft: "1px solid #CBD5E1",
            boxShadow: "-4px 0 16px rgba(15,23,42,0.08)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#F8FAFC",
            }}
          >
            <div>
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>
                {selectedSheet.category}
              </span>
              <h4 style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F172A", margin: "2px 0 0 0" }}>
                {selectedSheet.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSheet(null)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "4px",
                color: "#64748B",
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>SOURCE SYSTEM</label>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                {selectedSheet.source}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>EVIDENCE SHA-256 HASH</label>
              <div
                style={{
                  fontSize: "9.5px",
                  fontFamily: "var(--font-mono)",
                  color: "#334155",
                  background: "#F1F5F9",
                  padding: "5px 7px",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                  marginTop: "2px",
                }}
              >
                {selectedSheet.sha256}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>STATUTORY ADMISSIBILITY</label>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                {selectedSheet.statutoryBasis}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>CORRELATION DETAILS</label>
              <div style={{ fontSize: "11px", color: "#334155", lineHeight: 1.4, marginTop: "2px" }}>
                {selectedSheet.details}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>CORRELATED ENTITIES</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {selectedSheet.linkedEntities.map((ent, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      background: "#EEF2FF",
                      color: "#4338CA",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <button
              type="button"
              onClick={() => {
                toast.success("Navigating to Entity Dossier...");
                setSelectedSheet(null);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "5px",
                border: "1px solid #C7D2FE",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span>Inspect in Entities (02)</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

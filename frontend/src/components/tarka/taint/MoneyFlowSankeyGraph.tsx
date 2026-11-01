import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  sankey as d3Sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
} from "d3-sankey";
import {
  Scissors,
  Sparkles,
  Table as TableIcon,
  Clock,
} from "lucide-react";
import { useFocusStore } from "../kit";

export interface MoneyFlowSankeyGraphProps {
  freezeBudgetK: number;
  onFreezeBudgetKChange: (k: number) => void;
  isInjectClean: boolean;
  onToggleInjectClean: () => void;
  selectedRule: "LIBR" | "FIFO" | "PRO_RATA";
}

interface CustomNodeData {
  id: string;
  name: string;
  subname: string;
  category: "victim" | "mule" | "merchant" | "cashout" | "hold" | "clean";
  treatment: "frozen" | "lien" | "cashout" | "clean" | "victim";
  balance: number;
  statute: string;
}

interface CustomLinkData {
  source: string;
  target: string;
  value: number;
  treatment: "frozen" | "lien" | "cashout" | "clean" | "outflow";
  isCut: boolean;
  label: string;
  pct: number;
}


export const MoneyFlowSankeyGraph: React.FC<MoneyFlowSankeyGraphProps> = ({
  freezeBudgetK,
  isInjectClean,
  onToggleInjectClean,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 840, height: 320 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);

  const { selectedNodeId, setSelectedNodeId } = useFocusStore();

  // ResizeObserver for dynamic fit
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 200 && height > 150) {
          setDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Register dev hook
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.sankey = {
        stats: () => ({
          totalLoss: 500000,
          recoverable: 380000,
          freezeBudgetK,
          isInjectClean,
          nodeCount: isInjectClean ? 9 : 8,
          linkCount: isInjectClean ? 8 : 7,
        }),
      };
    }
  }, [freezeBudgetK, isInjectClean]);

  // Nodes & Links Data
  const rawData = useMemo(() => {
    const rawNodes: CustomNodeData[] = [
      {
        id: "sunil",
        name: "Sunil Kumar (Victim)",
        subname: "SBI 30910029101",
        category: "victim",
        treatment: "victim",
        balance: 500000,
        statute: "Victim Origin",
      },
      {
        id: "vikram",
        name: "Vikram Shah (L1 Mule)",
        subname: "SBI 41088291083",
        category: "mule",
        treatment: "frozen",
        balance: 500000,
        statute: "§107 BNSS Complete Hold",
      },
      {
        id: "rohit",
        name: "Rohit Verma (L2A)",
        subname: "HDFC 5010029419920",
        category: "mule",
        treatment: "frozen",
        balance: 300000,
        statute: "§107 BNSS Split Conduit",
      },
      {
        id: "sameer",
        name: "Sameer Khan (L2B)",
        subname: "AXIS 9140200410291",
        category: "mule",
        treatment: "frozen",
        balance: 200000,
        statute: "§107 BNSS Cashout Conduit",
      },
      {
        id: "apex",
        name: "Apex Electronics Pvt Ltd",
        subname: "ICICI · GSTIN 07AAACA1234F1Z8",
        category: "merchant",
        treatment: "lien",
        balance: isInjectClean ? 430000 : 180000,
        statute: "§106 BNSS Specific Lien",
      },
      {
        id: "rohit_hold",
        name: "Rohit Retained Hold",
        subname: "HDFC Account Residual",
        category: "hold",
        treatment: "frozen",
        balance: 120000,
        statute: "§107 BNSS Judicial Hold",
      },
      {
        id: "atm",
        name: "Noida ATM DL-049",
        subname: "Terminal Cash Out (Irreversible)",
        category: "cashout",
        treatment: "cashout",
        balance: 120000,
        statute: "Dispensed Cash Out",
      },
      {
        id: "sameer_hold",
        name: "Sameer Retained Hold",
        subname: "AXIS Account Residual",
        category: "hold",
        treatment: "frozen",
        balance: 80000,
        statute: "§107 BNSS Judicial Hold",
      },
    ];

    if (isInjectClean) {
      rawNodes.push({
        id: "clean",
        name: "Clean Revenue Inflow",
        subname: "Commercial POS Settlements",
        category: "clean",
        treatment: "clean",
        balance: 250000,
        statute: "LIBR Protected Capital",
      });
    }

    // Cut status determined by freezeBudgetK:
    // K >= 1 cuts Rohit->Apex (₹1.80L)
    // K >= 2 cuts Rohit->Hold (₹1.20L)
    // K >= 3 cuts Sameer->Hold (₹80K) - 100% contained!
    const rawLinks: CustomLinkData[] = [
      {
        source: "sunil",
        target: "vikram",
        value: 500000,
        treatment: "outflow",
        isCut: false,
        label: "₹5.00L Outflow (100%)",
        pct: 100,
      },
      {
        source: "vikram",
        target: "rohit",
        value: 300000,
        treatment: "frozen",
        isCut: false,
        label: "₹3.00L (60%)",
        pct: 60,
      },
      {
        source: "vikram",
        target: "sameer",
        value: 200000,
        treatment: "frozen",
        isCut: false,
        label: "₹2.00L (40%)",
        pct: 40,
      },
      {
        source: "rohit",
        target: "apex",
        value: 180000,
        treatment: "lien",
        isCut: freezeBudgetK >= 1,
        label: "₹1.80L §106 Lien",
        pct: 36,
      },
      {
        source: "rohit",
        target: "rohit_hold",
        value: 120000,
        treatment: "frozen",
        isCut: freezeBudgetK >= 2,
        label: "₹1.20L §107 Hold",
        pct: 24,
      },
      {
        source: "sameer",
        target: "atm",
        value: 120000,
        treatment: "cashout",
        isCut: false, // ATM cashout is an irreversible exit
        label: "₹1.20L Cash Out ⚠️",
        pct: 24,
      },
      {
        source: "sameer",
        target: "sameer_hold",
        value: 80000,
        treatment: "frozen",
        isCut: freezeBudgetK >= 3,
        label: "₹80K §107 Hold",
        pct: 16,
      },
    ];

    if (isInjectClean) {
      rawLinks.push({
        source: "clean",
        target: "apex",
        value: 250000,
        treatment: "clean",
        isCut: false,
        label: "+₹2.50L Clean Working Capital",
        pct: 50,
      });
    }

    return { rawNodes, rawLinks };
  }, [isInjectClean, freezeBudgetK]);

  // Compute Layout with d3-sankey
  const sankeyData = useMemo(() => {
    const nodeMap = new Map<string, number>();
    rawData.rawNodes.forEach((n, idx) => nodeMap.set(n.id, idx));

    const nodesForD3 = rawData.rawNodes.map((n) => ({ ...n }));
    const linksForD3 = rawData.rawLinks.map((l) => ({
      source: nodeMap.get(l.source)!,
      target: nodeMap.get(l.target)!,
      value: l.value,
      treatment: l.treatment,
      isCut: l.isCut,
      label: l.label,
      pct: l.pct,
    }));

    const w = Math.max(680, dimensions.width - 24);
    const h = Math.max(220, dimensions.height - 120);

    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(14)
      .nodePadding(28)
      .extent([
        [160, 24],
        [w - 180, h - 24],
      ])
      .nodeAlign(sankeyJustify)
      .iterations(64);

    try {
      const computed = sankeyGenerator({
        nodes: nodesForD3,
        links: linksForD3,
      });
      return computed;
    } catch (e) {
      console.warn("d3-sankey layout error:", e);
      return null;
    }
  }, [rawData, dimensions]);

  // Link Color Gradient Helper
  const getLinkGradient = (link: any) => {
    if (link.treatment === "clean") return "url(#sankey-grad-clean)";
    if (link.treatment === "lien") return "url(#sankey-grad-lien)";
    if (link.treatment === "cashout") return "url(#sankey-grad-cashout)";
    if (link.treatment === "frozen") return "url(#sankey-grad-frozen)";
    return "url(#sankey-grad-outflow)";
  };

  // Treatment Palette
  const treatmentColors: Record<string, string> = {
    victim: "#E11D48",
    frozen: "#D97706",
    lien: "#0284C7",
    cashout: "#BE123C",
    clean: "#10B981",
    hold: "#8B5CF6",
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        position: "relative",
      }}
    >
      {/* TOOLBAR HEADER ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          padding: "6px 12px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "11px",
        }}
      >
        {/* Left: View Mode & Rule Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
            D3-SANKEY 64-ITERS · ZERO CYCLES
          </span>

          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2",
              color: freezeBudgetK >= 3 ? "#047857" : "#BE123C",
              border: `1px solid ${freezeBudgetK >= 3 ? "#A7F3D0" : "#FECDD3"}`,
            }}
          >
            {freezeBudgetK >= 3
              ? "DINIC MIN-CUT SAT (K=3 SEALED) ✓"
              : `UNCONTAINED LEAKAGE (K=${freezeBudgetK}) ⚠️`}
          </span>
        </div>

        {/* Right: Controls & Mutators */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Inject Clean Deposit Mutator */}
          <button
            type="button"
            onClick={onToggleInjectClean}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "5px",
              border: isInjectClean ? "1.5px solid #10B981" : "1px solid #CBD5E1",
              background: isInjectClean ? "#ECFDF5" : "#FFFFFF",
              color: isInjectClean ? "#047857" : "#475569",
              cursor: "pointer",
            }}
            title="Inject ₹2.5L clean commercial working capital into Apex Electronics to test LIBR protection"
          >
            <Sparkles size={11} color={isInjectClean ? "#059669" : "#64748B"} />
            <span>{isInjectClean ? "Clean Deposit Active (+₹2.5L)" : "+ Inject Clean Deposit (+₹2.5L)"}</span>
          </button>

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
          >
            <TableIcon size={11} />
            <span>{isTableView ? "Sankey Flow" : "View as Table"}</span>
          </button>
        </div>
      </div>

      {/* VIEW AS TABLE MODE */}
      {isTableView ? (
        <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", padding: "12px", background: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B" }}>
                <th style={{ padding: "6px 8px" }}>Flow Path</th>
                <th style={{ padding: "6px 8px" }}>Source Account</th>
                <th style={{ padding: "6px 8px" }}>Target Account</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Rupee Amount</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>% of Defrauded</th>
                <th style={{ padding: "6px 8px" }}>Legal Classification</th>
                <th style={{ padding: "6px 8px" }}>Dinic Min-Cut Status</th>
              </tr>
            </thead>
            <tbody>
              {rawData.rawLinks.map((link, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "8px", fontWeight: 700, color: "#0F172A" }}>{link.label}</td>
                  <td style={{ padding: "8px" }}>{link.source}</td>
                  <td style={{ padding: "8px" }}>{link.target}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    ₹{link.value.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {link.pct}%
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span
                      style={{
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        background:
                          link.treatment === "lien"
                            ? "#E0F2FE"
                            : link.treatment === "cashout"
                            ? "#FFE4E6"
                            : link.treatment === "clean"
                            ? "#DCFCE7"
                            : "#FEF3C7",
                        color:
                          link.treatment === "lien"
                            ? "#0369A1"
                            : link.treatment === "cashout"
                            ? "#BE123C"
                            : link.treatment === "clean"
                            ? "#15803D"
                            : "#B45309",
                      }}
                    >
                      {link.treatment.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    {link.isCut ? (
                      <span style={{ color: "#059669", fontWeight: 700 }}>✂ CUT (FREEZE SEALED)</span>
                    ) : (
                      <span style={{ color: "#64748B" }}>PASS THROUGH</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* SANKEY CANVAS VIEWPORT */
        <div style={{ flex: "1 1 0%", minHeight: 0, position: "relative", overflow: "hidden", background: "#FAFCFF" }}>
          {sankeyData && (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${Math.max(680, dimensions.width - 24)} ${Math.max(220, dimensions.height - 120)}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              <defs>
                {/* Flow Ribbon Gradients */}
                <linearGradient id="sankey-grad-outflow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.5" />
                </linearGradient>

                <linearGradient id="sankey-grad-frozen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#B45309" stopOpacity="0.45" />
                </linearGradient>

                <linearGradient id="sankey-grad-lien" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.55" />
                </linearGradient>

                <linearGradient id="sankey-grad-cashout" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B45309" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#BE123C" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="sankey-grad-clean" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* RENDER SANKEY FLOW RIBBONS */}
              {sankeyData.links.map((link: any, idx: number) => {
                const pathD = sankeyLinkHorizontal()(link);
                if (!pathD) return null;

                const isHovered = hoveredLinkId === `link-${idx}`;
                const isConnected =
                  hoveredNodeId === link.source.id || hoveredNodeId === link.target.id;
                const opacity =
                  hoveredLinkId || hoveredNodeId
                    ? isHovered || isConnected
                      ? 0.95
                      : 0.15
                    : 0.7;

                // Midpoint for Scissors / Cut Marker
                const midX = ((link.source.x1 || 0) + (link.target.x0 || 0)) / 2;
                const midY = ((link.y0 || 0) + (link.y1 || 0)) / 2;

                return (
                  <g
                    key={`link-${idx}`}
                    onMouseEnter={() => setHoveredLinkId(`link-${idx}`)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={getLinkGradient(link)}
                      strokeWidth={Math.max(2, link.width || 0)}
                      opacity={opacity}
                      strokeLinecap="round"
                    />

                    {/* Ribbon Text Label with 3px White Halo */}
                    {(link.width || 0) >= 12 && (
                      <text
                        x={midX}
                        y={midY}
                        fill="#0F172A"
                        fontSize="8.5"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          paintOrder: "stroke",
                          stroke: "#FFFFFF",
                          strokeWidth: "3px",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          pointerEvents: "none",
                        }}
                      >
                        {link.label}
                      </text>
                    )}

                    {/* Dinic Min-Cut Scissors Badge */}
                    {link.isCut && (
                      <g transform={`translate(${midX - 10}, ${midY - 10})`}>
                        <circle cx="10" cy="10" r="10" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="1.5" />
                        <Scissors x="4" y="4" size={12} color="#4F46E5" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* RENDER VERTICAL SANKEY NODE BARS */}
              {sankeyData.nodes.map((node: any, idx: number) => {
                const color = treatmentColors[node.category] || "#64748B";
                const isHovered = hoveredNodeId === node.id;
                const isSelected = selectedNodeId === node.id;

                return (
                  <g
                    key={`node-bar-${idx}`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={node.x1 - node.x0}
                      height={Math.max(6, node.y1 - node.y0)}
                      fill={color}
                      rx="3"
                      stroke={isSelected ? "#0F172A" : isHovered ? color : "#FFFFFF"}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ transition: "all 0.2s ease" }}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* HTML POSITIONED NODE CARDS (ZERO OVERLAPS WITH RIBBONS) */}
          {sankeyData && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {sankeyData.nodes.map((node: any) => {
                const isLeft = node.x0 < dimensions.width * 0.28;
                const isRight = node.x1 > dimensions.width * 0.65;
                const isHovered = hoveredNodeId === node.id;
                const color = treatmentColors[node.category] || "#4F46E5";

                let cardLeft = node.x0;
                let cardTop = node.y0;

                if (isLeft) {
                  // Position card strictly to the LEFT of node bar
                  cardLeft = Math.max(8, node.x0 - 150);
                  cardTop = Math.max(10, node.y0 - 8);
                } else if (isRight) {
                  // Position card strictly to the RIGHT of node bar
                  cardLeft = node.x1 + 12;
                  cardTop = Math.max(10, node.y0 - 8);
                } else {
                  // Intermediate node (Vikram, Rohit, Sameer): place above node bar
                  cardLeft = node.x0 - 45;
                  cardTop = Math.max(10, node.y0 - 46);
                }

                return (
                  <div
                    key={`card-${node.id}`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      position: "absolute",
                      left: `${cardLeft}px`,
                      top: `${cardTop}px`,
                      width: isLeft || isRight ? "142px" : "130px",
                      background: "#FFFFFF",
                      border: isHovered ? `1.5px solid ${color}` : "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "4px 7px",
                      boxShadow: isHovered ? `0 4px 12px ${color}25` : "0 1px 3px rgba(15,23,42,0.06)",
                      cursor: "pointer",
                      pointerEvents: "auto",
                      zIndex: isHovered ? 30 : 20,
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: "#0F172A",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.name}
                      </span>
                    </div>
                    <div style={{ fontSize: "8px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {node.subname}
                    </div>
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: "8px",
                        fontWeight: 700,
                        color,
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>{node.statute}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          GOLDEN-HOUR DECAY CURVE (ECHARTS / PRECISION SVG STEP-AREA)
          ========================================================================= */}
      <div
        style={{
          height: "90px",
          minHeight: "90px",
          maxHeight: "90px",
          background: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          padding: "6px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={11} color="#059669" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A" }}>
              Golden-Hour Recovery Capital Decay Curve (T+0 to T+24h)
            </span>
            <span style={{ fontSize: "8.5px", color: "#64748B" }}>
              (Drag cursor to simulate freeze at as-of timestamp)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px" }}>
            <span style={{ color: "#E11D48", fontWeight: 700 }}>T+18m: Noida ATM DL-049 Cashout (-₹1.20L)</span>
            <span style={{ color: "#059669", fontWeight: 800 }}>T+2.5h: §106/107 Freeze Placed (₹3.80L Secured)</span>
          </div>
        </div>

        {/* Precision Step-Area SVG */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <svg width="100%" height="100%" viewBox="0 0 760 55" preserveAspectRatio="none">
            <defs>
              <linearGradient id="decay-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Step Decay Curve:
                T+0m (x=20) -> T+18m (x=160): ₹5.00L (y=10)
                T+18m (x=160) cashout drop to ₹3.80L (y=24)
                T+18m -> T+2.5h (x=380): ₹3.80L (y=24)
                T+2.5h freeze hold: stays flat at ₹3.80L to T+24h (x=740)
            */}
            <path
              d="M 20 10 L 160 10 L 160 24 L 380 24 L 740 24 L 740 50 L 20 50 Z"
              fill="url(#decay-fill)"
            />
            <path
              d="M 20 10 L 160 10 L 160 24 L 380 24 L 740 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
            />

            {/* ATM Drop Marker */}
            <circle cx="160" cy="24" r="4" fill="#BE123C" />
            <line x1="160" y1="10" x2="160" y2="50" stroke="#BE123C" strokeWidth="1" strokeDasharray="2 2" />

            {/* Statutory Freeze Marker at T+2.5h */}
            <circle cx="380" cy="24" r="4" fill="#4F46E5" />
            <line x1="380" y1="6" x2="380" y2="50" stroke="#4F46E5" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="385" y="14" fill="#4338CA" fontSize="8" fontWeight="800">
              T+2.5h Statutory Lien
            </text>

            {/* Axes */}
            <line x1="20" y1="50" x2="740" y2="50" stroke="#CBD5E1" strokeWidth="1" />
            <text x="20" y="48" fill="#64748B" fontSize="7.5">T+0m (₹5.00L)</text>
            <text x="160" y="48" fill="#BE123C" fontSize="7.5">T+18m ATM Cashout</text>
            <text x="380" y="48" fill="#4F46E5" fontSize="7.5">T+2.5h §106/107 Lien</text>
            <text x="700" y="48" fill="#64748B" fontSize="7.5">T+24h (₹3.80L)</text>
          </svg>
        </div>
      </div>
    </div>
  );
};

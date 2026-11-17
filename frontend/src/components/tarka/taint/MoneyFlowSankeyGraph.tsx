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
} from "lucide-react";
import { lintViz } from "../../../utils/lintViz";
import type { MoneyFlow, FlowNode } from "../../../selectors/caseSelectors";
import { formatInr, formatInrCompact } from "../../../lib/formatInr";

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export interface MoneyFlowSankeyGraphProps {
  freezeBudgetK: number;
  onFreezeBudgetKChange: (k: number) => void;
  isInjectClean: boolean;
  onToggleInjectClean: () => void;
  selectedRule: "LIBR" | "FIFO" | "PRO_RATA";
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  /** Nodes + links built from the active case's transactions (selectMoneyFlow). */
  flow: MoneyFlow;
}

interface CustomNodeData {
  id: string;
  name: string;
  subname: string;
  category: FlowNode["category"] | "clean";
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
  selectedNodeId,
  onSelectNode,
  flow,
}) => {
  const lossAmount = flow.totalInr;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 840, height: 280 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);
  const requiredK = Math.max(1, flow.links.filter((l) => (l.treatment === "frozen" || l.treatment === "lien") && !flow.links.some((x) => x.source === l.target)).length);

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

  // Lint viz on layout change
  useEffect(() => {
    if (canvasRef.current) {
      const result = lintViz(canvasRef.current);
      console.log("LINT VIZ SANKEY VIOLATIONS:", result.violations);
      if (canvasRef.current.parentElement) {
        canvasRef.current.parentElement.setAttribute("data-lint", result.passed ? "pass" : "fail");
      }
    }
  }, [dimensions, freezeBudgetK, isInjectClean, isTableView]);

  // Expose dev stats
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.sankey = {
        stats: () => ({
          totalLoss: lossAmount,
          recoverable: flow.links.filter((l) => (l.treatment === "frozen" || l.treatment === "lien") && !flow.links.some((x) => x.source === l.target)).reduce((s, l) => s + l.value, 0),
          freezeBudgetK,
          isInjectClean,
          nodeCount: flow.nodes.length + (isInjectClean ? 1 : 0),
          linkCount: flow.links.length + (isInjectClean ? 1 : 0),
        }),
      };
    }
  }, [freezeBudgetK, isInjectClean, lossAmount, flow]);

  // Nodes & Links Data (built from the active case; only the clean-deposit scenario is layered on top)
  const merchantNode = flow.nodes.find((n) => n.category === "merchant");
  const rawData = useMemo(() => {
    const treatmentOfNode = (n: FlowNode): CustomNodeData["treatment"] =>
      n.category === "victim" ? "victim" : n.category === "merchant" ? "lien" : n.category === "cashout" ? "cashout" : "frozen";
    const rawNodes: CustomNodeData[] = flow.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      subname: n.subname,
      category: n.category,
      treatment: treatmentOfNode(n),
      balance: n.balance,
      statute: n.statute,
    }));

    // Freeze order: biggest terminal holds / liens are cut first as the budget K grows.
    const terminalIds = new Set(flow.nodes.filter((n) => !flow.links.some((l) => l.source === n.id) && n.category !== "cashout").map((n) => n.id));
    const cuttable = flow.links
      .filter((l) => terminalIds.has(l.target) && (l.treatment === "frozen" || l.treatment === "lien"))
      .sort((a, b) => b.value - a.value);
    const rawLinks: CustomLinkData[] = flow.links.map((l) => {
      const idx = cuttable.indexOf(l);
      return { ...l, isCut: idx >= 0 && freezeBudgetK > idx };
    });

    if (isInjectClean && merchantNode) {
      const cleanAmt = merchantNode.balance;
      rawNodes.unshift({
        id: "clean",
        name: "Clean revenue inflow",
        subname: "Commercial POS settlements",
        category: "clean",
        treatment: "clean",
        balance: cleanAmt,
        statute: "LIBR protected capital",
      });
      rawLinks.push({
        source: "clean",
        target: merchantNode.id,
        value: cleanAmt,
        treatment: "clean",
        isCut: false,
        label: `+${formatInrCompact(cleanAmt)} clean`,
        pct: 0,
      });
    }
    return { rawNodes, rawLinks };
  }, [flow, isInjectClean, freezeBudgetK, merchantNode]);

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

    const w = Math.max(740, dimensions.width);
    // Enforce compact, readable Sankey height (always small: 220-240px) regardless of container stretching
    const h = Math.max(220, Math.min(240, dimensions.height - 44));

    // extent [[56, 30], [W - 240, H - 30]] ensures dedicated right gutter for sinks and room for Sunil on left
    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(14)
      .nodePadding(22)
      .extent([
        [24, 44],
        [w - 270, h - 30],
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

  // Treatment Colors
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
      className="hero-canvas-container"
      data-testid="hero-canvas"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 260,
        width: "100%",
        position: "relative",
        background: "#FAFCFF",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          TOOLBAR STRIP (44px, SEPARATE ROW)
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          height: 44,
          padding: "0 12px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "11px",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Left: Engine Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#EEF2FF",
              color: "#4338CA",
              border: "1px solid #C7D2FE",
              fontFamily: "var(--font-mono)",
            }}
          >
            MONEY FLOW
          </span>

          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: freezeBudgetK >= requiredK ? "#ECFDF5" : "#FFF1F2",
              color: freezeBudgetK >= requiredK ? "#047857" : "#BE123C",
              border: `1px solid ${freezeBudgetK >= requiredK ? "#A7F3D0" : "#FECDD3"}`,
            }}
          >
            {freezeBudgetK >= requiredK
              ? `All exits sealed (K=${freezeBudgetK}) ✓`
              : `Funds can still escape (K=${freezeBudgetK} of ${requiredK} needed)`}
          </span>
        </div>

        {/* Right: Mutators & Table Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {merchantNode && (
          <button
            type="button"
            onClick={onToggleInjectClean}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "5px",
              border: isInjectClean ? "1.5px solid #10B981" : "1px solid #CBD5E1",
              background: isInjectClean ? "#ECFDF5" : "#FFFFFF",
              color: isInjectClean ? "#047857" : "#475569",
              cursor: "pointer",
            }}
            title={`Inject ${formatInrCompact(merchantNode.balance)} of clean working capital into ${merchantNode.name} to test LIBR protection`}
          >
            <Sparkles size={11} color={isInjectClean ? "#059669" : "#64748B"} />
            <span>{isInjectClean ? "Clean deposit active" : "+ Inject clean deposit"}</span>
          </button>
          )}

          <button
            type="button"
            onClick={() => setIsTableView(!isTableView)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
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

      {/* =========================================================================
          VIEW MODE 1: PURE SVG SANKEY (ZERO HTML CARDS OVER THE CANVAS)
          ========================================================================= */}
      {!isTableView ? (
        <div
          ref={canvasRef}
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            position: "relative",
            width: "100%",
            height: "calc(100% - 44px)",
            overflow: "hidden",
            background: "#FAFCFF",
          }}
        >
          {sankeyData && (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${Math.max(740, dimensions.width)} ${Math.max(220, Math.min(240, dimensions.height - 44))}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              <defs>
                {/* Flow Ribbon Gradients */}
                <linearGradient id="sankey-grad-outflow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.55" />
                </linearGradient>

                <linearGradient id="sankey-grad-frozen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#B45309" stopOpacity="0.5" />
                </linearGradient>

                <linearGradient id="sankey-grad-lien" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B45309" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="sankey-grad-cashout" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B45309" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#BE123C" stopOpacity="0.65" />
                </linearGradient>

                <linearGradient id="sankey-grad-clean" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.65" />
                </linearGradient>
              </defs>

              {/* 1. DRAW SANKEY FLOW RIBBONS (Gradient Centerlines, stroke-width = link.width) */}
              {sankeyData.links.map((link: any, idx: number) => {
                const pathD = sankeyLinkHorizontal()(link);
                if (!pathD) return null;

                const isHovered = hoveredLinkId === `link-${idx}`;
                const isConnected =
                  hoveredNodeId === link.source.id || hoveredNodeId === link.target.id;
                const opacity =
                  hoveredLinkId || hoveredNodeId
                    ? isHovered || isConnected
                      ? 0.92
                      : 0.15
                    : 0.55;

                // Points along centerline: t=0.40 for text label, t=0.72 for scissor cut
                const x0 = link.source.x1 || 0;
                const x1 = link.target.x0 || 0;
                const y0 = link.y0 || 0;
                const y1 = link.y1 || 0;

                const textX = x0 + (x1 - x0) * 0.40;
                const textY = y0 + (y1 - y0) * 0.40;

                const cutX = x0 + (x1 - x0) * 0.72;
                const cutY = y0 + (y1 - y0) * 0.72;

                const gradId =
                  link.treatment === "clean"
                    ? "url(#sankey-grad-clean)"
                    : link.treatment === "lien"
                    ? "url(#sankey-grad-lien)"
                    : link.treatment === "cashout"
                    ? "url(#sankey-grad-cashout)"
                    : link.treatment === "frozen"
                    ? "url(#sankey-grad-frozen)"
                    : "url(#sankey-grad-outflow)";

                return (
                  <g
                    key={`link-${idx}`}
                    onMouseEnter={() => setHoveredLinkId(`link-${idx}`)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  >
                    <path
                      className="sankey-ribbon"
                      d={pathD}
                      fill="none"
                      stroke={gradId}
                      strokeWidth={Math.max(2, link.width || 0)}
                      opacity={opacity}
                      strokeLinecap="round"
                    />

                    {/* Ribbon amount label at t=0.40 (only if width >= 20px or hovered) */}
                    {((link.width || 0) >= 26 || isHovered) && (
                      <text
                        className="ribbon-label"
                        x={textX}
                        y={textY}
                        fill="#18181b"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          paintOrder: "stroke",
                          stroke: "#FFFFFF",
                          strokeWidth: "3.5px",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          pointerEvents: "none",
                        }}
                      >
                        {link.label}
                      </text>
                    )}

                    {/* Scissor markers at t=0.72 on CUT ribbons only (tracking K slider live) */}
                    {link.isCut && (
                      <g transform={`translate(${cutX - 10}, ${cutY - 10})`}>
                        <circle cx="10" cy="10" r="10" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="1.5" />
                        <Scissors x="4" y="4" size={12} color="#4F46E5" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 2. DRAW VERTICAL NODE BARS & LABELS */}
              {sankeyData.nodes.map((node: any) => {
                const color = treatmentColors[node.category] || "#64748B";
                const isHovered = hoveredNodeId === node.id;
                const isSelected = selectedNodeId === node.id;
                const isSink = (node.sourceLinks || []).length === 0;
                const isFirst = (node.targetLinks || []).length === 0;
                const barHeight = Math.max(8, node.y1 - node.y0);

                return (
                  <g
                    key={`node-${node.id}`}
                    className="sankey-node"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => onSelectNode && onSelectNode(isSelected ? null : node.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Node Bar Rect */}
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={node.x1 - node.x0}
                      height={barHeight}
                      fill={color}
                      rx="3"
                      stroke={isSelected ? "#0F172A" : isHovered ? color : "#FFFFFF"}
                      strokeWidth={isSelected ? 2.5 : 1}
                      style={{
                        transition: "all 0.2s ease",
                        filter: node.category === "cashout" ? "drop-shadow(0 0 6px rgba(225,29,72,0.4))" : undefined,
                      }}
                    />

                    {/* Column 0-2: Labels ABOVE the bar with white halo */}
                    {!isSink && (
                      <g transform={`translate(${isFirst ? node.x0 : node.x0 + (node.x1 - node.x0) / 2}, ${node.y0 - 8})`}>
                        <title>{node.name}</title>
                        <text
                          x="0"
                          y="-15"
                          fill="#18181b"
                          fontSize="12"
                          fontWeight="700"
                          textAnchor={isFirst ? "start" : "middle"}
                          style={{
                            paintOrder: "stroke",
                            stroke: "#FFFFFF",
                            strokeWidth: "3px",
                            pointerEvents: "none",
                          }}
                        >
                          <tspan x="0">{truncate(node.name, 18)}</tspan>
                          <tspan x="0" dy="13" fill={color} fontWeight="700" fontFamily="var(--font-mono)">{formatInrCompact(node.balance)}</tspan>
                        </text>
                      </g>
                    )}

                    {/* Column 3 (Sinks): Render in right-hand gutter (W-240..W) */}
                    {isSink && (
                      <g transform={`translate(${node.x1 + 8}, ${node.y0 + barHeight / 2})`}>
                        <title>{`${node.name} · ${formatInrCompact(node.balance)} · ${node.statute}`}</title>
                        <text
                          x="0"
                          y="0"
                          fill="#18181b"
                          fontSize="12.5"
                          fontWeight="700"
                          dominantBaseline="central"
                          style={{
                            paintOrder: "stroke",
                            stroke: "#FFFFFF",
                            strokeWidth: "3px",
                            pointerEvents: "none",
                          }}
                        >
                          {truncate(node.name, 24)} <tspan fill={color} fontWeight="700" fontFamily="var(--font-mono)">{formatInrCompact(node.balance)}</tspan> <tspan fontSize="11" fill="#52525b" fontWeight="600">({lossAmount > 0 ? Math.round((node.balance / lossAmount) * 100) : 0}%)</tspan>
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : (
        /* VIEW AS TABLE MODE */
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
                  <td style={{ padding: "8px" }}>{rawData.rawNodes.find((n) => n.id === link.source)?.name ?? link.source}</td>
                  <td style={{ padding: "8px" }}>{rawData.rawNodes.find((n) => n.id === link.target)?.name ?? link.target}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {formatInr(link.value)}
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
      )}
    </div>
  );
};

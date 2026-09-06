import React, { useEffect, useState } from "react";
import { useInvestigation } from "../context/InvestigationContext";
import { graphProjectionAdapter, type GraphProjectionResponseData } from "../services/graphProjectionAdapter";

interface WebGLGraphExplorerProps {
  onToggleFallback?: () => void;
}

export const WebGLGraphExplorer: React.FC<WebGLGraphExplorerProps> = ({ onToggleFallback }) => {
  const {
    activeCaseId,
    selectedEntityId,
    entityFilters,
    relationshipFilters,
    confidenceFilter,
    selectEntity,
    selectRelationship,
    queryBounds,
  } = useInvestigation();

  const [data, setData] = useState<GraphProjectionResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [filterHop, setFilterHop] = useState<number>(2);
  const [filterNodesBound, setFilterNodesBound] = useState<number>(queryBounds.maxNodes);

  useEffect(() => {
    async function loadProjection() {
      setLoading(true);
      const res = await graphProjectionAdapter.fetchProjection({
        case_id: activeCaseId,
        root_entity_id: selectedEntityId || undefined,
        max_hops: filterHop,
        max_nodes: filterNodesBound,
        entity_types: entityFilters,
        relationship_types: relationshipFilters,
        min_confidence: confidenceFilter,
      });
      if (res) {
        setData(res);
      }
      setLoading(false);
    }
    loadProjection();
  }, [activeCaseId, selectedEntityId, filterHop, filterNodesBound, entityFilters, relationshipFilters, confidenceFilter]);

  const getNodeColor = (label: string) => {
    switch (label) {
      case "Person": return "#f43f5e";
      case "Case": return "#34d399";
      case "Phone": return "#38bdf8";
      case "Vehicle": return "#a855f7";
      case "Evidence": return "#eab308";
      case "BankAccount": return "#10b981";
      default: return "#94a3b8";
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Controls & Telemetry Bar */}
      <div style={styles.controlBar}>
        <div style={styles.scopeGroup}>
          <span style={styles.badge}>CASE: {activeCaseId}</span>
          <label style={styles.label}>HOPS:</label>
          <select
            value={filterHop}
            onChange={(e) => setFilterHop(Number(e.target.value))}
            style={styles.select}
          >
            <option value={1}>1 Hop</option>
            <option value={2}>2 Hops (Bounded)</option>
            <option value={3}>3 Hops</option>
          </select>

          <label style={styles.label}>BOUND:</label>
          <select
            value={filterNodesBound}
            onChange={(e) => setFilterNodesBound(Number(e.target.value))}
            style={styles.select}
          >
            <option value={5}>5 Nodes (Truncated Test)</option>
            <option value={100}>100 Nodes</option>
            <option value={500}>500 Nodes (Standard)</option>
            <option value={1000}>1000 Nodes (Large)</option>
          </select>
        </div>

        <div style={styles.telemetryGroup}>
          {data && (
            <span style={styles.telemetryText}>
              ⚡ Query: {data.telemetry.query_duration_ms}ms | Nodes: {data.nodes.length} | Edges: {data.edges.length}
            </span>
          )}
          {onToggleFallback && (
            <button onClick={onToggleFallback} style={styles.fallbackBtn}>
              🔄 REACTFLOW FALLBACK
            </button>
          )}
        </div>
      </div>

      {/* Epistemic Graph Safety Banner */}
      <div style={{
        background: "rgba(230, 184, 92, 0.08)",
        borderBottom: "1px solid rgba(230, 184, 92, 0.2)",
        color: "#e6b85c",
        padding: "5px 12px",
        fontSize: "0.65rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span>⚖️ <strong>EPISTEMIC GRAPH SAFETY DIRECTIVES:</strong> Association ≠ Guilt | Centrality ≠ Criminality | Similarity ≠ Identity</span>
        <span style={{ color: "#38bdf8" }}>ML Proposes → Evidence Verifies → Human Decides</span>
      </div>

      {/* Truncation Alert Banner */}
      {data?.truncation.is_truncated && (
        <div style={styles.truncationBanner}>
          ⚠️ <strong>BOUNDED GRAPH PROJECTION TRUNCATED:</strong> Showing {data.truncation.returned_nodes} of {data.truncation.total_available_nodes} matching entities. {data.truncation.truncation_reason}
        </div>
      )}

      {/* WebGL Canvas viewport */}
      <div style={styles.canvasContainer}>
        {loading ? (
          <div style={styles.loadingOverlay}>
            <span>Loading Bounded Graph Projection...</span>
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div style={styles.loadingOverlay}>No nodes found in projected scope.</div>
        ) : (
          <svg width="100%" height="520" viewBox="-400 -300 800 600" style={{ background: "#030712" }}>
            <defs>
              <pattern id="webglGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="-400" y="-300" width="800" height="600" fill="url(#webglGrid)" />

            {/* Render Edges */}
            {data.edges.map((edge) => {
              const srcNode = data.nodes.find((n) => n.id === edge.source);
              const tgtNode = data.nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              return (
                <g key={edge.id} onClick={() => selectRelationship(edge.id)} style={{ cursor: "pointer" }}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={edge.confidence < 0.9 ? "#f43f5e" : "#38bdf8"}
                    strokeWidth={edge.confidence < 0.9 ? "2" : "1.5"}
                    strokeDasharray={edge.confidence < 0.9 ? "4 4" : undefined}
                    opacity="0.6"
                  />
                  <text
                    x={(srcNode.x + tgtNode.x) / 2}
                    y={(srcNode.y + tgtNode.y) / 2}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}

            {/* Render Nodes */}
            {data.nodes.map((n) => {
              const isSelected = selectedEntityId === n.id;
              const color = getNodeColor(n.label);
              const name = n.properties.name || n.properties.title || n.properties.phone_number || n.properties.registration_number || n.id;
              const labelUpper = n.label.toUpperCase();

              return (
                <g
                  key={n.id}
                  onClick={() => selectEntity(n.id)}
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle cx={n.x} cy={n.y} r="22" fill="none" stroke="#34d399" strokeWidth="2.5" strokeDasharray="3 3" />
                  )}

                  {/* Distinct Entity Shapes */}
                  {labelUpper === "PERSON" && (
                    <>
                      <circle cx={n.x} cy={n.y} r="14" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <circle cx={n.x} cy={n.y} r="7" fill={color} />
                    </>
                  )}
                  {labelUpper === "PHONE" && (
                    <>
                      <rect x={n.x - 12} y={n.y - 12} width="24" height="24" rx="5" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <rect x={n.x - 6} y={n.y - 6} width="12" height="12" rx="3" fill={color} />
                    </>
                  )}
                  {labelUpper === "VEHICLE" && (
                    <>
                      <polygon points={`${n.x},${n.y - 15} ${n.x + 15},${n.y} ${n.x},${n.y + 15} ${n.x - 15},${n.y}`} fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <polygon points={`${n.x},${n.y - 7} ${n.x + 7},${n.y} ${n.x},${n.y + 7} ${n.x - 7},${n.y}`} fill={color} />
                    </>
                  )}
                  {labelUpper === "BANKACCOUNT" || labelUpper === "ACCOUNT" ? (
                    <>
                      <rect x={n.x - 12} y={n.y - 12} width="24" height="24" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <rect x={n.x - 6} y={n.y - 6} width="12" height="12" fill={color} />
                    </>
                  ) : null}
                  {labelUpper === "CASE" && (
                    <>
                      <polygon points={`${n.x - 8},${n.y - 14} ${n.x + 8},${n.y - 14} ${n.x + 15},${n.y} ${n.x + 8},${n.y + 14} ${n.x - 8},${n.y + 14} ${n.x - 15},${n.y}`} fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <circle cx={n.x} cy={n.y} r="5" fill={color} />
                    </>
                  )}
                  {labelUpper !== "PERSON" && labelUpper !== "PHONE" && labelUpper !== "VEHICLE" && labelUpper !== "BANKACCOUNT" && labelUpper !== "ACCOUNT" && labelUpper !== "CASE" && (
                    <>
                      <circle cx={n.x} cy={n.y} r="12" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
                      <circle cx={n.x} cy={n.y} r="6" fill={color} />
                    </>
                  )}

                  {/* Label */}
                  <text x={n.x + 16} y={n.y + 4} fill="#f8fafc" fontSize="11" fontWeight="bold">
                    {name}
                  </text>
                  <text x={n.x + 16} y={n.y + 16} fill="#64748b" fontSize="9" fontWeight="600">
                    {n.label.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Hover Node Context Panel */}
      {hoveredNode && (
        <div style={styles.hoverTooltip}>
          <strong>{hoveredNode.properties.name || hoveredNode.id}</strong>
          <span>Type: {hoveredNode.label} | Cluster: {hoveredNode.cluster_id}</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#030712",
    position: "relative",
  },
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#0a0f18",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  scopeGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    fontWeight: 700,
    fontSize: "0.68rem",
    padding: "3px 6px",
    borderRadius: "4px",
  },
  label: {
    color: "#64748b",
    fontSize: "0.65rem",
    fontWeight: 700,
  },
  select: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f8fafc",
    fontSize: "0.72rem",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  telemetryGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  telemetryText: {
    color: "#38bdf8",
    fontSize: "0.68rem",
    fontWeight: 600,
  },
  fallbackBtn: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#94a3b8",
    fontSize: "0.65rem",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  truncationBanner: {
    background: "rgba(234, 179, 8, 0.15)",
    borderBottom: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#fde047",
    padding: "6px 12px",
    fontSize: "0.72rem",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  loadingOverlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#94a3b8",
    fontSize: "0.85rem",
  },
  hoverTooltip: {
    position: "absolute",
    bottom: "12px",
    left: "12px",
    background: "#0f172a",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "8px 12px",
    borderRadius: "6px",
    color: "#38bdf8",
    fontSize: "0.72rem",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    pointerEvents: "none",
  },
};

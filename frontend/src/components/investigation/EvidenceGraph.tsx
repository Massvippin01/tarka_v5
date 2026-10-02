import React, { useEffect, useState, useMemo } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  epistemic_level: string;
  risk_level?: string;
  content_hash?: string;
  valid_from?: string;
  valid_to?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  observed_at?: string;
  valid_from?: string;
  valid_to?: string;
  corroboration_level: string;
  epistemic_status: string;
  confidence: number;
}

export const EvidenceGraph: React.FC = () => {
  const { activeCaseId, selectedEntityId, selectEntity, selectRelationship } = useInvestigation();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(selectedEntityId || null);
  const [projectionStatus, setProjectionStatus] = useState<"HEALTHY" | "STALE" | "REBUILDING">("HEALTHY");
  const [projectionVersion, setProjectionVersion] = useState<number>(1);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Synchronize selection with external context (A3 context system)
  useEffect(() => {
    if (selectedEntityId && selectedEntityId !== selectedNode) {
      setSelectedNode(selectedEntityId);
    }
  }, [selectedEntityId]);

  // Initial Snapshot Fetch
  useEffect(() => {
    let isMounted = true;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/graph-projection/${activeCaseId}/snapshot`);
        if (res.ok) {
          const snap = await res.json();
          if (isMounted) {
            const mappedNodes: GraphNode[] = snap.nodes.map((n: any) => ({
              id: n.identifier || n.id,
              label: n.display_label || n.label || n.identifier,
              node_type: n.entity_type || n.label || "Entity",
              epistemic_level: n.epistemic_status || "OBSERVED",
              risk_level: n.risk_level || "UNKNOWN",
              valid_from: n.valid_from,
              valid_to: n.valid_to,
            }));

            const mappedEdges: GraphEdge[] = snap.edges.map((e: any) => ({
              id: e.relationship_id || e.id,
              source: e.source,
              target: e.target,
              relationship_type: e.relationship_type || e.type || "RELATED_TO",
              supporting_evidence: e.evidence_refs || [],
              contradicting_evidence: e.properties?.conflict_reason ? [e.properties.conflict_reason] : [],
              observed_at: e.observed_at,
              valid_from: e.valid_from,
              valid_to: e.valid_to,
              corroboration_level: (e.evidence_refs && e.evidence_refs.length > 1) ? "CORROBORATED" : "SINGLE_SOURCE",
              epistemic_status: e.epistemic_status || "DOCUMENTED",
              confidence: e.confidence ?? 1.0,
            }));

            setNodes(mappedNodes);
            setEdges(mappedEdges);
            setProjectionVersion(snap.version || 1);
            setProjectionStatus("HEALTHY");
          }
        }
      } catch (err) {
        console.warn("Using initial fallback for graph projection", err);
      }
    };

    fetchSnapshot();

    // Connect to SSE Realtime Event Stream for Incremental Graph Deltas (A5)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:8000/api/v1/investigation/events/stream?case_id=${activeCaseId}`);

      eventSource.addEventListener("GRAPH_NODE_CREATED", (e: MessageEvent) => {
        try {
          const delta = JSON.parse(e.data);
          if (delta.payload?.node) {
            const raw = delta.payload.node;
            const newNode: GraphNode = {
              id: raw.identifier,
              label: raw.display_label,
              node_type: raw.entity_type,
              epistemic_level: raw.epistemic_status,
              risk_level: raw.risk_level,
              valid_from: raw.valid_from,
              valid_to: raw.valid_to,
            };
            setNodes((prev) => {
              if (prev.some((n) => n.id === newNode.id)) return prev;
              return [...prev, newNode];
            });
            if (delta.payload.version) setProjectionVersion(delta.payload.version);
          }
        } catch (err) {
          console.error("Error processing GRAPH_NODE_CREATED delta", err);
        }
      });

      eventSource.addEventListener("GRAPH_NODE_UPDATED", (e: MessageEvent) => {
        try {
          const delta = JSON.parse(e.data);
          if (delta.payload?.node) {
            const raw = delta.payload.node;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === raw.identifier
                  ? {
                      ...n,
                      label: raw.display_label,
                      epistemic_level: raw.epistemic_status,
                      risk_level: raw.risk_level,
                    }
                  : n
              )
            );
            if (delta.payload.version) setProjectionVersion(delta.payload.version);
          }
        } catch (err) {
          console.error("Error processing GRAPH_NODE_UPDATED delta", err);
        }
      });

      eventSource.addEventListener("GRAPH_NODE_REMOVED", (e: MessageEvent) => {
        try {
          const delta = JSON.parse(e.data);
          const removedId = delta.payload?.removed_id;
          if (removedId) {
            setNodes((prev) => prev.filter((n) => n.id !== removedId));
            setEdges((prev) => prev.filter((ed) => ed.source !== removedId && ed.target !== removedId));
            if (selectedNode === removedId) {
              setStaleMessage("Selected entity is no longer available in the current projection.");
            }
            if (delta.payload.version) setProjectionVersion(delta.payload.version);
          }
        } catch (err) {
          console.error("Error processing GRAPH_NODE_REMOVED delta", err);
        }
      });

      eventSource.addEventListener("GRAPH_RELATIONSHIP_CREATED", (e: MessageEvent) => {
        try {
          const delta = JSON.parse(e.data);
          if (delta.payload?.edge) {
            const raw = delta.payload.edge;
            const newEdge: GraphEdge = {
              id: raw.relationship_id,
              source: raw.source,
              target: raw.target,
              relationship_type: raw.relationship_type,
              supporting_evidence: raw.evidence_refs || [],
              contradicting_evidence: raw.properties?.conflict_reason ? [raw.properties.conflict_reason] : [],
              observed_at: raw.observed_at,
              valid_from: raw.valid_from,
              valid_to: raw.valid_to,
              corroboration_level: (raw.evidence_refs && raw.evidence_refs.length > 1) ? "CORROBORATED" : "SINGLE_SOURCE",
              epistemic_status: raw.epistemic_status || "DOCUMENTED",
              confidence: raw.confidence ?? 1.0,
            };
            setEdges((prev) => {
              if (prev.some((ed) => ed.id === newEdge.id)) return prev;
              return [...prev, newEdge];
            });
            if (delta.payload.version) setProjectionVersion(delta.payload.version);
          }
        } catch (err) {
          console.error("Error processing GRAPH_RELATIONSHIP_CREATED delta", err);
        }
      });

      eventSource.addEventListener("GRAPH_PROJECTION_REBUILT", () => {
        setProjectionStatus("HEALTHY");
        fetchSnapshot();
      });

      eventSource.addEventListener("GRAPH_PROJECTION_STALE", () => {
        setProjectionStatus("STALE");
      });
    } catch (err) {
      console.warn("SSE event stream unavailable in current environment", err);
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeCaseId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (filterType === "ALL") return nodes;
    return nodes.filter((n) => n.node_type.toUpperCase() === filterType.toUpperCase());
  }, [nodes, filterType]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setStaleMessage(null);
    selectEntity(nodeId);
  };

  const getEpistemicBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "VERIFIED":
        return { tag: "[VERIFIED]", color: "#10b981", symbol: "✓" };
      case "OBSERVED":
        return { tag: "[OBSERVED]", color: "#38bdf8", symbol: "●" };
      case "INFERRED":
        return { tag: "[INFERRED]", color: "#a855f7", symbol: "◇" };
      case "CONTRADICTED":
        return { tag: "[CONFLICT]", color: "#ef4444", symbol: "▲" };
      default:
        return { tag: `[${status}]`, color: "#94a3b8", symbol: "○" };
    }
  };

  return (
    <div style={styles.container}>
      {/* Graph Toolbar */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={styles.title}>EVIDENCE-AWARE INTELLIGENCE GRAPH</span>
          <span style={styles.countBadge}>{filteredNodes.length} Nodes</span>
          <span style={styles.countBadge}>{edges.length} Relationships</span>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor:
                projectionStatus === "HEALTHY"
                  ? "#065f4630"
                  : projectionStatus === "STALE"
                  ? "#854d0e30"
                  : "#581c8730",
              color:
                projectionStatus === "HEALTHY"
                  ? "#10b981"
                  : projectionStatus === "STALE"
                  ? "#eab308"
                  : "#c084fc",
              borderColor:
                projectionStatus === "HEALTHY"
                  ? "#059669"
                  : projectionStatus === "STALE"
                  ? "#ca8a04"
                  : "#9333ea",
            }}
          >
            PROJECTION: {projectionStatus} (v{projectionVersion})
          </span>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Filter:</span>
          {["ALL", "PERSON", "PHONE", "VEHICLE", "BANK_ACCOUNT"].map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filterType === ft ? "#1e293b" : "transparent",
                borderColor: filterType === ft ? "#38bdf8" : "#334155",
                color: filterType === ft ? "#f8fafc" : "#94a3b8",
              }}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

      {staleMessage && (
        <div style={styles.staleNotice} role="alert">
          ℹ {staleMessage}
        </div>
      )}

      {/* Main Canvas Area */}
      <div style={styles.canvasGrid}>
        {/* Node Cards Cluster */}
        <div style={styles.nodeColumn}>
          <div style={styles.columnTitle}>ENTITIES & ARTIFACTS</div>
          <div style={styles.scrollList}>
            {filteredNodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isArtifact = node.node_type === "EVIDENCE_ARTIFACT";
              const epi = getEpistemicBadge(node.epistemic_level);
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  style={{
                    ...styles.nodeCard,
                    ...(isSelected ? styles.nodeCardSelected : {}),
                    borderLeftColor: isArtifact ? "#10b981" : "#38bdf8",
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                >
                  <div style={styles.nodeHeader}>
                    <span style={styles.nodeType}>{node.node_type}</span>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span style={{ ...styles.epistemicTag, color: epi.color }}>
                        {epi.symbol} {epi.tag}
                      </span>
                      {node.risk_level && <span style={styles.riskBadge}>{node.risk_level}</span>}
                    </div>
                  </div>
                  <div style={styles.nodeLabel}>{node.label}</div>
                  <div style={styles.nodeId}>ID: {node.id}</div>
                  {node.valid_from && (
                    <div style={styles.temporalText}>Active: {node.valid_from.slice(0, 10)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence-Aware Relationships Column */}
        <div style={styles.edgeColumn}>
          <div style={styles.columnTitle}>EVIDENCE-ANCHORED RELATIONSHIPS</div>
          <div style={styles.scrollList}>
            {edges.map((edge) => {
              const hasContradiction = edge.contradicting_evidence && edge.contradicting_evidence.length > 0;
              const epi = getEpistemicBadge(edge.epistemic_status);
              return (
                <div
                  key={edge.id}
                  onClick={() => selectRelationship(edge.id)}
                  style={{
                    ...styles.edgeCard,
                    borderColor: hasContradiction ? "#ef4444" : "#1e293b",
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <div style={styles.edgeHeader}>
                    <span style={styles.edgeType}>{edge.relationship_type}</span>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span style={{ ...styles.epistemicTag, color: epi.color }}>
                        {epi.symbol} {epi.tag}
                      </span>
                      <span
                        style={{
                          ...styles.corrobTag,
                          background: edge.corroboration_level === "CORROBORATED" ? "#065f4630" : "#1e293b",
                          color: edge.corroboration_level === "CORROBORATED" ? "#10b981" : "#94a3b8",
                        }}
                      >
                        {edge.corroboration_level}
                      </span>
                    </div>
                  </div>
                  <div style={styles.edgeLink}>
                    <strong>{edge.source}</strong> ──▶ <strong>{edge.target}</strong>
                  </div>
                  <div style={styles.evidenceRefs}>
                    Evidence: {edge.supporting_evidence.length} artifact(s) • Confidence: {Math.round(edge.confidence * 100)}%
                  </div>
                  {hasContradiction && (
                    <div style={styles.contradictionAlert}>
                      ▲ Epistemic Conflict: {edge.contradicting_evidence[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    background: "#080c14",
    color: "#f8fafc",
    fontFamily: "Inter, sans-serif",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 14px",
    background: "#0f172a",
    borderBottom: "1px solid #1e293b",
  },
  title: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#e2e8f0",
  },
  countBadge: {
    fontSize: "0.65rem",
    background: "#1e293b",
    color: "#94a3b8",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  filterBtn: {
    fontSize: "0.62rem",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 600,
  },
  staleNotice: {
    background: "#854d0e25",
    color: "#fde047",
    padding: "6px 14px",
    fontSize: "0.72rem",
    borderBottom: "1px solid #ca8a0450",
  },
  canvasGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    padding: "12px",
    flex: 1,
    overflow: "hidden",
  },
  nodeColumn: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  edgeColumn: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  columnTitle: {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  scrollList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  nodeCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderLeftWidth: "4px",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  nodeCardSelected: {
    background: "#1e293b",
    borderColor: "#38bdf8",
    boxShadow: "0 0 0 1px #38bdf8",
  },
  nodeHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
  },
  nodeType: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#64748b",
  },
  epistemicTag: {
    fontSize: "0.58rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  riskBadge: {
    fontSize: "0.58rem",
    fontWeight: 800,
    color: "#ef4444",
    background: "#ef444420",
    padding: "1px 4px",
    borderRadius: "3px",
  },
  nodeLabel: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#f1f5f9",
  },
  nodeId: {
    fontSize: "0.65rem",
    color: "#64748b",
    fontFamily: "monospace",
    marginTop: "2px",
  },
  temporalText: {
    fontSize: "0.62rem",
    color: "#94a3b8",
    marginTop: "2px",
  },
  edgeCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  edgeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  edgeType: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#38bdf8",
  },
  corrobTag: {
    fontSize: "0.58rem",
    padding: "1px 5px",
    borderRadius: "3px",
    fontWeight: 700,
  },
  edgeLink: {
    fontSize: "0.78rem",
    color: "#cbd5e1",
    marginBottom: "4px",
  },
  evidenceRefs: {
    fontSize: "0.65rem",
    color: "#64748b",
  },
  contradictionAlert: {
    marginTop: "4px",
    fontSize: "0.65rem",
    color: "#f87171",
    background: "#450a0a40",
    padding: "3px 6px",
    borderRadius: "4px",
    border: "1px solid #ef444440",
  },
};

import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  epistemic_level: string;
  risk_level?: string;
  content_hash?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  observed_at?: string;
  corroboration_level: string;
  epistemic_status: string;
  confidence: number;
}

export const EvidenceGraph: React.FC = () => {
  const { activeCaseId, selectEntity, selectRelationship } = useInvestigation();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchGraph = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/investigations/${activeCaseId}/graph`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
          }
        }
      } catch (err) {
        console.warn("Using fallback local graph nodes", err);
      }
    };
    fetchGraph();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <div style={styles.container}>
      {/* Graph Toolbar */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={styles.title}>️ EVIDENCE-AWARE INTELLIGENCE GRAPH</span>
          <span style={styles.countBadge}>{nodes.length} Nodes</span>
          <span style={styles.countBadge}>{edges.length} Relationships</span>
        </div>
        <div style={styles.legend}>
          <span style={{ color: "#38bdf8" }}>● Person</span>
          <span style={{ color: "#10b981" }}>● Verified Artifact</span>
          <span style={{ color: "#f59e0b" }}>● Phone/Device</span>
          <span style={{ color: "#c084fc" }}>● Bank/UPI</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div style={styles.canvasGrid}>
        {/* Node Cards Cluster */}
        <div style={styles.nodeColumn}>
          <div style={styles.columnTitle}>ENTITIES & ARTIFACTS</div>
          <div style={styles.scrollList}>
            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isArtifact = node.node_type === "EVIDENCE_ARTIFACT";
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node.id);
                    selectEntity(node.id);
                  }}
                  style={{
                    ...styles.nodeCard,
                    ...(isSelected ? styles.nodeCardSelected : {}),
                    borderLeftColor: isArtifact ? "#10b981" : "#38bdf8",
                  }}
                >
                  <div style={styles.nodeHeader}>
                    <span style={styles.nodeType}>{node.node_type}</span>
                    {node.risk_level && <span style={styles.riskBadge}>{node.risk_level}</span>}
                  </div>
                  <div style={styles.nodeLabel}>{node.label}</div>
                  <div style={styles.nodeId}>ID: {node.id}</div>
                  {node.content_hash && (
                    <div style={styles.hashText}>SHA-256: {node.content_hash.slice(0, 16)}...</div>
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
              return (
                <div
                  key={edge.id}
                  onClick={() => selectRelationship(edge.id)}
                  style={{
                    ...styles.edgeCard,
                    borderColor: hasContradiction ? "#ef4444" : "#1e293b",
                  }}
                >
                  <div style={styles.edgeHeader}>
                    <span style={styles.edgeType}>{edge.relationship_type}</span>
                    <span style={{
                      ...styles.corrobTag,
                      background: edge.corroboration_level === "CORROBORATED" ? "#065f4630" : "#1e293b",
                      color: edge.corroboration_level === "CORROBORATED" ? "#10b981" : "#94a3b8",
                    }}>
                      {edge.corroboration_level}
                    </span>
                  </div>
                  <div style={styles.edgeLink}>
                    <strong>{edge.source}</strong>  <strong>{edge.target}</strong>
                  </div>
                  <div style={styles.evidenceRefs}>
                    Evidence: {edge.supporting_evidence.length} artifact(s)
                  </div>
                  {hasContradiction && (
                    <div style={styles.contradictionAlert}>
                       Conflicting telemetry detected on this link
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
  legend: {
    display: "flex",
    gap: "10px",
    fontSize: "0.68rem",
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
    fontWeight: 700,
    color: "#f1f5f9",
  },
  nodeId: {
    fontSize: "0.65rem",
    color: "#94a3b8",
  },
  hashText: {
    fontSize: "0.58rem",
    fontFamily: "monospace",
    color: "#10b981",
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
    marginBottom: "3px",
  },
  edgeType: {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#38bdf8",
  },
  corrobTag: {
    fontSize: "0.58rem",
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: "3px",
  },
  edgeLink: {
    fontSize: "0.78rem",
    color: "#e2e8f0",
  },
  evidenceRefs: {
    fontSize: "0.65rem",
    color: "#94a3b8",
    marginTop: "2px",
  },
  contradictionAlert: {
    fontSize: "0.62rem",
    color: "#ef4444",
    marginTop: "4px",
    fontWeight: 600,
  },
};

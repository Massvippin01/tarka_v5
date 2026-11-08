import React, { useEffect, useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Compass, Scale, Crosshair, Pin, Check, AlertTriangle } from "lucide-react";
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
  is_pinned?: boolean;
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
  const {
    activeCaseId,
    selectedEntityId,
    selectedRelationshipId,
    selectEntity,
    selectRelationship,
    openProofDrawer,
    setActiveWorkspaceView,
    setActiveLens,
  } = useInvestigation();

  // Graph Data State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(selectedEntityId || null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(selectedRelationshipId || null);
  const [projectionStatus, setProjectionStatus] = useState<"HEALTHY" | "STALE" | "REBUILDING">("HEALTHY");
  const [projectionVersion, setProjectionVersion] = useState<number>(1);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [epistemicFilter, setEpistemicFilter] = useState<string>("ALL");
  const [contradictionOnly, setContradictionOnly] = useState<boolean>(false);

  // Focus & Visualization State (Visualization only — never mutates backend)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [pinnedNodeIds, setPinnedNodeIds] = useState<Set<string>>(new Set());
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);

  // Navigation History Stack
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Analytical Panels / Modals
  const [pathModalOpen, setPathModalOpen] = useState<boolean>(false);
  const [pathSource, setPathSource] = useState<string>("");
  const [pathTarget, setPathTarget] = useState<string>("");
  const [pathMode, setPathMode] = useState<"investigative" | "topological">("investigative");
  const [pathResult, setPathResult] = useState<any>(null);

  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [compareEntityA, setCompareEntityA] = useState<string>("");
  const [compareEntityB, setCompareEntityB] = useState<string>("");
  const [compareResult, setCompareResult] = useState<any>(null);

  const [evidenceThread, setEvidenceThread] = useState<any>(null);
  const [evidenceThreadModalOpen, setEvidenceThreadModalOpen] = useState<boolean>(false);

  // Synchronize selection with external context (A3 context system)
  useEffect(() => {
    if (selectedEntityId && selectedEntityId !== selectedNode) {
      setSelectedNode(selectedEntityId);
    }
  }, [selectedEntityId]);

  // Initial Snapshot Fetch (A5 + A6)
  useEffect(() => {
    let isMounted = true;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/v1/graph-projection/${activeCaseId}/snapshot`);
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
        console.warn("Using fallback for graph projection snapshot", err);
      }
    };

    fetchSnapshot();

    // SSE Realtime Event Stream (Incremental Deltas)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/investigation/events/stream?case_id=${activeCaseId}`);

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
            setNodes((prev) => (prev.some((n) => n.id === newNode.id) ? prev : [...prev, newNode]));
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
            setEdges((prev) => (prev.some((ed) => ed.id === newEdge.id) ? prev : [...prev, newEdge]));
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
      if (eventSource) eventSource.close();
    };
  }, [activeCaseId]);

  // ---------------------------------------------------------------------------
  // Navigation & Selection Logic
  // ---------------------------------------------------------------------------

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setStaleMessage(null);
    selectEntity(nodeId);

    // Push into navigation history stack
    setNavHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, nodeId];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedEdgeId(edge.id);
    selectRelationship(edge.id);
  };

  const navigateHistoryBack = () => {
    if (historyIndex > 0) {
      const prevId = navHistory[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      setSelectedNode(prevId);
      selectEntity(prevId);
    }
  };

  const navigateHistoryForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const nextId = navHistory[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      setSelectedNode(nextId);
      selectEntity(nextId);
    }
  };

  // ---------------------------------------------------------------------------
  // Visualization State Controls (Pin, Hide, Isolate, Focus)
  // ---------------------------------------------------------------------------

  const togglePinNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleHideNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  };

  const unhideAllNodes = () => {
    setHiddenNodeIds(new Set());
  };

  const enterFocusMode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFocusNodeId(nodeId);
    setSelectedNode(nodeId);
    selectEntity(nodeId);
  };

  const exitFocusMode = () => {
    setFocusNodeId(null);
    setIsolatedNodeId(null);
  };

  const toggleIsolate = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isolatedNodeId === nodeId) setIsolatedNodeId(null);
    else setIsolatedNodeId(nodeId);
  };

  const resetAllViews = () => {
    setFocusNodeId(null);
    setIsolatedNodeId(null);
    setSearchQuery("");
    setFilterType("ALL");
    setEpistemicFilter("ALL");
    setContradictionOnly(false);
    setHiddenNodeIds(new Set());
  };

  // ---------------------------------------------------------------------------
  // 1-Hop Connected Neighbors for Focus / Dimming
  // ---------------------------------------------------------------------------

  const focusedNeighbors = useMemo(() => {
    if (!focusNodeId && !isolatedNodeId) return null;
    const anchor = focusNodeId || isolatedNodeId;
    const nbrs = new Set<string>([anchor!]);
    for (const edge of edges) {
      if (edge.source === anchor) nbrs.add(edge.target);
      if (edge.target === anchor) nbrs.add(edge.source);
    }
    return nbrs;
  }, [focusNodeId, isolatedNodeId, edges]);

  // ---------------------------------------------------------------------------
  // Filtered Nodes & Edges Pipeline
  // ---------------------------------------------------------------------------

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      // 1. Hidden filter (visual only)
      if (hiddenNodeIds.has(n.id)) return false;

      // 2. Isolation filter
      if (isolatedNodeId && focusedNeighbors && !focusedNeighbors.has(n.id)) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = n.label.toLowerCase().includes(q);
        const matchId = n.id.toLowerCase().includes(q);
        const matchType = n.node_type.toLowerCase().includes(q);
        if (!matchLabel && !matchId && !matchType) return false;
      }

      // 4. Entity type filter
      if (filterType !== "ALL" && n.node_type.toUpperCase() !== filterType.toUpperCase()) {
        return false;
      }

      // 5. Epistemic filter
      if (epistemicFilter !== "ALL" && n.epistemic_level.toUpperCase() !== epistemicFilter.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, [nodes, hiddenNodeIds, isolatedNodeId, focusedNeighbors, searchQuery, filterType, epistemicFilter]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    return edges.filter((e) => {
      // Must connect visible nodes
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) {
        return false;
      }

      // Contradiction filter
      if (contradictionOnly) {
        const isContra = e.epistemic_status === "CONTRADICTED" || (e.contradicting_evidence && e.contradicting_evidence.length > 0);
        if (!isContra) return false;
      }

      return true;
    });
  }, [edges, filteredNodes, contradictionOnly]);

  // ---------------------------------------------------------------------------
  // Path Discovery Tracing (Investigative vs Topological)
  // ---------------------------------------------------------------------------

  const handleTracePath = async () => {
    if (!pathSource || !pathTarget) return;
    try {
      const url = `/api/v1/graph-projection/${activeCaseId}/path?source=${encodeURIComponent(
        pathSource
      )}&target=${encodeURIComponent(pathTarget)}&mode=${pathMode}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPathResult(data);
      }
    } catch (e) {
      console.error("Path trace error", e);
    }
  };

  // ---------------------------------------------------------------------------
  // Entity Comparison
  // ---------------------------------------------------------------------------

  const handleCompareEntities = async () => {
    if (!compareEntityA || !compareEntityB) return;
    try {
      const url = `/api/v1/graph-projection/${activeCaseId}/compare?entity_a=${encodeURIComponent(
        compareEntityA
      )}&entity_b=${encodeURIComponent(compareEntityB)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompareResult(data);
      }
    } catch (e) {
      console.error("Compare error", e);
    }
  };

  // ---------------------------------------------------------------------------
  // Evidence Thread Tracing
  // ---------------------------------------------------------------------------

  const handleTraceEvidenceThread = async (relId: string) => {
    try {
      const url = `/api/v1/graph-projection/${activeCaseId}/evidence-thread/RELATIONSHIP/${encodeURIComponent(
        relId
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvidenceThread(data);
        setEvidenceThreadModalOpen(true);
      }
    } catch (e) {
      console.error("Evidence thread error", e);
    }
  };

  const getEpistemicBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "VERIFIED":
        return { tag: "[VERIFIED]", color: "#10b981", symbol: "" };
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
      {/* ── Subphase A6 Header & Primary Command Strip ──────────────── */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={styles.title}>INTELLIGENCE GRAPH WORKSPACE</span>
          <span style={styles.countBadge}>{filteredNodes.length} Nodes</span>
          <span style={styles.countBadge}>{filteredEdges.length} Edges</span>
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

        {/* Search Input Bar */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flex: "0 1 260px" }}>
          <input
            type="text"
            placeholder="Search nodes, identifiers, types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            aria-label="Search graph entities"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={styles.clearBtn} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Analytical Action Buttons */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Navigation History */}
          <button
            onClick={navigateHistoryBack}
            disabled={historyIndex <= 0}
            style={{ ...styles.navBtn, opacity: historyIndex <= 0 ? 0.35 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}
            title="Navigate Back in Graph Selection History"
          >
            <ChevronLeft size={12} /> BACK
          </button>
          <button
            onClick={navigateHistoryForward}
            disabled={historyIndex >= navHistory.length - 1}
            style={{ ...styles.navBtn, opacity: historyIndex >= navHistory.length - 1 ? 0.35 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}
            title="Navigate Forward in Graph Selection History"
          >
            FWD <ChevronRight size={12} />
          </button>

          {/* Analytical Mode Toggles */}
          <button
            onClick={() => setContradictionOnly(!contradictionOnly)}
            style={{
              ...styles.actionBtn,
              backgroundColor: contradictionOnly ? "#450a0a" : "transparent",
              borderColor: contradictionOnly ? "#ef4444" : "#334155",
              color: contradictionOnly ? "#f87171" : "#cbd5e1",
            }}
            title="Filter graph to conflicting evidentiary links and kinematic anomalies"
          >
            ▲ CONTRADICTIONS
          </button>

          <button
            onClick={() => {
              if (selectedNode) setPathSource(selectedNode);
              setPathModalOpen(true);
            }}
            style={{ ...styles.actionBtn, display: "inline-flex", alignItems: "center", gap: "5px" }}
            title="Trace evidence-supported investigative path between entities"
          >
            <Compass size={13} /> TRACE PATH
          </button>

          <button
            onClick={() => {
              if (selectedNode) setCompareEntityA(selectedNode);
              setCompareModalOpen(true);
            }}
            style={{ ...styles.actionBtn, display: "inline-flex", alignItems: "center", gap: "5px" }}
            title="Multi-dimensional comparative analysis between two entities"
          >
            <Scale size={13} /> COMPARE
          </button>

          <button onClick={resetAllViews} style={styles.resetBtn} title="Reset view perspective">
            RESET
          </button>
        </div>
      </div>

      {/* ── Secondary Filter Strip: Entity & Epistemic Filter Chips ── */}
      <div style={styles.filterStrip}>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{ fontSize: "0.64rem", color: "#64748b", fontWeight: 700 }}>ENTITIES:</span>
          {["ALL", "PERSON", "PHONE", "VEHICLE", "BANK_ACCOUNT", "LOCATION"].map((ft) => (
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

        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{ fontSize: "0.64rem", color: "#64748b", fontWeight: 700 }}>EPISTEMIC:</span>
          {["ALL", "VERIFIED", "OBSERVED", "INFERRED", "CONTRADICTED"].map((ef) => (
            <button
              key={ef}
              onClick={() => setEpistemicFilter(ef)}
              style={{
                ...styles.filterBtn,
                backgroundColor: epistemicFilter === ef ? "#1e293b" : "transparent",
                borderColor: epistemicFilter === ef ? "#a855f7" : "#334155",
                color: epistemicFilter === ef ? "#f8fafc" : "#94a3b8",
              }}
            >
              {ef}
            </button>
          ))}

          {hiddenNodeIds.size > 0 && (
            <button onClick={unhideAllNodes} style={styles.unhideBtn}>
              RESTORE {hiddenNodeIds.size} HIDDEN
            </button>
          )}
        </div>
      </div>

      {/* ── Focus Mode Active Banner ─────────────────────────────────── */}
      {focusNodeId && (
        <div style={styles.focusBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Crosshair size={14} /> FOCUS MODE ACTIVE:
            </span>
            <span>Entity <strong>{focusNodeId}</strong> (1-Hop Context Isolated)</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={exitFocusMode} style={styles.focusActionBtn}>
              EXIT FOCUS MODE
            </button>
            <button onClick={resetAllViews} style={styles.focusActionBtn}>
              RETURN TO FULL VIEW
            </button>
          </div>
        </div>
      )}

      {staleMessage && (
        <div style={styles.staleNotice} role="alert">
          ℹ {staleMessage}
        </div>
      )}

      {/* ── Main Canvas Grid ────────────────────────────────────────── */}
      <div style={styles.canvasGrid}>
        {/* Left Column: Entities & Nodes */}
        <div style={styles.nodeColumn}>
          <div style={styles.columnTitle}>
            <span>ENTITIES & ARTIFACTS ({filteredNodes.length})</span>
            {focusNodeId && <span style={{ color: "#38bdf8" }}>[Focused]</span>}
          </div>
          <div style={styles.scrollList}>
            {filteredNodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isArtifact = node.node_type === "EVIDENCE_ARTIFACT";
              const epi = getEpistemicBadge(node.epistemic_level);
              const isPinned = pinnedNodeIds.has(node.id);
              const isDimmed = focusNodeId && focusedNeighbors && !focusedNeighbors.has(node.id);

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  style={{
                    ...styles.nodeCard,
                    ...(isSelected ? styles.nodeCardSelected : {}),
                    borderLeftColor: isArtifact ? "#10b981" : "#38bdf8",
                    opacity: isDimmed ? 0.25 : 1,
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                >
                  <div style={styles.nodeHeader}>
                    <span style={styles.nodeType}>{node.node_type}</span>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {isPinned && <span title="Pinned in visual workspace"><Pin size={11} style={{ display: "inline-block" }} /></span>}
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

                  {/* Node Quick Action Strip */}
                  <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => enterFocusMode(node.id, e)}
                      style={{ ...styles.cardActionBtn, display: "inline-flex", alignItems: "center", gap: "4px" }}
                      title="Focus on this entity and dim unrelated nodes"
                    >
                      <Crosshair size={11} /> FOCUS
                    </button>
                    <button
                      onClick={(e) => toggleIsolate(node.id, e)}
                      style={styles.cardActionBtn}
                      title="Isolate entity and immediate connections"
                    >
                      ISOLATE
                    </button>
                    <button
                      onClick={(e) => togglePinNode(node.id, e)}
                      style={styles.cardActionBtn}
                      title="Pin node layout position"
                    >
                      {isPinned ? "UNPIN" : "PIN"}
                    </button>
                    <button
                      onClick={(e) => toggleHideNode(node.id, e)}
                      style={styles.cardActionBtn}
                      title="Hide from view without deleting canonical state"
                    >
                      HIDE
                    </button>
                    {node.node_type === "LOCATION" && (
                      <button
                        onClick={() => {
                          selectEntity(node.id);
                          if (setActiveLens) setActiveLens("Map");
                          if (setActiveWorkspaceView) setActiveWorkspaceView("map" as any);
                        }}
                        style={{ ...styles.cardActionBtn, color: "#38bdf8" }}
                        title="View on GIS Map"
                      >
                        MAP ↗
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Evidence-Anchored Relationships */}
        <div style={styles.edgeColumn}>
          <div style={styles.columnTitle}>
            <span>EVIDENCE-ANCHORED RELATIONSHIPS ({filteredEdges.length})</span>
            {contradictionOnly && <span style={{ color: "#f87171" }}>[Contradictions Only]</span>}
          </div>
          <div style={styles.scrollList}>
            {filteredEdges.map((edge) => {
              const hasContradiction = edge.contradicting_evidence && edge.contradicting_evidence.length > 0;
              const epi = getEpistemicBadge(edge.epistemic_status);
              const isSelected = selectedEdgeId === edge.id;

              return (
                <div
                  key={edge.id}
                  onClick={() => handleEdgeClick(edge)}
                  style={{
                    ...styles.edgeCard,
                    ...(isSelected ? styles.edgeCardSelected : {}),
                    borderColor: hasContradiction ? "#ef4444" : isSelected ? "#38bdf8" : "#1e293b",
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
                    <strong style={{ color: "#38bdf8" }}>{edge.source}</strong> ──▶{" "}
                    <strong style={{ color: "#38bdf8" }}>{edge.target}</strong>
                  </div>

                  <div style={styles.evidenceRefs}>
                    Evidence: {edge.supporting_evidence.length} artifact(s) • Confidence: {Math.round(edge.confidence * 100)}%
                  </div>

                  {hasContradiction && (
                    <div style={styles.contradictionAlert}>
                      ▲ Epistemic Conflict: {edge.contradicting_evidence[0]}
                    </div>
                  )}

                  {/* Edge Actions */}
                  <div style={styles.edgeActionStrip} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTraceEvidenceThread(edge.id)}
                      style={styles.edgeActionBtn}
                      title="Trace full evidence lineage for this edge"
                    >
                      TRACE EVIDENCE THREAD
                    </button>
                    {edge.supporting_evidence.length > 0 && (
                      <button
                        onClick={() => openProofDrawer(edge.supporting_evidence[0])}
                        style={{ ...styles.edgeActionBtn, color: "#10b981" }}
                        title="Open Live Proof Drawer"
                      >
                        LIVE PROOF ↗
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Accessible Bottom Legend Strip ───────────────────────────── */}
      <div style={styles.legendStrip}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#64748b" }}>EPISTEMIC STANDING:</span>
          <span style={{ color: "#10b981", display: "inline-flex", alignItems: "center", gap: "3px" }}><Check size={11} /> VERIFIED</span>
          <span style={{ color: "#38bdf8" }}>● OBSERVED</span>
          <span style={{ color: "#a855f7" }}>◇ INFERRED</span>
          <span style={{ color: "#ef4444" }}>▲ CONFLICT</span>
        </div>
        <div style={{ color: "#64748b", fontSize: "0.62rem" }}>
          AI PROPOSES • EVIDENCE VERIFIES • HUMAN DECIDES | Proximity ≠ Guilt
        </div>
      </div>

      {/* ── Path Discovery Modal ─────────────────────────────────────── */}
      {pathModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>INVESTIGATIVE PATH TRACER</h3>
              <button onClick={() => setPathModalOpen(false)} style={styles.closeBtn} aria-label="Close modal"><X size={14} /></button>
            </div>

            <div style={{ display: "flex", gap: "10px", margin: "12px 0" }}>
              <input
                type="text"
                placeholder="Source Entity (e.g. P001)"
                value={pathSource}
                onChange={(e) => setPathSource(e.target.value.toUpperCase())}
                style={styles.modalInput}
              />
              <input
                type="text"
                placeholder="Target Entity (e.g. V188)"
                value={pathTarget}
                onChange={(e) => setPathTarget(e.target.value.toUpperCase())}
                style={styles.modalInput}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ fontSize: "0.72rem", display: "flex", gap: "4px", alignItems: "center" }}>
                <input
                  type="radio"
                  name="pathMode"
                  checked={pathMode === "investigative"}
                  onChange={() => setPathMode("investigative")}
                />
                Evidence-Supported Investigative Path
              </label>
              <label style={{ fontSize: "0.72rem", display: "flex", gap: "4px", alignItems: "center" }}>
                <input
                  type="radio"
                  name="pathMode"
                  checked={pathMode === "topological"}
                  onChange={() => setPathMode("topological")}
                />
                Topological Shortest Path
              </label>
              <button onClick={handleTracePath} style={styles.primaryBtn}>
                COMPUTE PATH
              </button>
            </div>

            {pathResult && (
              <div style={styles.pathResultContainer}>
                <div style={{ ...styles.disclaimerBox, display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} /> {pathResult.epistemic_disclaimer}
                </div>
                <div style={{ marginTop: "8px" }}>
                  <strong>Type:</strong> {pathResult.path_type} • <strong>Hops:</strong> {pathResult.hop_count}
                </div>
                {pathResult.nodes && (
                  <div style={styles.pathNodeSequence}>
                    {pathResult.nodes.map((nid: string, idx: number) => (
                      <React.Fragment key={nid}>
                        <span style={styles.pathNodeBadge}>{nid}</span>
                        {idx < pathResult.nodes.length - 1 && <span style={{ color: "#64748b" }}>──▶</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                {pathResult.supporting_evidence && (
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "8px" }}>
                    Supporting Evidence ({pathResult.supporting_evidence.length}): {pathResult.supporting_evidence.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Entity Comparison Modal ─────────────────────────────────── */}
      {compareModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>MULTI-DIMENSIONAL ENTITY COMPARISON</h3>
              <button onClick={() => setCompareModalOpen(false)} style={styles.closeBtn} aria-label="Close modal"><X size={14} /></button>
            </div>

            <div style={{ display: "flex", gap: "10px", margin: "12px 0" }}>
              <input
                type="text"
                placeholder="Entity A (e.g. P001)"
                value={compareEntityA}
                onChange={(e) => setCompareEntityA(e.target.value.toUpperCase())}
                style={styles.modalInput}
              />
              <input
                type="text"
                placeholder="Entity B (e.g. P044)"
                value={compareEntityB}
                onChange={(e) => setCompareEntityB(e.target.value.toUpperCase())}
                style={styles.modalInput}
              />
              <button onClick={handleCompareEntities} style={styles.primaryBtn}>
                COMPARE
              </button>
            </div>

            {compareResult && (
              <div style={styles.compareGrid}>
                <div style={styles.compareCard}>
                  <div style={styles.compareCardTitle}>SHARED PHONES / DEVICES</div>
                  <div style={styles.compareValue}>
                    {compareResult.shared_dimensions?.shared_phones?.length || 0}
                  </div>
                  <div style={styles.compareList}>
                    {compareResult.shared_dimensions?.shared_phones?.join(", ") || "None"}
                  </div>
                </div>

                <div style={styles.compareCard}>
                  <div style={styles.compareCardTitle}>SHARED VEHICLES</div>
                  <div style={styles.compareValue}>
                    {compareResult.shared_dimensions?.shared_vehicles?.length || 0}
                  </div>
                  <div style={styles.compareList}>
                    {compareResult.shared_dimensions?.shared_vehicles?.join(", ") || "None"}
                  </div>
                </div>

                <div style={styles.compareCard}>
                  <div style={styles.compareCardTitle}>SHARED LOCATIONS</div>
                  <div style={styles.compareValue}>
                    {compareResult.shared_dimensions?.shared_locations?.length || 0}
                  </div>
                  <div style={styles.compareList}>
                    {compareResult.shared_dimensions?.shared_locations?.join(", ") || "None"}
                  </div>
                </div>

                <div style={styles.compareCard}>
                  <div style={styles.compareCardTitle}>EVIDENCE OVERLAP</div>
                  <div style={styles.compareValue}>
                    {compareResult.shared_dimensions?.shared_evidence_count || 0}
                  </div>
                  <div style={styles.compareList}>
                    {compareResult.shared_dimensions?.shared_evidence_refs?.join(", ") || "None"}
                  </div>
                </div>

                <div style={{ ...styles.disclaimerBox, gridColumn: "1 / -1" }}>
                  ℹ {compareResult.epistemic_disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Evidence Thread Modal ───────────────────────────────────── */}
      {evidenceThreadModalOpen && evidenceThread && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>UNBROKEN EVIDENCE THREAD LINEAGE</h3>
              <button onClick={() => setEvidenceThreadModalOpen(false)} style={styles.closeBtn} aria-label="Close modal"><X size={14} /></button>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: "12px" }}>
                Target: <strong>{evidenceThread.object_id}</strong> ({evidenceThread.relationship_type || evidenceThread.object_type})
              </div>

              <div style={styles.threadStages}>
                {evidenceThread.stages?.map((st: any) => (
                  <div key={st.stage_order} style={styles.threadStageCard}>
                    <div style={styles.stageHeader}>
                      <span style={styles.stageOrder}>STAGE {st.stage_order}</span>
                      <span style={styles.stageName}>{st.stage_name}</span>
                      <span style={styles.stageBadge}>{st.epistemic_level}</span>
                    </div>
                    <div style={styles.stageId}>{st.identifier}</div>
                    <div style={styles.stageDesc}>{st.description}</div>
                    {st.sha256 && (
                      <div style={styles.stageHash}>SHA-256: {st.sha256.slice(0, 24)}...</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
    fontFamily: "var(--font-sans)",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px",
    background: "#0f172a",
    borderBottom: "1px solid #1e293b",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 12px",
    background: "#090d16",
    borderBottom: "1px solid #1e293b",
    fontSize: "0.68rem",
    gap: "10px",
  },
  title: {
    fontSize: "0.74rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#e2e8f0",
  },
  countBadge: {
    fontSize: "0.62rem",
    background: "#1e293b",
    color: "#94a3b8",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: "0.60rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  searchInput: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#f8fafc",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "0.70rem",
    width: "100%",
    outline: "none",
  },
  clearBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.75rem",
  },
  navBtn: {
    fontSize: "0.62rem",
    padding: "2px 6px",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 600,
  },
  actionBtn: {
    fontSize: "0.62rem",
    padding: "2px 6px",
    background: "transparent",
    border: "1px solid #334155",
    color: "#cbd5e1",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 600,
  },
  resetBtn: {
    fontSize: "0.60rem",
    padding: "2px 5px",
    background: "#33415540",
    border: "1px solid #475569",
    color: "#94a3b8",
    borderRadius: "3px",
    cursor: "pointer",
  },
  filterBtn: {
    fontSize: "0.60rem",
    padding: "1px 5px",
    borderRadius: "3px",
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 600,
  },
  unhideBtn: {
    fontSize: "0.58rem",
    padding: "1px 6px",
    borderRadius: "3px",
    border: "1px solid #38bdf8",
    background: "#38bdf820",
    color: "#38bdf8",
    cursor: "pointer",
    fontWeight: 700,
  },
  focusBanner: {
    background: "#0369a130",
    borderBottom: "1px solid #0284c760",
    color: "#e0f2fe",
    padding: "6px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.70rem",
  },
  focusActionBtn: {
    fontSize: "0.60rem",
    padding: "2px 6px",
    background: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontWeight: 700,
  },
  staleNotice: {
    background: "#854d0e25",
    color: "#fde047",
    padding: "5px 12px",
    fontSize: "0.70rem",
    borderBottom: "1px solid #ca8a0450",
  },
  canvasGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    padding: "10px",
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
    fontSize: "0.66rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.08em",
    marginBottom: "6px",
    display: "flex",
    justifyContent: "space-between",
  },
  scrollList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  nodeCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderLeftWidth: "4px",
    borderRadius: "5px",
    padding: "6px 9px",
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
    fontSize: "0.60rem",
    fontWeight: 800,
    color: "#64748b",
  },
  epistemicTag: {
    fontSize: "0.56rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  riskBadge: {
    fontSize: "0.56rem",
    fontWeight: 800,
    color: "#ef4444",
    background: "#ef444420",
    padding: "1px 4px",
    borderRadius: "3px",
  },
  nodeLabel: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#f1f5f9",
  },
  nodeId: {
    fontSize: "0.62rem",
    color: "#64748b",
    fontFamily: "monospace",
    marginTop: "2px",
  },
  temporalText: {
    fontSize: "0.60rem",
    color: "#94a3b8",
    marginTop: "2px",
  },
  cardActions: {
    display: "flex",
    gap: "4px",
    marginTop: "6px",
    paddingTop: "4px",
    borderTop: "1px solid #1e293b40",
  },
  cardActionBtn: {
    fontSize: "0.55rem",
    padding: "1px 4px",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "2px",
    cursor: "pointer",
    fontWeight: 600,
  },
  edgeCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "5px",
    padding: "6px 9px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  edgeCardSelected: {
    background: "#1e293b",
    borderColor: "#38bdf8",
  },
  edgeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3px",
  },
  edgeType: {
    fontSize: "0.64rem",
    fontWeight: 700,
    color: "#38bdf8",
  },
  corrobTag: {
    fontSize: "0.55rem",
    padding: "1px 4px",
    borderRadius: "2px",
    fontWeight: 700,
  },
  edgeLink: {
    fontSize: "0.74rem",
    color: "#cbd5e1",
    marginBottom: "3px",
  },
  evidenceRefs: {
    fontSize: "0.62rem",
    color: "#64748b",
  },
  contradictionAlert: {
    marginTop: "3px",
    fontSize: "0.62rem",
    color: "#f87171",
    background: "#450a0a40",
    padding: "2px 5px",
    borderRadius: "3px",
    border: "1px solid #ef444440",
  },
  edgeActionStrip: {
    display: "flex",
    gap: "6px",
    marginTop: "6px",
    paddingTop: "4px",
    borderTop: "1px solid #1e293b40",
  },
  edgeActionBtn: {
    fontSize: "0.55rem",
    padding: "1px 5px",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "2px",
    cursor: "pointer",
    fontWeight: 600,
  },
  legendStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 12px",
    background: "#090d16",
    borderTop: "1px solid #1e293b",
    fontSize: "0.60rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    width: "560px",
    maxWidth: "92vw",
    padding: "16px",
    color: "#f8fafc",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "8px",
  },
  modalTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#38bdf8",
    margin: 0,
    letterSpacing: "0.04em",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  modalInput: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#f8fafc",
    padding: "5px 8px",
    borderRadius: "4px",
    fontSize: "0.72rem",
  },
  primaryBtn: {
    background: "#0284c7",
    color: "#fff",
    border: "none",
    padding: "5px 12px",
    borderRadius: "4px",
    fontSize: "0.70rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  pathResultContainer: {
    marginTop: "12px",
    padding: "10px",
    background: "#090d16",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    fontSize: "0.72rem",
  },
  disclaimerBox: {
    background: "#854d0e20",
    border: "1px solid #ca8a0440",
    color: "#fde047",
    padding: "6px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    lineHeight: 1.3,
  },
  pathNodeSequence: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "10px 0",
    flexWrap: "wrap",
  },
  pathNodeBadge: {
    background: "#1e293b",
    border: "1px solid #38bdf8",
    color: "#38bdf8",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.70rem",
  },
  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "12px",
  },
  compareCard: {
    background: "#090d16",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "8px",
  },
  compareCardTitle: {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "#64748b",
    marginBottom: "4px",
  },
  compareValue: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#38bdf8",
  },
  compareList: {
    fontSize: "0.65rem",
    color: "#94a3b8",
    marginTop: "4px",
  },
  threadStages: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "360px",
    overflowY: "auto",
  },
  threadStageCard: {
    background: "#090d16",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "8px",
  },
  stageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  stageOrder: {
    fontSize: "0.58rem",
    fontWeight: 800,
    color: "#64748b",
  },
  stageName: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  stageBadge: {
    fontSize: "0.58rem",
    fontWeight: 700,
    color: "#10b981",
  },
  stageId: {
    fontSize: "0.65rem",
    fontFamily: "monospace",
    color: "#38bdf8",
  },
  stageDesc: {
    fontSize: "0.66rem",
    color: "#cbd5e1",
    marginTop: "2px",
  },
  stageHash: {
    fontSize: "0.58rem",
    color: "#10b981",
    fontFamily: "monospace",
    marginTop: "3px",
  },
};

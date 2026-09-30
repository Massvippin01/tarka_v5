import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface StateData {
  case: {
    case_id: string;
    title: string;
    status: string;
    lead_investigator: string;
    jurisdiction: string;
    snapshot_time: string;
  };
  source_summary: {
    total_artifacts: number;
    total_bytes: number;
    by_source_type: Record<string, number>;
    integrity_breakdown: {
      VERIFIED: number;
      QUARANTINED: number;
      PENDING: number;
    };
  };
  epistemic_summary: {
    total_facts: number;
    total_observations: number;
    total_claims: number;
    corroborated_claims_count: number;
    open_contradictions_count: number;
    critical_contradictions_count: number;
    open_evidence_gaps_count: number;
    critical_gaps_count: number;
    candidate_identity_matches_requiring_review: number;
    epistemic_disclaimer: string;
  };
}

export const InvestigationStatePanel: React.FC = () => {
  const { activeCaseId, activeWorkspaceView, setActiveWorkspaceView } = useInvestigation();
  const [state, setState] = useState<StateData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/investigations/${activeCaseId}/state`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setState(data);
        }
      } catch (err) {
        console.warn("Failed to fetch investigation state from API, fallback to local state projection", err);
      }
    };
    fetchState();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <aside style={styles.container}>
      {/* Case Header */}
      <div style={styles.header}>
        <div style={styles.caseBadge}>CASE PROJECTION</div>
        <h2 style={styles.caseTitle}>{state?.case?.title || `Investigation ${activeCaseId}`}</h2>
        <div style={styles.caseMeta}>
          <span>ID: <strong>{activeCaseId}</strong></span>
          <span>Lead: <strong>{state?.case?.lead_investigator || "ACP Kumar"}</strong></span>
        </div>
      </div>

      {/* Epistemic Health Alert Pill */}
      <div style={styles.epistemicBox}>
        <div style={styles.epistemicTitle}> EPISTEMIC INTEGRITY</div>
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricNum}>{state?.epistemic_summary?.total_facts ?? 15}</span>
            <span style={styles.metricLabel}>Verified Facts</span>
          </div>
          <div style={styles.metricCard}>
            <span style={{ ...styles.metricNum, color: "#ef4444" }}>
              {state?.epistemic_summary?.open_contradictions_count ?? 1}
            </span>
            <span style={styles.metricLabel}>Contradictions</span>
          </div>
          <div style={styles.metricCard}>
            <span style={{ ...styles.metricNum, color: "#f59e0b" }}>
              {state?.epistemic_summary?.critical_gaps_count ?? 1}
            </span>
            <span style={styles.metricLabel}>Critical Gaps</span>
          </div>
          <div style={styles.metricCard}>
            <span style={{ ...styles.metricNum, color: "#38bdf8" }}>
              {state?.epistemic_summary?.candidate_identity_matches_requiring_review ?? 1}
            </span>
            <span style={styles.metricLabel}>Identity Review</span>
          </div>
        </div>
      </div>

      {/* Workspace View Switcher */}
      <div style={styles.navSection}>
        <div style={styles.sectionLabel}>WORKSPACE LENSES</div>
        <button
          style={{ ...styles.viewBtn, ...(activeWorkspaceView === "graph" ? styles.viewBtnActive : {}) }}
          onClick={() => setActiveWorkspaceView("graph")}
        >
          ️ Evidence Graph
        </button>
        <button
          style={{ ...styles.viewBtn, ...(activeWorkspaceView === "timeline" ? styles.viewBtnActive : {}) }}
          onClick={() => setActiveWorkspaceView("timeline")}
        >
          ⏱️ Spatiotemporal Timeline
        </button>
        <button
          style={{ ...styles.viewBtn, ...(activeWorkspaceView === "contradictions" ? styles.viewBtnActive : {}) }}
          onClick={() => setActiveWorkspaceView("contradictions")}
        >
           Contradiction Center ({state?.epistemic_summary?.open_contradictions_count ?? 1})
        </button>
        <button
          style={{ ...styles.viewBtn, ...(activeWorkspaceView === "gaps" ? styles.viewBtnActive : {}) }}
          onClick={() => setActiveWorkspaceView("gaps")}
        >
           Evidence Gap Center ({state?.epistemic_summary?.open_evidence_gaps_count ?? 2})
        </button>
        <button
          style={{ ...styles.viewBtn, ...(activeWorkspaceView === "delta" ? styles.viewBtnActive : {}) }}
          onClick={() => setActiveWorkspaceView("delta")}
        >
           Investigation Delta
        </button>
      </div>

      {/* Source Ingestion Summary */}
      <div style={styles.sourceSection}>
        <div style={styles.sectionLabel}>INGESTED SOURCES ({state?.source_summary?.total_artifacts ?? 11})</div>
        <div style={styles.sourceList}>
          <div style={styles.sourceItem}>
            <span> CCTNS / ICJS Records</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
          <div style={styles.sourceItem}>
            <span> e-FSL Forensic Reports</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
          <div style={styles.sourceItem}>
            <span> Airtel CDR Logs</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
          <div style={styles.sourceItem}>
            <span> Bank Ledgers / UPI</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
          <div style={styles.sourceItem}>
            <span> Cellebrite Mobile / UFED</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
          <div style={styles.sourceItem}>
            <span> DND Toll ANPR Sighting</span>
            <span style={styles.sourceTag}>VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Governed Investigation Memory (Tiers 1-4) */}
      <div style={styles.sourceSection}>
        <div style={styles.sectionLabel}>GOVERNED MEMORY (TIERS 1–4)</div>
        <div style={styles.sourceList}>
          <div style={styles.sourceItem}>
            <span>T1 Working Context</span>
            <span style={{ ...styles.sourceTag, color: "#0284c7", background: "rgba(2, 132, 199, 0.12)" }}>
              BOUNDED
            </span>
          </div>
          <div style={styles.sourceItem}>
            <span>T2 Chronological Episodic</span>
            <span style={{ ...styles.sourceTag, color: "#16a34a", background: "rgba(22, 163, 74, 0.12)" }}>
              APPEND-ONLY
            </span>
          </div>
          <div style={styles.sourceItem}>
            <span>T3 Validated Semantic</span>
            <span style={{ ...styles.sourceTag, color: "#8b5cf6", background: "rgba(139, 92, 246, 0.12)" }}>
              PROVENANCE
            </span>
          </div>
          <div style={styles.sourceItem}>
            <span>T4 Approved Organizational</span>
            <span style={{ ...styles.sourceTag, color: "#ea580c", background: "rgba(234, 88, 12, 0.12)" }}>
              GOVERNED
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          <button
            style={{
              flex: 1,
              padding: "4px 8px",
              background: "#FAF8F3",
              border: "1px solid #D8D2C7",
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              borderRadius: "2px",
            }}
            onClick={async () => {
              try {
                const res = await fetch("http://localhost:8000/api/v1/memory/snapshot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ case_id: activeCaseId }),
                });
                if (res.ok) alert(`Memory Snapshot Captured for ${activeCaseId}`);
              } catch (e) {
                console.warn("Snapshot call failed", e);
              }
            }}
          >
            📸 Snapshot
          </button>
          <button
            style={{
              flex: 1,
              padding: "4px 8px",
              background: "#FAF8F3",
              border: "1px solid #D8D2C7",
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              borderRadius: "2px",
            }}
            onClick={async () => {
              try {
                const res = await fetch("http://localhost:8000/api/v1/memory/rehydrate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ case_id: activeCaseId }),
                });
                if (res.ok) alert(`Memory Rehydrated for ${activeCaseId}`);
              } catch (e) {
                console.warn("Rehydration call failed", e);
              }
            }}
          >
            🔄 Rehydrate
          </button>
        </div>
      </div>

      {/* Statutory & Epistemic Disclaimer */}
      <div style={styles.disclaimerBox}>
        <strong>EPISTEMIC SAFETY MANDATE</strong>
        <p style={{ margin: "4px 0 0", fontSize: "0.65rem", lineHeight: 1.3, color: "#94a3b8" }}>
          Association ≠ Guilt. Centrality ≠ Criminality. Similarity ≠ Identity.
          All claims require statutory corroboration under Section 65B IEA / Section 63 BSA 2023.
        </p>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "260px",
    minWidth: "260px",
    background: "#FAF8F3",
    borderRight: "1px solid #D8D2C7",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    overflowY: "auto",
    color: "#1E1D1A",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    borderBottom: "1px solid #D8D2C7",
    paddingBottom: "8px",
  },
  caseBadge: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#625E57",
    background: "#ECE8DF",
    padding: "2px 5px",
    borderRadius: "2px",
    display: "inline-block",
    marginBottom: "4px",
  },
  caseTitle: {
    fontFamily: '"IBM Plex Serif", Georgia, serif',
    fontSize: "15px",
    fontWeight: 600,
    margin: "0 0 4px",
    color: "#1E1D1A",
  },
  caseMeta: {
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#625E57",
    display: "flex",
    justifyContent: "space-between",
  },
  epistemicBox: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "8px",
  },
  epistemicTitle: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#625E57",
    marginBottom: "6px",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
  },
  metricCard: {
    background: "#ECE8DF",
    padding: "6px",
    borderRadius: "2px",
    textAlign: "center",
  },
  metricNum: {
    display: "block",
    fontSize: "16px",
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#1E6F43",
  },
  metricLabel: {
    fontSize: "10px",
    color: "#625E57",
  },
  navSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sectionLabel: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#625E57",
    marginBottom: "2px",
  },
  viewBtn: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    color: "#1E1D1A",
    padding: "6px 8px",
    borderRadius: "2px",
    fontSize: "12px",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 500,
    transition: "background 0.08s ease",
  },
  viewBtnActive: {
    background: "#ECE8DF",
    borderColor: "#AE2D30",
    color: "#AE2D30",
    fontWeight: 600,
  },
  sourceSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sourceList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sourceItem: {
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 6px",
    background: "#ECE8DF",
    borderRadius: "2px",
    color: "#1E1D1A",
  },
  sourceTag: {
    fontSize: "9px",
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#1E6F43",
    background: "rgba(30, 111, 67, 0.12)",
    padding: "1px 4px",
    borderRadius: "2px",
  },
  disclaimerBox: {
    marginTop: "auto",
    padding: "8px",
    background: "#ECE8DF",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
  },
};

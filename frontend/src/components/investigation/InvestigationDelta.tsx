import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface DeltaData {
  case_id: string;
  delta_timestamp: string;
  semantics: string;
  new_entities: Array<{ entity_id: string; display_name: string; type: string }>;
  new_relationships: Array<{ relationship_id: string; source: string; target: string; type: string }>;
  claim_status_changes: Array<{ claim_id: string; assertion_text: string; current_status: string; corroboration: string }>;
  new_contradictions: Array<{ contradiction_id: string; type: string; severity: string; status: string; reason: string }>;
  new_evidence_gaps: Array<{ gap_id: string; type: string; title: string; severity: string }>;
  hypothesis_impact: Array<{ hypothesis_id: string; code: string; title: string; supporting_facts_added: number; open_gaps_affecting: number }>;
  append_only_notice: string;
}

export const InvestigationDelta: React.FC = () => {
  const { activeCaseId } = useInvestigation();
  const [delta, setDelta] = useState<DeltaData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDelta = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/investigations/${activeCaseId}/delta`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDelta(data);
        }
      } catch (err) {
        console.warn("Using fallback local delta projection", err);
      }
    };
    fetchDelta();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={styles.badge}>APPEND-ONLY DELTA</span>
          <span style={styles.title}> INVESTIGATION DIFFERENTIAL & STATE TRANSITIONS</span>
        </div>
        <div style={styles.notice}>{delta?.append_only_notice || "Evidence is immutable. Zero deletions."}</div>
      </div>

      {/* Grid of Delta Columns */}
      <div style={styles.grid}>
        {/* Claim Transitions */}
        <div style={styles.col}>
          <div style={styles.colTitle}>CLAIM STATUS TRANSITIONS</div>
          <div style={styles.itemList}>
            {delta?.claim_status_changes?.map((c) => (
              <div key={c.claim_id} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <span style={styles.statusTag}>{c.current_status}</span>
                  <span style={styles.corrobTag}>{c.corroboration}</span>
                </div>
                <div style={styles.itemText}>{c.assertion_text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* New Contradictions */}
        <div style={styles.col}>
          <div style={styles.colTitle}>ACTIVE CONTRADICTIONS DETECTED</div>
          <div style={styles.itemList}>
            {delta?.new_contradictions?.map((ct) => (
              <div key={ct.contradiction_id} style={{ ...styles.itemCard, borderLeftColor: "#ef4444" }}>
                <div style={styles.itemHeader}>
                  <span style={{ ...styles.statusTag, color: "#ef4444" }}>{ct.severity}</span>
                  <span style={styles.corrobTag}>{ct.type}</span>
                </div>
                <div style={styles.itemText}>{ct.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Gaps */}
        <div style={styles.col}>
          <div style={styles.colTitle}>EVIDENCE GAPS IDENTIFIED</div>
          <div style={styles.itemList}>
            {delta?.new_evidence_gaps?.map((g) => (
              <div key={g.gap_id} style={{ ...styles.itemCard, borderLeftColor: "#f59e0b" }}>
                <div style={styles.itemHeader}>
                  <span style={{ ...styles.statusTag, color: "#f59e0b" }}>{g.severity}</span>
                  <span style={styles.corrobTag}>{g.type}</span>
                </div>
                <div style={styles.itemText}>{g.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hypothesis Impact */}
        <div style={styles.col}>
          <div style={styles.colTitle}>HYPOTHESIS IMPACT</div>
          <div style={styles.itemList}>
            {delta?.hypothesis_impact?.map((h) => (
              <div key={h.hypothesis_id} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <span style={styles.statusTag}>{h.code}</span>
                  <span style={styles.corrobTag}>Affecting Gaps: {h.open_gaps_affecting}</span>
                </div>
                <div style={styles.itemText}>{h.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "240px",
    minHeight: "240px",
    background: "#090d16",
    borderTop: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    padding: "10px 14px",
    boxSizing: "border-box",
    color: "#f8fafc",
    fontFamily: "var(--font-sans)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "6px",
  },
  badge: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#38bdf8",
    background: "#0369a120",
    padding: "2px 6px",
    borderRadius: "3px",
  },
  title: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  notice: {
    fontSize: "0.65rem",
    color: "#94a3b8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "10px",
    flex: 1,
    overflow: "hidden",
  },
  col: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  colTitle: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.08em",
    marginBottom: "4px",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
    paddingRight: "2px",
  },
  itemCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderLeftWidth: "3px",
    borderLeftColor: "#38bdf8",
    borderRadius: "4px",
    padding: "6px 8px",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2px",
  },
  statusTag: {
    fontSize: "0.58rem",
    fontWeight: 800,
    color: "#38bdf8",
  },
  corrobTag: {
    fontSize: "0.55rem",
    color: "#94a3b8",
  },
  itemText: {
    fontSize: "0.7rem",
    color: "#cbd5e1",
    lineHeight: 1.25,
  },
};

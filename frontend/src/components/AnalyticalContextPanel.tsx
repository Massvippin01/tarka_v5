import React, { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from "../api/client";
import { useInvestigation } from "../context/InvestigationContext";

interface AnalyticalContextPanelProps {
  caseId: string;
  onSelectEntity?: (id: string) => void;
}

export const AnalyticalContextPanel: React.FC<AnalyticalContextPanelProps> = ({ caseId, onSelectEntity }) => {
  const { selectEntity, selectEvidence, selectRelationship, runCopilotQuery } = useInvestigation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  useEffect(() => {
    async function fetchSignals() {
      setLoading(true);
      try {
        const res = await axios.get(apiUrl(`/api/v1/investigation/analytics/signals/${caseId}`));
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, [caseId]);

  if (loading) {
    return <div style={styles.loading}>Calculating multi-dimensional analytical signals...</div>;
  }

  if (!data || !data.signals) {
    return <div style={styles.empty}>No analytical signals found for case {caseId}.</div>;
  }

  const filteredSignals = activeCategory === "ALL"
    ? data.signals
    : data.signals.filter((s: any) => s.signal_type === activeCategory);

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "#f43f5e";
      case "HIGH": return "#f97316";
      case "MEDIUM": return "#eab308";
      default: return "#38bdf8";
    }
  };

  return (
    <div style={styles.container}>
      {/* Sub-Category Filter Bar */}
      <div style={styles.categoryBar}>
        {["ALL", "NETWORK", "CROSS_CASE", "TEMPORAL", "MOBILITY", "FINANCIAL"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              ...styles.catBtn,
              ...(activeCategory === cat ? styles.catActive : {}),
            }}
          >
            {cat.replace("_", "-")}
          </button>
        ))}
      </div>

      <div style={styles.signalList}>
        {filteredSignals.map((sig: any) => {
          const sevColor = getSeverityColor(sig.severity);
          return (
            <div key={sig.signal_id} style={styles.signalCard}>
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <span style={{ ...styles.sevBadge, background: `${sevColor}22`, color: sevColor, borderColor: `${sevColor}44` }}>
                  {sig.severity}
                </span>
                <span style={styles.signalType}>{sig.signal_type}</span>
                <span style={styles.confText}>
                  {(sig.confidence * 100).toFixed(0)}% ({sig.epistemic_status})
                </span>
              </div>

              {/* Title & Description */}
              <div style={styles.title}>{sig.title}</div>
              <div style={styles.description}>{sig.description}</div>

              {/* Method & Sources */}
              <div style={styles.metaRow}>
                <span>Method: <code>{sig.analytical_method}</code></span>
                <span>Sources: {sig.source_systems.join(", ")}</span>
              </div>

              {/* Evidence Citations */}
              {sig.evidence_references && sig.evidence_references.length > 0 && (
                <div style={styles.sectionBox}>
                  <div style={styles.sectionLabel}> SUPPORTING EVIDENCE:</div>
                  <div style={styles.chipRow}>
                    {sig.evidence_references.map((evId: string) => (
                      <button
                        key={evId}
                        style={styles.evChip}
                        onClick={() => selectEvidence(evId)}
                      >
                        {evId}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Gaps & Alternative Explanations */}
              {sig.evidence_gaps && sig.evidence_gaps.length > 0 && (
                <div style={styles.gapText}>
                   <strong>EVIDENCE GAP:</strong> {sig.evidence_gaps[0]}
                </div>
              )}

              {sig.alternative_explanations && sig.alternative_explanations.length > 0 && (
                <div style={styles.altText}>
                   <strong>ALTERNATIVE HYPOTHESIS:</strong> {sig.alternative_explanations[0]}
                </div>
              )}

              <div style={styles.verifyText}>
                 <strong>RECOMMENDED ACTION:</strong> {sig.recommended_verification}
              </div>

              {/* Quick Action Buttons */}
              <div style={styles.actionRow}>
                {sig.subject_entities && sig.subject_entities.length > 0 && (
                  <button
                    style={styles.actionBtn}
                    onClick={() => {
                      const targetId = sig.subject_entities[0];
                      if (onSelectEntity) onSelectEntity(targetId);
                      else selectEntity(targetId);
                    }}
                  >
                     OPEN DOSSIER
                  </button>
                )}
                <button
                  style={styles.actionBtn}
                  onClick={() => selectRelationship("rel-p1-p2")}
                >
                   WHY? INSPECTION
                </button>
                <button
                  style={styles.copilotBtn}
                  onClick={() => runCopilotQuery(`Explain analytical signal ${sig.signal_id}: ${sig.title}`)}
                >
                   ASK COPILOT
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#070a0f",
  },
  loading: {
    color: "#38bdf8",
    fontSize: "0.78rem",
    padding: "16px",
    textAlign: "center",
  },
  empty: {
    color: "#64748b",
    fontSize: "0.78rem",
    padding: "16px",
    textAlign: "center",
  },
  categoryBar: {
    display: "flex",
    gap: "4px",
    overflowX: "auto",
    paddingBottom: "4px",
  },
  catBtn: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#94a3b8",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "3px 6px",
    borderRadius: "4px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  catActive: {
    background: "rgba(56, 189, 248, 0.2)",
    color: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  signalList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  signalCard: {
    background: "#0a0f18",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sevBadge: {
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid transparent",
  },
  signalType: {
    color: "#94a3b8",
    fontSize: "0.65rem",
    fontWeight: 700,
  },
  confText: {
    color: "#34d399",
    fontSize: "0.65rem",
    fontWeight: 700,
    marginLeft: "auto",
  },
  title: {
    color: "#f8fafc",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  description: {
    color: "#cbd5e1",
    fontSize: "0.75rem",
    lineHeight: "1.4",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: "0.65rem",
  },
  sectionBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sectionLabel: {
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 700,
  },
  chipRow: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  evChip: {
    background: "rgba(56, 189, 248, 0.12)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    fontSize: "0.65rem",
    padding: "2px 6px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  gapText: {
    color: "#fde047",
    fontSize: "0.68rem",
    background: "rgba(234, 179, 8, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  altText: {
    color: "#a7f3d0",
    fontSize: "0.68rem",
    background: "rgba(16, 185, 129, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  verifyText: {
    color: "#94a3b8",
    fontSize: "0.68rem",
    fontStyle: "italic",
  },
  actionRow: {
    display: "flex",
    gap: "6px",
    marginTop: "4px",
  },
  actionBtn: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f8fafc",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  copilotBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    cursor: "pointer",
    marginLeft: "auto",
  },
};

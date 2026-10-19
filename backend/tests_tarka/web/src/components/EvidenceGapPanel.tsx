import React, { useEffect, useState } from "react";
import axios from "axios";

interface EvidenceGapPanelProps {
  caseId: string;
  onSelectEntity?: (id: string) => void;
}

export const EvidenceGapPanel: React.FC<EvidenceGapPanelProps> = ({
  caseId,
  onSelectEntity,
}) => {
  const [gapsData, setGapsData] = useState<any>(null);
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("gaps");

  useEffect(() => {
    async function loadGapIntelligence() {
      try {
        const [gRes, hRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/v1/investigation/evidence-gaps/${caseId}`),
          axios.get(`http://localhost:8000/api/v1/investigation/hypotheses/${caseId}`),
        ]);
        setGapsData(gRes.data);
        setHypotheses(hRes.data.hypotheses || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadGapIntelligence();
  }, [caseId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>PRIMARY NOVELTY #2 — EVIDENCE GAP & CONTRADICTION INTELLIGENCE</div>
          <h3 style={{ color: "#f8fafc", margin: "2px 0 0" }}>Case {caseId} Analytical Challenge Panel</h3>
        </div>
        <div style={styles.navBtns}>
          <button
            onClick={() => setActiveTab("gaps")}
            style={{ ...styles.tabBtn, ...(activeTab === "gaps" ? styles.tabActive : {}) }}
          >
            EVIDENCE GAPS & CONTRADICTIONS
          </button>
          <button
            onClick={() => setActiveTab("hypotheses")}
            style={{ ...styles.tabBtn, ...(activeTab === "hypotheses" ? styles.tabActive : {}) }}
          >
            HYPOTHESIS WORKSPACE (H1 / H2 / H3)
          </button>
        </div>
      </div>

      {/* Tab 1: Gaps & Contradictions */}
      {activeTab === "gaps" && (
        <div style={styles.grid2}>
          {/* Evidence Gaps */}
          <div style={styles.card}>
            <h4> IDENTIFIED EVIDENCE GAPS ({gapsData?.evidence_gaps?.length || 0})</h4>
            <div style={styles.gapList}>
              {gapsData?.evidence_gaps?.map((gap: any) => (
                <div key={gap.gap_id} style={styles.gapItem}>
                  <div style={styles.gapHeader}>
                    <span style={styles.gapTitle}>{gap.title}</span>
                    <span style={styles.sevBadge}>{gap.severity}</span>
                  </div>
                  <p style={styles.desc}>{gap.description}</p>
                  <div onClick={() => onSelectEntity?.(gap.target_entity_id)} style={{ ...styles.kv, cursor: "pointer", color: "#38bdf8" }}>
                    <strong>Target Entity:</strong> {gap.target_entity_id} (Click to open Dossier)
                  </div>
                  <div style={styles.kv}>
                    <strong>Why It Matters:</strong> {gap.why_it_matters}
                  </div>
                  <div style={styles.kv}>
                    <strong>Current Impact:</strong> {gap.current_impact}
                  </div>
                  <div style={styles.actionBox}>
                     <strong>Recommended Verification:</strong> {gap.next_verification}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spatial & Temporal Contradictions */}
          <div style={styles.card}>
            <h4> CONTRADICTORY OBSERVATIONS ({gapsData?.contradictions?.length || 0})</h4>
            <div style={styles.gapList}>
              {gapsData?.contradictions?.map((c: any) => (
                <div key={c.contradiction_id} style={styles.contradictionItem}>
                  <div style={styles.cTitle}>{c.title}</div>
                  <div style={styles.obsBox}>
                    <div>• <strong>Obs A:</strong> {c.observation_a_desc}</div>
                    <div>• <strong>Obs B:</strong> {c.observation_b_desc}</div>
                  </div>
                  <div style={styles.conflictDesc}>
                    <strong>Conflict Reason:</strong> {c.conflict_reason}
                  </div>
                  <div style={styles.statusTag}>Status: {c.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Competing Hypothesis Evaluation */}
      {activeTab === "hypotheses" && (
        <div style={styles.hypoGrid}>
          {hypotheses.map((h) => (
            <div
              key={h.hypothesis_id}
              style={{
                ...styles.hypoCard,
                ...(h.status === "PRIMARY_HYPOTHESIS" ? styles.hypoPrimary : {}),
              }}
            >
              <div style={styles.hypoHeader}>
                <span style={styles.codeBadge}>{h.code}</span>
                <span style={styles.hypoTitle}>{h.title}</span>
                <span style={styles.confText}>{(h.confidence * 100).toFixed(0)}% Confidence</span>
              </div>
              <p style={styles.hypoDesc}>{h.description}</p>

              <div style={styles.evidenceMatrix}>
                <div style={styles.matrixCol}>
                  <div style={styles.mHeaderSuccess}>SUPPORTS ({h.supporting_evidence?.length || 0})</div>
                  {h.supporting_evidence?.map((item: any, i: number) => (
                    <div key={i} style={styles.mItem}>• {item.description}</div>
                  ))}
                </div>

                <div style={styles.matrixCol}>
                  <div style={styles.mHeaderDanger}>CONTRADICTS ({h.contradicting_evidence?.length || 0})</div>
                  {h.contradicting_evidence?.map((item: any, i: number) => (
                    <div key={i} style={styles.mItemDanger}>• {item.description}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    background: "#070a0f",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0f172a",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: "#eab308",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "1px",
  },
  navBtns: {
    display: "flex",
    gap: "8px",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  tabActive: {
    background: "rgba(234, 179, 8, 0.15)",
    color: "#fde047",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  gapList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  gapItem: {
    background: "#070a0f",
    border: "1px solid rgba(234, 179, 8, 0.2)",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  gapHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gapTitle: {
    color: "#fde047",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  sevBadge: {
    background: "rgba(244, 63, 94, 0.2)",
    color: "#fda4af",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  desc: {
    color: "#cbd5e1",
    fontSize: "0.75rem",
    margin: 0,
  },
  kv: {
    color: "#94a3b8",
    fontSize: "0.72rem",
  },
  actionBox: {
    background: "rgba(56, 189, 248, 0.1)",
    color: "#38bdf8",
    fontSize: "0.72rem",
    padding: "8px",
    borderRadius: "4px",
    marginTop: "4px",
  },
  contradictionItem: {
    background: "#070a0f",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  cTitle: {
    color: "#fda4af",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  obsBox: {
    color: "#cbd5e1",
    fontSize: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  conflictDesc: {
    color: "#f43f5e",
    fontSize: "0.72rem",
  },
  statusTag: {
    color: "#94a3b8",
    fontSize: "0.65rem",
  },
  hypoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  hypoCard: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  hypoPrimary: {
    border: "1px solid rgba(52, 211, 153, 0.4)",
    boxShadow: "0 0 16px rgba(52, 211, 153, 0.1)",
  },
  hypoHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  codeBadge: {
    background: "#0284c7",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  hypoTitle: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "1rem",
    flex: 1,
  },
  confText: {
    color: "#34d399",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  hypoDesc: {
    color: "#94a3b8",
    fontSize: "0.78rem",
    margin: 0,
  },
  evidenceMatrix: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "6px",
  },
  matrixCol: {
    background: "#070a0f",
    padding: "10px",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  mHeaderSuccess: {
    color: "#34d399",
    fontSize: "0.68rem",
    fontWeight: 700,
  },
  mHeaderDanger: {
    color: "#f43f5e",
    fontSize: "0.68rem",
    fontWeight: 700,
  },
  mItem: {
    color: "#cbd5e1",
    fontSize: "0.72rem",
  },
  mItemDanger: {
    color: "#fda4af",
    fontSize: "0.72rem",
  },
};

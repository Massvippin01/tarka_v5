import React, { useEffect, useState } from "react";
import axios from "axios";

interface RelationshipInspectorProps {
  relId: string | null;
  onClose: () => void;
  onSelectEntity?: (id: string) => void;
}

export const RelationshipInspector: React.FC<RelationshipInspectorProps> = ({
  relId,
  onClose,
  onSelectEntity,
}) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadRelationship() {
      try {
        const idToFetch = relId || "rel-p1-p2";
        const res = await axios.get(`http://localhost:8000/api/v1/investigation/relationship-inspector/${idToFetch}`);
        setData(res.data);
      } catch (e) {
        console.error(e);
      }
    }
    if (relId) {
      loadRelationship();
    }
  }, [relId]);

  if (!relId || !data) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>PRIMARY NOVELTY #1 — RELATIONSHIP INTELLIGENCE</div>
            <h3 style={styles.title}>
              <span onClick={() => onSelectEntity?.(data.source_entity?.id || "P001")} style={{ cursor: "pointer", color: "#38bdf8" }}>
                {data.source_entity?.name || "P001"}
              </span>{" "}
              ↔{" "}
              <span onClick={() => onSelectEntity?.(data.target_entity?.id || "P044")} style={{ cursor: "pointer", color: "#38bdf8" }}>
                {data.target_entity?.name || "P044"}
              </span>
            </h3>
            <div style={styles.relType}>TYPE: {data.relationship_type || "CO_ACCUSED_WITH"}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Confidence & Epistemic Status Banner */}
        <div style={styles.statusBanner}>
          <div style={styles.confCard}>
            <span style={styles.lbl}>ANALYTICAL CONFIDENCE</span>
            <strong style={styles.confValue}>{(data.confidence * 100).toFixed(0)}%</strong>
            <span style={styles.badge}>{data.confidence_level || "INFERRED"}</span>
          </div>
          <div style={styles.confCard}>
            <span style={styles.lbl}>EPISTEMIC STATUS</span>
            <strong style={styles.statusValue}>{data.status || "INFERRED"}</strong>
            <span style={styles.subLbl}>Review: {data.review_status || "PENDING_INVESTIGATOR_REVIEW"}</span>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div style={styles.body}>
          {/* Supporting Evidence */}
          <div style={styles.section}>
            <h4>✅ SUPPORTING OBSERVATIONS & EVIDENCE ({data.supporting_observations?.length || 0})</h4>
            <div style={styles.list}>
              {data.supporting_observations?.map((obs: string, idx: number) => (
                <div key={idx} style={styles.itemSuccess}>
                  • {obs}
                </div>
              ))}
              {data.evidence_references?.map((ref: string, idx: number) => (
                <div key={idx} style={styles.evidenceChip}>
                  📋 Citation Ref: {ref}
                </div>
              ))}
            </div>
          </div>

          {/* Primary Novelty #2: Contradictory Observations */}
          <div style={styles.section}>
            <h4>⚠️ CONTRADICTORY OBSERVATIONS ({data.contradictory_observations?.length || 0})</h4>
            <div style={styles.list}>
              {data.contradictory_observations?.map((obs: string, idx: number) => (
                <div key={idx} style={styles.itemDanger}>
                  ❌ {obs}
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Explanation */}
          <div style={styles.section}>
            <h4>💡 ALTERNATIVE HYPOTHESIS & EXPLANATION</h4>
            <p style={styles.text}>{data.alternative_explanation || "Device or account may have been used by another co-conspirator during the event window."}</p>
          </div>

          {/* Evidence Gaps & Next Verification */}
          <div style={styles.section}>
            <h4>🔍 EVIDENCE GAP & NEXT VERIFICATION ACTION</h4>
            <div style={styles.gapBox}>
              <div style={styles.gapTitle}>CRITICAL GAP: {data.evidence_gaps?.[0] || "Unverified subscriber identity"}</div>
              <div style={styles.gapAction}>
                ⚡ <strong>Next Verification</strong>: {data.next_verification || "Verify subscriber/device association during relevant event window."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(4px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "600px",
    maxHeight: "85vh",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "1px",
  },
  title: {
    color: "#f8fafc",
    fontSize: "1.2rem",
    fontWeight: 700,
    margin: "4px 0 2px",
  },
  relType: {
    color: "#94a3b8",
    fontSize: "0.72rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  statusBanner: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    padding: "12px 20px",
    background: "#070a0f",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  confCard: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  lbl: {
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 700,
  },
  confValue: {
    color: "#34d399",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  statusValue: {
    color: "#38bdf8",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  subLbl: {
    color: "#94a3b8",
    fontSize: "0.65rem",
  },
  badge: {
    background: "rgba(52, 211, 153, 0.15)",
    color: "#34d399",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    width: "fit-content",
  },
  body: {
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  itemSuccess: {
    background: "rgba(16, 185, 129, 0.08)",
    borderLeft: "3px solid #34d399",
    color: "#e2e8f0",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "0.78rem",
  },
  itemDanger: {
    background: "rgba(244, 63, 94, 0.08)",
    borderLeft: "3px solid #f43f5e",
    color: "#fda4af",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "0.78rem",
  },
  evidenceChip: {
    color: "#38bdf8",
    fontSize: "0.72rem",
    background: "rgba(56, 189, 248, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    width: "fit-content",
  },
  text: {
    color: "#cbd5e1",
    fontSize: "0.78rem",
    lineHeight: "1.5",
    margin: 0,
    background: "#070a0f",
    padding: "10px",
    borderRadius: "6px",
  },
  gapBox: {
    background: "rgba(234, 179, 8, 0.08)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  gapTitle: {
    color: "#fde047",
    fontWeight: 700,
    fontSize: "0.78rem",
  },
  gapAction: {
    color: "#fef08a",
    fontSize: "0.75rem",
  },
};

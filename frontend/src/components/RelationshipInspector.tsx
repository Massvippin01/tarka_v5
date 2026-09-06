import React, { useEffect, useState } from "react";
import axios from "axios";

interface RelationshipInspectorProps {
  relId: string | null;
  onClose: () => void;
  onSelectEntity?: (id: string) => void;
  isInline?: boolean;
}

export const RelationshipInspector: React.FC<RelationshipInspectorProps> = ({
  relId,
  onClose,
  onSelectEntity,
  isInline = true,
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
    loadRelationship();
  }, [relId]);

  if (!data) {
    return (
      <div style={{ padding: "16px", color: "#94a3b8", fontSize: "0.78rem" }}>
        ⌛ Loading relationship intelligence explanation...
      </div>
    );
  }

  const content = (
    <div style={isInline ? styles.inlineContainer : styles.modal}>
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
        {!isInline && <button style={styles.closeBtn} onClick={onClose}>✕</button>}
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
  );

  if (isInline) {
    return content;
  }

  return <div style={styles.overlay}>{content}</div>;
};

const styles: Record<string, React.CSSProperties> = {
  inlineContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "transparent",
  },
  overlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(8, 16, 24, 0.75)",
    backdropFilter: "blur(4px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "600px",
    maxHeight: "85vh",
    background: "#0d1721",
    border: "1px solid #243342",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #243342",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    color: "#31c4d8",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "1px",
  },
  title: {
    color: "#f3f6f8",
    fontSize: "1.2rem",
    fontWeight: 700,
    margin: "4px 0 2px",
  },
  relType: {
    color: "#9baab7",
    fontSize: "0.72rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#9baab7",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  statusBanner: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    padding: "12px 20px",
    background: "#081018",
    borderBottom: "1px solid #243342",
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
    color: "#45c98a",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  statusValue: {
    color: "#31c4d8",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  subLbl: {
    color: "#9baab7",
    fontSize: "0.65rem",
  },
  badge: {
    background: "rgba(69, 201, 138, 0.15)",
    color: "#45c98a",
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
    background: "rgba(69, 201, 138, 0.08)",
    borderLeft: "3px solid #45c98a",
    color: "#f3f6f8",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "0.78rem",
  },
  itemDanger: {
    background: "rgba(226, 109, 120, 0.08)",
    borderLeft: "3px solid #e26d78",
    color: "#fca5a5",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "0.78rem",
  },
  evidenceChip: {
    color: "#31c4d8",
    fontSize: "0.72rem",
    background: "rgba(49, 196, 216, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    width: "fit-content",
  },
  text: {
    color: "#cbd5e1",
    fontSize: "0.78rem",
    lineHeight: "1.5",
    margin: 0,
    background: "#081018",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #243342",
  },
  gapBox: {
    background: "rgba(230, 184, 92, 0.08)",
    border: "1px solid rgba(230, 184, 92, 0.3)",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  gapTitle: {
    color: "#e6b85c",
    fontWeight: 700,
    fontSize: "0.78rem",
  },
  gapAction: {
    color: "#fef08a",
    fontSize: "0.75rem",
  },
};

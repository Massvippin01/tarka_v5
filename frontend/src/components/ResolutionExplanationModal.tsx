import React, { useEffect, useState } from "react";
import axios from "axios";

interface ResolutionExplanationModalProps {
  entityId: string;
  onClose: () => void;
  onConfirmMatch?: (candidateId: string) => void;
}

export const ResolutionExplanationModal: React.FC<ResolutionExplanationModalProps> = ({
  entityId,
  onClose,
  onConfirmMatch,
}) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLog, setActionLog] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:8000/api/v1/resolution/matches/${entityId}`);
        setMatches(res.data || []);
      } catch (err) {
        console.error("Failed to load resolution matches", err);
      } finally {
        setLoading(false);
      }
    }
    if (entityId) {
      loadMatches();
    }
  }, [entityId]);

  const handleDecision = async (candidateId: string, action: "CONFIRM" | "REJECT") => {
    try {
      await axios.post("http://localhost:8000/api/v1/investigation/verify-claim", {
        claim_id: `RESOLUTION_CLAIM_${entityId}_${candidateId}`,
        action: action === "CONFIRM" ? "VERIFIED" : "DISMISSED",
        investigator_notes: `Investigator manually ${action.toLowerCase()}ed entity resolution match between ${entityId} and ${candidateId}.`,
      });
      setActionLog(`Decision recorded: Match between ${entityId} and ${candidateId} set to ${action}ED.`);
      if (action === "CONFIRM" && onConfirmMatch) {
        onConfirmMatch(candidateId);
      }
    } catch (err) {
      console.error("Failed to record decision", err);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>9-STAGE LAYERED ENTITY RESOLUTION EXPLANATION</div>
            <h3 style={styles.title}>Resolution Candidates for Entity #{entityId}</h3>
            <p style={styles.subtitle}>ML Proposes → Evidence Verifies → Human Decides</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Safety Disclaimer */}
        <div style={styles.safetyBanner}>
          <span>⚖️ <strong>EPISTEMIC SAFETY GUARANTEE:</strong> Model confidence score indicates analytical similarity only. Similarity ≠ Identity. Human investigator approval is required to merge records.</span>
        </div>

        {actionLog && (
          <div style={styles.actionBanner}>
            ✅ {actionLog}
          </div>
        )}

        {/* Content Body */}
        <div style={styles.body}>
          {loading ? (
            <div style={{ color: "#94a3b8", padding: "20px", fontSize: "0.85rem" }}>
              ⌛ Executing 9-Stage Entity Resolution Pipeline...
            </div>
          ) : matches.length === 0 ? (
            <div style={{ color: "#94a3b8", padding: "20px", fontSize: "0.85rem" }}>
              No entity resolution candidates above 40% similarity threshold for #{entityId}.
            </div>
          ) : (
            matches.map((m, idx) => (
              <div key={idx} style={styles.candidateCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.candTitle}>Candidate: <strong>{m.candidate_display_name} ({m.candidate_entity_id})</strong></span>
                    <div style={styles.methodTag}>{m.resolution_method}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={styles.confScore}>{m.confidence_percentage}% Match</div>
                    <span style={styles.statusBadge}>{m.resolution_status}</span>
                  </div>
                </div>

                {/* Signals breakdown */}
                <div style={styles.signalGrid}>
                  {/* Supporting */}
                  <div style={styles.signalCol}>
                    <h5 style={{ color: "#34d399", margin: "0 0 6px" }}>
                      ✅ SUPPORTING SIGNALS ({m.supporting_signals?.length || 0})
                    </h5>
                    {m.supporting_signals?.map((sig: any, sIdx: number) => (
                      <div key={sIdx} style={styles.suppItem}>
                        <strong>[{sig.stage_name}]</strong> {sig.description}
                      </div>
                    ))}
                  </div>

                  {/* Contradicting */}
                  <div style={styles.signalCol}>
                    <h5 style={{ color: "#f87171", margin: "0 0 6px" }}>
                      ❌ CONTRADICTING SIGNALS ({m.contradicting_signals?.length || 0})
                    </h5>
                    {m.contradicting_signals?.length === 0 ? (
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>No conflicting signals detected.</div>
                    ) : (
                      m.contradicting_signals?.map((sig: any, cIdx: number) => (
                        <div key={cIdx} style={styles.contraItem}>
                          <strong>[{sig.stage_name}]</strong> {sig.description}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Evidence Citations */}
                <div style={styles.citationBox}>
                  <strong>Evidence Citations:</strong> {m.evidence_references?.join(", ") || "CCTNS Dossier, CDR Log #CDR001"}
                </div>

                {/* Investigator Action Bar */}
                <div style={styles.actionBar}>
                  <button
                    style={styles.confirmBtn}
                    onClick={() => handleDecision(m.candidate_entity_id, "CONFIRM")}
                  >
                    ✓ Confirm Entity Identity
                  </button>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => handleDecision(m.candidate_entity_id, "REJECT")}
                  >
                    ✕ Reject Candidate Match
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(6, 12, 20, 0.8)",
    backdropFilter: "blur(4px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "720px",
    maxHeight: "85vh",
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
    fontSize: "1.15rem",
    fontWeight: 700,
    margin: "2px 0",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "0.72rem",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  safetyBanner: {
    background: "rgba(230, 184, 92, 0.08)",
    borderBottom: "1px solid rgba(230, 184, 92, 0.2)",
    color: "#e6b85c",
    padding: "8px 20px",
    fontSize: "0.68rem",
  },
  actionBanner: {
    background: "rgba(52, 211, 153, 0.12)",
    color: "#34d399",
    padding: "8px 20px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  body: {
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  candidateCard: {
    background: "#070a0f",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  candTitle: {
    color: "#f8fafc",
    fontSize: "0.9rem",
  },
  methodTag: {
    color: "#64748b",
    fontSize: "0.65rem",
    marginTop: "2px",
  },
  confScore: {
    color: "#34d399",
    fontSize: "1.2rem",
    fontWeight: 700,
  },
  statusBadge: {
    background: "rgba(56, 189, 248, 0.12)",
    color: "#38bdf8",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
  },
  signalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  signalCol: {
    background: "#0f172a",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  suppItem: {
    color: "#cbd5e1",
    fontSize: "0.72rem",
    margin: "4px 0",
    lineHeight: "1.4",
  },
  contraItem: {
    color: "#fca5a5",
    fontSize: "0.72rem",
    margin: "4px 0",
    lineHeight: "1.4",
  },
  citationBox: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    background: "#0b1329",
    padding: "8px 12px",
    borderRadius: "4px",
  },
  actionBar: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  confirmBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  rejectBtn: {
    background: "rgba(244, 63, 94, 0.15)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "#f43f5e",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
  },
};

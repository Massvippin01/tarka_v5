import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface ClaimItem {
  claim_id: string;
  assertion_text: string;
  status: string;
  epistemic_status: string;
  supporting_fact_ids: string[];
  contradicting_fact_ids: string[];
  supporting_artifact_ids: string[];
  corroboration: string;
  source_reliability: string;
  confidence_score: number;
}

export const ClaimInspector: React.FC = () => {
  const { activeCaseId, selectedClaimId, openProofDrawer, selectEvidence } = useInvestigation();
  const [activeClaim, setActiveClaim] = useState<ClaimItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchClaims = async () => {
      try {
        const res = await fetch(`/api/v1/investigations/${activeCaseId}/state`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list: ClaimItem[] = data.claims || [];
            const found = list.find((c) => c.claim_id === selectedClaimId) || list[0] || null;
            setActiveClaim(found);
          }
        }
      } catch (err) {
        console.warn("Using fallback claims", err);
      }
    };
    fetchClaims();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId, selectedClaimId]);

  if (!activeClaim) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}></div>
        <div style={styles.emptyTitle}>No Claim Selected</div>
        <div style={styles.emptySubtitle}>Select a claim to inspect justification & proof lineage.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>CLAIM JUSTIFICATION INSPECTOR</div>
        <h3 style={styles.title}>{activeClaim.assertion_text}</h3>
        <div style={styles.idText}>Claim ID: {activeClaim.claim_id}</div>
      </div>

      {/* Justification & Status Banner */}
      <div style={styles.statusBox}>
        <div style={styles.statusRow}>
          <span>EPISTEMIC STATUS:</span>
          <strong style={{ color: "#38bdf8" }}>{activeClaim.status}</strong>
        </div>
        <div style={styles.statusRow}>
          <span>CORROBORATION:</span>
          <strong style={{ color: activeClaim.corroboration === "CORROBORATED" ? "#10b981" : "#f59e0b" }}>
            {activeClaim.corroboration}
          </strong>
        </div>
        <div style={styles.statusRow}>
          <span>SOURCE RELIABILITY:</span>
          <strong>{activeClaim.source_reliability}</strong>
        </div>
        <div style={styles.statusRow}>
          <span>CONFIDENCE SCORE:</span>
          <strong>{(activeClaim.confidence_score * 100).toFixed(0)}%</strong>
        </div>
      </div>

      {/* Supporting Evidence Facts */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          SUPPORTING FACTS ({activeClaim.supporting_fact_ids?.length || 0})
        </div>
        <div style={styles.factList}>
          {activeClaim.supporting_fact_ids?.map((fid) => (
            <div key={fid} style={styles.factCard}>
              <span style={styles.factId}>{fid}</span>
              <span style={styles.factBadge}>SUPPORTING FACT</span>
            </div>
          ))}
          {activeClaim.supporting_artifact_ids?.map((aid) => (
            <button
              key={aid}
              style={styles.artifactBtn}
              onClick={() => selectEvidence(aid)}
            >
               Inspect Root Artifact: {aid.slice(0, 16)}...
            </button>
          ))}
        </div>
      </div>

      {/* Contradicting Facts */}
      {activeClaim.contradicting_fact_ids?.length > 0 && (
        <div style={styles.section}>
          <div style={{ ...styles.sectionTitle, color: "#ef4444" }}>
            CONTRADICTING FACTS ({activeClaim.contradicting_fact_ids.length})
          </div>
          <div style={styles.factList}>
            {activeClaim.contradicting_fact_ids.map((fid) => (
              <div key={fid} style={{ ...styles.factCard, borderLeftColor: "#ef4444" }}>
                <span style={styles.factId}>{fid}</span>
                <span style={{ ...styles.factBadge, color: "#ef4444" }}>CONTRADICTION</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LiveProof Trigger Action */}
      <div style={styles.actionSection}>
        <button
          style={styles.proofBtn}
          onClick={() => openProofDrawer(activeClaim.claim_id)}
        >
           VERIFY LIVE PROOF (SECTION 65B CERTIFICATE)
        </button>
        <div style={styles.legalNotice}>
          Traverses backward: Claim  Fact  Observation  Artifact  SHA-256  Provenance  Custody
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "#f8fafc",
    fontFamily: "var(--font-sans)",
  },
  emptyContainer: {
    padding: "24px",
    textAlign: "center",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "2rem",
    marginBottom: "8px",
  },
  emptyTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#cbd5e1",
  },
  emptySubtitle: {
    fontSize: "0.72rem",
    marginTop: "4px",
  },
  header: {
    borderBottom: "1px solid #1e293b",
    paddingBottom: "8px",
  },
  badge: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#38bdf8",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "0.92rem",
    fontWeight: 700,
    margin: "4px 0",
    color: "#f1f5f9",
  },
  idText: {
    fontSize: "0.65rem",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#94a3b8",
  },
  statusBox: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "0.72rem",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionTitle: {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.08em",
  },
  factList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  factCard: {
    background: "#1e293b50",
    border: "1px solid #1e293b",
    borderLeftWidth: "3px",
    borderLeftColor: "#10b981",
    borderRadius: "4px",
    padding: "6px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factId: {
    fontSize: "0.68rem",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#cbd5e1",
  },
  factBadge: {
    fontSize: "0.58rem",
    fontWeight: 800,
    color: "#10b981",
  },
  artifactBtn: {
    background: "transparent",
    border: "1px dashed #334155",
    color: "#38bdf8",
    padding: "6px 8px",
    borderRadius: "4px",
    fontSize: "0.68rem",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 600,
  },
  actionSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "8px",
  },
  proofBtn: {
    background: "#0284c7",
    border: "none",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 800,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.15s ease",
  },
  legalNotice: {
    fontSize: "0.62rem",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.25,
  },
};

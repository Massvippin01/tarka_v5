import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface EvidenceGapItem {
  gap_id: string;
  gap_type: string;
  title: string;
  description: string;
  required_evidence_type: string;
  available_evidence_ids: string[];
  missing_evidence_description: string;
  impact: string;
  recommended_action: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
}

export const EvidenceGapCenter: React.FC = () => {
  const { activeCaseId } = useInvestigation();
  const [gaps, setGaps] = useState<EvidenceGapItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchGaps = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/investigations/${activeCaseId}/gaps`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setGaps(data.gaps || []);
        }
      } catch (err) {
        console.warn("Using fallback local evidence gaps", err);
      }
    };
    fetchGaps();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.badge}>EVIDENCE GAP ENGINE</div>
          <h2 style={styles.title}> EVIDENCE GAP CENTER (WHAT REMAINS UNKNOWN)</h2>
        </div>
        <div style={styles.deductionPill}>
          HYPOTHESIS  REQUIRED EVIDENCE  AVAILABLE EVIDENCE  MISSING  GAP
        </div>
      </div>

      {/* Gap Cards */}
      <div style={styles.list}>
        {gaps.map((gap) => {
          const isCritical = gap.severity === "CRITICAL";
          return (
            <div
              key={gap.gap_id}
              style={{
                ...styles.card,
                borderLeftColor: isCritical ? "#ef4444" : "#f59e0b",
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{
                    ...styles.sevBadge,
                    background: isCritical ? "#ef444425" : "#f59e0b25",
                    color: isCritical ? "#ef4444" : "#f59e0b",
                  }}>
                    {gap.severity} GAP
                  </span>
                  <span style={styles.typeBadge}>{gap.gap_type}</span>
                </div>
                <span style={styles.statusBadge}>STATUS: {gap.status}</span>
              </div>

              <div style={styles.gapTitle}>{gap.title}</div>
              <div style={styles.descText}>{gap.description}</div>

              {/* Deductive Evidence Breakdown */}
              <div style={styles.deductionGrid}>
                <div style={styles.deductionBox}>
                  <div style={styles.boxLabel}>REQUIRED EVIDENCE TYPE</div>
                  <div style={styles.boxVal}>{gap.required_evidence_type}</div>
                </div>
                <div style={styles.deductionBox}>
                  <div style={styles.boxLabel}>AVAILABLE EVIDENCE ANCHORS</div>
                  <div style={styles.boxVal}>{gap.available_evidence_ids.length} Artifact(s) (CDR / Telemetry)</div>
                </div>
              </div>

              {/* Missing Evidence Description */}
              <div style={styles.missingBox}>
                <div style={styles.missingLabel}>SPECIFICALLY MISSING FORENSIC PROOF:</div>
                <div style={styles.missingText}>{gap.missing_evidence_description}</div>
              </div>

              {/* Legal / Evidentiary Impact */}
              <div style={styles.impactBox}>
                <div style={styles.impactLabel}>IMPACT ON ADMISSIBILITY & ATTRIBUTION:</div>
                <div style={styles.impactText}>{gap.impact}</div>
              </div>

              {/* Statutory Action Prescription */}
              <div style={styles.actionBox}>
                <div style={styles.actionLabel}>STATUTORY INVESTIGATIVE ACTION (CrPC / BNSS):</div>
                <div style={styles.actionText}>{gap.recommended_action}</div>
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
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    background: "#080c14",
    padding: "16px",
    boxSizing: "border-box",
    overflowY: "auto",
    color: "#f8fafc",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "12px",
  },
  badge: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#f59e0b",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: 800,
    margin: "2px 0 0",
    color: "#f8fafc",
  },
  deductionPill: {
    fontSize: "0.65rem",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#94a3b8",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: 700,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderLeftWidth: "5px",
    borderRadius: "8px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sevBadge: {
    fontSize: "0.65rem",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  typeBadge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#94a3b8",
    background: "#1e293b",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  statusBadge: {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#10b981",
    background: "#065f4620",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  gapTitle: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  descText: {
    fontSize: "0.82rem",
    color: "#cbd5e1",
    lineHeight: 1.4,
  },
  deductionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  deductionBox: {
    background: "#1e293b50",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #1e293b",
  },
  boxLabel: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#64748b",
    marginBottom: "3px",
  },
  boxVal: {
    fontSize: "0.75rem",
    color: "#e2e8f0",
  },
  missingBox: {
    background: "#ef444410",
    border: "1px solid #ef444430",
    padding: "8px 10px",
    borderRadius: "6px",
  },
  missingLabel: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#ef4444",
    marginBottom: "3px",
  },
  missingText: {
    fontSize: "0.78rem",
    color: "#fca5a5",
  },
  impactBox: {
    background: "#111827",
    border: "1px solid #1f2937",
    padding: "8px 10px",
    borderRadius: "6px",
  },
  impactLabel: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#f59e0b",
    marginBottom: "3px",
  },
  impactText: {
    fontSize: "0.78rem",
    color: "#cbd5e1",
  },
  actionBox: {
    background: "#0369a115",
    border: "1px dashed #0284c7",
    padding: "8px 10px",
    borderRadius: "6px",
  },
  actionLabel: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#38bdf8",
    marginBottom: "3px",
  },
  actionText: {
    fontSize: "0.78rem",
    color: "#bae6fd",
    fontWeight: 500,
  },
};

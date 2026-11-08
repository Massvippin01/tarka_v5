import React, { useEffect, useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface ContradictionItem {
  contradiction_id: string;
  contradiction_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  fact_a: string;
  fact_b: string;
  reason: string;
  detector: string;
  required_verification: string;
  created_at: string;
  resolved_at?: string;
}

export const ContradictionCenter: React.FC = () => {
  const { activeCaseId } = useInvestigation();
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchContradictions = async () => {
      try {
        const res = await fetch(`/api/v1/investigations/${activeCaseId}/contradictions`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setContradictions(data.contradictions || []);
        }
      } catch (err) {
        console.warn("Using fallback local contradictions", err);
      }
    };
    fetchContradictions();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.badge}>CONTRADICTION ENGINE</div>
          <h2 style={styles.title}> CONTRADICTION CENTER (UN-SILENCED EVIDENCE CONFLICTS)</h2>
        </div>
        <div style={styles.policyNotice}>
           <strong>FORENSIC RULE:</strong> Never silently resolve contradictions or prioritize one sensor over another.
        </div>
      </div>

      {/* Conflict List */}
      <div style={styles.list}>
        {contradictions.map((c) => {
          const isCritical = c.severity === "CRITICAL";
          return (
            <div
              key={c.contradiction_id}
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
                    {c.severity} CONFLICT
                  </span>
                  <span style={styles.typeBadge}>{c.contradiction_type}</span>
                </div>
                <span style={styles.statusBadge}>STATUS: {c.status}</span>
              </div>

              {/* Conflict Explanation */}
              <div style={styles.reasonText}>{c.reason}</div>

              {/* Involved Observation Anchors */}
              <div style={styles.factsGrid}>
                <div style={styles.factBox}>
                  <div style={styles.factLabel}>OBSERVATION A (GROUND TRUTH FACT)</div>
                  <div style={styles.factContent}>{c.fact_a}</div>
                </div>
                <div style={styles.factBox}>
                  <div style={styles.factLabel}>OBSERVATION B (GROUND TRUTH FACT)</div>
                  <div style={styles.factContent}>{c.fact_b}</div>
                </div>
              </div>

              {/* Prescribed Verification Action */}
              <div style={styles.actionBox}>
                <div style={styles.actionTitle}>REQUIRED INVESTIGATIVE VERIFICATION (NO AUTOMATED GUESSWORK):</div>
                <div style={styles.actionText}>{c.required_verification}</div>
              </div>

              <div style={styles.footer}>
                <span>Detector: <strong>{c.detector}</strong></span>
                <span>Detected At: {new Date(c.created_at).toLocaleTimeString()}</span>
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
    fontFamily: "var(--font-sans)",
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
    color: "#ef4444",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: 800,
    margin: "2px 0 0",
    color: "#f8fafc",
  },
  policyNotice: {
    fontSize: "0.72rem",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#cbd5e1",
    padding: "6px 10px",
    borderRadius: "6px",
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
    color: "#38bdf8",
    background: "#0369a120",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  reasonText: {
    fontSize: "0.85rem",
    lineHeight: 1.4,
    color: "#f1f5f9",
    fontWeight: 500,
  },
  factsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  factBox: {
    background: "#1e293b50",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #1e293b",
  },
  factLabel: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#64748b",
    marginBottom: "4px",
  },
  factContent: {
    fontSize: "0.78rem",
    color: "#e2e8f0",
    wordBreak: "break-all",
  },
  actionBox: {
    background: "#111827",
    border: "1px dashed #334155",
    padding: "8px 10px",
    borderRadius: "6px",
  },
  actionTitle: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#38bdf8",
    marginBottom: "3px",
  },
  actionText: {
    fontSize: "0.78rem",
    color: "#cbd5e1",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.68rem",
    color: "#64748b",
    borderTop: "1px solid #1e293b",
    paddingTop: "6px",
  },
};

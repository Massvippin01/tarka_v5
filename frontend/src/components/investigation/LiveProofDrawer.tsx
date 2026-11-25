import React, { useEffect, useState } from "react";
import { apiUrl } from "../../api/client";
import { useInvestigation } from "../../context/InvestigationContext";

interface ProofStep {
  level: string;
  identifier: string;
  status: "VERIFIED" | "FAILED" | "MISSING";
  details: Record<string, any>;
  error?: string;
}

interface ProofResponse {
  proof_id: string;
  direction: string;
  root_id: string;
  is_valid: boolean;
  hash_verified: boolean;
  provenance_verified: boolean;
  custody_verified: boolean;
  source_location_verified: boolean;
  errors: string[];
  steps: ProofStep[];
  statutory_compliance?: string;
}

export const LiveProofDrawer: React.FC = () => {
  const { proofDrawerClaimId, openProofDrawer } = useInvestigation();
  const [proof, setProof] = useState<ProofResponse | null>(null);

  useEffect(() => {
    if (!proofDrawerClaimId) {
      setProof(null);
      return;
    }

    let isMounted = true;
    const fetchProof = async () => {
      try {
        const res = await fetch(apiUrl(`/api/v1/proof/${proofDrawerClaimId}`));
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setProof(data);
        }
      } catch (err) {
        console.warn("Failed to fetch live proof", err);
      }
    };
    fetchProof();
    return () => {
      isMounted = false;
    };
  }, [proofDrawerClaimId]);

  if (!proofDrawerClaimId) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.drawer}>
        {/* Drawer Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>DETERMINISTIC FORENSIC REASONING</div>
            <h3 style={styles.title}> LIVE PROOF LINEAGE ENGINE</h3>
            <div style={styles.subtext}>Claim Target: {proofDrawerClaimId}</div>
          </div>
          <button style={styles.closeBtn} onClick={() => openProofDrawer(null)}>
             CLOSE
          </button>
        </div>

        {/* Verification Status Banner */}
        <div style={{
          ...styles.statusBanner,
          background: proof?.is_valid ? "#065f4625" : "#ef444425",
          borderColor: proof?.is_valid ? "#10b981" : "#ef4444",
        }}>
          <div style={styles.statusTitle}>
            {proof?.is_valid ? " CRYPTOGRAPHICALLY VERIFIED PROOF" : " LINEAGE BROKEN / UNVERIFIED"}
          </div>
          <div style={styles.statusMeta}>
            <span>SHA-256 Hash: <strong>{proof?.hash_verified ? "MATCH" : "MISMATCH"}</strong></span>
            <span>Provenance: <strong>{proof?.provenance_verified ? "INTACT" : "FAILED"}</strong></span>
            <span>Custody Chain: <strong>{proof?.custody_verified ? "UNBROKEN" : "FAILED"}</strong></span>
          </div>
        </div>

        {/* Statutory Admissibility Notice */}
        <div style={styles.statutoryBox}>
          <strong>STATUTORY COMPLIANCE (EVIDENTIAL CERTIFICATE)</strong>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
            {proof?.statutory_compliance || "Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam, 2023"}
          </div>
        </div>

        {/* Proof Lineage Progression */}
        <div style={styles.chainTitle}>EVIDENTIAL LINEAGE CHAIN</div>
        <div style={styles.chainList}>
          {proof?.steps?.map((step, idx) => {
            const isOk = step.status === "VERIFIED";
            return (
              <div key={idx} style={styles.stepRow}>
                <div style={styles.stepNum}>{idx + 1}</div>
                <div style={styles.stepBody}>
                  <div style={styles.stepHeader}>
                    <span style={styles.stepLevel}>{step.level}</span>
                    <span style={{
                      ...styles.stepStatus,
                      color: isOk ? "#10b981" : "#ef4444",
                    }}>
                      {step.status}
                    </span>
                  </div>
                  <div style={styles.stepId}>{step.identifier}</div>
                  {step.details && (
                    <div style={styles.detailsBox}>
                      {Object.entries(step.details).map(([k, v]) => (
                        <div key={k}>
                          <strong>{k}:</strong> {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                  {step.error && <div style={styles.errorText}>{step.error}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    background: "#00000080",
    backdropFilter: "blur(2px)",
    zIndex: 100,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "480px",
    background: "#0b0f19",
    borderLeft: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    overflowY: "auto",
    color: "#f8fafc",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "10px",
  },
  badge: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#10b981",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: 800,
    margin: "2px 0 0",
  },
  subtext: {
    fontSize: "0.68rem",
    color: "#94a3b8",
  },
  closeBtn: {
    background: "transparent",
    border: "1px solid #334155",
    color: "#94a3b8",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.68rem",
    fontWeight: 700,
  },
  statusBanner: {
    border: "1px solid",
    borderRadius: "6px",
    padding: "10px",
  },
  statusTitle: {
    fontSize: "0.78rem",
    fontWeight: 800,
    marginBottom: "4px",
  },
  statusMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.68rem",
    color: "#cbd5e1",
  },
  statutoryBox: {
    background: "#111827",
    border: "1px solid #1f2937",
    padding: "8px 10px",
    borderRadius: "6px",
  },
  chainTitle: {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.08em",
  },
  chainList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  stepRow: {
    display: "flex",
    gap: "10px",
  },
  stepNum: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#38bdf8",
    flexShrink: 0,
    marginTop: "2px",
  },
  stepBody: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "8px 10px",
    flex: 1,
  },
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2px",
  },
  stepLevel: {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#38bdf8",
  },
  stepStatus: {
    fontSize: "0.62rem",
    fontWeight: 800,
  },
  stepId: {
    fontSize: "0.72rem",
    fontFamily: "monospace",
    color: "#f1f5f9",
    wordBreak: "break-all",
  },
  detailsBox: {
    fontSize: "0.65rem",
    color: "#94a3b8",
    background: "#111827",
    padding: "4px 6px",
    borderRadius: "4px",
    marginTop: "4px",
    lineHeight: 1.3,
  },
  errorText: {
    fontSize: "0.65rem",
    color: "#ef4444",
    marginTop: "4px",
  },
};

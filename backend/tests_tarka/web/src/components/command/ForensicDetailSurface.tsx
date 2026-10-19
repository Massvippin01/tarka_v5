import React from "react";
import { useInvestigation } from "../../context/InvestigationContext";
import { EntityDossier } from "../EntityDossier";
import { RelationshipInspector } from "../RelationshipInspector";

export const ForensicDetailSurface: React.FC = () => {
  const {
    activeCaseId,
    selectedEntityId,
    selectedRelationshipId,
    selectEntity,
    setExperienceLevel,
    openProofDrawer,
  } = useInvestigation();

  return (
    <div style={styles.forensicRoot}>
      {/* Top Breadcrumb & Return Bar */}
      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button
            onClick={() => setExperienceLevel(0)}
            style={styles.returnBtn}
            title="Return to Level 0 Command Surface (Esc)"
          >
            ← COMMAND SURFACE (L0)
          </button>
          <span style={styles.divider}>/</span>
          <button
            onClick={() => setExperienceLevel(1)}
            style={styles.navLink}
          >
            FOCUS (L1)
          </button>
          <span style={styles.divider}>/</span>
          <span style={styles.levelTag}>LEVEL 3: FORENSIC DETAIL & CAS LINEAGE // {activeCaseId}</span>
        </div>

        <div style={styles.topBarRight}>
          <div style={styles.levelSelector}>
            <button onClick={() => setExperienceLevel(0)} style={styles.levelPill}>L0 Command</button>
            <button onClick={() => setExperienceLevel(1)} style={styles.levelPill}>L1 Focus</button>
            <button onClick={() => setExperienceLevel(2)} style={styles.levelPill}>L2 Workspace</button>
            <button onClick={() => setExperienceLevel(3)} style={{ ...styles.levelPill, ...styles.activeLevelPill }}>L3 Forensic</button>
            <button onClick={() => setExperienceLevel(4)} style={styles.levelPill}>L4 Audit</button>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Forensic Workstation */}
      <main style={styles.dualPaneContainer}>
        {/* Left Pane: Detailed Dossier / Relation Inspector */}
        <section style={styles.leftPane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneTitle}>EVIDENTIARY DOSSIER & ATTRIBUTES</span>
            <span style={styles.entityBadge}>SUBJECT: {selectedEntityId || "P001"}</span>
          </div>
          <div style={styles.paneBody}>
            {selectedRelationshipId ? (
              <RelationshipInspector
                relId={selectedRelationshipId}
                onClose={() => selectEntity("P001")}
                onSelectEntity={selectEntity}
              />
            ) : (
              <EntityDossier
                entityId={selectedEntityId || "P001"}
                onSelectEntity={selectEntity}
              />
            )}
          </div>
        </section>

        {/* Right Pane: Cryptographic Proof & Lineage */}
        <section style={styles.rightPane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneTitle}>LIVEPROOF CRYPTOGRAPHIC LINEAGE (CAS)</span>
            <span style={styles.statusVerified}>SHA-256 VERIFIED</span>
          </div>

          <div style={styles.proofBody}>
            <div style={styles.proofCard}>
              <div style={styles.claimHeader}>
                <span style={styles.claimId}>CLAIM: CLM-2026-001</span>
                <span style={styles.claimStatusBadge}>EVIDENCE_CONTRADICTED</span>
              </div>
              <p style={styles.claimText}>
                Vikram Malhotra claimed absence from NCR on night of 2026-08-14.
                Physical and digital sensor evidence contradicts sworn statement.
              </p>

              <div style={styles.lineageChain}>
                <div style={styles.lineageStep}>
                  <div style={styles.stepDot} />
                  <div style={styles.stepContent}>
                    <span style={styles.stepLabel}>1. RAW CAS ARTIFACT</span>
                    <span style={styles.stepHash}>
                      sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </span>
                    <span style={styles.stepMeta}>Acquired: 2026-08-14 23:42:18 IST · ANPR Sensor Gateway</span>
                  </div>
                </div>

                <div style={styles.lineageStep}>
                  <div style={styles.stepDot} />
                  <div style={styles.stepContent}>
                    <span style={styles.stepLabel}>2. NORMALIZED FORENSIC OBSERVATION</span>
                    <span style={styles.stepDetail}>
                      Observation OBS-2026-001: Vehicle DL-3C-AQ-9901 registered to Shell Corp "Apex Global"
                    </span>
                  </div>
                </div>

                <div style={styles.lineageStep}>
                  <div style={styles.stepDot} />
                  <div style={styles.stepContent}>
                    <span style={styles.stepLabel}>3. CHAIN OF CUSTODY INTEGRITY</span>
                    <span style={styles.stepDetail}>
                      Custody Token CUST-DL-8842 · Officer DL-8842 · Immutably Stored
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.proofActionRow}>
                <button
                  onClick={() => openProofDrawer("CLM-2026-001")}
                  style={styles.proofDrawerBtn}
                >
                  Open Full Lineage Drawer →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={styles.quickNavRow}>
              <button
                onClick={() => setExperienceLevel(2)}
                style={styles.secondaryBtn}
              >
                Inspect in Network Graph (L2)
              </button>
              <button
                onClick={() => setExperienceLevel(4)}
                style={styles.secondaryBtn}
              >
                View Audit Telemetry (L4)
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  forensicRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "var(--bg-canonical)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    overflow: "hidden",
  },
  topBar: {
    height: "44px",
    backgroundColor: "var(--surface-primary)",
    borderBottom: "1px solid var(--border-structural)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    fontSize: "var(--font-size-meta)",
    flexShrink: 0,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  returnBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--primary-accent)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  },
  navLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    cursor: "pointer",
    padding: "2px 6px",
  },
  divider: {
    color: "var(--border-strong)",
  },
  levelTag: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
  },
  levelSelector: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  levelPill: {
    backgroundColor: "transparent",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
    padding: "2px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
  },
  activeLevelPill: {
    backgroundColor: "var(--surface-selected)",
    borderColor: "var(--primary-accent)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  dualPaneContainer: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1px",
    backgroundColor: "var(--border-structural)",
    overflow: "hidden",
  },
  leftPane: {
    backgroundColor: "var(--surface-primary)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  rightPane: {
    backgroundColor: "var(--surface-primary)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  paneHeader: {
    height: "40px",
    borderBottom: "1px solid var(--border-structural)",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "var(--surface-secondary)",
  },
  paneTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "0.05em",
  },
  entityBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-secondary)",
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  statusVerified: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--status-verified)",
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  paneBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  proofBody: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  proofCard: {
    backgroundColor: "var(--surface-secondary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  claimHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  claimId: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  claimStatusBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--sentinel-crimson)",
    backgroundColor: "var(--surface-primary)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--sentinel-crimson)",
  },
  claimText: {
    fontSize: "13px",
    color: "var(--text-primary)",
    lineHeight: 1.5,
    margin: 0,
  },
  lineageChain: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    borderLeft: "2px solid var(--border-strong)",
    paddingLeft: "14px",
    marginLeft: "6px",
    marginTop: "6px",
  },
  lineageStep: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    position: "relative",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-accent)",
    position: "absolute",
    left: "-19px",
    top: "3px",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  stepLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.04em",
  },
  stepHash: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--primary-accent)",
    wordBreak: "break-all",
  },
  stepMeta: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
  },
  stepDetail: {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  proofActionRow: {
    marginTop: "8px",
  },
  proofDrawerBtn: {
    backgroundColor: "var(--primary-accent)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
  },
  quickNavRow: {
    display: "flex",
    gap: "10px",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    cursor: "pointer",
  },
};

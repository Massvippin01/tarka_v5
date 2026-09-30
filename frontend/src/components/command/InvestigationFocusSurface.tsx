import React from "react";
import { useInvestigation } from "../../context/InvestigationContext";

export const InvestigationFocusSurface: React.FC = () => {
  const {
    activeCaseId,
    selectEntity,
    setExperienceLevel,
    setActiveWorkspaceView,
    setActiveNav,
    setActiveLens,
    openProofDrawer,
  } = useInvestigation();

  const handleOpenGraph = (entityId?: string) => {
    if (entityId) selectEntity(entityId);
    setActiveWorkspaceView("graph");
    setActiveLens("Network");
    setExperienceLevel(2);
  };

  const handleOpenContradictions = () => {
    setActiveNav("contradictions");
    setActiveWorkspaceView("contradictions");
    setExperienceLevel(2);
  };

  const handleOpenGaps = () => {
    setActiveNav("gaps");
    setActiveWorkspaceView("gaps");
    setExperienceLevel(2);
  };

  const handleOpenDossier = (entityId: string) => {
    selectEntity(entityId);
    setExperienceLevel(3);
  };

  const handleOpenProof = (claimId: string) => {
    openProofDrawer(claimId);
    setExperienceLevel(3);
  };

  return (
    <div style={styles.focusRoot}>
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
          <span style={styles.levelTag}>LEVEL 1: CURRENT INVESTIGATION FOCUS</span>
        </div>

        <div style={styles.topBarRight}>
          <div style={styles.levelSelector}>
            <button onClick={() => setExperienceLevel(0)} style={styles.levelPill}>L0 Command</button>
            <button onClick={() => setExperienceLevel(1)} style={{ ...styles.levelPill, ...styles.activeLevelPill }}>L1 Focus</button>
            <button onClick={() => setExperienceLevel(2)} style={styles.levelPill}>L2 Workspace</button>
            <button onClick={() => setExperienceLevel(3)} style={styles.levelPill}>L3 Forensic</button>
            <button onClick={() => setExperienceLevel(4)} style={styles.levelPill}>L4 Audit</button>
          </div>
        </div>
      </header>

      {/* Main Focus Docket */}
      <main style={styles.contentContainer}>
        {/* Case Metadata Banner */}
        <section style={styles.caseHeaderCard}>
          <div style={styles.caseHeaderTop}>
            <div>
              <span style={styles.classificationTag}>RESTRICTED // LE SENSITIVE</span>
              <h1 style={styles.caseTitle}>
                {activeCaseId} // OPERATION TRIAD NEXUS
              </h1>
            </div>
            <div style={styles.caseMetaRight}>
              <span style={styles.statusBadge}>ACTIVE INQUIRY</span>
              <span style={styles.officerText}>LEAD: INSP. A. RAWAT [DL-8842]</span>
            </div>
          </div>

          <div style={styles.caseDetailsGrid}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>STATUTORY AUTHORITY</span>
              <span style={styles.metaValue}>Section 94 BNSS (2023) / Sec 69 IT Act</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>JURISDICTION</span>
              <span style={styles.metaValue}>Delhi NCR / Gurugram Special Cell</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>TIME HORIZON</span>
              <span style={styles.metaValue}>2026-08-01 — 2026-08-30 (30 Days)</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>EVIDENTIARY HASH INTEGRITY</span>
              <span style={{ ...styles.metaValue, color: "var(--status-verified)" }}>
                SHA-256 CAS CHAIN VERIFIED
              </span>
            </div>
          </div>
        </section>

        {/* 3 Core Investigative Focus Panels */}
        <div style={styles.focusPanelsGrid}>
          {/* Card 1: Primary Entities of Interest */}
          <section style={styles.panelCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardHeaderTitle}>PRIMARY ENTITIES OF INTEREST</span>
              <span style={styles.cardHeaderBadge}>3 TARGETS</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.entityRow}>
                <div style={styles.entityInfo}>
                  <span style={styles.entityName}>Vikram Malhotra</span>
                  <span style={styles.entityRole}>Target · Hawala Kingpin / Shell Director (P001)</span>
                </div>
                <div style={styles.entityActions}>
                  <button
                    onClick={() => handleOpenDossier("P001")}
                    style={styles.actionSmallBtn}
                    title="Open forensic dossier (L3)"
                  >
                    Dossier (L3)
                  </button>
                  <button
                    onClick={() => handleOpenGraph("P001")}
                    style={styles.actionSmallBtn}
                    title="Inspect network linkages (L2)"
                  >
                    Graph (L2)
                  </button>
                </div>
              </div>

              <div style={styles.entityRow}>
                <div style={styles.entityInfo}>
                  <span style={styles.entityName}>Rajesh Sharma</span>
                  <span style={styles.entityRole}>Conduit · Hawala Courier / Cash Handler (P002)</span>
                </div>
                <div style={styles.entityActions}>
                  <button
                    onClick={() => handleOpenDossier("P002")}
                    style={styles.actionSmallBtn}
                  >
                    Dossier (L3)
                  </button>
                  <button
                    onClick={() => handleOpenGraph("P002")}
                    style={styles.actionSmallBtn}
                  >
                    Graph (L2)
                  </button>
                </div>
              </div>

              <div style={styles.entityRow}>
                <div style={styles.entityInfo}>
                  <span style={styles.entityName}>Amit Verma</span>
                  <span style={styles.entityRole}>Associate · Apex Global Logistics Shell (P003)</span>
                </div>
                <div style={styles.entityActions}>
                  <button
                    onClick={() => handleOpenDossier("P003")}
                    style={styles.actionSmallBtn}
                  >
                    Dossier (L3)
                  </button>
                  <button
                    onClick={() => handleOpenGraph("P003")}
                    style={styles.actionSmallBtn}
                  >
                    Graph (L2)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Critical Contradictions */}
          <section style={styles.panelCard}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardHeaderTitle, color: "var(--sentinel-crimson)" }}>
                CRITICAL EVIDENTIARY CONTRADICTIONS
              </span>
              <span style={{ ...styles.cardHeaderBadge, backgroundColor: "var(--sentinel-crimson)", color: "#FFFFFF" }}>
                1 CRITICAL
              </span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.contradictionItem}>
                <div style={styles.contradictionTitleRow}>
                  <span style={styles.anomalyIcon}>⚠️</span>
                  <span style={styles.contradictionTitle}>Alibi vs. ANPR Sensor Tolling Event</span>
                </div>
                <p style={styles.contradictionText}>
                  Vikram Malhotra claimed during sworn interview to have remained at Mumbai Corporate HQ on 2026-08-14 at 11:30 PM.
                  However, ANPR toll camera <strong>EV-ANPR-001</strong> captured vehicle DL-3C-AQ-9901 passing Gurugram Expressway at 11:42 PM.
                </p>
                <div style={styles.cardFooterActions}>
                  <button
                    onClick={handleOpenContradictions}
                    style={styles.primaryPanelBtn}
                  >
                    Inspect Contradiction Center (L2) →
                  </button>
                  <button
                    onClick={() => handleOpenProof("CLM-2026-001")}
                    style={styles.secondaryPanelBtn}
                  >
                    Verify CAS Proof (L3)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Evidentiary Gaps */}
          <section style={styles.panelCard}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardHeaderTitle, color: "var(--status-gap)" }}>
                KEY EVIDENTIARY GAPS
              </span>
              <span style={{ ...styles.cardHeaderBadge, backgroundColor: "var(--status-gap)", color: "#000" }}>
                2 IDENTIFIED
              </span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.gapItem}>
                <span style={styles.gapLabel}>GAP-001: Cloud Server Access Logs</span>
                <p style={styles.gapText}>
                  Missing encrypted telemetry from hosting provider between 2026-08-12 and 2026-08-15.
                  Requisition warrant prepared under Section 94 BNSS.
                </p>
              </div>
              <div style={styles.gapItem}>
                <span style={styles.gapLabel}>GAP-002: Sector 29 CCTV Camera Stream</span>
                <p style={styles.gapText}>
                  Substation power interruption caused a 35-minute recording gap during the cash delivery window.
                </p>
              </div>
              <div style={styles.cardFooterActions}>
                <button onClick={handleOpenGaps} style={styles.primaryPanelBtn}>
                  Inspect Evidence Gaps & Requisitions (L2) →
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Global Primary Navigation Actions */}
        <section style={styles.actionToolbar}>
          <button
            onClick={() => setExperienceLevel(2)}
            style={styles.launchWorkspaceBtn}
          >
            <span>▶ LAUNCH FULL ANALYTICAL WORKSPACE (L2)</span>
          </button>
          <button
            onClick={() => setExperienceLevel(3)}
            style={styles.toolbarBtn}
          >
            <span>🔍 INSPECT FORENSIC DETAIL (L3)</span>
          </button>
          <button
            onClick={() => setExperienceLevel(4)}
            style={styles.toolbarBtn}
          >
            <span>📋 VIEW GOVERNANCE & AUDIT LEDGER (L4)</span>
          </button>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  focusRoot: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "var(--bg-canonical)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
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
  contentContainer: {
    flex: 1,
    padding: "28px 24px",
    maxWidth: "1100px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  caseHeaderCard: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
  },
  caseHeaderTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "16px",
    borderBottom: "1px solid var(--border-structural)",
    paddingBottom: "14px",
  },
  classificationTag: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--sentinel-crimson)",
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  caseTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "4px 0 0 0",
  },
  caseMetaRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  statusBadge: {
    backgroundColor: "var(--surface-secondary)",
    color: "var(--primary-accent)",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-structural)",
  },
  officerText: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  caseDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  metaLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
  },
  metaValue: {
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  focusPanelsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  panelCard: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-structural)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "var(--surface-secondary)",
  },
  cardHeaderTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "var(--text-primary)",
  },
  cardHeaderBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 6px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },
  entityRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  entityInfo: {
    display: "flex",
    flexDirection: "column",
  },
  entityName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  entityRole: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
  },
  entityActions: {
    display: "flex",
    gap: "6px",
  },
  actionSmallBtn: {
    backgroundColor: "var(--surface-secondary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-primary)",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  contradictionItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  contradictionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  anomalyIcon: {
    fontSize: "14px",
  },
  contradictionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--sentinel-crimson)",
  },
  contradictionText: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    margin: 0,
  },
  gapItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  gapLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--status-gap)",
    fontFamily: "var(--font-mono)",
  },
  gapText: {
    fontSize: "11px",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
    margin: 0,
  },
  cardFooterActions: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
  },
  primaryPanelBtn: {
    backgroundColor: "var(--primary-accent)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
  },
  secondaryPanelBtn: {
    backgroundColor: "var(--surface-secondary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 10px",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
  },
  actionToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "12px",
  },
  launchWorkspaceBtn: {
    backgroundColor: "var(--primary-accent)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "10px 18px",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  toolbarBtn: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 16px",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
  },
};

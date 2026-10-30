import React, { useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

export const GovernedIntelligenceSentinel: React.FC = () => {
  const {
    activeCaseId,
    selectedEntityId,
    selectedEvidenceId,
    selectedClaimId,
    openProofDrawer,
    setActiveWorkspaceView,
    setActiveNav,
  } = useInvestigation();

  const [activeTab, setActiveTab] = useState<"ANALYSIS" | "PLANNER" | "POLICY">("ANALYSIS");

  return (
    <div style={styles.container}>
      {/* Sentinel Analyst Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={styles.crimsonDot} />
          <span style={styles.sentinelLabel}>SENTINEL</span>
          <span style={styles.scopeTag}>INTELLIGENCE LAYER</span>
        </div>
        <span style={styles.caseRef}>{activeCaseId}</span>
      </div>

      {/* Sub-Tabs: Document Column Navigation */}
      <div style={styles.subTabBar}>
        <button
          onClick={() => setActiveTab("ANALYSIS")}
          style={{ ...styles.tabBtn, ...(activeTab === "ANALYSIS" ? styles.tabBtnActive : {}) }}
        >
          Analytical Notes
        </button>
        <button
          onClick={() => setActiveTab("PLANNER")}
          style={{ ...styles.tabBtn, ...(activeTab === "PLANNER" ? styles.tabBtnActive : {}) }}
        >
          Investigation Plan
        </button>
        <button
          onClick={() => setActiveTab("POLICY")}
          style={{ ...styles.tabBtn, ...(activeTab === "POLICY" ? styles.tabBtnActive : {}) }}
        >
          Policy Gateway
        </button>
      </div>

      {/* Body: Concise Textual Reasoning */}
      <div style={styles.body}>
        {activeTab === "ANALYSIS" && (
          <div style={styles.reasoningStack}>
            {/* Primary Finding Block */}
            <div style={styles.findingCard}>
              <div style={styles.findingHeader}>
                <span style={styles.findingEyebrow}>UNRESOLVED SPATIAL CONFLICT</span>
              </div>
              <p style={styles.findingText}>
                I found one unresolved conflict between the CDR and ANPR observations.
              </p>

              <div style={styles.metaBlock}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>EVIDENCE</span>
                  <span style={styles.metaValue}>CDR-2026-001 · ANPR-2026-004</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>STATUS</span>
                  <span style={{ ...styles.metaValue, color: "#AE2D30", fontWeight: 600 }}>Verification required</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>ACTION</span>
                  <span style={styles.metaValue}>Compare travel feasibility</span>
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button
                  style={styles.primaryActionBtn}
                  onClick={() => {
                    setActiveWorkspaceView("contradictions");
                    setActiveNav("contradictions");
                  }}
                >
                  Examine Travel Feasibility
                </button>
                <button
                  style={styles.secondaryActionBtn}
                  onClick={() => openProofDrawer("CLM-2026-001")}
                >
                  Verify Lineage
                </button>
              </div>
            </div>

            {/* Context Object Details */}
            <div style={styles.contextBox}>
              <div style={styles.contextTitle}>INSPECTING OBJECT</div>
              <div style={styles.contextMeta}>
                <span>Target: <strong>{selectedEntityId || selectedEvidenceId || selectedClaimId || "Case 2026-001"}</strong></span>
                <span>Type: {selectedEntityId ? "Resolved Entity Dossier" : "Composite Case Synthesis"}</span>
              </div>
              <p style={styles.contextNarrative}>
                Network degree reflects observational density across 11 source adapter feeds. Direct criminal association is not established solely by call frequency or co-location.
              </p>
            </div>

            {/* Sovereign Epistemic Disclaimer */}
            <div style={styles.disclaimerBox}>
              <div style={styles.disclaimerTitle}>EPISTEMIC BOUNDARY</div>
              <div style={styles.disclaimerItems}>
                <div>• Association ≠ Guilt</div>
                <div>• Centrality ≠ Criminality</div>
                <div>• Similarity ≠ Identity</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "PLANNER" && (
          <div style={styles.plannerStack}>
            <div style={styles.planBlock}>
              <div style={styles.planHeader}>INVESTIGATIVE OBJECTIVE</div>
              <p style={styles.planObjective}>
                Corroborate identity of driver operating DL-01-AB-4040 at DND Toll Plaza (Lane 4).
              </p>
            </div>

            <div style={styles.planGrid}>
              <div style={styles.planItem}>
                <span style={styles.planLabel}>KNOWNS</span>
                <span style={styles.planText}>Vehicle passed DND toll at 09:41; Tag DL-01-AB-4040.</span>
              </div>
              <div style={styles.planItem}>
                <span style={styles.planLabel}>UNKNOWNS</span>
                <span style={styles.planText}>Driver visual identity inside cabin; Device presence in vehicle.</span>
              </div>
              <div style={styles.planItem}>
                <span style={styles.planLabel}>HYPOTHESIS</span>
                <span style={styles.planText}>Courier operated vehicle; primary suspect remained in South Delhi.</span>
              </div>
              <div style={styles.planItem}>
                <span style={styles.planLabel}>GAPS</span>
                <span style={styles.planText}>Toll camera NTP synchronization log; Burner SIM CAF.</span>
              </div>
            </div>

            <div style={styles.actionsList}>
              <div style={styles.actionsTitle}>CANDIDATE PROCEDURAL ACTIONS</div>
              <div style={styles.actionEntry}>
                <div style={styles.actionInfo}>
                  <div style={styles.actionName}>1. Requisition Toll Lane HD Video</div>
                  <div style={styles.actionDetails}>Authority: Sec 91 CrPC / Sec 94 BNSS · Cost: Low · Risk: Zero</div>
                </div>
                <span style={styles.allowBadge}>ALLOW</span>
              </div>
              <div style={styles.actionEntry}>
                <div style={styles.actionInfo}>
                  <div style={styles.actionName}>2. Requisition Tower Timing Advance Data</div>
                  <div style={styles.actionDetails}>Authority: Section 91 CrPC · Cost: Low · Risk: Zero</div>
                </div>
                <span style={styles.allowBadge}>ALLOW</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "POLICY" && (
          <div style={styles.policyStack}>
            <div style={styles.policyHeader}>GOVERNED INTELLIGENCE POLICY GATEWAY</div>
            <div style={styles.policyRows}>
              <div style={styles.policyField}>
                <span style={styles.pLabel}>OFFICER (WHO)</span>
                <span style={styles.pValue}>Insp. A. Rawat [ID: DL-8842, Special Cell]</span>
              </div>
              <div style={styles.policyField}>
                <span style={styles.pLabel}>REQUESTED ACTION (WHAT)</span>
                <span style={styles.pValue}>CDR Geodesic Tower Matrix & ANPR Sighting Correlation</span>
              </div>
              <div style={styles.policyField}>
                <span style={styles.pLabel}>LEGAL BASIS (WHY)</span>
                <span style={styles.pValue}>FIR 182/2026 U/S 384/420/120B IPC</span>
              </div>
              <div style={styles.policyField}>
                <span style={styles.pLabel}>AUTHORITY</span>
                <span style={styles.pAuthority}>Section 91 CrPC / Section 94 BNSS</span>
              </div>
              <div style={styles.policyField}>
                <span style={styles.pLabel}>DATA CLASSIFICATION</span>
                <span style={styles.pValue}>RESTRICTED // LE SENSITIVE</span>
              </div>
            </div>

            <div style={styles.verdictsBlock}>
              <div style={styles.verdictItem}>
                <span style={styles.allowBadge}>ALLOW</span>
                <span style={styles.verdictText}>Authorized case queries, CAS lookups, graph traversals</span>
              </div>
              <div style={styles.verdictItem}>
                <span style={styles.confirmBadge}>CONFIRM</span>
                <span style={styles.verdictText}>Subpoena generation, external telecom nodal API dispatch</span>
              </div>
              <div style={styles.verdictItem}>
                <span style={styles.denyBadge}>DENY</span>
                <span style={styles.verdictText}>Warrantless wiretaps, un-scoped queries, guilt determination</span>
              </div>
            </div>
          </div>
        )}
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
    background: "#FAF8F3",
    boxSizing: "border-box",
    fontFamily: "var(--font-sans)",
    color: "#1E1D1A",
    overflow: "hidden",
  },
  header: {
    padding: "10px 14px",
    background: "#FAF8F3",
    borderBottom: "1px solid #D8D2C7",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  crimsonDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#AE2D30",
    display: "inline-block",
  },
  sentinelLabel: {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    fontWeight: 600,
    color: "#1E1D1A",
    letterSpacing: "0.2px",
  },
  scopeTag: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#625E57",
  },
  caseRef: {
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#8C877E",
  },
  subTabBar: {
    display: "flex",
    background: "#ECE8DF",
    borderBottom: "1px solid #D8D2C7",
  },
  tabBtn: {
    flex: 1,
    padding: "7px 6px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#625E57",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center",
  },
  tabBtnActive: {
    color: "#1E1D1A",
    borderBottom: "2px solid #AE2D30",
    background: "#FAF8F3",
    fontWeight: 600,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  reasoningStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  findingCard: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  findingHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  findingEyebrow: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#AE2D30",
    letterSpacing: "0.06em",
  },
  findingText: {
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#1E1D1A",
    margin: 0,
    fontWeight: 500,
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "8px 0",
    borderTop: "1px solid #E5E0D6",
    borderBottom: "1px solid #E5E0D6",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
  },
  metaLabel: {
    color: "#625E57",
    fontWeight: 600,
  },
  metaValue: {
    color: "#1E1D1A",
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
    marginTop: "2px",
  },
  primaryActionBtn: {
    background: "#AE2D30",
    color: "#FAF8F3",
    border: "none",
    padding: "6px 10px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
  secondaryActionBtn: {
    background: "#FAF8F3",
    color: "#1E1D1A",
    border: "1px solid #D8D2C7",
    padding: "6px 10px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
  contextBox: {
    background: "#ECE8DF",
    padding: "10px 12px",
    borderRadius: "2px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
  },
  contextTitle: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#625E57",
    letterSpacing: "0.06em",
  },
  contextMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#1E1D1A",
  },
  contextNarrative: {
    fontSize: "12px",
    color: "#625E57",
    lineHeight: "1.4",
    margin: "4px 0 0 0",
  },
  disclaimerBox: {
    padding: "10px 12px",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  disclaimerTitle: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#8C877E",
    letterSpacing: "0.06em",
  },
  disclaimerItems: {
    fontSize: "11px",
    color: "#625E57",
    lineHeight: "1.4",
  },
  plannerStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  planBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  planHeader: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#625E57",
    letterSpacing: "0.06em",
  },
  planObjective: {
    fontSize: "13px",
    color: "#1E1D1A",
    lineHeight: "1.4",
    margin: 0,
    fontWeight: 500,
  },
  planGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "10px 0",
    borderTop: "1px solid #E5E0D6",
    borderBottom: "1px solid #E5E0D6",
  },
  planItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  planLabel: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#625E57",
  },
  planText: {
    fontSize: "12px",
    color: "#1E1D1A",
  },
  actionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  actionsTitle: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#625E57",
  },
  actionEntry: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 8px",
    background: "#ECE8DF",
    borderRadius: "2px",
  },
  actionInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  actionName: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#1E1D1A",
  },
  actionDetails: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#625E57",
  },
  allowBadge: {
    fontSize: "9px",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    padding: "2px 5px",
    borderRadius: "2px",
    background: "rgba(30, 111, 67, 0.12)",
    color: "#1E6F43",
  },
  confirmBadge: {
    fontSize: "9px",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    padding: "2px 5px",
    borderRadius: "2px",
    background: "rgba(180, 83, 9, 0.12)",
    color: "#B45309",
  },
  denyBadge: {
    fontSize: "9px",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    padding: "2px 5px",
    borderRadius: "2px",
    background: "rgba(174, 45, 48, 0.12)",
    color: "#AE2D30",
  },
  policyStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  policyHeader: {
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#1E1D1A",
    borderBottom: "1px solid #D8D2C7",
    paddingBottom: "6px",
  },
  policyRows: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  policyField: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  pLabel: {
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    color: "#625E57",
  },
  pValue: {
    fontSize: "12px",
    color: "#1E1D1A",
  },
  pAuthority: {
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    color: "#1E6F43",
  },
  verdictsBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingTop: "8px",
    borderTop: "1px solid #D8D2C7",
  },
  verdictItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  verdictText: {
    fontSize: "11px",
    color: "#625E57",
  },
};

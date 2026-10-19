import React, { useState } from "react";
import { useInvestigation } from "../../context/InvestigationContext";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  modality: string;
  action: string;
  statutoryBasis: string;
  policyResult: "PERMITTED" | "BLOCKED" | "CONFIRMATION_REQUIRED";
  hash: string;
}

export const AuditGovernanceSurface: React.FC = () => {
  const { activeCaseId, setExperienceLevel } = useInvestigation();
  const [filterModality, setFilterModality] = useState<string>("ALL");

  const AUDIT_ENTRIES: AuditEntry[] = [
    {
      id: "AUD-2026-901",
      timestamp: "2026-08-30T17:45:10+05:30",
      actor: "INSP. A. RAWAT [DL-8842]",
      modality: "VOICE",
      action: "INVESTIGATION_INTENT_NORMALIZED: Continue CASE-2026-001",
      statutoryBasis: "Section 94 BNSS (2023)",
      policyResult: "PERMITTED",
      hash: "e7b0c44298fc1c149afbf4c8996fb92427ae41e4",
    },
    {
      id: "AUD-2026-902",
      timestamp: "2026-08-30T17:45:12+05:30",
      actor: "INSP. A. RAWAT [DL-8842]",
      modality: "COMMAND_BUS",
      action: "DISPATCH_ACTION: OPEN_CASE (CASE-2026-001)",
      statutoryBasis: "Section 94 BNSS (2023)",
      policyResult: "PERMITTED",
      hash: "8a1f81d830b80ef84b6f00e9949bd5a8f427ba61",
    },
    {
      id: "AUD-2026-903",
      timestamp: "2026-08-30T17:45:18+05:30",
      actor: "AGENT: EVIDENCE_ANALYST",
      modality: "AGENT",
      action: "ANALYZE_CONTRADICTIONS: Alibi statement vs. ANPR toll record",
      statutoryBasis: "Section 69 IT Act / Section 94 BNSS",
      policyResult: "PERMITTED",
      hash: "3c7d65b90f4e1951f28b4c90e38a2e1d749ac105",
    },
    {
      id: "AUD-2026-904",
      timestamp: "2026-08-30T17:45:25+05:30",
      actor: "CAS_GATEWAY",
      modality: "SYSTEM",
      action: "EVIDENCE_VALIDATION: CAS SHA-256 integrity block verified",
      statutoryBasis: "Forensic Evidence Custody Standard (ISO 27037)",
      policyResult: "PERMITTED",
      hash: "f1a942bc30e84b7d159ef8302b4d90e21a8bf901",
    },
  ];

  const filteredEntries = filterModality === "ALL"
    ? AUDIT_ENTRIES
    : AUDIT_ENTRIES.filter((e) => e.modality === filterModality);

  return (
    <div style={styles.auditRoot}>
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
          <span style={styles.levelTag}>LEVEL 4: AUDIT, GOVERNANCE & STATUTORY LEDGER</span>
        </div>

        <div style={styles.topBarRight}>
          <div style={styles.levelSelector}>
            <button onClick={() => setExperienceLevel(0)} style={styles.levelPill}>L0 Command</button>
            <button onClick={() => setExperienceLevel(1)} style={styles.levelPill}>L1 Focus</button>
            <button onClick={() => setExperienceLevel(2)} style={styles.levelPill}>L2 Workspace</button>
            <button onClick={() => setExperienceLevel(3)} style={styles.levelPill}>L3 Forensic</button>
            <button onClick={() => setExperienceLevel(4)} style={{ ...styles.levelPill, ...styles.activeLevelPill }}>L4 Audit</button>
          </div>
        </div>
      </header>

      {/* Main Governance Content */}
      <main style={styles.contentContainer}>
        {/* Governance Overview Card */}
        <section style={styles.governanceHeader}>
          <div>
            <span style={styles.statutoryTag}>CONSTITUTIONAL COMPLIANCE ENGINE</span>
            <h1 style={styles.pageTitle}>TAMPER-EVIDENT FORENSIC AUDIT LEDGER</h1>
            <p style={styles.pageSubtitle}>
              Every action, intent resolution, agent finding, and evidence ingestion is immutably cryptographically chained.
            </p>
          </div>

          <div style={styles.policyStatusBox}>
            <span style={styles.policyTitle}>OPA POLICY GATEWAY</span>
            <span style={styles.policyActive}>ACTIVE · FAIL-CLOSED</span>
            <span style={styles.policyStat}>100% Statutorily Authorized</span>
          </div>
        </section>

        {/* Audit Filter Toolbar */}
        <div style={styles.filterToolbar}>
          <span style={styles.filterLabel}>FILTER MODALITY:</span>
          {["ALL", "VOICE", "COMMAND_BUS", "AGENT", "SYSTEM"].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModality(mod)}
              style={{
                ...styles.filterBtn,
                ...(filterModality === mod ? styles.activeFilterBtn : {}),
              }}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Audit Table */}
        <section style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>EVENT ID</th>
                <th style={styles.th}>TIMESTAMP (IST)</th>
                <th style={styles.th}>SWORN ACTOR</th>
                <th style={styles.th}>MODALITY</th>
                <th style={styles.th}>INVESTIGATIVE ACTION</th>
                <th style={styles.th}>STATUTORY AUTHORITY</th>
                <th style={styles.th}>POLICY GATE</th>
                <th style={styles.th}>BLOCK HASH</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} style={styles.tr}>
                  <td style={styles.tdMono}>{entry.id}</td>
                  <td style={styles.tdMono}>{entry.timestamp}</td>
                  <td style={styles.tdBold}>{entry.actor}</td>
                  <td style={styles.tdMono}>{entry.modality}</td>
                  <td style={styles.tdAction}>{entry.action}</td>
                  <td style={styles.tdMono}>{entry.statutoryBasis}</td>
                  <td style={styles.td}>
                    <span style={styles.permittedBadge}>{entry.policyResult}</span>
                  </td>
                  <td style={styles.tdHash}>{entry.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Four-Tier Governed Memory Snapshot */}
        <section style={styles.memorySection}>
          <h2 style={styles.memorySectionTitle}>FOUR-TIER GOVERNED INVESTIGATION MEMORY STATUS</h2>
          <div style={styles.memoryGrid}>
            <div style={styles.memoryCard}>
              <span style={styles.memTierName}>TIER 1: WORKING MEMORY</span>
              <span style={styles.memStatus}>ACTIVE · EPHEMERAL</span>
              <span style={styles.memDetail}>Session CTX-DEFAULT · 3 Entities focused · 1 Contradiction active</span>
            </div>
            <div style={styles.memoryCard}>
              <span style={styles.memTierName}>TIER 2: EPISODIC MEMORY</span>
              <span style={styles.memStatus}>CASE BOUND · TRANSACTIONAL</span>
              <span style={styles.memDetail}>Case {activeCaseId} · 12 chronological episodes logged in PostgreSQL</span>
            </div>
            <div style={styles.memoryCard}>
              <span style={styles.memTierName}>TIER 3: SEMANTIC MEMORY</span>
              <span style={styles.memStatus}>EVIDENCE CORRELATED</span>
              <span style={styles.memDetail}>18 verified facts · Cross-referenced in Neo4j intelligence graph</span>
            </div>
            <div style={styles.memoryCard}>
              <span style={styles.memTierName}>TIER 4: INSTITUTIONAL MEMORY</span>
              <span style={styles.memStatus}>GOVERNED · POLICY RULESET</span>
              <span style={styles.memDetail}>Bharatiya Nagarik Suraksha Sanhita (BNSS) · OPA Enforcement Active</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  auditRoot: {
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
  contentContainer: {
    flex: 1,
    padding: "28px 24px",
    maxWidth: "1200px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  governanceHeader: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statutoryTag: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--status-verified)",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  pageTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    fontWeight: 700,
    margin: "4px 0",
    color: "var(--text-primary)",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    margin: 0,
  },
  policyStatusBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
    backgroundColor: "var(--surface-secondary)",
    border: "1px solid var(--border-structural)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
  },
  policyTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
  },
  policyActive: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--status-verified)",
  },
  policyStat: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-secondary)",
  },
  filterToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-muted)",
    letterSpacing: "0.04em",
  },
  filterBtn: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    padding: "3px 10px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  activeFilterBtn: {
    backgroundColor: "var(--surface-selected)",
    borderColor: "var(--primary-accent)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  tableCard: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  theadRow: {
    backgroundColor: "var(--surface-secondary)",
    borderBottom: "1px solid var(--border-structural)",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
    fontWeight: 600,
  },
  tr: {
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "10px 14px",
  },
  tdMono: {
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  tdBold: {
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  tdAction: {
    padding: "10px 14px",
    fontSize: "12px",
    color: "var(--text-primary)",
  },
  tdHash: {
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--primary-accent)",
  },
  permittedBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--status-verified)",
    backgroundColor: "var(--surface-secondary)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  memorySection: {
    marginTop: "12px",
  },
  memorySectionTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: "0.06em",
    marginBottom: "12px",
  },
  memoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },
  memoryCard: {
    backgroundColor: "var(--surface-primary)",
    border: "1px solid var(--border-structural)",
    borderRadius: "var(--radius-md)",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  memTierName: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  memStatus: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--status-verified)",
  },
  memDetail: {
    fontFamily: "var(--font-sans)",
    fontSize: "11px",
    color: "var(--text-secondary)",
    marginTop: "2px",
  },
};

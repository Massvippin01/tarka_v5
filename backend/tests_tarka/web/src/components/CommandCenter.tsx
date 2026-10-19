import React from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface CommandCenterProps {
  onSelectEntity?: (id: string) => void;
  onRunCopilotQuery?: (q: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = () => {
  const {
    activeCaseId,
    setActiveNav,
    setActiveWorkspaceView,
    openProofDrawer,
    selectEntity,
  } = useInvestigation();

  return (
    <div style={styles.container}>
      {/* Morning Briefing Docket Header */}
      <div style={styles.docketHeader}>
        <div style={styles.docketMetaRow}>
          <span style={styles.docketDate}>14 AUGUST 2026 · {activeCaseId} · BRIEFING DOCKET 0842-A</span>
          <span style={styles.docketJurisdiction}>SPECIAL CELL · INTER-STATE INVESTIGATION</span>
        </div>
        <h1 style={styles.docketTitle}>Current Investigative Attention</h1>
        <p style={styles.docketSubtitle}>
          Synthesized from 11 verified source adapter feeds. Prioritizes physical transit impossibilities, formal proof gaps, and identity ambiguity requiring officer verification.
        </p>
      </div>

      {/* Dominant Editorial Briefing Section */}
      <section style={styles.editorialSection}>
        <div style={styles.editorialHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={styles.crimsonDot} />
            <span style={styles.editorialEyebrow}>CRITICAL SPATIOTEMPORAL ANOMALY</span>
          </div>
          <span style={styles.referenceCode}>REF: CONTRA-2026-001</span>
        </div>

        <h2 style={styles.anomalyHeading}>
          Impossible Transit Velocity: South Delhi CDR vs DND Toll ANPR
        </h2>

        <div style={styles.editorialGrid}>
          <div style={styles.editorialItem}>
            <span style={styles.itemLabel}>WHAT CHANGED</span>
            <p style={styles.itemText}>
              ANPR camera at DND Toll Plaza (Lane 4) captured vehicle <strong>DL-01-AB-4040</strong> at 09:41 UTC, exactly 180 seconds after suspect device connected to Okhla cell tower in South Delhi at 09:38 UTC.
            </p>
          </div>

          <div style={styles.editorialItem}>
            <span style={styles.itemLabel}>WHY IT MATTERS</span>
            <p style={styles.itemText}>
              The calculated transit speed across 18.2 km is <strong style={{ color: "#AE2D30" }}>364 km/h</strong>, exceeding physical road transit limits. Indicates the handset and vehicle were transported independently, or a courier was operating the vehicle.
            </p>
          </div>

          <div style={styles.editorialItem}>
            <span style={styles.itemLabel}>EVIDENCE INVOLVED</span>
            <p style={styles.itemText}>
              <code>CDR-2026-001</code> (Airtel Tower Okhla) · <code>ANPR-2026-004</code> (DND Toll Camera 4) · <code>UFED-2026-012</code> (Seized phone extraction).
            </p>
          </div>

          <div style={styles.editorialItem}>
            <span style={styles.itemLabel}>UNCERTAINTY</span>
            <p style={styles.itemText}>
              Toll server NTP synchronization drift unknown (estimated ±30s). Handset physically unobserved inside vehicle passenger cabin.
            </p>
          </div>

          <div style={styles.editorialItemFull}>
            <span style={styles.itemLabel}>REQUIRED VERIFICATION</span>
            <p style={styles.itemText}>
              Requisition toll optical server NTP calibration certificate and subpoena high-definition booth cabin video under <strong>Section 91 CrPC / Section 94 BNSS</strong>.
            </p>
          </div>
        </div>

        {/* Editorial Action Bar */}
        <div style={styles.editorialActions}>
          <button
            style={styles.primaryBtn}
            onClick={() => {
              setActiveWorkspaceView("contradictions");
              setActiveNav("contradictions");
            }}
          >
            Review Contradiction Center
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => openProofDrawer("CLM-2026-001")}
          >
            Trace Lineage (Live Proof)
          </button>
        </div>
      </section>

      {/* Dense Structured Investigation Rows */}
      <section style={styles.rowsSection}>
        <div style={styles.rowsSectionHeader}>
          <span style={styles.rowsTitle}>ACTIVE INVESTIGATIVE REGISTER</span>
          <span style={styles.rowsCount}>5 ITEMS REQUIRING ATTENTION</span>
        </div>

        <div style={styles.tableContainer}>
          {/* Row 1 */}
          <div style={styles.tableRow}>
            <div style={styles.colDate}>14 AUG 09:41</div>
            <div style={styles.colCategory}>
              <span style={{ color: "#AE2D30", fontWeight: 600 }}>ALIBI CONFLICT</span>
            </div>
            <div style={styles.colSubject}>
              <strong>Vikram Singh</strong> (Accused #1)
            </div>
            <div style={styles.colSummary}>
              Cell detail record in South Delhi conflicts with toll camera sighting (calculated 364 km/h).
            </div>
            <div style={styles.colProvenance}>2 sources · 1 contradiction</div>
            <div style={styles.colAction}>
              <button
                style={styles.rowBtn}
                onClick={() => {
                  setActiveWorkspaceView("contradictions");
                  setActiveNav("contradictions");
                }}
              >
                Review
              </button>
            </div>
          </div>

          {/* Row 2 */}
          <div style={styles.tableRow}>
            <div style={styles.colDate}>14 AUG 10:15</div>
            <div style={styles.colCategory}>
              <span style={{ color: "#B45309", fontWeight: 600 }}>MISSING CAF</span>
            </div>
            <div style={styles.colSubject}>
              <strong>Burner SIM</strong> (+91-9888044556)
            </div>
            <div style={styles.colSummary}>
              Subscriber acquisition form missing from telecom ledger; blocks legal ownership attribution.
            </div>
            <div style={styles.colProvenance}>1 source · 1 open gap</div>
            <div style={styles.colAction}>
              <button
                style={styles.rowBtn}
                onClick={() => {
                  setActiveWorkspaceView("gaps");
                  setActiveNav("gaps");
                }}
              >
                Issue Notice
              </button>
            </div>
          </div>

          {/* Row 3 */}
          <div style={styles.tableRow}>
            <div style={styles.colDate}>13 AUG 16:30</div>
            <div style={styles.colCategory}>
              <span style={{ color: "#625E57", fontWeight: 600 }}>IDENTITY MATCH</span>
            </div>
            <div style={styles.colSubject}>
              <strong>Vikram Singh</strong> vs <strong>Bikram Sing</strong>
            </div>
            <div style={styles.colSummary}>
              Transliteration similarity score 0.88; automated merge prohibited. Officer verification required.
            </div>
            <div style={styles.colProvenance}>3 cross-case records</div>
            <div style={styles.colAction}>
              <button
                style={styles.rowBtn}
                onClick={() => {
                  selectEntity("P001");
                  setActiveNav("entities");
                }}
              >
                Adjudicate
              </button>
            </div>
          </div>

          {/* Row 4 */}
          <div style={styles.tableRow}>
            <div style={styles.colDate}>13 AUG 11:20</div>
            <div style={styles.colCategory}>
              <span style={{ color: "#1E6F43", fontWeight: 600 }}>HAWALA DISPERSION</span>
            </div>
            <div style={styles.colSubject}>
              <strong>ICICI A/C 9042...88</strong>
            </div>
            <div style={styles.colSummary}>
              Rapid ₹4.5 Lakh dissipation across 3 UPI VPAs within 12 minutes of extortion call.
            </div>
            <div style={styles.colProvenance}>4 bank records · CAS verified</div>
            <div style={styles.colAction}>
              <button
                style={styles.rowBtn}
                onClick={() => setActiveNav("evidence")}
              >
                Inspect Ledger
              </button>
            </div>
          </div>

          {/* Row 5 */}
          <div style={styles.tableRow}>
            <div style={styles.colDate}>12 AUG 18:00</div>
            <div style={styles.colCategory}>
              <span style={{ color: "#1E6F43", fontWeight: 600 }}>UFED EXTRACTION</span>
            </div>
            <div style={styles.colSubject}>
              <strong>Cellebrite TAR Dump</strong>
            </div>
            <div style={styles.colSummary}>
              Physical memory extraction ingested into immutable CAS; 12 facts derived with unbroken custody.
            </div>
            <div style={styles.colProvenance}>SHA-256 verified · 0 orphans</div>
            <div style={styles.colAction}>
              <button
                style={styles.rowBtn}
                onClick={() => setActiveNav("sources")}
              >
                Provenance
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    background: "#F4F1EA",
    overflowY: "auto",
    padding: "24px 32px",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    color: "#1E1D1A",
    gap: "28px",
  },
  docketHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    borderBottom: "1px solid #D8D2C7",
    paddingBottom: "16px",
  },
  docketMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#625E57",
    letterSpacing: "0.06em",
  },
  docketDate: {
    fontWeight: 600,
  },
  docketJurisdiction: {
    color: "#8C877E",
  },
  docketTitle: {
    fontFamily: '"IBM Plex Serif", Georgia, serif',
    fontSize: "24px",
    fontWeight: 600,
    color: "#1E1D1A",
    margin: "6px 0 2px 0",
    letterSpacing: "-0.01em",
  },
  docketSubtitle: {
    fontSize: "13px",
    color: "#625E57",
    margin: 0,
    maxWidth: "840px",
    lineHeight: "1.5",
  },
  editorialSection: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    borderRadius: "2px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  editorialHeader: {
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
  editorialEyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    fontWeight: 600,
    color: "#AE2D30",
    letterSpacing: "0.08em",
  },
  referenceCode: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    color: "#8C877E",
  },
  anomalyHeading: {
    fontFamily: '"IBM Plex Serif", Georgia, serif',
    fontSize: "19px",
    fontWeight: 600,
    color: "#1E1D1A",
    margin: "0 0 4px 0",
    letterSpacing: "-0.01em",
  },
  editorialGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px 24px",
    paddingTop: "8px",
    borderTop: "1px solid #E5E0D6",
  },
  editorialItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  editorialItemFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  itemLabel: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    color: "#625E57",
    letterSpacing: "0.08em",
  },
  itemText: {
    fontSize: "13px",
    color: "#1E1D1A",
    lineHeight: "1.5",
    margin: 0,
  },
  editorialActions: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
    paddingTop: "14px",
    borderTop: "1px solid #E5E0D6",
  },
  primaryBtn: {
    background: "#AE2D30",
    color: "#FAF8F3",
    border: "none",
    padding: "8px 16px",
    borderRadius: "2px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  secondaryBtn: {
    background: "#FAF8F3",
    color: "#1E1D1A",
    border: "1px solid #D8D2C7",
    padding: "8px 16px",
    borderRadius: "2px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  rowsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  rowsSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #D8D2C7",
    paddingBottom: "8px",
  },
  rowsTitle: {
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    color: "#1E1D1A",
    letterSpacing: "0.06em",
  },
  rowsCount: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#8C877E",
  },
  tableContainer: {
    display: "flex",
    flexDirection: "column",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "110px 140px 160px 1fr 140px 80px",
    alignItems: "center",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #E5E0D6",
    fontSize: "12px",
  },
  colDate: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    color: "#625E57",
  },
  colCategory: {
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  colSubject: {
    color: "#1E1D1A",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  colSummary: {
    color: "#1E1D1A",
    lineHeight: "1.4",
  },
  colProvenance: {
    fontSize: "11px",
    color: "#8C877E",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  colAction: {
    textAlign: "right",
  },
  rowBtn: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    color: "#1E1D1A",
    padding: "4px 8px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
  },
};

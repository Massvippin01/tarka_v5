import React from "react";

interface LandingPageProps {
  onStartInvestigation: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartInvestigation,
  onOpenAuth,
}) => {
  return (
    <div style={styles.container}>
      {/* Top Header Navigation */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <h1 style={styles.brandTitle}>SENTINELX</h1>
          <span style={styles.brandSubtitle}>INVESTIGATION WORKSPACE</span>
        </div>

        <div style={styles.navActions}>
          <button onClick={onStartInvestigation} style={styles.primaryNavBtn}>
            Start Investigation <span style={{ marginLeft: "4px" }}>➔</span>
          </button>
          <button onClick={onOpenAuth} style={styles.secondaryNavBtn}>
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Subtitle */}
      <div style={styles.heroSubSection}>
        <p style={styles.heroSubText}>
          Evidence-backed analysis for investigators, analysts, and intelligence teams.
        </p>
      </div>

      {/* Core Capabilities Section */}
      <main style={styles.mainContent}>
        <div style={styles.eyebrowRow}>
          <span style={styles.redDot}></span>
          <span style={styles.eyebrow}>CORE CAPABILITIES</span>
        </div>

        <h2 style={styles.mainHeading}>
          See the network behind the record.
        </h2>

        {/* 4-Card Capability Grid */}
        <div style={styles.grid}>
          {/* Card 01 */}
          <div style={styles.card}>
            <div style={styles.cardNum}>01</div>
            <h3 style={styles.cardTitle}>Network Intelligence</h3>
            <p style={styles.cardDesc}>
              Map entities, relationships, communities, and influence from the live investigation graph.
            </p>
          </div>

          {/* Card 02 */}
          <div style={styles.card}>
            <div style={styles.cardNum}>02</div>
            <h3 style={styles.cardTitle}>Multi-Source Correlation</h3>
            <p style={styles.cardDesc}>
              Connect observed signals across calls, transactions, locations, and evidence records.
            </p>
          </div>

          {/* Card 03 */}
          <div style={styles.card}>
            <div style={styles.cardNum}>03</div>
            <h3 style={styles.cardTitle}>Risk & Anomaly Detection</h3>
            <p style={styles.cardDesc}>
              Prioritize explainable risk indicators with transparent rule and graph signals.
            </p>
          </div>

          {/* Card 04 */}
          <div style={styles.card}>
            <div style={styles.cardNum}>04</div>
            <h3 style={styles.cardTitle}>Evidence & Reports</h3>
            <p style={styles.cardDesc}>
              Trace findings back to source evidence, provenance, and integrity verification.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Legal Disclaimer */}
      <footer style={styles.footer}>
        <p style={styles.disclaimerText}>
          SentinelX assists investigation and evidence analysis. It does not determine guilt, criminality, or legal responsibility.
        </p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "#f5f2eb",
    color: "#1c1917",
    fontFamily: '"IBM Plex Sans", Inter, sans-serif',
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "32px 48px 16px",
    maxWidth: "1320px",
    margin: "0 auto",
    width: "100%",
  },
  brandGroup: {
    display: "flex",
    flexDirection: "column",
  },
  brandTitle: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", Georgia, serif',
    fontSize: "1.4rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: "#1c1917",
    margin: 0,
  },
  brandSubtitle: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.64rem",
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "#78716c",
    marginTop: "2px",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  primaryNavBtn: {
    background: "#9e2a2b",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 18px",
    fontSize: "0.86rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(158, 42, 43, 0.2)",
    display: "flex",
    alignItems: "center",
  },
  secondaryNavBtn: {
    background: "#efece6",
    color: "#1c1917",
    border: "1px solid #d1c9bd",
    borderRadius: "6px",
    padding: "10px 18px",
    fontSize: "0.86rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  heroSubSection: {
    padding: "0 48px",
    maxWidth: "1320px",
    margin: "0 auto 40px",
    width: "100%",
  },
  heroSubText: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.82rem",
    color: "#57534e",
    margin: 0,
  },
  mainContent: {
    flex: 1,
    padding: "20px 48px 60px",
    maxWidth: "1320px",
    margin: "0 auto",
    width: "100%",
  },
  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  redDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#9e2a2b",
    display: "inline-block",
  },
  eyebrow: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#9e2a2b",
    letterSpacing: "0.14em",
  },
  mainHeading: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", Georgia, serif',
    fontSize: "clamp(2rem, 3.5vw, 3.2rem)",
    fontWeight: 600,
    color: "#1c1917",
    margin: "0 0 48px 0",
    letterSpacing: "-0.02em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
    borderTop: "1px solid #e2ddd5",
    paddingTop: "32px",
  },
  card: {
    background: "#efece6",
    border: "1px solid #d1c9bd",
    borderRadius: "8px",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardNum: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.75rem",
    color: "#78716c",
    fontWeight: 700,
  },
  cardTitle: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", Georgia, serif',
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "#1c1917",
    margin: 0,
  },
  cardDesc: {
    fontSize: "0.85rem",
    color: "#57534e",
    lineHeight: "1.55",
    margin: 0,
  },
  footer: {
    padding: "24px 48px 36px",
    borderTop: "1px solid #e2ddd5",
    maxWidth: "1320px",
    margin: "0 auto",
    width: "100%",
    textAlign: "left",
  },
  disclaimerText: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.72rem",
    color: "#78716c",
    margin: 0,
  },
};

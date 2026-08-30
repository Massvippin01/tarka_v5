import React from "react";
import axios from "axios";

interface CommandCenterProps {
  onSelectEntity: (id: string) => void;
  onRunCopilotQuery: (q: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onSelectEntity,
  onRunCopilotQuery,
}) => {

  const handleSeedGoldenSlice = async () => {
    try {
      const res = await axios.post("http://localhost:8000/api/v1/investigation/seed-golden-slice");
      if (res.data.status === "success") {
        onRunCopilotQuery("What connects Case C102 and Case C481?");
      }
    } catch (e) {
      console.error(e);
      onRunCopilotQuery("What connects Case C102 and Case C481?");
    }
  };

  return (
    <div style={styles.container}>
      {/* Metric Cards Banner */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricTitle}>ACTIVE CASES</span>
          <strong style={styles.metricValue}>12</strong>
          <span style={styles.metricSub}>CCTNS & ICJS Synced</span>
        </div>
        <div style={styles.metricCard}>
          <span style={{ ...styles.metricTitle, color: "#f43f5e" }}>HIGH THREAT ENTITIES</span>
          <strong style={{ ...styles.metricValue, color: "#fda4af" }}>8</strong>
          <span style={styles.metricSub}>Threat Score &gt; 75.0</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricTitle}>ANPR TOLL SIGHTINGS</span>
          <strong style={styles.metricValue}>1,420</strong>
          <span style={styles.metricSub}>24h Surveillance Feed</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricTitle}>CDR & TRANSACTION LOGS</span>
          <strong style={styles.metricValue}>8,940</strong>
          <span style={styles.metricSub}>Telecom & UPI Ledger</span>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Left Column: National GIS Map & Golden Scenario Trigger */}
        <div style={styles.leftCol}>
          <div style={styles.cardHeader}>
            <h3>NATIONAL GIS OPERATIONS PICTURE</h3>
            <button style={styles.goldenBtn} onClick={handleSeedGoldenSlice}>
              ⚡ RUN GOLDEN INVESTIGATION SLICE
            </button>
          </div>
          <div style={styles.mapContainer}>
            <svg width="100%" height="320" viewBox="0 0 600 400" style={{ background: "#05080e" }}>
              {/* Synthetic Map Grid & Hotspots */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* India Outline Mock Geometry */}
              <polygon
                points="220,50 320,60 380,120 420,220 340,320 260,380 200,300 160,200 180,100"
                fill="rgba(16, 185, 129, 0.05)"
                stroke="rgba(52, 211, 153, 0.3)"
                strokeWidth="2"
              />

              {/* Delhi / Gurugram Hotspot */}
              <circle cx="280" cy="140" r="16" fill="rgba(244, 63, 94, 0.25)" />
              <circle cx="280" cy="140" r="6" fill="#f43f5e" />
              <text x="302" y="144" fill="#f8fafc" fontSize="11" fontWeight="bold">
                DELHI / GURUGRAM (Case C102 & C481)
              </text>

              {/* Mumbai Hotspot */}
              <circle cx="220" cy="260" r="10" fill="rgba(2, 132, 199, 0.3)" />
              <circle cx="220" cy="260" r="4" fill="#0284c7" />
              <text x="235" y="264" fill="#94a3b8" fontSize="10">
                MUMBAI FINANCIAL MULE NODE
              </text>

              {/* Bengaluru Hotspot */}
              <circle cx="270" cy="330" r="10" fill="rgba(234, 179, 8, 0.3)" />
              <circle cx="270" cy="330" r="4" fill="#eab308" />
              <text x="285" y="334" fill="#94a3b8" fontSize="10">
                BENGALURU CYBER HUB
              </text>

              {/* Inter-State Linkage Arc */}
              <path
                d="M 280 140 Q 250 200 220 260"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
        </div>

        {/* Right Column: Live Signal Feed & Primary Entities */}
        <div style={styles.rightCol}>
          <h3>LIVE ANALYTICAL SIGNAL FEED</h3>

          <div style={styles.signalCard} onClick={() => onSelectEntity("C102")}>
            <div style={styles.signalBadge}>HIDDEN CROSS-CASE LINKAGE</div>
            <div style={styles.signalTitle}>Case C102 (Delhi Cyber) &lt;-&gt; Case C481 (Gurugram)</div>
            <div style={styles.signalDesc}>
              4 multi-hop links discovered via Person P044, Vehicle DL-01-AB-1888, Phone +91-9888044556, and ₹1,25,000 UPI transfer.
            </div>
            <div style={styles.signalMeta}>
              Confidence: <strong style={{ color: "#34d399" }}>INFERRED (89%)</strong> | Source: ANALYTICAL_ENGINE
            </div>
          </div>

          <div style={styles.signalCard} onClick={() => onSelectEntity("P001")}>
            <div style={{ ...styles.signalBadge, background: "rgba(244, 63, 94, 0.2)", color: "#fda4af" }}>
              HIGH RISK TARGET
            </div>
            <div style={styles.signalTitle}>Vikram @ Vicky Singh (P001)</div>
            <div style={styles.signalDesc}>
              Aadhaar: 9988-1122-3344. Suspect in CCTNS FIR-2026-C102. Phone +91-9999011223 active on cell tower Delhi South.
            </div>
            <div style={styles.signalMeta}>
              Threat Score: <strong style={{ color: "#f43f5e" }}>88.5 / 100</strong> | Source: CCTNS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    height: "calc(100vh - 64px)",
    overflowY: "auto",
    background: "#070a0f",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  metricCard: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "16px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricTitle: {
    color: "#64748b",
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: "1.8rem",
    fontWeight: 700,
  },
  metricSub: {
    color: "#94a3b8",
    fontSize: "0.7rem",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
  },
  leftCol: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goldenBtn: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(16, 185, 129, 0.4)",
  },
  mapContainer: {
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  rightCol: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  signalCard: {
    background: "#070a0f",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "14px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "border-color 0.2s",
  },
  signalBadge: {
    background: "rgba(52, 211, 153, 0.15)",
    color: "#34d399",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "3px 6px",
    borderRadius: "4px",
    width: "fit-content",
  },
  signalTitle: {
    color: "#f8fafc",
    fontWeight: 600,
    fontSize: "0.85rem",
  },
  signalDesc: {
    color: "#94a3b8",
    fontSize: "0.75rem",
    lineHeight: "1.4",
  },
  signalMeta: {
    color: "#64748b",
    fontSize: "0.68rem",
    marginTop: "4px",
  },
};

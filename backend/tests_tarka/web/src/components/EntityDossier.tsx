import React, { useEffect, useState } from "react";
import axios from "axios";

interface EntityDossierProps {
  entityId: string;
  onSelectEntity: (id: string) => void;
}

export const EntityDossier: React.FC<EntityDossierProps> = ({
  entityId,
  onSelectEntity,
}) => {
  const [data, setData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  useEffect(() => {
    async function loadDossier() {
      try {
        const res = await axios.get(`http://localhost:8000/api/v1/investigation/dossier/${entityId}`);
        setData(res.data);
      } catch (e) {
        console.error(e);
      }
    }
    if (entityId) {
      loadDossier();
    }
  }, [entityId]);

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h3>SELECT AN ENTITY TO VIEW DOSSIER</h3>
          <p style={{ color: "#64748b" }}>Click on Vikram Singh (P001) or Case C102 from Command Center or Search bar.</p>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button style={styles.quickBtn} onClick={() => onSelectEntity("P001")}>
               View Vikram Singh (P001)
            </button>
            <button style={styles.quickBtn} onClick={() => onSelectEntity("C102")}>
               View Case C102
            </button>
          </div>
        </div>
      </div>
    );
  }

  const d = data.dossier || {};
  const prov = data.provenance || {};

  return (
    <div style={styles.container}>
      {/* Non-Guilt Epistemic Disclaimer */}
      <div
        style={{
          background: "rgba(230, 184, 92, 0.1)",
          border: "1px solid rgba(230, 184, 92, 0.3)",
          color: "var(--status-potential)",
          padding: "6px 12px",
          borderRadius: "4px",
          fontSize: "0.65rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span> <strong>INVESTIGATIVE NOTICE:</strong> Graph adjacency & network association are analytical pings, not proof of culpability or guilt. All claims require empirical evidence verification.</span>
      </div>

      {/* Dossier Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerInfo}>
          <div style={styles.badge}>{data.entity_type || "ENTITY"}</div>
          <h2>{d.full_name || d.title || d.name || entityId}</h2>
          <div style={styles.subMeta}>
            <span>ID: <strong>{d.id || entityId}</strong></span>
            {d.risk_level && (
              <span>Risk: <strong style={{ color: "#f43f5e" }}>{d.risk_level} ({d.threat_score || 0})</strong></span>
            )}
            {d.case_number && <span>FIR: <strong>{d.case_number}</strong></span>}
          </div>
        </div>
        <div style={styles.provTag}>
          <div>SOURCE: <strong>{prov.source || "CCTNS"}</strong></div>
          <div>CONFIDENCE: <strong style={{ color: "#34d399" }}>{prov.confidence || "DOCUMENTED"}</strong></div>
          <div>REVIEW: <strong>{prov.review_status || "APPROVED"}</strong></div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={styles.subNav}>
        {["overview", "network", "evidence", "provenance"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              ...styles.subTabBtn,
              ...(activeSubTab === tab ? styles.subTabActive : {}),
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sub Tab Content */}
      {activeSubTab === "overview" && (
        <div style={styles.grid2}>
          <div style={styles.card}>
            <h4>CANONICAL IDENTIFIERS</h4>
            <div style={styles.kvGrid}>
              <div><span>Aadhaar Number:</span> <strong>{d.aadhaar || "9988-1122-3344"}</strong></div>
              <div><span>Driving License:</span> <strong>{d.driving_license || "DL-1420190012345"}</strong></div>
              <div><span>Occupation:</span> <strong>{d.occupation || "Cyber Consultant"}</strong></div>
              <div><span>Gender / DOB:</span> <strong>{d.gender || "MALE"} / 1992-04-14</strong></div>
            </div>
          </div>

          <div style={styles.card}>
            <h4>ASSOCIATED CASES & ASSETS</h4>
            <div style={styles.linkList}>
              <div style={styles.linkItem} onClick={() => onSelectEntity("C102")}>
                 <strong>Case C102</strong> (Delhi Cyber Crime FIR-2026-C102)
              </div>
              <div style={styles.linkItem} onClick={() => onSelectEntity("C481")}>
                 <strong>Case C481</strong> (Gurugram Police FIR-2026-C481)
              </div>
              <div style={styles.linkItem} onClick={() => onSelectEntity("V188")}>
                 <strong>Vehicle V188</strong> (Hyundai Creta DL-01-AB-1888)
              </div>
              <div style={styles.linkItem} onClick={() => onSelectEntity("ACC992")}>
                 <strong>Bank Account ACC992</strong> (SBI Connaught Place 3099882211)
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "network" && (
        <div style={styles.card}>
          <h4>GRAPH NETWORK ADJACENCY ({data.network?.nodes?.length || 0} Connected Nodes)</h4>
          <div style={styles.nodeGrid}>
            {data.network?.nodes?.map((node: any) => (
              <div
                key={node.id}
                style={styles.nodeBadge}
                onClick={() => onSelectEntity(node.id)}
              >
                <span>{node.labels?.[0]}</span>
                <strong>{node.properties?.name || node.properties?.title || node.id}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === "evidence" && (
        <div style={styles.card}>
          <h4>CHAIN OF CUSTODY & FORENSIC EVIDENCE ({data.evidence?.length || 0} Items)</h4>
          {data.evidence?.map((ev: any) => (
            <div key={ev.id} style={styles.evCard}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{ev.evidence_number} — {ev.evidence_type}</strong>
                <span style={{ color: "#34d399" }}>{ev.source}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "4px 0" }}>{ev.description}</p>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                Chain: {ev.chain_of_custody?.join(" → ") || "Seized by SI Patel → Cyber Lab"}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === "provenance" && (
        <div style={styles.card}>
          <h4>DATA PROVENANCE & LINEAGE AUDIT</h4>
          <div style={styles.kvGrid}>
            <div><span>Ingested From System:</span> <strong>{prov.source || "CCTNS"}</strong></div>
            <div><span>Source Record Reference:</span> <strong>{prov.evidence_reference || "CCTNS Dossier #P-001"}</strong></div>
            <div><span>Analytical Method:</span> <strong>{d.analytical_method || "DIRECT_RECORD"}</strong></div>
            <div><span>Investigator Review Status:</span> <strong>{prov.review_status || "APPROVED"}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "calc(100vh - 64px)",
    overflowY: "auto",
    background: "#070a0f",
  },
  headerCard: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "16px 20px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  badge: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    width: "fit-content",
  },
  subMeta: {
    display: "flex",
    gap: "16px",
    fontSize: "0.75rem",
    color: "#94a3b8",
  },
  provTag: {
    fontSize: "0.7rem",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textAlign: "right",
  },
  subNav: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "8px",
  },
  subTabBtn: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "0.72rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "4px",
  },
  subTabActive: {
    background: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "16px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  kvGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "8px",
    fontSize: "0.78rem",
    color: "#94a3b8",
  },
  linkList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  linkItem: {
    background: "#070a0f",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "10px",
    borderRadius: "6px",
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: "0.78rem",
  },
  nodeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "10px",
  },
  nodeBadge: {
    background: "#070a0f",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    fontSize: "0.72rem",
    color: "#f8fafc",
  },
  evCard: {
    background: "#070a0f",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "10px",
    borderRadius: "6px",
  },
  quickBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.78rem",
    cursor: "pointer",
  },
};

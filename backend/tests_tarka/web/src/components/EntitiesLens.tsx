import React, { useState } from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface EntityRow {
  id: string;
  name: string;
  type: "PERSON" | "PHONE" | "VEHICLE" | "ACCOUNT" | "LOCATION" | "ORGANIZATION";
  primaryIdentifier: string;
  riskScore: number;
  caseCount: number;
  lastSeen: string;
  status: "PRIMARY_SUSPECT" | "MULE_ACCOUNT" | "OPERATOR" | "KEY_LOCATION" | "ASSOCIATE";
}

const MOCK_ENTITIES: EntityRow[] = [
  {
    id: "P001",
    name: "Vikram Singh (Alias: Vicky Phisher)",
    type: "PERSON",
    primaryIdentifier: "AADH-9012-4410",
    riskScore: 0.94,
    caseCount: 4,
    lastSeen: "2026-08-14 Sector 29 Gurugram",
    status: "PRIMARY_SUSPECT",
  },
  {
    id: "PH001",
    name: "+91 98765 43210",
    type: "PHONE",
    primaryIdentifier: "IMEI-86420104920192",
    riskScore: 0.91,
    caseCount: 3,
    lastSeen: "Delhi Cyber PS Tower Ping",
    status: "OPERATOR",
  },
  {
    id: "ACC992",
    name: "ICICI Bank Mule Account #99210",
    type: "ACCOUNT",
    primaryIdentifier: "IFSC: ICIC0009921",
    riskScore: 0.88,
    caseCount: 5,
    lastSeen: "₹1,25,000 UPI Transfer",
    status: "MULE_ACCOUNT",
  },
  {
    id: "V188",
    name: "DL-01-AB-1234 (Black Mahindra Scorpio)",
    type: "VEHICLE",
    primaryIdentifier: "CHAS-DL2026-8819",
    riskScore: 0.82,
    caseCount: 2,
    lastSeen: "DND Flyway Toll Gate #4",
    status: "ASSOCIATE",
  },
  {
    id: "LOC001",
    name: "Sector 29 Gurugram Cyber Hub Safehouse",
    type: "LOCATION",
    primaryIdentifier: "28.4691° N, 77.0648° E",
    riskScore: 0.79,
    caseCount: 2,
    lastSeen: "CDR Geo-cluster",
    status: "KEY_LOCATION",
  },
];

export const EntitiesLens: React.FC = () => {
  const { selectEntity } = useInvestigation();
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = filterType === "ALL" ? MOCK_ENTITIES : MOCK_ENTITIES.filter((e) => e.type === filterType);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface-primary)",
        color: "var(--text-primary)",
        padding: "16px",
        overflowY: "auto",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
             INVESTIGATIVE ENTITIES DIRECTORY
          </h2>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Indexed criminal network entities, risk scores, and cross-case association metrics.
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["ALL", "PERSON", "PHONE", "VEHICLE", "ACCOUNT", "LOCATION"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                background: filterType === t ? "var(--surface-selected)" : "var(--surface-secondary)",
                border: `1px solid ${filterType === t ? "var(--border-accent)" : "var(--border-subtle)"}`,
                color: filterType === t ? "var(--text-accent)" : "var(--text-secondary)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.68rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entity Table */}
      <div
        style={{
          background: "var(--surface-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAli: "left" } as any}>
          <thead>
            <tr
              style={{
                background: "var(--surface-elevated)",
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <th style={{ padding: "10px 12px" }}>ENTITY ID</th>
              <th style={{ padding: "10px 12px" }}>NAME / IDENTIFIER</th>
              <th style={{ padding: "10px 12px" }}>TYPE</th>
              <th style={{ padding: "10px 12px" }}>RISK SCORE</th>
              <th style={{ padding: "10px 12px" }}>CASES</th>
              <th style={{ padding: "10px 12px" }}>STATUS</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background 0.1s ease",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-accent)", fontFamily: "var(--font-mono)" }}>
                  {item.id}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {item.primaryIdentifier}
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      background: "var(--surface-primary)",
                      color: "var(--text-secondary)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.type}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "50px",
                        height: "6px",
                        background: "var(--surface-primary)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${item.riskScore * 100}%`,
                          height: "100%",
                          background: item.riskScore > 0.9 ? "var(--status-contradicted)" : "var(--status-gap)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        color: item.riskScore > 0.9 ? "var(--status-contradicted)" : "var(--status-gap)",
                      }}
                    >
                      {Math.round(item.riskScore * 100)}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {item.caseCount} FIRs
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      background: "rgba(49, 196, 216, 0.12)",
                      color: "var(--text-accent)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <button
                    onClick={() => selectEntity(item.id)}
                    style={{
                      background: "var(--surface-selected)",
                      border: "1px solid var(--border-accent)",
                      color: "var(--text-accent)",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    OPEN DOSSIER
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface EvidenceRecord {
  id: string;
  title: string;
  sourceSystem: "CCTNS" | "NCRP" | "VAHAN" | "CDR" | "ANPR" | "FINANCIAL" | "FSL";
  recordId: string;
  sha256: string;
  provenanceStage: string;
  confidence: number;
  supportingEntities: string[];
  contradictingEntities: string[];
  status: "VERIFIED" | "PENDING_REVIEW" | "CORROBORATED";
}

const MOCK_EVIDENCE_ITEMS: EvidenceRecord[] = [
  {
    id: "EV-2026-101",
    title: "FSL Digital Forensics Extraction — WhatsApp Chat Log #8042",
    sourceSystem: "FSL",
    recordId: "FSL-DEL-2026-8812",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    provenanceStage: "RAW RECORD ➔ OBSERVATION ➔ SIGNAL ➔ EVIDENCE ➔ CLAIM",
    confidence: 0.99,
    supportingEntities: ["P001", "PH001", "ACC992"],
    contradictingEntities: [],
    status: "CORROBORATED",
  },
  {
    id: "EV-2026-102",
    title: "Bank Statement — ICICI Mule Account ACC992 Ledger",
    sourceSystem: "FINANCIAL",
    recordId: "ICICI-TXN-99120",
    sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    provenanceStage: "RAW RECORD ➔ OBSERVATION ➔ SIGNAL ➔ EVIDENCE",
    confidence: 0.98,
    supportingEntities: ["ACC992", "ACC481"],
    contradictingEntities: [],
    status: "VERIFIED",
  },
  {
    id: "EV-2026-103",
    title: "Telecom Call Data Record — CDR001 (340s Intercept)",
    sourceSystem: "CDR",
    recordId: "AIRTEL-CDR-2026-0814",
    sha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    provenanceStage: "RAW RECORD ➔ SIGNAL ➔ EVIDENCE",
    confidence: 0.95,
    supportingEntities: ["PH001", "PH002"],
    contradictingEntities: [],
    status: "VERIFIED",
  },
  {
    id: "EV-2026-104",
    title: "ANPR Highway Camera Snapshot — DND Flyway Toll Gate #4",
    sourceSystem: "ANPR",
    recordId: "ANPR-DEL-8812",
    sha256: "4b227777d4da1691cb48f219149ce57b28251e76500c9835077717872a128260",
    provenanceStage: "RAW RECORD ➔ OBSERVATION ➔ EVIDENCE",
    confidence: 0.92,
    supportingEntities: ["V188", "P001"],
    contradictingEntities: ["P001_ALIBI_CP"],
    status: "CORROBORATED",
  },
];

export const EvidenceLens: React.FC = () => {
  const { selectEntity, selectEvidence, runCopilotQuery } = useInvestigation();

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
            📋 EVIDENCE PROVENANCE & INTEGRITY SPINE
          </h2>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Cryptographically hashed SHA-256 evidence records linked directly to CCTNS, NCRP, CDR, and FSL sources.
          </div>
        </div>
        <button
          onClick={() => runCopilotQuery("Verify SHA-256 evidence audit hash chain integrity")}
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-accent)",
            color: "var(--text-accent)",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🔒 AUDIT HASH CHAIN
        </button>
      </div>

      {/* Evidence Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
        {MOCK_EVIDENCE_ITEMS.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "var(--status-confirmed)",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    border: "1px solid var(--status-confirmed)",
                  }}
                >
                  {item.status}
                </span>
                <span
                  style={{
                    background: "var(--surface-elevated)",
                    color: "var(--text-accent)",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}
                >
                  {item.sourceSystem}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.id}
                </span>
              </div>

              <span style={{ fontSize: "0.65rem", color: "var(--status-observed)", fontWeight: 700 }}>
                CONFIDENCE: {Math.round(item.confidence * 100)}%
              </span>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {item.title}
            </div>

            {/* SHA-256 Audit Bar */}
            <div
              style={{
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "0.62rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>SHA-256: {item.sha256}</span>
              <span style={{ color: "var(--status-confirmed)", fontWeight: 700 }}>✔ IMMUTABLE</span>
            </div>

            {/* Lineage Trace */}
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              LINEAGE: <span style={{ color: "var(--text-accent)" }}>{item.provenanceStage}</span>
            </div>

            {/* Supporting & Contradicting Badges */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                  SUPPORTING ENTITIES:
                </span>
                {item.supportingEntities.map((ent) => (
                  <button
                    key={ent}
                    onClick={() => selectEntity(ent)}
                    style={{
                      background: "rgba(52, 211, 153, 0.15)",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      color: "#34d399",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {ent}
                  </button>
                ))}
              </div>

              {item.contradictingEntities.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    CONTRADICTS:
                  </span>
                  {item.contradictingEntities.map((ent) => (
                    <span
                      key={ent}
                      style={{
                        background: "rgba(226, 109, 120, 0.15)",
                        border: "1px solid var(--status-contradicted)",
                        color: "var(--status-contradicted)",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                      }}
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => selectEvidence(item.id)}
                style={{
                  marginLeft: "auto",
                  background: "var(--surface-primary)",
                  border: "1px solid var(--border-accent)",
                  color: "var(--text-accent)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                INSPECT EVIDENCE GAPS
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

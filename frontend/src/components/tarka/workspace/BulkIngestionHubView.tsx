import React from "react";
import {
  FileUp,
  Cpu,
  FileSpreadsheet,
  Network,
} from "lucide-react";
import type { CaseWorkspace } from "../../../context/TarkaGlobalContext";

interface BulkIngestionHubViewProps {
  cases: CaseWorkspace[];
  onOpenUploadModal: () => void;
}

export const BulkIngestionHubView: React.FC<BulkIngestionHubViewProps> = ({
  cases,
  onOpenUploadModal,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflowY: "auto",
        padding: "16px 20px",
        gap: "16px",
        scrollbarWidth: "thin",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Cpu size={16} color="#4F46E5" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
              HIGH-THROUGHPUT BULK EVIDENCE INGESTION PIPELINE
            </h3>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748B", maxWidth: "600px" }}>
            Streams 50,000+ row bank statements, NPCI UPI logs, and 100,000+ telecom CDRs off the main UI thread via dedicated Web Workers with real-time SHA-256 bitstream validation.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUploadModal}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: "#4F46E5",
            color: "#FFFFFF",
            fontSize: "11.5px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
          }}
        >
          <FileUp size={14} />
          <span>⚡ Ingest New Bulk Dataset</span>
        </button>
      </div>

      {/* 3 Pipeline Architecture Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#059669", fontWeight: 800, fontSize: "11px" }}>
            <FileSpreadsheet size={14} />
            <span>CORE BANKING STATEMENTS (CBS)</span>
          </div>
          <p style={{ fontSize: "10.5px", color: "#475569", margin: "6px 0 0 0", lineHeight: 1.4 }}>
            Finacle, BaNCS, and Flexcube CSVs. Verifies balance arithmetic (B_t = B_prev + Credit - Debit) and identifies missing statement intervals.
          </p>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0284C7", fontWeight: 800, fontSize: "11px" }}>
            <Network size={14} />
            <span>TELECOM CDR & IPDR LOGS</span>
          </div>
          <p style={{ fontSize: "10.5px", color: "#475569", margin: "6px 0 0 0", lineHeight: 1.4 }}>
            Airtel, Jio, and Vi lawful intercept exports. Strictly auto-blinds non-target citizen records under RFC-6962 Merkle tree prior to memory hydration.
          </p>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4F46E5", fontWeight: 800, fontSize: "11px" }}>
            <Cpu size={14} />
            <span>NPCI UPI 2.0 XML TELEMETRY</span>
          </div>
          <p style={{ fontSize: "10.5px", color: "#475569", margin: "6px 0 0 0", lineHeight: 1.4 }}>
            Central Switch T1 stanzas. Extracts device BSSID, JA4 TLS hashes, app signatures, and GPS coordinates under BSA §63(4).
          </p>
        </div>
      </div>

      {/* Ingested Exhibits Across All Cases */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", fontSize: "11px", fontWeight: 800, color: "#1E293B" }}>
          ACTIVE CASE EXHIBIT LEDGER ({cases.reduce((a: number, c) => a + c.artifacts.length, 0)} VERIFIED ARTIFACTS)
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F1F5F9", color: "#475569", borderBottom: "1px solid #CBD5E1" }}>
              <th style={{ padding: "6px 10px" }}>Case ID</th>
              <th style={{ padding: "6px 10px" }}>Filename</th>
              <th style={{ padding: "6px 10px" }}>Vector</th>
              <th style={{ padding: "6px 10px" }}>Size</th>
              <th style={{ padding: "6px 10px" }}>SHA-256 Digest</th>
              <th style={{ padding: "6px 10px" }}>Integrity Gate</th>
            </tr>
          </thead>
          <tbody>
            {cases.flatMap((c) =>
              c.artifacts.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#4F46E5" }}>
                    {c.caseId}
                  </td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0F172A" }}>{a.filename}</td>
                  <td style={{ padding: "6px 10px", color: "#475569" }}>{a.vectorType}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)" }}>
                    {a.byteSize > 1000000 ? `${(a.byteSize / 1000000).toFixed(1)} MB` : `${Math.round(a.byteSize / 1024)} KB`}
                  </td>
                  <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#64748B" }}>
                    {a.sha256.slice(0, 16)}...{a.sha256.slice(-8)}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: a.gateStatus === "PASS" ? "#ECFDF5" : "#FFF1F2",
                        color: a.gateStatus === "PASS" ? "#047857" : "#BE123C",
                      }}
                    >
                      {a.gateStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

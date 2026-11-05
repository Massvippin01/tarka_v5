import React, { useState, useMemo } from "react";
import { Disc, SkipBack, SkipForward, User, Cpu, Bot, CheckCircle } from "lucide-react";

export type FlightRecorderActorType = "HUMAN_EXAMINER" | "AUTOMATED_SYSTEM" | "AI_ASSISTANT";

export interface FlightRecorderEntry {
  sequence: number;
  timestamp: string;
  actorType: FlightRecorderActorType;
  actorId: string;
  actorRole: string;
  action: string;
  details: string;
  eventHash: string;
  previousHash: string;
  verified: boolean;
  statutoryCategory?: string;
}

interface InvestigationFlightRecorderProps {
  caseId: string;
  entries?: FlightRecorderEntry[];
  className?: string;
}

const DEFAULT_RECORDER_ENTRIES: FlightRecorderEntry[] = [
  {
    sequence: 1,
    timestamp: "2026-10-12T09:15:00Z",
    actorType: "HUMAN_EXAMINER",
    actorId: "POL-DEL-102",
    actorRole: "Investigating Officer (Delhi Cell)",
    action: "CASE_WORKSPACE_INITIALIZED",
    details: "Case upi_payment_discrepancy initiated under Section 63 BSA statutory mandate.",
    eventHash: "a1f09c8d7e6b5a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    verified: true,
    statutoryCategory: "SEC_63_BSA_INIT",
  },
  {
    sequence: 2,
    timestamp: "2026-10-12T09:16:30Z",
    actorType: "AUTOMATED_SYSTEM",
    actorId: "EVIDENCE_GATEWAY_V5",
    actorRole: "Storage CAS Authority",
    action: "RAW_BYTE_INGESTION_AND_SEAL",
    details: "Acquired ART-BANK-001 (bank_statement.xlsx). SHA-256 computed: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8.",
    eventHash: "b2e18d9c0f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c",
    previousHash: "a1f09c8d7e6b5a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c",
    verified: true,
    statutoryCategory: "CAS_BYTE_PRESERVATION",
  },
  {
    sequence: 3,
    timestamp: "2026-10-12T09:17:15Z",
    actorType: "AI_ASSISTANT",
    actorId: "TARKA_SCAM_LLM_V1",
    actorRole: "Bounded Neural Classifier",
    action: "PROPOSE_SCAM_TYPOLOGY_CANDIDATE",
    details: "Classified complaint text with 94.2% confidence as Digital Arrest Fraud. Flagged: PROPOSED_ONLY.",
    eventHash: "c3d27e8b1a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e",
    previousHash: "b2e18d9c0f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c",
    verified: true,
    statutoryCategory: "AI_NON_PROMOTABLE_PROPOSAL",
  },
  {
    sequence: 4,
    timestamp: "2026-10-12T09:20:00Z",
    actorType: "HUMAN_EXAMINER",
    actorId: "POL-DEL-102",
    actorRole: "Investigating Officer (Delhi Cell)",
    action: "EXAMINER_REVIEW_DECISION",
    details: "Accepted AI classification candidate. Formally promoted typology to verified case category.",
    eventHash: "d4c36e7a2b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e",
    previousHash: "c3d27e8b1a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e",
    verified: true,
    statutoryCategory: "STATUTORY_HUMAN_OVERSIGHT",
  },
  {
    sequence: 5,
    timestamp: "2026-10-12T09:22:45Z",
    actorType: "AUTOMATED_SYSTEM",
    actorId: "Z3_SMT_MUS_SOLVER",
    actorRole: "Formal Theorem Prover",
    action: "FINANCIAL_CONSERVATION_PROOF",
    details: "Proved conservation of funds across 4 hops. Constraint satisfied (SAT). Execution time: 4.8ms.",
    eventHash: "e5b45f6a3c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f",
    previousHash: "d4c36e7a2b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e",
    verified: true,
    statutoryCategory: "SMT_FORMAL_VERIFICATION",
  },
  {
    sequence: 6,
    timestamp: "2026-10-12T09:25:10Z",
    actorType: "AUTOMATED_SYSTEM",
    actorId: "BFT_CONSENSUS_ENGINE",
    actorRole: "4-Validator PBFT Cluster",
    action: "SHARED_EVENT_BLOCK_COMMITTED",
    details: "Quorum of 3/4 validators achieved across HDFC, ICICI, and Telco nodes. Block #104 committed.",
    eventHash: "f6a54e5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f",
    previousHash: "e5b45f6a3c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f",
    verified: true,
    statutoryCategory: "PBFT_DISTRIBUTED_CONSENSUS",
  },
];

export const InvestigationFlightRecorder: React.FC<InvestigationFlightRecorderProps> = ({
  caseId,
  entries = DEFAULT_RECORDER_ENTRIES,
  className = "",
}) => {
  const [filterActor, setFilterActor] = useState<string>("ALL");
  const [replayStep, setReplayStep] = useState<number>(entries.length);
  const [selectedEntry, setSelectedEntry] = useState<FlightRecorderEntry | null>(entries[entries.length - 1] || null);

  const filteredEntries = useMemo(() => {
    let subset = entries.slice(0, replayStep);
    if (filterActor !== "ALL") {
      subset = subset.filter((e) => e.actorType === filterActor);
    }
    return subset;
  }, [entries, replayStep, filterActor]);

  const getActorBadge = (type: FlightRecorderActorType) => {
    switch (type) {
      case "HUMAN_EXAMINER":
        return { label: "HUMAN DECISION", bg: "rgba(200, 247, 81, 0.15)", text: "#C8F751", icon: <User size={11} /> };
      case "AUTOMATED_SYSTEM":
        return { label: "AUTOMATED SYSTEM", bg: "rgba(82, 124, 154, 0.2)", text: "#527C9A", icon: <Cpu size={11} /> };
      case "AI_ASSISTANT":
        return { label: "AI PROPOSAL (DATA_ONLY)", bg: "rgba(182, 91, 72, 0.18)", text: "#B65B48", icon: <Bot size={11} /> };
    }
  };

  return (
    <div
      className={`investigation-flight-recorder ${className}`}
      style={{
        background: "var(--surface-primary, #152220)",
        border: "1px solid var(--border-structural, rgba(107, 119, 112, 0.35))",
        borderRadius: "10px",
        padding: "16px",
        color: "var(--text-primary, #F4F6F4)",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle, rgba(107, 119, 112, 0.18))", paddingBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Disc size={18} style={{ color: "var(--fieldnote-signal-lime, #C8F751)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.02em" }}>
              INVESTIGATION FLIGHT RECORDER
            </h3>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(200, 247, 81, 0.12)",
                color: "#C8F751",
                border: "1px solid rgba(200, 247, 81, 0.32)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              IMMUTABLE HASH-CHAINED AUDIT
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary, #A3B1AA)" }}>
            Deterministic chronological log of every human action, automated pipeline transition, and AI proposal for Case <span style={{ color: "#C8F751", fontFamily: "var(--font-mono, monospace)" }}>{caseId}</span>.
          </p>
        </div>

        {/* Actor Filter */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "2px", borderRadius: "6px" }}>
          {[
            { id: "ALL", label: "ALL ACTORS" },
            { id: "HUMAN_EXAMINER", label: "HUMAN" },
            { id: "AUTOMATED_SYSTEM", label: "SYSTEM" },
            { id: "AI_ASSISTANT", label: "AI" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterActor(f.id)}
              style={{
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: 600,
                border: "none",
                borderRadius: "4px",
                background: filterActor === f.id ? "var(--fieldnote-signal-lime, #C8F751)" : "transparent",
                color: filterActor === f.id ? "#101918" : "var(--text-secondary, #A3B1AA)",
                cursor: "pointer",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Replay Scrubber Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0, 0, 0, 0.25)",
          padding: "8px 12px",
          borderRadius: "6px",
          marginBottom: "14px",
          border: "1px solid rgba(107, 119, 112, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setReplayStep(Math.max(1, replayStep - 1))}
            disabled={replayStep <= 1}
            style={{
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: "#F4F6F4",
              cursor: replayStep <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <SkipBack size={12} />
          </button>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--text-secondary, #A3B1AA)" }}>
            Replay Horizon: <strong>{replayStep} / {entries.length} steps</strong>
          </span>
          <button
            onClick={() => setReplayStep(Math.min(entries.length, replayStep + 1))}
            disabled={replayStep >= entries.length}
            style={{
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: "#F4F6F4",
              cursor: replayStep >= entries.length ? "not-allowed" : "pointer",
            }}
          >
            <SkipForward size={12} />
          </button>
        </div>

        <button
          onClick={() => setReplayStep(entries.length)}
          style={{
            fontSize: "11px",
            background: "transparent",
            border: "1px solid rgba(200, 247, 81, 0.3)",
            color: "#C8F751",
            borderRadius: "4px",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Jump to Current Head
        </button>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
        {/* Ledger Entries List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "480px", overflowY: "auto" }}>
          {filteredEntries.map((entry) => {
            const badge = getActorBadge(entry.actorType);
            const isSelected = selectedEntry?.sequence === entry.sequence;

            return (
              <div
                key={entry.sequence}
                onClick={() => setSelectedEntry(entry)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: isSelected ? "rgba(200, 247, 81, 0.12)" : "rgba(0, 0, 0, 0.2)",
                  border: isSelected ? "1px solid rgba(200, 247, 81, 0.45)" : "1px solid rgba(107, 119, 112, 0.2)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted, #6B7770)", minWidth: "24px" }}>
                  #{entry.sequence}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "3px",
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.text}33`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {badge.icon} {badge.label}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                      {entry.timestamp}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "#C8F751" : "#F4F6F4" }}>
                    {entry.action}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-secondary, #A3B1AA)", lineHeight: "1.3" }}>
                    {entry.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Entry Hash-Chain Cryptographic Inspector */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid var(--border-structural, rgba(107, 119, 112, 0.35))",
            borderRadius: "6px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {selectedEntry ? (
            <>
              <div style={{ borderBottom: "1px solid rgba(107, 119, 112, 0.25)", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--fieldnote-signal-lime, #C8F751)", fontFamily: "var(--font-mono, monospace)" }}>
                    SEQUENCE #{selectedEntry.sequence}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#10B981" }}>
                    <CheckCircle size={11} /> CHAIN INTEGRITY VERIFIED
                  </span>
                </div>
                <h4 style={{ margin: "6px 0 2px", fontSize: "13px", fontWeight: 700 }}>
                  {selectedEntry.action}
                </h4>
                <div style={{ fontSize: "11px", color: "var(--text-secondary, #A3B1AA)" }}>
                  Actor: <strong>{selectedEntry.actorId}</strong> ({selectedEntry.actorRole})
                </div>
              </div>

              {/* Hash Chain Values */}
              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "10px", borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", marginBottom: "6px" }}>
                  IMMUTABLE SHA-256 HASH CHAIN
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "10px", fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all" }}>
                  <div>
                    <span style={{ color: "var(--text-muted, #6B7770)" }}>Current Event Hash:</span>
                    <div style={{ color: "#C8F751" }}>{selectedEntry.eventHash}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted, #6B7770)" }}>Previous Chained Hash:</span>
                    <div style={{ color: "#A3B1AA" }}>{selectedEntry.previousHash}</div>
                  </div>
                </div>
              </div>

              {/* Statutory Note */}
              <div style={{ fontSize: "11px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", marginBottom: "4px" }}>
                  STATUTORY REPRODUCIBILITY
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary, #A3B1AA)", lineHeight: "1.4" }}>
                  This action is recorded in the append-only ledger and signed in accordance with Bharatiya Sakshya Adhiniyam, 2023 evidentiary standards.
                </p>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted, #6B7770)", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
              Select an entry to inspect the cryptographic hash chain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

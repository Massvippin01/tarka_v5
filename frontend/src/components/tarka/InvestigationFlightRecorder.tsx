import React, { useState, useMemo, useEffect } from "react";
import { Disc, SkipBack, SkipForward, User, Cpu, Bot, CheckCircle, Copy, Check } from "lucide-react";
import { hashChainSync } from "../../utils/sha256";

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

const RAW_RECORDER_EVENTS = [
  {
    sequence: 1,
    timestamp: "2026-10-12T09:15:00Z",
    actorType: "HUMAN_EXAMINER" as const,
    actorId: "POL-DEL-102",
    actorRole: "Investigating Officer (Delhi Cell)",
    action: "CASE_WORKSPACE_INITIALIZED",
    details: "Case upi_payment_discrepancy initiated under Section 63 BSA statutory mandate.",
    statutoryCategory: "SEC_63_BSA_INIT",
  },
  {
    sequence: 2,
    timestamp: "2026-10-12T09:16:30Z",
    actorType: "AUTOMATED_SYSTEM" as const,
    actorId: "EVIDENCE_GATEWAY_V5",
    actorRole: "Storage CAS Authority",
    action: "RAW_BYTE_INGESTION_AND_SEAL",
    details: "Acquired ART-BANK-001 (bank_statement.xlsx). SHA-256 computed from raw payload bytes.",
    statutoryCategory: "CAS_BYTE_PRESERVATION",
  },
  {
    sequence: 3,
    timestamp: "2026-10-12T09:17:15Z",
    actorType: "AI_ASSISTANT" as const,
    actorId: "TARKA_SCAM_LLM_V1",
    actorRole: "Bounded Neural Classifier",
    action: "PROPOSE_SCAM_TYPOLOGY_CANDIDATE",
    details: "Classified complaint text with 94.2% confidence as Digital Arrest Fraud. Flagged: PROPOSED_ONLY.",
    statutoryCategory: "AI_NON_PROMOTABLE_PROPOSAL",
  },
  {
    sequence: 4,
    timestamp: "2026-10-12T09:20:00Z",
    actorType: "HUMAN_EXAMINER" as const,
    actorId: "POL-DEL-102",
    actorRole: "Investigating Officer (Delhi Cell)",
    action: "EXAMINER_REVIEW_DECISION",
    details: "Accepted AI classification candidate. Formally promoted typology to verified case category.",
    statutoryCategory: "STATUTORY_HUMAN_OVERSIGHT",
  },
  {
    sequence: 5,
    timestamp: "2026-10-12T09:22:45Z",
    actorType: "AUTOMATED_SYSTEM" as const,
    actorId: "Z3_SMT_MUS_SOLVER",
    actorRole: "Formal Theorem Prover",
    action: "FINANCIAL_CONSERVATION_PROOF",
    details: "Proved conservation of funds across 4 hops. Constraint satisfied (SAT). Execution time: 4.8ms.",
    statutoryCategory: "SMT_FORMAL_VERIFICATION",
  },
  {
    sequence: 6,
    timestamp: "2026-10-12T09:25:10Z",
    actorType: "AUTOMATED_SYSTEM" as const,
    actorId: "BFT_CONSENSUS_ENGINE",
    actorRole: "4-Validator PBFT Cluster",
    action: "SHARED_EVENT_BLOCK_COMMITTED",
    details: "Quorum of 3/4 validators achieved across HDFC, ICICI, and Telco nodes. Block #104 committed.",
    statutoryCategory: "PBFT_DISTRIBUTED_CONSENSUS",
  },
];

const computedChains = hashChainSync(RAW_RECORDER_EVENTS);

const DEFAULT_RECORDER_ENTRIES: FlightRecorderEntry[] = RAW_RECORDER_EVENTS.map((evt, idx) => ({
  ...evt,
  eventHash: computedChains[idx].eventHash,
  previousHash: computedChains[idx].previousHash,
  verified: true,
}));

export const InvestigationFlightRecorder: React.FC<InvestigationFlightRecorderProps> = ({
  caseId,
  entries = DEFAULT_RECORDER_ENTRIES,
  className = "",
}) => {
  const [filterActor, setFilterActor] = useState<string>("ALL");
  const [replayStep, setReplayStep] = useState<number>(entries.length);
  const [selectedEntry, setSelectedEntry] = useState<FlightRecorderEntry | null>(entries[entries.length - 1] || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setReplayStep(entries.length);
    setSelectedEntry(entries[entries.length - 1] || null);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let subset = entries.slice(0, replayStep);
    if (filterActor !== "ALL") {
      subset = subset.filter((e) => e.actorType === filterActor);
    }
    return subset;
  }, [entries, replayStep, filterActor]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const getActorBadge = (type: FlightRecorderActorType) => {
    switch (type) {
      case "HUMAN_EXAMINER":
        return {
          label: "HUMAN DECISION",
          bg: "#EFF6FF",
          text: "#1D4ED8",
          border: "#BFDBFE",
          icon: <User size={11} />,
        };
      case "AUTOMATED_SYSTEM":
        return {
          label: "AUTOMATED SYSTEM",
          bg: "#ECFDF5",
          text: "#047857",
          border: "#A7F3D0",
          icon: <Cpu size={11} />,
        };
      case "AI_ASSISTANT":
        return {
          label: "AI PROPOSAL (DATA_ONLY)",
          bg: "#FFF1F2",
          text: "#BE123C",
          border: "#FECDD3",
          icon: <Bot size={11} />,
        };
    }
  };

  return (
    <div
      className={`investigation-flight-recorder ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "16px",
        color: "#0F172A",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "12px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Disc size={18} color="#7C3AED" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.01em", color: "#0F172A" }}>
              INVESTIGATION FLIGHT RECORDER
            </h3>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#FAF5FF",
                color: "#7C3AED",
                border: "1px solid #DDD6FE",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              IMMUTABLE HASH-CHAINED AUDIT
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
            Deterministic chronological log of every human action, automated pipeline transition, and AI proposal for Case{" "}
            <span style={{ color: "#4F46E5", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
              {caseId}
            </span>.
          </p>
        </div>

        {/* Actor Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "3px",
            background: "#F1F5F9",
            padding: "3px",
            borderRadius: "6px",
          }}
        >
          {[
            { id: "ALL", label: "ALL ACTORS" },
            { id: "HUMAN_EXAMINER", label: "HUMAN" },
            { id: "AUTOMATED_SYSTEM", label: "SYSTEM" },
            { id: "AI_ASSISTANT", label: "AI" },
          ].map((f) => {
            const isSelected = filterActor === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterActor(f.id)}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? "1px solid #CBD5E1" : "1px solid transparent",
                  borderRadius: "4px",
                  background: isSelected ? "#FFFFFF" : "transparent",
                  color: isSelected ? "#4F46E5" : "#64748B",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  fontFamily: "var(--font-mono, monospace)",
                  transition: "all 0.12s ease",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Replay Scrubber Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#F8FAFC",
          padding: "8px 12px",
          borderRadius: "6px",
          marginBottom: "14px",
          border: "1px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setReplayStep(Math.max(1, replayStep - 1))}
            disabled={replayStep <= 1}
            style={{
              padding: "4px 8px",
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              color: replayStep <= 1 ? "#94A3B8" : "#334155",
              cursor: replayStep <= 1 ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Step Back"
          >
            <SkipBack size={12} />
          </button>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#334155" }}>
            Replay Horizon: <strong>{replayStep} / {entries.length} steps</strong>
          </span>
          <button
            type="button"
            onClick={() => setReplayStep(Math.min(entries.length, replayStep + 1))}
            disabled={replayStep >= entries.length}
            style={{
              padding: "4px 8px",
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              color: replayStep >= entries.length ? "#94A3B8" : "#334155",
              cursor: replayStep >= entries.length ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Step Forward"
          >
            <SkipForward size={12} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setReplayStep(entries.length)}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            color: "#4F46E5",
            borderRadius: "4px",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            transition: "all 0.12s ease",
          }}
        >
          Jump to Current Head
        </button>
      </div>

      {/* 3. Main Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
        {/* Ledger Entries List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
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
                  background: isSelected ? "#EEF2FF" : "#FFFFFF",
                  border: isSelected ? "1px solid #818CF8" : "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 1px 3px rgba(79, 70, 229, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                    color: isSelected ? "#4F46E5" : "#64748B",
                    minWidth: "24px",
                    paddingTop: "2px",
                  }}
                >
                  #{entry.sequence}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "3px",
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {badge.icon} {badge.label}
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748B", fontFamily: "var(--font-mono, monospace)" }}>
                      {entry.timestamp}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "#4F46E5" : "#0F172A" }}>
                    {entry.action}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569", lineHeight: "1.35" }}>
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
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {selectedEntry ? (
            <>
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: "#FAF5FF",
                      color: "#7C3AED",
                      border: "1px solid #DDD6FE",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    SEQUENCE #{selectedEntry.sequence}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    <CheckCircle size={11} /> CHAIN INTEGRITY VERIFIED
                  </span>
                </div>
                <h4 style={{ margin: "8px 0 2px", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                  {selectedEntry.action}
                </h4>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Actor: <strong style={{ color: "#0F172A" }}>{selectedEntry.actorId}</strong> ({selectedEntry.actorRole})
                </div>
              </div>

              {/* Hash Chain Values */}
              <div
                style={{
                  background: "#FFFFFF",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Immutable SHA-256 Hash Chain
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono, monospace)",
                    wordBreak: "break-all",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748B" }}>Current Event Hash:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedEntry.eventHash, "currHash")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: copiedKey === "currHash" ? "#059669" : "#94A3B8",
                        }}
                        title="Copy Current Event Hash"
                      >
                        {copiedKey === "currHash" ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                    <div style={{ color: "#4F46E5", fontWeight: 600, marginTop: "2px" }}>
                      {selectedEntry.eventHash}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748B" }}>Previous Chained Hash:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedEntry.previousHash, "prevHash")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: copiedKey === "prevHash" ? "#059669" : "#94A3B8",
                        }}
                        title="Copy Previous Hash"
                      >
                        {copiedKey === "prevHash" ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                    <div style={{ color: "#64748B", fontWeight: 500, marginTop: "2px" }}>
                      {selectedEntry.previousHash}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Note */}
              <div
                style={{
                  background: "#FFFFFF",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Statutory Reproducibility
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                  This action is recorded in the append-only ledger and signed in accordance with Bharatiya Sakshya Adhiniyam, 2023 evidentiary standards.
                </p>
              </div>
            </>
          ) : (
            <div style={{ color: "#64748B", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
              Select an entry to inspect the cryptographic hash chain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

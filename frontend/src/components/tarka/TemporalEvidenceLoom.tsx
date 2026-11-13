import React, { useState, useMemo, useEffect } from "react";
import { Clock, Layers, GitCommit, AlertOctagon, Sliders, Copy, Check } from "lucide-react";
import { sha256HexSync, canonicalJson } from "../../utils/sha256";
import { validateChronology, formatChronologyTimestamp } from "../../utils/chronologyValidator";
import { formatInr } from "../../utils/formatters";

export interface LoomTrackEvent {
  id: string;
  track: "BANKING" | "TELECOM" | "DEVICE" | "COMPLAINT" | "CAS_INGEST";
  title: string;
  sourceTimestamp: string;
  receivedTimestamp: string;
  clockOffsetMs: number;
  confidence: number;
  artifactId: string;
  artifactHash: string;
  hasContradiction?: boolean;
  contradictionNote?: string;
  details: Record<string, any>;
}

interface TemporalEvidenceLoomProps {
  caseId: string;
  events?: LoomTrackEvent[];
  onSelectEvent?: (event: LoomTrackEvent) => void;
  className?: string;
}

const RAW_LOOM_EVENTS = [
  {
    id: "LOOM-EVT-001",
    track: "TELECOM" as const,
    title: "SIM-Swap Event Triggered at Telco Tower (NCR-Gurugram)",
    sourceTimestamp: "2026-10-12T09:10:00Z",
    receivedTimestamp: "2026-10-12T09:11:00Z",
    clockOffsetMs: 60000,
    confidence: 0.98,
    artifactId: "ART-CDR-99120",
    hasContradiction: true,
    contradictionNote: "IMSI activated on tower while subscriber passport records departure to Dubai",
    details: { imsi: "404450192837192", tower_id: "DEL-SEC-4-TOWER", cell_id: "CELL-981" },
  },
  {
    id: "LOOM-EVT-002",
    track: "DEVICE" as const,
    title: "IPDR Handshake from CGNAT Pool (Port Allocation 18420)",
    sourceTimestamp: "2026-10-12T09:24:39Z",
    receivedTimestamp: "2026-10-12T09:24:40Z",
    clockOffsetMs: 1000,
    confidence: 0.94,
    artifactId: "ART-IPDR-POOL-04",
    details: { public_ip: "103.21.144.12", translated_port: 18420, private_ip: "10.48.12.9" },
  },
  {
    id: "LOOM-EVT-003",
    track: "BANKING" as const,
    title: "Primary UPI Debit: Victim to Layer-1 Mule (A/C 99182)",
    sourceTimestamp: "2026-10-12T09:25:00Z",
    receivedTimestamp: "2026-10-12T09:25:02Z",
    clockOffsetMs: 2000,
    confidence: 1.0,
    artifactId: "ART-UPI-TX-001",
    details: { rrn: "428190019281", amount: "₹1,84,000", remitter: "sunita@okhdfc", beneficiary: "mule1@ybl" },
  },
  {
    id: "LOOM-EVT-004",
    track: "BANKING" as const,
    title: "Layer-1 Split: Mule Account to 3 Digital Wallets",
    sourceTimestamp: "2026-10-12T09:28:10Z",
    receivedTimestamp: "2026-10-12T09:28:12Z",
    clockOffsetMs: 2000,
    confidence: 1.0,
    artifactId: "ART-UPI-TX-002",
    details: { splits: "₹60,000 + ₹60,000 + ₹64,000", latency_seconds: "190s" },
  },
  {
    id: "LOOM-EVT-005",
    track: "COMPLAINT" as const,
    title: "1930 NCRP Cyber Crime Portal Complaint Registered",
    sourceTimestamp: "2026-10-12T09:45:00Z",
    receivedTimestamp: "2026-10-12T09:45:22Z",
    clockOffsetMs: 22000,
    confidence: 1.0,
    artifactId: "ART-NCRP-88219",
    details: { victim: "Smt. Sunita Rao", reported_loss: "₹1,84,000", typology: "Digital Arrest Fraud" },
  },
  {
    id: "LOOM-EVT-006",
    track: "CAS_INGEST" as const,
    title: "Evidence Gateway Bitstream Acquisition & Section 63 BSA Checksum Seal",
    sourceTimestamp: "2026-10-12T09:50:00Z",
    receivedTimestamp: "2026-10-12T09:50:01Z",
    clockOffsetMs: 1000,
    confidence: 1.0,
    artifactId: "ART-CAS-SEAL-01",
    details: { status: "BITSTREAM_SEALED", storage_tier: "IMMUTABLE_CAS_S3" },
  },
];

const DEFAULT_LOOM_EVENTS: LoomTrackEvent[] = RAW_LOOM_EVENTS.map((evt) => ({
  ...evt,
  artifactHash: sha256HexSync(canonicalJson({ id: evt.id, title: evt.title, artifactId: evt.artifactId })),
}));

export const TemporalEvidenceLoom: React.FC<TemporalEvidenceLoomProps> = ({
  caseId,
  events = DEFAULT_LOOM_EVENTS,
  onSelectEvent,
  className = "",
}) => {
  const [selectedTrack, setSelectedTrack] = useState<string>("ALL");
  const [activeEvent, setActiveEvent] = useState<LoomTrackEvent | null>(events[0] || null);
  const [showDriftOverlay, setShowDriftOverlay] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<"IST" | "UTC">("IST");

  useEffect(() => {
    setActiveEvent(events[0] || null);
  }, [events]);

  const chronologyAnalysis = useMemo(() => {
    return validateChronology(events);
  }, [events]);

  const conflictMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of chronologyAnalysis.conflicts) {
      map.set(c.eventId, c.message);
    }
    return map;
  }, [chronologyAnalysis]);

  const tracks: LoomTrackEvent["track"][] = ["COMPLAINT", "TELECOM", "BANKING", "DEVICE", "CAS_INGEST"];

  const filteredEvents = useMemo(() => {
    if (selectedTrack === "ALL") return events;
    return events.filter((e) => e.track === selectedTrack);
  }, [events, selectedTrack]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const getTrackBadge = (track: LoomTrackEvent["track"]) => {
    switch (track) {
      case "COMPLAINT":
        return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", dot: "#D97706" };
      case "TELECOM":
        return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", dot: "#2563EB" };
      case "BANKING":
        return { bg: "#ECFDF5", border: "#A7F3D0", text: "#047857", dot: "#059669" };
      case "DEVICE":
        return { bg: "#F0FDFA", border: "#99F6E4", text: "#0F766E", dot: "#0D9488" };
      case "CAS_INGEST":
        return { bg: "#FAF5FF", border: "#DDD6FE", text: "#6D28D9", dot: "#7C3AED" };
      default:
        return { bg: "#F1F5F9", border: "#CBD5E1", text: "#475569", dot: "#64748B" };
    }
  };

  return (
    <div
      className={`temporal-evidence-loom ${className}`}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Layers size={18} color="#4F46E5" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.01em", color: "#0F172A" }}>
              TEMPORAL EVIDENCE LOOM
            </h3>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#EEF2FF",
                color: "#4F46E5",
                border: "1px solid #C7D2FE",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              MULTI-SOURCE TRACK CORRELATION
            </span>
            {chronologyAnalysis.conflictCount > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "#FEE2E2",
                  color: "#B91C1C",
                  border: "1px solid #FCA5A5",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                <AlertOctagon size={12} color="#DC2626" />
                {chronologyAnalysis.conflictCount} CHRONOLOGY CONFLICT{chronologyAnalysis.conflictCount > 1 ? "S" : ""}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
            Cross-institution synchronized multi-track temporal alignment, dual timestamps, and clock drift isolation for Case{" "}
            <span style={{ color: "#4F46E5", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
              {caseId}
            </span>.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setTimezone((tz) => (tz === "IST" ? "UTC" : "IST"))}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              background: timezone === "IST" ? "#F0FDF4" : "#F8FAFC",
              color: timezone === "IST" ? "#166534" : "#334155",
              border: `1px solid ${timezone === "IST" ? "#BBF7D0" : "#CBD5E1"}`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.12s ease",
            }}
          >
            <Clock size={12} />
            Timezone: <strong>{timezone}</strong>
          </button>

          <button
            type="button"
            onClick={() => setShowDriftOverlay(!showDriftOverlay)}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              background: showDriftOverlay ? "#EFF6FF" : "#F8FAFC",
              color: showDriftOverlay ? "#1D4ED8" : "#64748B",
              border: `1px solid ${showDriftOverlay ? "#BFDBFE" : "#CBD5E1"}`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.12s ease",
            }}
          >
            <Sliders size={12} />
            {showDriftOverlay ? "Hide Clock Offsets" : "Show Clock Offsets"}
          </button>

          <div
            style={{
              display: "flex",
              gap: "3px",
              background: "#F1F5F9",
              padding: "3px",
              borderRadius: "6px",
            }}
          >
            {["ALL", ...tracks].map((t) => {
              const isSelected = selectedTrack === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTrack(t)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
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
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Main Multi-Track Canvas & Inspector Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
        {/* Left Column: Track Lanes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tracks.map((trackName) => {
            const trackEvts = filteredEvents.filter((e) => e.track === trackName);
            if (selectedTrack !== "ALL" && selectedTrack !== trackName) return null;

            const badge = getTrackBadge(trackName);

            return (
              <div
                key={trackName}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "10px 12px",
                }}
              >
                {/* Track Lane Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: badge.dot,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {trackName} TRACK
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      color: "#64748B",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {trackEvts.length} observation{trackEvts.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Track Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {trackEvts.length === 0 ? (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        fontStyle: "italic",
                        padding: "6px 4px",
                      }}
                    >
                      No events registered on this track for current filter window.
                    </div>
                  ) : (
                    trackEvts.map((evt) => {
                      const isSelected = activeEvent?.id === evt.id;
                      const hasConflict = conflictMap.has(evt.id);
                      return (
                        <div
                          key={evt.id}
                          onClick={() => {
                            setActiveEvent(evt);
                            onSelectEvent?.(evt);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: isSelected
                              ? "#EEF2FF"
                              : hasConflict
                              ? "#FEF2F2"
                              : evt.hasContradiction
                              ? "#FFF1F2"
                              : "#FFFFFF",
                            border: isSelected
                              ? "1px solid #818CF8"
                              : hasConflict
                              ? "1px solid #FCA5A5"
                              : evt.hasContradiction
                              ? "1px solid #FECDD3"
                              : "1px solid #E2E8F0",
                            borderRadius: "5px",
                            padding: "8px 10px",
                            cursor: "pointer",
                            boxShadow: isSelected
                              ? "0 1px 3px rgba(79, 70, 229, 0.15)"
                              : "0 1px 2px rgba(0,0,0,0.02)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {hasConflict ? (
                              <AlertOctagon size={14} color="#DC2626" />
                            ) : evt.hasContradiction ? (
                              <AlertOctagon size={14} color="#E11D48" />
                            ) : (
                              <GitCommit size={14} color={isSelected ? "#4F46E5" : badge.dot} />
                            )}
                            <div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: hasConflict ? "#DC2626" : isSelected ? "#4F46E5" : "#0F172A",
                                }}
                              >
                                {evt.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#64748B",
                                  fontFamily: "var(--font-mono, monospace)",
                                  marginTop: "2px",
                                }}
                              >
                                {timezone}: {formatChronologyTimestamp(evt.sourceTimestamp, timezone)}
                              </div>
                              {hasConflict && (
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "#DC2626",
                                    fontWeight: 700,
                                    marginTop: "3px",
                                    fontFamily: "var(--font-mono, monospace)",
                                  }}
                                >
                                  ⚠️ Chronology Conflict: {conflictMap.get(evt.id)}
                                </div>
                              )}
                            </div>
                          </div>

                          {showDriftOverlay && (
                            <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: evt.clockOffsetMs > 60000 ? "#FFF1F2" : "#F1F5F9",
                                  color: evt.clockOffsetMs > 60000 ? "#BE123C" : "#475569",
                                  border: `1px solid ${
                                    evt.clockOffsetMs > 60000 ? "#FECDD3" : "#CBD5E1"
                                  }`,
                                }}
                              >
                                Δ{" "}
                                {evt.clockOffsetMs >= 1000
                                  ? `${(evt.clockOffsetMs / 1000).toFixed(1)}s`
                                  : `${evt.clockOffsetMs}ms`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Event Detail & Dual-Timestamp Inspector */}
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
          {activeEvent ? (
            <>
              {/* Event Header */}
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: getTrackBadge(activeEvent.track).bg,
                      color: getTrackBadge(activeEvent.track).text,
                      border: `1px solid ${getTrackBadge(activeEvent.track).border}`,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {activeEvent.track} TRACK
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748B",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {activeEvent.id}
                  </span>
                </div>
                <h4 style={{ margin: "8px 0 2px", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                  {activeEvent.title}
                </h4>
              </div>

              {/* Dual Timestamps */}
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
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Dual-Timestamp Synchronization
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748B" }}>Source Event ({timezone}): </span>
                    <strong style={{ color: "#0F172A" }}>{formatChronologyTimestamp(activeEvent.sourceTimestamp, timezone)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Ingest / Received ({timezone}): </span>
                    <strong style={{ color: "#0D9488" }}>{formatChronologyTimestamp(activeEvent.receivedTimestamp, timezone)}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#2563EB",
                      marginTop: "2px",
                      paddingTop: "4px",
                      borderTop: "1px dashed #E2E8F0",
                    }}
                  >
                    <Clock size={11} />
                    <span>
                      Clock Offset: <strong>+{activeEvent.clockOffsetMs} ms</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Chronology Conflict Callout */}
              {conflictMap.has(activeEvent.id) && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "5px",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#DC2626",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <AlertOctagon size={13} /> CAUSALITY / CHRONOLOGY CONFLICT DETECTED
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#991B1B", lineHeight: 1.4 }}>
                    {conflictMap.get(activeEvent.id)}
                  </p>
                </div>
              )}

              {/* Contradiction Callout */}
              {activeEvent.hasContradiction && (
                <div
                  style={{
                    background: "#FFF1F2",
                    border: "1px solid #FECDD3",
                    borderRadius: "5px",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#BE123C",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <AlertOctagon size={13} /> TEMPORAL CONTRADICTION DETECTED
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9F1239", lineHeight: 1.4 }}>
                    {activeEvent.contradictionNote}
                  </p>
                </div>
              )}

              {/* Cryptographic Lineage Anchor */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Cryptographic Provenance Anchor
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    background: "#FFFFFF",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      <strong style={{ color: "#059669" }}>Artifact:</strong> {activeEvent.artifactId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeEvent.artifactId, "artId")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: copiedKey === "artId" ? "#059669" : "#94A3B8",
                      }}
                      title="Copy Artifact ID"
                    >
                      {copiedKey === "artId" ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      wordBreak: "break-all",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "4px",
                    }}
                  >
                    <span style={{ color: "#64748B" }}>
                      <strong>SHA-256:</strong> {activeEvent.artifactHash}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeEvent.artifactHash, "hash")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: copiedKey === "hash" ? "#059669" : "#94A3B8",
                        flexShrink: 0,
                      }}
                      title="Copy SHA-256 Hash"
                    >
                      {copiedKey === "hash" ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Observed Metadata */}
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Observed Metadata Attributes
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10.5px",
                    background: "#FFFFFF",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  {Object.entries(activeEvent.details).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "2px 0",
                        borderBottom: "1px solid #F1F5F9",
                      }}
                    >
                      <span style={{ color: "#64748B" }}>{k}:</span>
                      <span style={{ color: "#0F172A", fontWeight: 600 }}>
                        {typeof v === "number" && (k.toLowerCase().includes("loss") || k.toLowerCase().includes("amount") || k.toLowerCase().includes("inr"))
                          ? formatInr(v)
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "#64748B", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
              Select an event to inspect dual-timestamps and lineage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

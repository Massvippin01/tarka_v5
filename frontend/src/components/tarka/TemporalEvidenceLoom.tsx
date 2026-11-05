import React, { useState, useMemo } from "react";
import { Clock, Layers, GitCommit, AlertOctagon, Sliders } from "lucide-react";

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

const DEFAULT_LOOM_EVENTS: LoomTrackEvent[] = [
  {
    id: "LOOM-EVT-001",
    track: "COMPLAINT",
    title: "1930 NCRP Cyber Crime Portal Complaint Registered",
    sourceTimestamp: "2026-10-12T09:15:00Z",
    receivedTimestamp: "2026-10-12T09:15:22Z",
    clockOffsetMs: 22000,
    confidence: 1.0,
    artifactId: "ART-NCRP-88219",
    artifactHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    details: { victim: "Smt. Sunita Rao", reported_loss: "INR 1,84,000", typology: "Digital Arrest Fraud" },
  },
  {
    id: "LOOM-EVT-002",
    track: "TELECOM",
    title: "SIM-Swap Event Triggered at Telco Tower (NCR-Gurugram)",
    sourceTimestamp: "2026-10-12T09:18:14Z",
    receivedTimestamp: "2026-10-12T09:21:00Z",
    clockOffsetMs: 166000,
    confidence: 0.98,
    artifactId: "ART-CDR-99120",
    artifactHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    hasContradiction: true,
    contradictionNote: "IMSI activated on tower while subscriber passport records departure to Dubai",
    details: { imsi: "404450192837192", tower_id: "DEL-SEC-4-TOWER", cell_id: "CELL-981" },
  },
  {
    id: "LOOM-EVT-003",
    track: "BANKING",
    title: "Primary UPI Debit: Victim to Layer-1 Mule (A/C 99182)",
    sourceTimestamp: "2026-10-12T09:24:41Z",
    receivedTimestamp: "2026-10-12T09:24:43Z",
    clockOffsetMs: 2000,
    confidence: 1.0,
    artifactId: "ART-UPI-TX-001",
    artifactHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    details: { rrn: "428190019281", amount: 184000, remitter: "sunita@okhdfc", beneficiary: "mule1@ybl" },
  },
  {
    id: "LOOM-EVT-004",
    track: "DEVICE",
    title: "IPDR Handshake from CGNAT Pool (Port Allocation 18420)",
    sourceTimestamp: "2026-10-12T09:24:39Z",
    receivedTimestamp: "2026-10-12T09:26:10Z",
    clockOffsetMs: 91000,
    confidence: 0.94,
    artifactId: "ART-IPDR-POOL-04",
    artifactHash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    details: { public_ip: "103.21.144.12", translated_port: 18420, private_ip: "10.48.12.9" },
  },
  {
    id: "LOOM-EVT-005",
    track: "BANKING",
    title: "Layer-1 Split: Mule Account to 3 Digital Wallets",
    sourceTimestamp: "2026-10-12T09:28:10Z",
    receivedTimestamp: "2026-10-12T09:28:12Z",
    clockOffsetMs: 2000,
    confidence: 1.0,
    artifactId: "ART-UPI-TX-002",
    artifactHash: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    details: { splits: ["INR 60,000", "INR 60,000", "INR 64,000"], latency_seconds: 209 },
  },
  {
    id: "LOOM-EVT-006",
    track: "CAS_INGEST",
    title: "Evidence Gateway Bitstream Acquisition & Section 63 BSA Checksum Seal",
    sourceTimestamp: "2026-10-12T09:35:00Z",
    receivedTimestamp: "2026-10-12T09:35:01Z",
    clockOffsetMs: 1000,
    confidence: 1.0,
    artifactId: "ART-CAS-SEAL-01",
    artifactHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    details: { status: "BITSTREAM_SEALED", storage_tier: "IMMUTABLE_CAS_S3" },
  },
];

export const TemporalEvidenceLoom: React.FC<TemporalEvidenceLoomProps> = ({
  caseId,
  events = DEFAULT_LOOM_EVENTS,
  onSelectEvent,
  className = "",
}) => {
  const [selectedTrack, setSelectedTrack] = useState<string>("ALL");
  const [activeEvent, setActiveEvent] = useState<LoomTrackEvent | null>(events[0] || null);
  const [showDriftOverlay, setShowDriftOverlay] = useState<boolean>(true);

  const tracks: LoomTrackEvent["track"][] = ["COMPLAINT", "TELECOM", "BANKING", "DEVICE", "CAS_INGEST"];

  const filteredEvents = useMemo(() => {
    if (selectedTrack === "ALL") return events;
    return events.filter((e) => e.track === selectedTrack);
  }, [events, selectedTrack]);

  const getTrackColor = (track: LoomTrackEvent["track"]) => {
    switch (track) {
      case "BANKING":
        return "#C8F751"; // Signal Lime
      case "TELECOM":
        return "#527C9A"; // Reference Blue
      case "DEVICE":
        return "#99F6E4"; // Teal
      case "COMPLAINT":
        return "#F59E0B"; // Amber
      case "CAS_INGEST":
        return "#10B981"; // Emerald
      default:
        return "#6B7770";
    }
  };

  return (
    <div
      className={`temporal-evidence-loom ${className}`}
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
            <Layers size={18} style={{ color: "var(--fieldnote-signal-lime, #C8F751)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.02em" }}>
              TEMPORAL EVIDENCE LOOM
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
              MULTI-SOURCE TRACK CORRELATION
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary, #A3B1AA)" }}>
            Cross-institution synchronized multi-track temporal alignment, dual timestamps, and clock drift isolation for Case <span style={{ color: "#C8F751", fontFamily: "var(--font-mono, monospace)" }}>{caseId}</span>.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setShowDriftOverlay(!showDriftOverlay)}
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              background: showDriftOverlay ? "rgba(82, 124, 154, 0.2)" : "transparent",
              color: showDriftOverlay ? "#527C9A" : "var(--text-muted, #6B7770)",
              border: "1px solid rgba(82, 124, 154, 0.4)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sliders size={12} /> {showDriftOverlay ? "Hide Clock Offsets" : "Show Clock Offsets"}
          </button>
          <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "2px", borderRadius: "6px" }}>
            {["ALL", ...tracks].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTrack(t)}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  background: selectedTrack === t ? "var(--fieldnote-signal-lime, #C8F751)" : "transparent",
                  color: selectedTrack === t ? "#101918" : "var(--text-secondary, #A3B1AA)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Track Canvas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
        {/* Tracks Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tracks.map((trackName) => {
            const trackEvts = filteredEvents.filter((e) => e.track === trackName);
            if (selectedTrack !== "ALL" && selectedTrack !== trackName) return null;

            return (
              <div
                key={trackName}
                style={{
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid rgba(107, 119, 112, 0.25)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: getTrackColor(trackName),
                      }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: getTrackColor(trackName) }}>
                      {trackName} TRACK
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                    {trackEvts.length} observation{trackEvts.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Track Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {trackEvts.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--text-muted, #6B7770)", fontStyle: "italic", padding: "4px 0" }}>
                      No events registered on this track for current filter window.
                    </div>
                  ) : (
                    trackEvts.map((evt) => {
                      const isSelected = activeEvent?.id === evt.id;
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
                            background: isSelected ? "rgba(200, 247, 81, 0.14)" : "rgba(255, 255, 255, 0.03)",
                            border: isSelected
                              ? "1px solid rgba(200, 247, 81, 0.5)"
                              : evt.hasContradiction
                              ? "1px solid rgba(182, 91, 72, 0.4)"
                              : "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "4px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {evt.hasContradiction ? (
                              <AlertOctagon size={13} style={{ color: "#B65B48" }} />
                            ) : (
                              <GitCommit size={13} style={{ color: getTrackColor(evt.track) }} />
                            )}
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "#C8F751" : "inherit" }}>
                                {evt.title}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                                Source: {evt.sourceTimestamp}
                              </div>
                            </div>
                          </div>

                          {showDriftOverlay && (
                            <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  background: evt.clockOffsetMs > 60000 ? "rgba(182, 91, 72, 0.2)" : "rgba(82, 124, 154, 0.2)",
                                  color: evt.clockOffsetMs > 60000 ? "#B65B48" : "#527C9A",
                                  border: evt.clockOffsetMs > 60000 ? "1px solid rgba(182, 91, 72, 0.4)" : "1px solid rgba(82, 124, 154, 0.3)",
                                }}
                              >
                                Δ {evt.clockOffsetMs >= 1000 ? `${(evt.clockOffsetMs / 1000).toFixed(1)}s` : `${evt.clockOffsetMs}ms`}
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

        {/* Selected Event Detail & Dual-Timestamp Inspector */}
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
          {activeEvent ? (
            <>
              <div style={{ borderBottom: "1px solid rgba(107, 119, 112, 0.25)", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: "rgba(200, 247, 81, 0.15)",
                      color: "#C8F751",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {activeEvent.track} TRACK
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                    {activeEvent.id}
                  </span>
                </div>
                <h4 style={{ margin: "8px 0 4px", fontSize: "13px", fontWeight: 700 }}>
                  {activeEvent.title}
                </h4>
              </div>

              {/* Dual Timestamps */}
              <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "10px", borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", marginBottom: "6px" }}>
                  DUAL-TIMESTAMP SYNCHRONIZATION
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", fontFamily: "var(--font-mono, monospace)" }}>
                  <div>
                    <span style={{ color: "var(--text-muted, #6B7770)" }}>Source Event (Wall): </span>
                    <span style={{ color: "#F4F6F4" }}>{activeEvent.sourceTimestamp}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted, #6B7770)" }}>Ingest / Received: </span>
                    <span style={{ color: "#99F6E4" }}>{activeEvent.receivedTimestamp}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#527C9A" }}>
                    <Clock size={11} /> Clock Drift / Offset: <strong>+{activeEvent.clockOffsetMs} ms</strong>
                  </div>
                </div>
              </div>

              {/* Contradiction Callout */}
              {activeEvent.hasContradiction && (
                <div
                  style={{
                    background: "rgba(182, 91, 72, 0.12)",
                    border: "1px solid rgba(182, 91, 72, 0.35)",
                    borderRadius: "4px",
                    padding: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#B65B48", fontSize: "11px", fontWeight: 700 }}>
                    <AlertOctagon size={13} /> TEMPORAL CONTRADICTION DETECTED
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#F4F6F4" }}>
                    {activeEvent.contradictionNote}
                  </p>
                </div>
              )}

              {/* Cryptographic Lineage Anchor */}
              <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)" }}>
                  CRYPTOGRAPHIC PROVENANCE ANCHOR
                </div>
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", wordBreak: "break-all", background: "rgba(0,0,0,0.3)", padding: "6px", borderRadius: "3px" }}>
                  <span style={{ color: "#C8F751" }}>Artifact:</span> {activeEvent.artifactId}
                  <br />
                  <span style={{ color: "#6B7770" }}>SHA-256:</span> {activeEvent.artifactHash}
                </div>
              </div>

              {/* Structured Metadata */}
              <div style={{ fontSize: "11px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", marginBottom: "4px" }}>
                  OBSERVED METADATA ATTRIBUTES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontFamily: "var(--font-mono, monospace)", fontSize: "10px" }}>
                  {Object.entries(activeEvent.details).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted, #6B7770)" }}>{k}:</span>
                      <span style={{ color: "#F4F6F4" }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted, #6B7770)", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
              Select an event to inspect dual-timestamps and lineage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

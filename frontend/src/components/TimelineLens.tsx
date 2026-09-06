import React from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "CALL" | "TRANSACTION" | "ANPR" | "FIR" | "CHAT" | "LOCATION";
  summary: string;
  entityId: string;
  source: string;
  confidence: number;
  evidenceId: string;
  contradiction?: boolean;
}

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "EVT-101",
    timestamp: "2026-08-14 10:15:22",
    type: "FIR",
    summary: "FIR-2026-C102 filed at Delhi Cyber Cell by victim R. Sharma (Loss: ₹1,25,000 via phishing link)",
    entityId: "P001",
    source: "CCTNS",
    confidence: 1.0,
    evidenceId: "EV-2026-101",
  },
  {
    id: "EVT-102",
    timestamp: "2026-08-14 10:42:00",
    type: "TRANSACTION",
    summary: "UPI Transaction TXN001: ₹1,25,000 transferred from HDFC (Victim) to ICICI Mule ACC992",
    entityId: "ACC992",
    source: "FINANCIAL",
    confidence: 0.98,
    evidenceId: "EV-2026-102",
  },
  {
    id: "EVT-103",
    timestamp: "2026-08-14 11:05:10",
    type: "CALL",
    summary: "CDR001: 340-second voice call between PH001 (P001 Vikram Singh) and PH002 (Mule Operator)",
    entityId: "PH001",
    source: "CDR",
    confidence: 0.95,
    evidenceId: "EV-2026-103",
  },
  {
    id: "EVT-104",
    timestamp: "2026-08-14 12:30:45",
    type: "ANPR",
    summary: "ANPR001 Sighting: Vehicle DL-01-AB-1234 captured at DND Flyway Toll Plaza heading towards Gurugram",
    entityId: "V188",
    source: "ANPR",
    confidence: 0.92,
    evidenceId: "EV-2026-104",
  },
  {
    id: "EVT-105",
    timestamp: "2026-08-14 14:15:00",
    type: "CHAT",
    summary: "FSL WhatsApp Extraction: Message containing bank account details sent from PH001 to PH002",
    entityId: "P001",
    source: "FSL_DIGITAL",
    confidence: 0.99,
    evidenceId: "EV-2026-105",
  },
  {
    id: "EVT-106",
    timestamp: "2026-08-14 15:00:12",
    type: "LOCATION",
    summary: "Cell Tower Geo-location: PH001 pinged at Sector 29 Gurugram (Contradicts initial alibi of Connaught Place)",
    entityId: "PH001",
    source: "CDR_GEO",
    confidence: 0.88,
    evidenceId: "EV-2026-106",
    contradiction: true,
  },
];

export const TimelineLens: React.FC = () => {
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
            ⏱️ INVESTIGATION CHRONOLOGICAL TIMELINE
          </h2>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Reconstructed event sequence based on CCTNS, CDR, ANPR, and Financial intelligence pings.
          </div>
        </div>
        <button
          onClick={() => runCopilotQuery("Analyze timeline anomalies and spatial contradictions")}
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
          🤖 DETECT TIMELINE CONTRADICTIONS
        </button>
      </div>

      {/* Timeline Stream */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
        {/* Timeline Axis */}
        <div
          style={{
            position: "absolute",
            left: "140px",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "var(--border-subtle)",
            zIndex: 1,
          }}
        />

        {MOCK_EVENTS.map((event) => (
          <div
            key={event.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Timestamp Column */}
            <div
              style={{
                width: "130px",
                textAlign: "right",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                paddingTop: "6px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {event.timestamp}
            </div>

            {/* Timeline Node Icon */}
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: event.contradiction ? "rgba(226, 109, 120, 0.2)" : "var(--surface-elevated)",
                border: `2px solid ${event.contradiction ? "var(--status-contradicted)" : "var(--text-accent)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                flexShrink: 0,
              }}
            >
              {event.type === "CALL"
                ? "📞"
                : event.type === "TRANSACTION"
                ? "💸"
                : event.type === "ANPR"
                ? "📷"
                : event.type === "FIR"
                ? "📄"
                : event.type === "CHAT"
                ? "💬"
                : "📍"}
            </div>

            {/* Event Content Card */}
            <div
              style={{
                flex: 1,
                background: "var(--surface-secondary)",
                border: `1px solid ${event.contradiction ? "var(--status-contradicted)" : "var(--border-subtle)"}`,
                borderRadius: "6px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    {event.type}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    SOURCE: {event.source}
                  </span>
                  {event.contradiction && (
                    <span
                      style={{
                        background: "rgba(226, 109, 120, 0.15)",
                        color: "var(--status-contradicted)",
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: "1px solid var(--status-contradicted)",
                      }}
                    >
                      ⚠️ ALIBI CONTRADICTION DETECTED
                    </span>
                  )}
                </div>

                <span style={{ fontSize: "0.65rem", color: "var(--status-observed)", fontWeight: 700 }}>
                  CONFIDENCE: {Math.round(event.confidence * 100)}%
                </span>
              </div>

              <div style={{ fontSize: "0.8rem", lineHeight: 1.4, color: "var(--text-primary)" }}>
                {event.summary}
              </div>

              <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
                <button
                  onClick={() => selectEntity(event.entityId)}
                  style={{
                    background: "var(--surface-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-accent)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  👤 INSPECT ENTITY ({event.entityId})
                </button>
                <button
                  onClick={() => selectEvidence(event.evidenceId)}
                  style={{
                    background: "var(--surface-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📋 VIEW EVIDENCE ({event.evidenceId})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

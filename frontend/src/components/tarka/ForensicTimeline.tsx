import React, { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export interface TimelineEvent {
  event_id: string;
  timestamp: string;
  timestamp_iso: string;
  timestamp_epoch: number;
  event_type: string;
  title: string;
  description: string;
  source_artifact_ids: string[];
  supporting_fact_ids: string[];
  confidence: number;
  status: string;
  temporal_priority: number;
  is_timestamp_inferred: boolean;
  conflict_explanation?: string;
  amount?: number;
  identifiers: Record<string, string>;
  evidence?: {
    source_filename?: string;
    trust_tier?: string;
    raw_snippet?: string;
  };
}

interface ForensicTimelineProps {
  events: TimelineEvent[];
  className?: string;
  onSelectEvent?: (evt: TimelineEvent) => void;
  selectedEventId?: string;
}

export const ForensicTimeline: React.FC<ForensicTimelineProps> = ({
  events,
  className = "",
  onSelectEvent,
  selectedEventId,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    if (filterType === "CONFLICTS") return e.status === "CONFLICT" || Boolean(e.conflict_explanation);
    if (filterType === "FINANCIAL") return e.event_type.includes("PAYMENT") || e.amount !== undefined;
    return e.event_type === filterType;
  });

  return (
    <div className={`lg-table-wrapper ${className}`} data-testid="timeline-container">
      <div className="lg-table-header">
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={15} style={{ color: "var(--lg-accent-primary, #60A5FA)" }} /> Verifiable Chronological Timeline
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9CA3AF" }}>
            Strict ascending chronology with explicit temporal uncertainty bounds and provenance anchors.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {["ALL", "FINANCIAL", "CONFLICTS"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`lg-btn ${filterType === t ? "lg-btn-primary" : "lg-btn-secondary"}`}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "650px", overflowY: "auto" }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", fontSize: "13px" }}>
            No timeline events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isConflict = evt.status === "CONFLICT" || Boolean(evt.conflict_explanation);
            const isSelected = selectedEventId === evt.event_id;

            return (
              <div
                key={evt.event_id}
                onClick={() => onSelectEvent?.(evt)}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: isSelected
                    ? "1px solid #3B82F6"
                    : isConflict
                    ? "1px solid rgba(244, 63, 94, 0.4)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  backgroundColor: isSelected
                    ? "rgba(37, 99, 235, 0.12)"
                    : isConflict
                    ? "rgba(244, 63, 94, 0.06)"
                    : "rgba(20, 24, 34, 0.6)",
                  boxShadow: isConflict
                    ? "0 4px 20px -4px rgba(244, 63, 94, 0.15)"
                    : "var(--lg-shadow-sm)",
                  cursor: onSelectEvent ? "pointer" : "default",
                  transition: "all 0.15s ease",
                }}
                className="lg-card-interactive"
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#60A5FA" }}>
                      {evt.event_id}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#F3F4F6", backgroundColor: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      {evt.timestamp}
                    </span>
                    {evt.is_timestamp_inferred && (
                      <span className="lg-badge lg-badge-amber">
                        Clock Inferred (± 2.5 min)
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isConflict && (
                      <span className="lg-badge lg-badge-coral" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle size={11} />
                        Conflict Detected
                      </span>
                    )}
                    <span className="lg-badge lg-badge-gray">
                      {evt.evidence?.trust_tier || "T2"}
                    </span>
                  </div>
                </div>

                <h4 style={{ margin: "8px 0 4px", fontSize: "13px", fontWeight: 600, color: "#F3F4F6" }}>
                  {evt.title}
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", lineHeight: 1.5 }}>
                  {evt.description}
                </p>

                {evt.conflict_explanation && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "4px", backgroundColor: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", fontSize: "11px", color: "#FDA4AF" }}>
                    <strong>Temporal Contradiction: </strong>
                    {evt.conflict_explanation}
                  </div>
                )}

                <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#6B7280", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span>Source: <strong style={{ color: "#D1D5DB" }}>{evt.evidence?.source_filename || "Ledger Record"}</strong></span>
                    {evt.identifiers?.rrn && <span>RRN: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>{evt.identifiers.rrn}</code></span>}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#9CA3AF" }}>
                    Confidence: {Math.round(evt.confidence * 100)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ForensicTimeline;

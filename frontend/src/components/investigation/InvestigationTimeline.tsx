import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useInvestigation } from "../../context/InvestigationContext";

interface TimelineEntry {
  entry_id: string;
  entry_type: string;
  title: string;
  timestamp: string;
  timestamp_uncertainty_seconds: number;
  location: string;
  location_uncertainty_meters: number;
  details?: Record<string, any>;
  source_artifact_id?: string;
}

export const InvestigationTimeline: React.FC = () => {
  const { activeCaseId, selectEvidence } = useInvestigation();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/v1/investigations/${activeCaseId}/timeline`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setEntries(data.entries || []);
        }
      } catch (err) {
        console.warn("Using fallback local timeline", err);
      }
    };
    fetchTimeline();
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.badge}>TEMPORAL CONSISTENCY PROJECTION</div>
          <h2 style={{ ...styles.title, display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} /> SPATIOTEMPORAL INVESTIGATION TIMELINE
          </h2>
        </div>
        <div style={styles.uncertaintyPill}>
          UNCERTAINTY BOUNDS PRESERVED: ±TIME & ±DISTANCE RETAINED
        </div>
      </div>

      {/* Timeline Stream */}
      <div style={styles.stream}>
        {entries.map((entry, idx) => {
          const dt = new Date(entry.timestamp);
          const isArrival = entry.entry_type === "EVIDENCE_ARRIVAL";
          const isSighting = entry.entry_type === "VEHICLE_SIGHTING";
          const isTransmission = entry.entry_type === "TELECOM_TRANSMISSION";

          return (
            <div key={entry.entry_id || idx} style={styles.timelineRow}>
              {/* Timestamp & Uncertainty Column */}
              <div style={styles.timeColumn}>
                <div style={styles.timeStr}>{isNaN(dt.getTime()) ? entry.timestamp : dt.toLocaleTimeString()}</div>
                <div style={styles.uncertaintyBadge}>±{entry.timestamp_uncertainty_seconds}s Window</div>
                <div style={styles.dateStr}>{isNaN(dt.getTime()) ? "" : dt.toLocaleDateString()}</div>
              </div>

              {/* Node Dot & Line */}
              <div style={styles.spineColumn}>
                <div style={{
                  ...styles.spineDot,
                  background: isArrival ? "#10b981" : isSighting ? "#f59e0b" : isTransmission ? "#38bdf8" : "#a855f7",
                }} />
                {idx < entries.length - 1 && <div style={styles.spineLine} />}
              </div>

              {/* Event Card */}
              <div
                style={styles.card}
                onClick={() => {
                  if (entry.source_artifact_id) selectEvidence(entry.source_artifact_id);
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.typeTag}>{entry.entry_type}</span>
                  <span style={styles.locBadge}>
                     {entry.location} (±{entry.location_uncertainty_meters}m)
                  </span>
                </div>
                <div style={styles.cardTitle}>{entry.title}</div>
                {entry.source_artifact_id && (
                  <div style={styles.artifactRef}>
                    Artifact Link: {entry.source_artifact_id.slice(0, 18)}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    background: "#080c14",
    padding: "16px",
    boxSizing: "border-box",
    overflowY: "auto",
    color: "#f8fafc",
    fontFamily: "var(--font-sans)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "12px",
  },
  badge: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#38bdf8",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: 800,
    margin: "2px 0 0",
  },
  uncertaintyPill: {
    fontSize: "0.65rem",
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#38bdf8",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: 700,
  },
  stream: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  timelineRow: {
    display: "flex",
    gap: "12px",
    position: "relative",
  },
  timeColumn: {
    width: "110px",
    textAlign: "right",
    flexShrink: 0,
  },
  timeStr: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#f1f5f9",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
  },
  uncertaintyBadge: {
    fontSize: "0.58rem",
    color: "#38bdf8",
    fontWeight: 600,
  },
  dateStr: {
    fontSize: "0.62rem",
    color: "#64748b",
  },
  spineColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "16px",
    flexShrink: 0,
    position: "relative",
  },
  spineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    zIndex: 2,
    marginTop: "4px",
  },
  spineLine: {
    width: "2px",
    flex: 1,
    background: "#1e293b",
    position: "absolute",
    top: "14px",
    bottom: "-12px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "10px 12px",
    flex: 1,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  typeTag: {
    fontSize: "0.62rem",
    fontWeight: 800,
    color: "#64748b",
  },
  locBadge: {
    fontSize: "0.65rem",
    color: "#94a3b8",
  },
  cardTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  artifactRef: {
    fontSize: "0.62rem",
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "#10b981",
    marginTop: "4px",
  },
};

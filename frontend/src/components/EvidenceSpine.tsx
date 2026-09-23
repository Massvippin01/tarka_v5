import React from "react";
import { useInvestigation } from "../context/InvestigationContext";

interface TimelineEvent {
  id: string;
  time: string;
  type: string;
  title: string;
  source: string;
  entityId: string;
}

interface EvidenceSpineProps {
  onSelectEvent?: (ev: TimelineEvent) => void;
  onInspectRelationship?: () => void;
}

export const EvidenceSpine: React.FC<EvidenceSpineProps> = ({
  onSelectEvent,
  onInspectRelationship,
}) => {
  const { selectedEventId, selectEvent, selectRelationship } = useInvestigation();

  const events: TimelineEvent[] = [
    { id: "EVT-01", time: "09:17", type: "CDR", title: "340s Call PH001 ↔ PH002", source: "CDR", entityId: "PH001" },
    { id: "EVT-02", time: "09:26", type: "FINANCIAL", title: "₹1,25,000 Transfer ACC992 → ACC481", source: "FINANCIAL", entityId: "ACC992" },
    { id: "EVT-03", time: "09:41", type: "ANPR", title: "Creta V188 Sighting @ DND Toll", source: "ANPR", entityId: "V188" },
    { id: "EVT-04", time: "09:52", type: "LINK", title: "Cross-Case Link Case C102 ↔ C481", source: "ANALYTICAL", entityId: "C102" },
    { id: "EVT-05", time: "10:03", type: "SIGNAL", title: "Signal SIG-001 High Confidence", source: "ANALYTICAL", entityId: "SIG-001" },
  ];

  const handleEventClick = (ev: TimelineEvent) => {
    selectEvent(ev.id, ev.entityId);
    if (onSelectEvent) {
      onSelectEvent(ev);
    }
  };

  const handleInspectClick = () => {
    selectRelationship("rel-p1-p2");
    if (onInspectRelationship) {
      onInspectRelationship();
    }
  };

  return (
    <div style={styles.spineContainer}>
      <div style={styles.spineHeader}>
        <span>EVIDENCE SPINE — TEMPORAL INVESTIGATION TIMELINE</span>
        <button style={styles.inspectBtn} onClick={handleInspectClick}>
           INSPECT RELATIONSHIP WHY?
        </button>
      </div>
      <div style={styles.timelineRow}>
        {events.map((ev) => {
          const isSelected = selectedEventId === ev.id;
          return (
            <div
              key={ev.id}
              style={{
                ...styles.eventChip,
                ...(isSelected ? styles.eventSelected : {}),
              }}
              onClick={() => handleEventClick(ev)}
            >
              <span style={styles.timeTag}>{ev.time}</span>
              <span style={styles.typeBadge}>{ev.type}</span>
              <span style={styles.titleText}>{ev.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  spineContainer: {
    height: "64px",
    background: "#0a0f18",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    padding: "6px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  spineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  inspectBtn: {
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  timelineRow: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
  },
  eventChip: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "4px 8px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  eventSelected: {
    background: "rgba(52, 211, 153, 0.15)",
    borderColor: "rgba(52, 211, 153, 0.4)",
    boxShadow: "0 0 8px rgba(52, 211, 153, 0.2)",
  },
  timeTag: {
    color: "#34d399",
    fontWeight: 700,
    fontSize: "0.7rem",
  },
  typeBadge: {
    background: "rgba(255,255,255,0.06)",
    color: "#94a3b8",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 4px",
    borderRadius: "3px",
  },
  titleText: {
    color: "#f8fafc",
    fontSize: "0.72rem",
  },
};

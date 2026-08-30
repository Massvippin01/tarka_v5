import React, { useState } from "react";

interface GISMapProps {
  onSelectEntity: (id: string) => void;
}

export const GISMap: React.FC<GISMapProps> = ({ onSelectEntity }) => {
  const [selectedPin, setSelectedPin] = useState<any>(null);

  const pins = [
    { id: "C102", type: "CASE", name: "Delhi Cyber PS (FIR-2026-C102)", lat: 28.62, lng: 77.21, x: 280, y: 120, color: "#34d399" },
    { id: "C481", type: "CASE", name: "Gurugram Cyber PS (FIR-2026-C481)", lat: 28.45, lng: 77.02, x: 180, y: 220, color: "#f43f5e" },
    { id: "ANPR001", type: "ANPR", name: "DND Toll Plaza ANPR Camera (V188)", lat: 28.57, lng: 77.29, x: 340, y: 150, color: "#eab308" },
    { id: "TOWER01", type: "CELL_TOWER", name: "South Delhi Cell Tower T-88", lat: 28.52, lng: 77.19, x: 260, y: 180, color: "#38bdf8" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>GEOSPATIAL INTELLIGENCE & MOVEMENT SURVEILLANCE</h3>
        <div style={styles.meta}>Interactive GIS View — ANPR Toll Cameras, Cell Towers & Vehicle Movement Trails</div>
      </div>

      <div style={styles.mapCanvas}>
        <svg width="100%" height="450" viewBox="0 0 600 350" style={{ background: "#05080e" }}>
          <defs>
            <pattern id="gisGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gisGrid)" />

          {/* Movement Trail from Delhi to DND Toll to Gurugram */}
          <path
            d="M 280 120 L 340 150 L 260 180 L 180 220"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="6 4"
          />

          {/* Render Pins */}
          {pins.map((pin) => (
            <g
              key={pin.id}
              onClick={() => {
                setSelectedPin(pin);
                onSelectEntity(pin.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle cx={pin.x} cy={pin.y} r="14" fill={`${pin.color}22`} />
              <circle cx={pin.x} cy={pin.y} r="6" fill={pin.color} />
              <text x={pin.x + 10} y={pin.y + 4} fill="#f8fafc" fontSize="10" fontWeight="bold">
                {pin.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selectedPin && (
        <div style={styles.pinDetails}>
          <strong>SELECTED MAP LOCATION: {selectedPin.name}</strong>
          <span>Type: {selectedPin.type} | ID: {selectedPin.id}</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    background: "#070a0f",
  },
  header: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  meta: {
    color: "#94a3b8",
    fontSize: "0.75rem",
    marginTop: "4px",
  },
  mapCanvas: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    overflow: "hidden",
  },
  pinDetails: {
    background: "#0f172a",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "12px",
    borderRadius: "8px",
    color: "#38bdf8",
    fontSize: "0.78rem",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
};

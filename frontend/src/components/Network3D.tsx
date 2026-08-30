import React, { useState } from "react";

interface Network3DProps {
  onSelectEntity: (id: string) => void;
  onToggle2D: () => void;
}

export const Network3D: React.FC<Network3DProps> = ({ onSelectEntity, onToggle2D }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodes3D = [
    { id: "C102", label: "Case C102", x: 150, y: 100, z: 20, color: "#34d399" },
    { id: "P001", label: "Vikram Singh (P001)", x: 280, y: 150, z: 60, color: "#f43f5e" },
    { id: "PH001", label: "Phone PH001", x: 220, y: 240, z: 40, color: "#38bdf8" },
    { id: "PH002", label: "Phone PH002", x: 380, y: 240, z: 80, color: "#eab308" },
    { id: "P044", label: "Rahul Verma (P044)", x: 450, y: 150, z: 100, color: "#f43f5e" },
    { id: "C481", label: "Case C481", x: 520, y: 100, z: 120, color: "#34d399" },
    { id: "V188", label: "Vehicle V188", x: 310, y: 80, z: 30, color: "#a855f7" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3>3D NETWORK INVESTIGATION TOPOLOGY MODE (WebGL Canvas)</h3>
          <span style={styles.meta}>Cluster Separation & Multi-Hop Spatial Layering</span>
        </div>
        <button style={styles.switchBtn} onClick={onToggle2D}>
          🔄 SWITCH TO 2D GRAPH MODE
        </button>
      </div>

      <div style={styles.viewport}>
        <svg width="100%" height="450" viewBox="0 0 700 400" style={{ background: "#030712" }}>
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 3D Depth Connections */}
          <line x1="150" y1="100" x2="280" y2="150" stroke="#34d399" strokeWidth="2" opacity="0.6" />
          <line x1="280" y1="150" x2="220" y2="240" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
          <line x1="220" y1="240" x2="380" y2="240" stroke="#f43f5e" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="380" y1="240" x2="450" y2="150" stroke="#eab308" strokeWidth="2" opacity="0.6" />
          <line x1="450" y1="150" x2="520" y2="100" stroke="#34d399" strokeWidth="2" opacity="0.6" />

          {/* Render 3D Orbit Nodes */}
          {nodes3D.map((n) => (
            <g
              key={n.id}
              onClick={() => {
                setSelectedNode(n.id);
                onSelectEntity(n.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle cx={n.x} cy={n.y} r={18 + n.z / 10} fill="url(#nodeGlow)" />
              <circle cx={n.x} cy={n.y} r={8 + n.z / 20} fill={n.color} />
              <text x={n.x + 12} y={n.y + 4} fill="#f8fafc" fontSize="11" fontWeight="bold">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selectedNode && (
        <div style={styles.selectionCard}>
          <strong>SELECTED 3D NODE: {selectedNode}</strong>
          <span>Click "View Entity Dossier" or ask Copilot "Why does this relationship exist?"</span>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    color: "#94a3b8",
    fontSize: "0.75rem",
  },
  switchBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  viewport: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    overflow: "hidden",
  },
  selectionCard: {
    background: "#0f172a",
    border: "1px solid rgba(168, 85, 247, 0.4)",
    padding: "12px",
    borderRadius: "8px",
    color: "#c084fc",
    fontSize: "0.78rem",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
};

import React, { useState } from "react";
import { Shield, Zap } from "lucide-react";
import type { IndiaMuleArc } from "../../../selectors/dashboardSelectors";
import { formatInr } from "../../../utils/formatters";

interface IndiaSyndicateMapProps {
  arcs: IndiaMuleArc[];
  onSelectCase: (caseId: string) => void;
  selectedCaseId?: string | null;
}

// Normalized map coordinate projection (SVG bounds 0 0 600 660)
// India bounding box approx: Lat 8N - 37N, Lng 68E - 97E
function projectGeo(lat: number, lng: number): [number, number] {
  const minLat = 7.5;
  const maxLat = 36.5;
  const minLng = 67.5;
  const maxLng = 97.5;

  const x = ((lng - minLng) / (maxLng - minLng)) * 540 + 30;
  const y = (1 - (lat - minLat) / (maxLat - minLat)) * 580 + 40;
  return [Math.round(x), Math.round(y)];
}

export const IndiaSyndicateMap: React.FC<IndiaSyndicateMapProps> = ({
  arcs,
  onSelectCase,
  selectedCaseId,
}) => {
  const [hoveredArc, setHoveredArc] = useState<IndiaMuleArc | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Outline polygon approximation for India subcontinent backdrop
  const indiaBackdropPath =
    "M 195 75 L 245 45 L 290 85 L 320 135 L 375 160 L 450 155 L 500 180 L 530 230 L 480 250 L 435 255 L 410 295 L 390 355 L 350 420 L 305 480 L 275 560 L 255 615 L 235 560 L 210 470 L 175 410 L 155 355 L 125 320 L 110 250 L 140 205 L 180 155 Z";

  return (
    <div
      data-testid="india-syndicate-map"
      style={{
        position: "relative",
        background: "#0F172A",
        borderRadius: "12px",
        border: "1px solid #1E293B",
        padding: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Shield size={14} color="#38BDF8" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#F8FAFC", letterSpacing: "0.5px" }}>
            NATIONAL CYBER-FRAUD TRAFFICKING CORRIDORS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#38BDF8" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38BDF8" }} />
            Victim Origin
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#EF4444" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444" }} />
            Mule Layer Sink
          </span>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: "320px", display: "flex", justifyContent: "center" }}>
        <svg
          viewBox="0 0 600 660"
          style={{ width: "100%", height: "100%", maxHeight: "380px" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => setHoveredArc(null)}
        >
          {/* Subtle grid mesh */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
            <linearGradient id="arcGradGolden" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="arcGradNormal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          <rect width="600" height="660" fill="url(#mapGrid)" />

          {/* Subcontinent outline backdrop */}
          <path
            d={indiaBackdropPath}
            fill="#1E293B"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Arcs connecting origins to mule targets */}
          {arcs.map((arc) => {
            const [x1, y1] = projectGeo(arc.originCoords[0], arc.originCoords[1]);
            const [x2, y2] = projectGeo(arc.targetCoords[0], arc.targetCoords[1]);

            // Quadratic bezier curve midpoint offset
            const mx = (x1 + x2) / 2 - (y2 - y1) * 0.25;
            const my = (y1 + y2) / 2 + (x2 - x1) * 0.25;

            const isSelected = selectedCaseId === arc.caseId;
            const isHovered = hoveredArc?.id === arc.id;

            return (
              <g
                key={arc.id}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectCase(arc.caseId)}
                onMouseEnter={() => setHoveredArc(arc)}
              >
                {/* Flow corridor glow */}
                <path
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={arc.isGoldenHour ? "#F59E0B" : "#38BDF8"}
                  strokeWidth={isHovered || isSelected ? 4 : 2}
                  strokeOpacity={isHovered || isSelected ? 0.9 : 0.6}
                  strokeDasharray="6,4"
                />

                {/* Origin Pin */}
                <circle cx={x1} cy={y1} r={isHovered ? 6 : 4} fill="#38BDF8" />
                <circle cx={x1} cy={y1} r={isHovered ? 12 : 8} fill="none" stroke="#38BDF8" strokeOpacity="0.4" />

                {/* Target Pin (Pulsing Mule Sink) */}
                <circle cx={x2} cy={y2} r={isHovered ? 7 : 5} fill={arc.isGoldenHour ? "#F59E0B" : "#EF4444"} />
                <circle
                  cx={x2}
                  cy={y2}
                  r={isHovered ? 14 : 10}
                  fill="none"
                  stroke={arc.isGoldenHour ? "#F59E0B" : "#EF4444"}
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />

                {/* City label on target */}
                <text
                  x={x2 + 8}
                  y={y2 + 3}
                  fill="#E2E8F0"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {arc.targetCity.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredArc && tooltipPos && (
          <div
            style={{
              position: "absolute",
              left: `${tooltipPos.x + 10}px`,
              top: `${tooltipPos.y + 10}px`,
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "10px 12px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
              color: "#FFFFFF",
              fontSize: "11px",
              pointerEvents: "none",
              zIndex: 30,
              minWidth: "220px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontWeight: 800, color: "#38BDF8" }}>{hoveredArc.caseId}</span>
              <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>
                {hoveredArc.firNumber}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>
              {formatInr(hoveredArc.amountInr)}
            </div>
            <div style={{ marginTop: "4px", color: "#94A3B8", fontSize: "10px" }}>
              <div>From: <span style={{ color: "#F8FAFC" }}>{hoveredArc.originCity}</span></div>
              <div>To: <span style={{ color: "#F8FAFC" }}>{hoveredArc.targetCity}</span></div>
              <div>Mule: <span style={{ color: "#F8FAFC" }}>{hoveredArc.muleName}</span></div>
            </div>
            {hoveredArc.isGoldenHour && (
              <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", color: "#F59E0B", fontSize: "9.5px", fontWeight: 700 }}>
                <Zap size={10} />
                <span>P0 Golden-Hour Lien Active</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: "10px", color: "#64748B", textAlign: "center", marginTop: "4px" }}>
        Click any corridor arc to isolate case evidence and recommended freeze directives.
      </div>
    </div>
  );
};

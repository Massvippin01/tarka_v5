import React from "react";
import { useInvestigation, type NavRoute } from "../context/InvestigationContext";

interface NavItemDef {
  id: NavRoute;
  label: string;
  badge?: string;
  badgeType?: "critical" | "warning";
}

const PRIMARY_NAV_ITEMS: NavItemDef[] = [
  { id: "command", label: "Command" },
  { id: "cases", label: "Cases" },
  { id: "evidence", label: "Evidence" },
  { id: "entities", label: "Entities" },
  { id: "timeline", label: "Timeline" },
  { id: "contradictions", label: "Contradictions", badge: "1 conflict", badgeType: "critical" },
  { id: "gaps", label: "Evidence Gaps", badge: "1 open", badgeType: "warning" },
  { id: "proof", label: "Live Proof" },
  { id: "sources", label: "Source Adapters" },
  { id: "memory", label: "Memory" },
  { id: "reports", label: "Reports" },
  { id: "audit", label: "Audit Ledger" },
];

export const LeftNavRail: React.FC = () => {
  const { activeNav, setActiveNav, isLeftRailCollapsed, toggleLeftRail } = useInvestigation();

  return (
    <aside
      style={{
        width: isLeftRailCollapsed ? "48px" : "190px",
        background: "#FAF8F3",
        borderRight: "1px solid #D8D2C7",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "width 0.12s ease",
        zIndex: 20,
        userSelect: "none",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: isLeftRailCollapsed ? "center" : "space-between",
          padding: "0 12px",
          borderBottom: "1px solid #D8D2C7",
          background: "#FAF8F3",
        }}
      >
        {!isLeftRailCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#AE2D30",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: '"IBM Plex Serif", Georgia, serif',
                fontSize: "14px",
                fontWeight: 600,
                color: "#1E1D1A",
                letterSpacing: "0.2px",
              }}
            >
              Sentinel<span style={{ color: "#AE2D30" }}>X</span>
            </span>
          </div>
        )}
        <button
          onClick={toggleLeftRail}
          title={isLeftRailCollapsed ? "Expand Navigation" : "Collapse Navigation"}
          style={{
            background: "transparent",
            border: "none",
            color: "#625E57",
            cursor: "pointer",
            fontSize: "11px",
            padding: "4px",
          }}
        >
          {isLeftRailCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Primary Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              title={isLeftRailCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: isLeftRailCollapsed ? "8px 0" : "6px 10px",
                justifyContent: isLeftRailCollapsed ? "center" : "space-between",
                borderRadius: "2px",
                border: "none",
                background: isActive ? "#ECE8DF" : "transparent",
                color: isActive ? "#1E1D1A" : "#625E57",
                fontWeight: isActive ? 600 : 400,
                fontSize: "13px",
                cursor: "pointer",
                position: "relative",
                borderLeft: isActive ? "3px solid #AE2D30" : "3px solid transparent",
                textAlign: "left",
                transition: "background 0.08s ease",
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isLeftRailCollapsed ? item.label.slice(0, 3) : item.label}
              </span>

              {!isLeftRailCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    padding: "1px 5px",
                    borderRadius: "2px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    background:
                      item.badgeType === "critical"
                        ? "rgba(174, 45, 48, 0.12)"
                        : "rgba(180, 83, 9, 0.12)",
                    color:
                      item.badgeType === "critical"
                        ? "#AE2D30"
                        : "#B45309",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Persistent Legal & Operational Scope Footer */}
      {!isLeftRailCollapsed && (
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid #D8D2C7",
            background: "#ECE8DF",
            fontSize: "11px",
            fontFamily: "'IBM Plex Mono', monospace",
            color: "#625E57",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <div style={{ color: "#1E1D1A", fontWeight: 600 }}>DELHI NCR · SPL CELL</div>
          <div style={{ fontSize: "10px" }}>OFFICER: DL-8842</div>
          <div style={{ fontSize: "10px", color: "#1E6F43" }}>● CAS VERIFIED</div>
        </div>
      )}
    </aside>
  );
};

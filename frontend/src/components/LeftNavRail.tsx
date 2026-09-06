import React from "react";
import { useInvestigation, type NavRoute } from "../context/InvestigationContext";

interface NavItemDef {
  id: NavRoute;
  label: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: "command", label: "Command Center", icon: "🏛️" },
  { id: "investigations", label: "Investigations", icon: "🔍", badge: "ACTIVE" },
  { id: "cases", label: "Cases", icon: "📁" },
  { id: "search", label: "Search", icon: "🔎" },
  { id: "entities", label: "Entities", icon: "👤" },
  { id: "network", label: "Network", icon: "🕸️" },
  { id: "timeline", label: "Timeline", icon: "⏱️" },
  { id: "evidence", label: "Evidence", icon: "📋" },
  { id: "alerts", label: "Alerts", icon: "🔔", badge: "3" },
  { id: "watchlists", label: "Watchlists", icon: "👁️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "sources", label: "Data Sources", icon: "🔌" },
  { id: "health", label: "System Health", icon: "💚" },
  { id: "audit", label: "Audit Log", icon: "📜" },
  { id: "admin", label: "Administration", icon: "⚙️" },
  { id: "help", label: "Help & Manual", icon: "❓" },
];

export const LeftNavRail: React.FC = () => {
  const { activeNav, setActiveNav, isLeftRailCollapsed, toggleLeftRail } = useInvestigation();

  return (
    <aside
      style={{
        width: isLeftRailCollapsed ? "56px" : "210px",
        background: "var(--surface-primary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "width 0.15s ease",
        zIndex: 20,
        userSelect: "none",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: isLeftRailCollapsed ? "center" : "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-secondary)",
        }}
      >
        {!isLeftRailCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #10b981, #047857)",
                color: "#ffffff",
                fontSize: "0.6rem",
                fontWeight: 900,
                padding: "2px 6px",
                borderRadius: "3px",
                letterSpacing: "1px",
              }}
            >
              NX
            </span>
            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text-primary)", letterSpacing: "0.5px" }}>
              SENTINEL<span style={{ color: "var(--text-accent)" }}>X</span>
            </span>
          </div>
        )}
        <button
          onClick={toggleLeftRail}
          title={isLeftRailCollapsed ? "Expand Navigation Rail" : "Collapse Navigation Rail"}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.8rem",
            padding: "4px",
            borderRadius: "4px",
          }}
        >
          {isLeftRailCollapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              title={isLeftRailCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: isLeftRailCollapsed ? "10px 0" : "8px 10px",
                justifyContent: isLeftRailCollapsed ? "center" : "flex-start",
                borderRadius: "4px",
                border: "none",
                background: isActive ? "var(--surface-selected)" : "transparent",
                color: isActive ? "var(--text-accent)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.75rem",
                cursor: "pointer",
                position: "relative",
                borderLeft: isActive ? "3px solid var(--text-accent)" : "3px solid transparent",
                transition: "all 0.1s ease",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>{item.icon}</span>
              {!isLeftRailCollapsed && (
                <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </span>
              )}
              {!isLeftRailCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: item.badge === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: item.badge === "ACTIVE" ? "#34d399" : "#f87171",
                    border: `1px solid ${item.badge === "ACTIVE" ? "rgba(52, 211, 153, 0.4)" : "rgba(248, 113, 113, 0.4)"}`,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Context Footer */}
      {!isLeftRailCollapsed && (
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--surface-secondary)",
            fontSize: "0.65rem",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>STATION: DELHI CYBER CELL</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>INVESTIGATOR_ID: INV-8042</div>
        </div>
      )}
    </aside>
  );
};

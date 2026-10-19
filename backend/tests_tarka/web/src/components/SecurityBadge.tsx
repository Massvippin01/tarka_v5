import React, { useState } from "react";
import { useInvestigation } from "../context/InvestigationContext";

export const SecurityBadge: React.FC = () => {
  const { activeCaseId } = useInvestigation();
  const [currentUser, setCurrentUser] = useState<string>("INVESTIGATOR_DELHI");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const users: Record<string, { name: string; badge: string; role: string; scope: string[] }> = {
    INVESTIGATOR_DELHI: {
      name: "Insp. Vikramaditya",
      badge: "POL-DEL-102",
      role: "INVESTIGATOR",
      scope: ["C102", "C114"],
    },
    INVESTIGATOR_GURUGRAM: {
      name: "Insp. Rajesh Sharma",
      badge: "POL-GUR-481",
      role: "INVESTIGATOR",
      scope: ["C481", "C512"],
    },
    SUPERVISOR_NCR: {
      name: "ACP S. K. Verma",
      badge: "POL-NCR-001",
      role: "SUPERVISOR",
      scope: ["C102", "C114", "C481", "C512"],
    },
    AUDITOR: {
      name: "Director M. K. Rao",
      badge: "AUD-NAT-99",
      role: "AUDITOR",
      scope: ["ALL (READ-ONLY)"],
    },
  };

  const activeProfile = users[currentUser] || users.INVESTIGATOR_DELHI;
  const isAuthorized = activeProfile.scope.includes(activeCaseId) || activeProfile.scope.includes("ALL (READ-ONLY)");

  return (
    <div style={styles.container}>
      {/* Persistent Synthetic Simulation Banner Badge */}
      <div style={styles.synthPill}>
         SYNTHETIC SIMULATION ENVIRONMENT
      </div>

      {/* Security Identity Badge */}
      <div style={styles.userBadge} onClick={() => setShowDropdown(!showDropdown)}>
        <span style={styles.userName}> {activeProfile.name}</span>
        <span style={styles.roleTag}>{activeProfile.role}</span>
        <span style={isAuthorized ? styles.scopeOk : styles.scopeDenied}>
          {isAuthorized ? ` SCOPE AUTHORIZED (${activeCaseId})` : ` OUT OF SCOPE (${activeCaseId})`}
        </span>
        <span style={styles.caret}>▾</span>
      </div>

      {/* Role Switcher Dropdown */}
      {showDropdown && (
        <div style={styles.dropdown} onClick={() => setShowDropdown(false)}>
          <div style={styles.dropdownTitle}>SWITCH DEMO IDENTITY:</div>
          {Object.entries(users).map(([key, u]) => (
            <div
              key={key}
              style={{
                ...styles.userItem,
                ...(key === currentUser ? styles.userActive : {}),
              }}
              onClick={() => setCurrentUser(key)}
            >
              <strong>{u.name} ({u.role})</strong>
              <span>Scope: {u.scope.join(", ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
  },
  synthPill: {
    background: "rgba(234, 179, 8, 0.15)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#fde047",
    fontSize: "0.64rem",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  userBadge: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    fontSize: "0.68rem",
    color: "#f8fafc",
  },
  userName: {
    fontWeight: 700,
  },
  roleTag: {
    background: "rgba(56, 189, 248, 0.2)",
    color: "#38bdf8",
    fontSize: "0.6rem",
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: "3px",
  },
  scopeOk: {
    color: "#34d399",
    fontSize: "0.6rem",
    fontWeight: 700,
  },
  scopeDenied: {
    color: "#f43f5e",
    fontSize: "0.6rem",
    fontWeight: 700,
  },
  caret: {
    color: "#64748b",
    fontSize: "0.7rem",
  },
  dropdown: {
    position: "absolute",
    top: "34px",
    right: 0,
    background: "#0a0f18",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "6px",
    padding: "8px",
    width: "260px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  dropdownTitle: {
    color: "#64748b",
    fontSize: "0.6rem",
    fontWeight: 700,
    paddingBottom: "4px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  userItem: {
    padding: "6px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.68rem",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  userActive: {
    background: "rgba(56, 189, 248, 0.15)",
    borderLeft: "2px solid #38bdf8",
  },
};

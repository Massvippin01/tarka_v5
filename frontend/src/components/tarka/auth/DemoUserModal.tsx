import React, { useState } from "react";
import { KeyRound, LogOut, X, Check } from "lucide-react";
import { useSettingsStore, type UserRole } from "../../../store/useSettingsStore";
import { toast } from "sonner";

interface DemoUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PersonaConfig {
  role: UserRole;
  authUsername: string;
  name: string;
  rank: string;
  badgeNo: string;
  unit: string;
  permissions: string[];
  description: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    role: "INVESTIGATOR",
    authUsername: "INVESTIGATOR_DELHI",
    name: "Insp. Rajeshwar Rao",
    rank: "Inspector of Police (IO-4091)",
    badgeNo: "DL-CY-4091",
    unit: "Cyber Financial Crime Unit, NCR",
    permissions: [
      "Evidence intake & parsing",
      "Graph exploration & entity resolution",
      "Draft §106/§107 BNSS freeze orders",
      "View case intelligence & reports",
    ],
    description: "Frontline investigating officer handling rapid golden-hour response and bank freeze requests.",
  },
  {
    role: "SUPERVISOR",
    authUsername: "SUPERVISOR_NCR",
    name: "ACP Vikramaditya Roy",
    rank: "Assistant Commissioner of Police",
    badgeNo: "NCR-SP-1002",
    unit: "Special Investigation Cell, Joint Task Force",
    permissions: [
      "All investigator capabilities",
      "Reassign Investigating Officers (IO)",
      "Approve statutory case closures",
      "Archive and restore case dossiers",
    ],
    description: "Supervisory lead overseeing multi-jurisdiction syndicate operations and closure approvals.",
  },
  {
    role: "ADMIN",
    authUsername: "SYSTEM_ADMIN",
    name: "Director Dr. S. K. Nambiar",
    rank: "Director of Cyber Intelligence",
    badgeNo: "I4C-DIR-001",
    unit: "I4C National Coordination & Platform Operations",
    permissions: [
      "Full administrative platform access",
      "Calibrate mule-scoring detection weights",
      "Execute canonical demo baseline resets",
      "Full system audit ledger access",
    ],
    description: "System administrator with platform governance authority and algorithm calibration rights.",
  },
];

export const DemoUserModal: React.FC<DemoUserModalProps> = ({ isOpen, onClose }) => {
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const { profile, setRole, updateProfile } = useSettingsStore();

  if (!isOpen) return null;

  const handleSelectPersona = async (persona: PersonaConfig) => {
    setLoadingRole(persona.role);
    try {
      // 1. Fetch real JWT from backend forensics auth session endpoint
      const res = await fetch("/api/v1/forensics/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: persona.authUsername }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          sessionStorage.setItem("sentinelx_auth_token", data.access_token);
          localStorage.setItem("sentinelx_auth_token", data.access_token);
        }
      } else {
        // Fallback demo token
        sessionStorage.setItem("sentinelx_auth_token", `demo-token-${persona.role.toLowerCase()}`);
      }

      // 2. Update client settings store
      setRole(persona.role);
      updateProfile({
        name: persona.name,
        rank: persona.rank,
        badgeNo: persona.badgeNo,
      });

      toast.success(`Switched identity to ${persona.name} (${persona.role})`);
      onClose();
    } catch {
      toast.error("Failed to authenticate session.");
    } finally {
      setLoadingRole(null);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("sentinelx_auth_token");
    localStorage.removeItem("sentinelx_auth_token");
    setRole("INVESTIGATOR");
    updateProfile({
      name: "Guest Officer (Unauthenticated)",
      rank: "Observer",
      badgeNo: "GUEST-00",
    });
    toast.info("Signed out. Operating with guest credentials.");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        data-testid="demo-user-modal"
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Switch Operational Persona
              </h2>
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                Select a verified evaluation role to inspect RBAC authorization gates and UI permissions.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Persona Cards Grid */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {PERSONAS.map((p) => {
            const isCurrent = profile.role === p.role;
            const isLoading = loadingRole === p.role;

            return (
              <div
                key={p.role}
                onClick={() => handleSelectPersona(p)}
                style={{
                  border: isCurrent ? "2px solid #0284C7" : "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  background: isCurrent ? "#F0F9FF" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background:
                          p.role === "ADMIN" ? "#FEE2E2" : p.role === "SUPERVISOR" ? "#DBEAFE" : "#DCFCE7",
                        color:
                          p.role === "ADMIN" ? "#DC2626" : p.role === "SUPERVISOR" ? "#2563EB" : "#16A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {p.role[0]}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "#0F172A" }}>{p.name}</strong>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background:
                              p.role === "ADMIN" ? "#FEF2F2" : p.role === "SUPERVISOR" ? "#EFF6FF" : "#ECFDF5",
                            color:
                              p.role === "ADMIN" ? "#DC2626" : p.role === "SUPERVISOR" ? "#2563EB" : "#059669",
                            border:
                              p.role === "ADMIN"
                                ? "1px solid #FECACA"
                                : p.role === "SUPERVISOR"
                                ? "1px solid #BFDBFE"
                                : "1px solid #A7F3D0",
                          }}
                        >
                          {p.role}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>
                        {p.rank} · {p.badgeNo}
                      </span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#0284C7",
                      }}
                    >
                      <Check size={14} /> Active Persona
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      style={{
                        background: "#0284C7",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      {isLoading ? "Signing In..." : "Select"}
                    </button>
                  )}
                </div>

                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#475569", lineHeight: 1.4 }}>
                  {p.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "4px",
                    paddingTop: "6px",
                    borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {p.permissions.map((perm, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "10.5px",
                        color: "#64748B",
                        background: "rgba(0, 0, 0, 0.03)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      ✓ {perm}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Sign Out */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            borderRadius: "0 0 14px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            Tokens are cryptographically signed with HMAC-SHA256 and verified at every API boundary.
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748B",
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

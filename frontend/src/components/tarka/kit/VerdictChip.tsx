import React from "react";
import { Check, AlertTriangle, X, Shield, Lock } from "lucide-react";

export interface VerdictChipProps {
  status: "holds" | "violated" | "advisory" | "lien" | "sealed";
  label: string;
  code?: string;
  className?: string;
}

export const VerdictChip: React.FC<VerdictChipProps> = ({
  status,
  label,
  code,
  className = "",
}) => {
  const statusStyles = {
    holds: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", icon: Check },
    violated: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", icon: X },
    advisory: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", icon: AlertTriangle },
    lien: { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD", icon: Lock },
    sealed: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", icon: Shield },
  };

  const current = statusStyles[status] || statusStyles.holds;
  const Icon = current.icon;

  return (
    <span
      className={`verdict-chip ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: "4px",
        background: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} strokeWidth={2.4} />
      <span>{label}</span>
      {code && (
        <span style={{ fontFamily: "var(--font-mono)", opacity: 0.8, fontSize: "9px" }}>
          [{code}]
        </span>
      )}
    </span>
  );
};


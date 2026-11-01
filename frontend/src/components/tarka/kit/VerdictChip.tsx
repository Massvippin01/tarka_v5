import React from "react";
import { Check, AlertTriangle, X, Shield, Lock } from "lucide-react";

export interface VerdictChipProps {
  status: "holds" | "violated" | "advisory" | "lien" | "sealed";
  label: string;
  code?: string;
  onClick?: () => void;
  className?: string;
}

export const VerdictChip: React.FC<VerdictChipProps> = ({
  status,
  label,
  code,
  onClick,
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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`verdict-chip ${
        onClick
          ? "cursor-pointer hover:shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          : ""
      } ${className}`}
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


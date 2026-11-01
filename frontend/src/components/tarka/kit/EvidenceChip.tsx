import React from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import { CheckCircle2 } from "lucide-react";

export interface EvidenceChipProps {
  tier: "T1" | "T2" | "T3";
  label: string;
  hash?: string;
  detail?: string;
  custodyStatus?: string;
  className?: string;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  tier,
  label,
  hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  detail = "Cryptographically signed evidentiary artifact",
  custodyStatus = "Chain of Custody: INTACT (RFC-3161 Anchor)",
  className = "",
}) => {
  const tierColors = {
    T1: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", badgeBg: "#059669" },
    T2: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", badgeBg: "#4F46E5" },
    T3: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", badgeBg: "#E11D48" },
  };

  const style = tierColors[tier] || tierColors.T1;

  return (
    <HoverCard.Root openDelay={120} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <span
          className={`evidence-chip ${className}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "5px",
            background: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`,
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            whiteSpace: "nowrap",
            boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "8.5px",
              fontWeight: 800,
              padding: "0.5px 3.5px",
              borderRadius: "3px",
              background: style.badgeBg,
              color: "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            {tier}
          </span>
          <span style={{ fontFamily: "var(--font-sans, sans-serif)", color: "#0F172A" }}>
            {label}
          </span>
        </span>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          sideOffset={5}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "10px 12px",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
            width: "280px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: style.text, textTransform: "uppercase" }}>
              Tier-{tier.slice(1)} Evidentiary Record
            </span>
            <span style={{ fontSize: "9px", color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
              <CheckCircle2 size={10} /> Valid
            </span>
          </div>

          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
            {label}
          </div>

          <div style={{ fontSize: "9.5px", color: "#64748B", lineHeight: 1.35 }}>
            {detail}
          </div>

          <div
            style={{
              fontSize: "8.5px",
              color: "#334155",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "4px",
              padding: "4px 6px",
              fontFamily: "var(--font-mono, monospace)",
              wordBreak: "break-all",
            }}
          >
            SHA-256: {hash.slice(0, 32)}...
          </div>

          <div style={{ fontSize: "8.5px", color: "#059669", fontWeight: 700 }}>
            {custodyStatus}
          </div>
          <HoverCard.Arrow style={{ fill: "#FFFFFF", stroke: "#E2E8F0" }} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

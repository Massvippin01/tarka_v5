import React, { useState } from "react";
import { Copy, Check, Shield, ExternalLink } from "lucide-react";

export interface EvidenceProvenancePillProps {
  artifactName: string;
  tier: "T1" | "T2" | "T3";
  sha256?: string;
  recordRef?: string;
  onInspect?: () => void;
  className?: string;
}

export const EvidenceProvenancePill: React.FC<EvidenceProvenancePillProps> = ({
  artifactName,
  tier,
  sha256,
  recordRef,
  onInspect,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const getTierBadge = () => {
    switch (tier) {
      case "T1":
        return {
          bg: "var(--forensic-verified-bg, #ECFDF5)",
          color: "var(--forensic-verified, #059669)",
          border: "var(--forensic-verified-border, #A7F3D0)",
          label: "T1 Carrier/CBS",
        };
      case "T2":
        return {
          bg: "var(--accent-brand-subtle, #EEF2FF)",
          color: "var(--accent-brand, #4F46E5)",
          border: "#C7D2FE",
          label: "T2 Secondary",
        };
      case "T3":
      default:
        return {
          bg: "var(--forensic-review-bg, #FFFBEB)",
          color: "var(--forensic-review, #D97706)",
          border: "var(--forensic-review-border, #FDE68A)",
          label: "T3 Uncertified",
        };
    }
  };

  const tierStyle = getTierBadge();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sha256) {
      navigator.clipboard.writeText(sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`evidence-provenance-pill ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "2px 8px 2px 6px",
        borderRadius: "var(--radius-sm, 6px)",
        background: "var(--surface-secondary, #F8FAFC)",
        border: "1px solid var(--border-structural, #E2E8F0)",
        fontSize: "11px",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
      }}
      title={`Forensic Provenance: ${artifactName} (${tier})${sha256 ? ` · SHA-256: ${sha256}` : ""}`}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          padding: "1px 5px",
          borderRadius: "3px",
          background: tierStyle.bg,
          color: tierStyle.color,
          border: `1px solid ${tierStyle.border}`,
          fontWeight: 700,
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <Shield size={10} /> {tier}
      </span>

      <span
        style={{
          color: "var(--text-primary, #0F172A)",
          fontWeight: 600,
          maxWidth: "140px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {artifactName}
      </span>

      {recordRef && (
        <span
          style={{
            color: "var(--text-muted, #64748B)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
          }}
        >
          @{recordRef}
        </span>
      )}

      {sha256 && (
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            padding: "2px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            color: copied ? "var(--forensic-verified, #059669)" : "var(--text-muted, #64748B)",
          }}
          title={copied ? "SHA-256 Copied!" : `Copy SHA-256: ${sha256}`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      )}

      {onInspect && (
        <button
          onClick={onInspect}
          style={{
            background: "none",
            border: "none",
            padding: "2px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            color: "var(--accent-brand, #4F46E5)",
          }}
          title="Inspect Byte Exhibit"
        >
          <ExternalLink size={11} />
        </button>
      )}
    </div>
  );
};

import React from "react";
import type { DAGNodeStatus } from "../../types/forensics";

interface EvidenceStatusBadgeProps {
  status: DAGNodeStatus | string;
  className?: string;
}

export const EvidenceStatusBadge: React.FC<EvidenceStatusBadgeProps> = ({ status, className = "" }) => {
  const normalized = (status || "").toLowerCase();

  let badgeVariant = "default";
  let label = status;
  let customStyle = "bg-slate-800 text-slate-300 border-slate-700";

  if (normalized.includes("contradiction") || normalized.includes("conflict")) {
    badgeVariant = "contradiction";
    customStyle = "bg-[#AF3F3A]/20 text-[#AF3F3A] border-[#AF3F3A]/40 font-semibold";
    label = "Contradiction";
  } else if (normalized.includes("surviv")) {
    badgeVariant = "success";
    customStyle = "bg-[#26715A]/20 text-[#26715A] border-[#26715A]/40 font-semibold";
    label = "Surviving";
  } else if (normalized.includes("baseline") || normalized.includes("removed")) {
    // Hard Forensic Invariant: Baseline-only finding must NOT use contradiction/crimson
    badgeVariant = "info";
    customStyle = "bg-[#355C8A]/20 text-[#355C8A] border-[#355C8A]/40 font-medium";
    label = "Baseline Only";
  } else if (normalized.includes("inactive") || normalized.includes("excluded")) {
    badgeVariant = "neutral";
    customStyle = "bg-slate-800/40 text-slate-400 border-dashed border-slate-600 opacity-60";
    label = "Inactive / Excluded";
  } else if (normalized.includes("review")) {
    badgeVariant = "warning";
    customStyle = "bg-amber-900/20 text-amber-400 border-amber-600/40 font-semibold";
    label = "Review Required";
  } else if (normalized.includes("active")) {
    badgeVariant = "active";
    customStyle = "bg-emerald-900/20 text-emerald-400 border-emerald-600/40";
    label = "Active";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border tracking-wide uppercase ${customStyle} ${className}`}
      data-variant={badgeVariant}
    >
      {label}
    </span>
  );
};

export default EvidenceStatusBadge;

import React from "react";
import { ShieldCheck, MinusCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { FindingSummary } from "../../types/forensics";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";

interface ChallengeDiffCardProps {
  changeType: "SURVIVING" | "REMOVED" | "REMOVED_CONTRADICTION" | "NEW";
  finding: FindingSummary;
  impactReasoning?: string;
  className?: string;
}

export const ChallengeDiffCard: React.FC<ChallengeDiffCardProps> = ({
  changeType,
  finding,
  impactReasoning,
  className = "",
}) => {
  const title = finding.title;
  let iconNode: React.ReactNode;
  let cardBorder: string;

  switch (changeType) {
    case "SURVIVING":
      iconNode = <ShieldCheck size={16} className="text-[#26715A]" />;
      cardBorder = "border-[#26715A]/40 bg-[#26715A]/5";
      break;

    case "REMOVED":
      // Invariant: REMOVED baseline-only findings must NOT use contradiction crimson (badgeVariant: "info", var(--accent))
      iconNode = <MinusCircle size={16} className="text-[#355C8A]" />;
      cardBorder = "border-[#355C8A]/40 bg-[#355C8A]/5";
      break;

    case "REMOVED_CONTRADICTION":
      iconNode = <CheckCircle2 size={16} className="text-emerald-400" />;
      cardBorder = "border-emerald-600/40 bg-emerald-950/20";
      break;

    case "NEW":
      iconNode = <AlertTriangle size={16} className="text-amber-400" />;
      cardBorder = "border-amber-600/40 bg-amber-950/20";
      break;

    default:
      iconNode = <Info size={16} className="text-slate-400" />;
      cardBorder = "border-slate-800 bg-slate-900/30";
  }

  return (
    <div className={`p-4 rounded-lg border transition-all ${cardBorder} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center">{iconNode}</span>
          <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        </div>
        <EvidenceStatusBadge status={changeType} />
      </div>

      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
        {finding.summary_text}
      </p>

      {impactReasoning && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">Forensic Causality: </span>
          {impactReasoning}
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
        <span>Rule: <code className="text-slate-200">{finding.rule_id || "DIRECT_EVIDENCE"}</code></span>
        <span>Confidence: <strong className="text-slate-200">{finding.confidence_score !== undefined ? (finding.confidence_score * 100).toFixed(0) : "100"}%</strong></span>
        <span>Artifacts: <code className="text-slate-200">{(finding.participating_artifact_ids || []).join(", ") || "N/A"}</code></span>
      </div>
    </div>
  );
};

export default ChallengeDiffCard;

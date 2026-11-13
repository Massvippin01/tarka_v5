import React from "react";
import { ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

export interface ScreenFindingCardProps {
  finding: string;
  metric: string;
  metricLabel: string;
  actionLabel: string;
  onAction: () => void;
  status?: "verified" | "warning" | "alert";
  evidenceTag?: string;
}

export const ScreenFindingCard: React.FC<ScreenFindingCardProps> = ({
  finding,
  metric,
  metricLabel,
  actionLabel,
  onAction,
  status = "verified",
  evidenceTag = "Computed from canonical evidence",
}) => {
  const getColors = () => {
    switch (status) {
      case "alert":
        return {
          bg: "rgba(239, 68, 68, 0.08)",
          border: "rgba(239, 68, 68, 0.3)",
          accent: "#EF4444",
          badgeBg: "rgba(239, 68, 68, 0.15)",
          badgeText: "#F87171",
        };
      case "warning":
        return {
          bg: "rgba(245, 158, 11, 0.08)",
          border: "rgba(245, 158, 11, 0.3)",
          accent: "#F59E0B",
          badgeBg: "rgba(245, 158, 11, 0.15)",
          badgeText: "#FBBF24",
        };
      case "verified":
      default:
        return {
          bg: "rgba(16, 185, 129, 0.08)",
          border: "rgba(16, 185, 129, 0.3)",
          accent: "#10B981",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          badgeText: "#34D399",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className="screen-finding-card mb-4 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="p-2 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: colors.badgeBg, color: colors.accent }}
        >
          {status === "alert" ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{ background: colors.badgeBg, color: colors.badgeText }}
            >
              Investigator Finding
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {evidenceTag}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
            {finding}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/50 dark:border-slate-800">
        <div className="text-left md:text-right">
          <div
            className="text-lg font-bold font-mono tracking-tight"
            style={{ color: colors.accent }}
          >
            {metric}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">{metricLabel}</div>
        </div>

        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: colors.accent }}
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React from "react";
import { AlertTriangle, ShieldAlert, Loader2, Database, Lock, RefreshCw, FolderSearch } from "lucide-react";

export type ForensicNoticeType = "empty" | "loading" | "error" | "permission_denied" | "unverified";

export interface ForensicStateNoticeProps {
  type: ForensicNoticeType;
  title: string;
  description: string;
  statutoryRef?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  height?: string | number;
}

export const ForensicStateNotice: React.FC<ForensicStateNoticeProps> = ({
  type,
  title,
  description,
  statutoryRef,
  actionLabel,
  onAction,
  className = "",
  height = "220px",
}) => {
  const getIcon = () => {
    switch (type) {
      case "loading":
        return <Loader2 className="animate-spin text-indigo-600" size={32} />;
      case "error":
        return <AlertTriangle className="text-rose-600" size={32} />;
      case "permission_denied":
        return <Lock className="text-amber-600" size={32} />;
      case "unverified":
        return <ShieldAlert className="text-amber-600" size={32} />;
      case "empty":
      default:
        return <FolderSearch className="text-slate-400" size={32} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "error":
        return "var(--forensic-tamper-border, #FECDD3)";
      case "permission_denied":
      case "unverified":
        return "var(--forensic-review-border, #FDE68A)";
      case "loading":
        return "var(--accent-brand-subtle, #EEF2FF)";
      case "empty":
      default:
        return "var(--border-structural, #E2E8F0)";
    }
  };

  return (
    <div
      className={`forensic-state-notice ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height,
        padding: "24px",
        borderRadius: "var(--radius-md, 10px)",
        background: "var(--surface-primary, #FFFFFF)",
        border: `1px dashed ${getBorderColor()}`,
        textAlign: "center",
        boxSizing: "border-box",
      }}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div style={{ marginBottom: "12px" }}>{getIcon()}</div>
      <h4
        style={{
          margin: "0 0 6px 0",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--text-primary, #0F172A)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "12.5px",
          color: "var(--text-secondary, #475569)",
          maxWidth: "460px",
          lineHeight: 1.5,
          fontFamily: "var(--font-sans)",
        }}
      >
        {description}
      </p>

      {statutoryRef && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: "var(--surface-secondary, #F8FAFC)",
            color: "var(--text-muted, #64748B)",
            border: "1px solid var(--border-subtle, #F1F5F9)",
            marginBottom: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <Database size={11} /> {statutoryRef}
        </span>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: "var(--radius-sm, 6px)",
            background: "var(--accent-brand, #4F46E5)",
            color: "var(--text-inverse, #FFFFFF)",
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <RefreshCw size={13} /> {actionLabel}
        </button>
      )}
    </div>
  );
};


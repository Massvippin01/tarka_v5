import React from "react";
import { ShieldAlert, UploadCloud, FileText, ArrowRight } from "lucide-react";

interface RequirementEmptyStateProps {
  title: string;
  screenName: string;
  requiredEvidenceText: string;
  statutoryBasis?: string;
  onUploadClick?: () => void;
  onActionClick?: () => void;
  actionButtonLabel?: string;
}

export const RequirementEmptyState: React.FC<RequirementEmptyStateProps> = ({
  title,
  screenName,
  requiredEvidenceText,
  statutoryBasis = "Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023",
  onUploadClick,
  onActionClick,
  actionButtonLabel = "Upload Evidence Exhibit",
}) => {
  return (
    <div
      data-testid="requirement-empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        minHeight: "360px",
        background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
        borderRadius: "12px",
        border: "1.5px dashed #CBD5E1",
        margin: "16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: "#FEF3C7",
          border: "1px solid #FDE68A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <ShieldAlert size={24} color="#D97706" />
      </div>

      <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>
        {title}
      </h3>

      <p style={{ fontSize: "12px", color: "#64748B", maxWidth: "460px", margin: "0 0 16px 0", lineHeight: "1.5" }}>
        {screenName} requires verified evidentiary inputs before analytical attribution can be established:
      </p>

      <div
        style={{
          padding: "8px 14px",
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "6px",
          fontSize: "11.5px",
          color: "#1E40AF",
          fontWeight: 600,
          marginBottom: "16px",
          maxWidth: "500px",
        }}
      >
        Required Exhibit: {requiredEvidenceText}
      </div>

      <div style={{ fontSize: "10.5px", color: "#94A3B8", marginBottom: "20px" }}>
        Statutory Authority: {statutoryBasis}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              background: "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
            }}
          >
            <UploadCloud size={14} />
            <span>{actionButtonLabel}</span>
          </button>
        )}

        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              background: "#FFFFFF",
              color: "#334155",
              border: "1px solid #CBD5E1",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FileText size={14} />
            <span>Generate §94 BNSS Notice</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};


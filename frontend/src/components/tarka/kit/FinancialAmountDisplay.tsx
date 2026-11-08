import React from "react";

export interface FinancialAmountDisplayProps {
  amountRupees: number;
  accountingModel?: "LIBR" | "FIFO" | "NEUTRAL";
  isTainted?: boolean;
  taintRatio?: number; // 0.0 to 1.0
  isProtectedWorkingCapital?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const FinancialAmountDisplay: React.FC<FinancialAmountDisplayProps> = ({
  amountRupees,
  accountingModel = "NEUTRAL",
  isTainted = false,
  taintRatio,
  isProtectedWorkingCapital = false,
  size = "md",
  className = "",
}) => {
  // Format to standard Indian Rupee notation (lakhs & crores)
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amountRupees);

  const getFontSize = () => {
    switch (size) {
      case "sm":
        return { num: "12px", badge: "9px" };
      case "lg":
        return { num: "18px", badge: "11px" };
      case "md":
      default:
        return { num: "14px", badge: "10px" };
    }
  };

  const dims = getFontSize();

  const getTextColor = () => {
    if (isProtectedWorkingCapital) return "var(--forensic-verified, #059669)";
    if (isTainted) return "var(--forensic-tamper, #E11D48)";
    return "var(--text-primary, #0F172A)";
  };

  return (
    <span
      className={`financial-amount-display ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontVariantNumeric: "tabular-nums",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: dims.num,
          color: getTextColor(),
          letterSpacing: "-0.01em",
        }}
      >
        {formattedAmount}
      </span>

      {accountingModel !== "NEUTRAL" && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: dims.badge,
            fontWeight: 700,
            padding: "1px 4px",
            borderRadius: "3px",
            background: accountingModel === "LIBR" ? "var(--forensic-verified-bg, #ECFDF5)" : "var(--accent-brand-subtle, #EEF2FF)",
            color: accountingModel === "LIBR" ? "var(--forensic-verified, #059669)" : "var(--accent-brand, #4F46E5)",
            border: `1px solid ${accountingModel === "LIBR" ? "var(--forensic-verified-border, #A7F3D0)" : "#C7D2FE"}`,
          }}
          title={accountingModel === "LIBR" ? "Lowest Intermediate Balance Rule (Protects Innocent Commerce)" : "First-In, First-Out Allocation"}
        >
          {accountingModel}
        </span>
      )}

      {isProtectedWorkingCapital && (
        <span
          style={{
            fontSize: dims.badge,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: "3px",
            background: "var(--forensic-verified-bg, #ECFDF5)",
            color: "var(--forensic-verified, #059669)",
            border: "1px solid var(--forensic-verified-border, #A7F3D0)",
          }}
        >
          SAFE HARBOR
        </span>
      )}

      {typeof taintRatio === "number" && taintRatio > 0 && (
        <span
          style={{
            fontSize: dims.badge,
            fontWeight: 600,
            padding: "1px 4px",
            borderRadius: "3px",
            background: "var(--forensic-tamper-bg, #FFF1F2)",
            color: "var(--forensic-tamper, #E11D48)",
            border: "1px solid var(--forensic-tamper-border, #FECDD3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {Math.round(taintRatio * 100)}% TAINT
        </span>
      )}
    </span>
  );
};


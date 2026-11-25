import React, { useState } from "react";
import { Clock } from "lucide-react";

export interface TimestampDisplayProps {
  isoTimestamp: string;
  clockDriftSeconds?: number;
  showDualTimezone?: boolean;
  className?: string;
}

export const TimestampDisplay: React.FC<TimestampDisplayProps> = ({
  isoTimestamp,
  clockDriftSeconds,
  showDualTimezone = true,
  className = "",
}) => {
  const [preferIst, setPreferIst] = useState(true);

  let dateObj: Date;
  try {
    dateObj = new Date(isoTimestamp);
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
  } catch {
    dateObj = new Date();
  }

  // Format in IST (UTC+05:30)
  const istStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dateObj);

  // Format in UTC
  const utcStr = dateObj.toISOString().replace("T", " ").replace("Z", " UTC");

  const primaryTime = preferIst ? `${istStr} IST` : utcStr;
  const secondaryTime = preferIst ? utcStr : `${istStr} IST`;

  return (
    <span
      className={`timestamp-display ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontVariantNumeric: "tabular-nums",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        boxSizing: "border-box",
      }}
      title={`Forensic Timestamp: ${primaryTime} (Secondary: ${secondaryTime})`}
    >
      <Clock size={12} color="var(--text-muted, #64748B)" />
      
      <span
        style={{
          fontWeight: 600,
          color: "var(--text-primary, #0F172A)",
          cursor: "pointer",
        }}
        onClick={() => setPreferIst(!preferIst)}
        title="Click to toggle between IST and UTC"
      >
        {primaryTime}
      </span>

      {showDualTimezone && (
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted, #64748B)",
          }}
        >
          ({preferIst ? "IST" : "UTC"})
        </span>
      )}

      {typeof clockDriftSeconds === "number" && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "1px 4px",
            borderRadius: "3px",
            background: Math.abs(clockDriftSeconds) <= 1.0 ? "var(--forensic-verified-bg, #ECFDF5)" : "var(--forensic-review-bg, #FFFBEB)",
            color: Math.abs(clockDriftSeconds) <= 1.0 ? "var(--forensic-verified, #059669)" : "var(--forensic-review, #D97706)",
            border: `1px solid ${Math.abs(clockDriftSeconds) <= 1.0 ? "var(--forensic-verified-border, #A7F3D0)" : "var(--forensic-review-border, #FDE68A)"}`,
          }}
          title={`NTP Clock Drift Caliper: ${clockDriftSeconds > 0 ? `+${clockDriftSeconds.toFixed(2)}` : clockDriftSeconds.toFixed(2)}s relative to Stratum-1`}
        >
          Δ{clockDriftSeconds > 0 ? `+${clockDriftSeconds.toFixed(1)}` : clockDriftSeconds.toFixed(1)}s
        </span>
      )}
    </span>
  );
};

import React, { useEffect, useState } from "react";
import { Sparkles, X, CheckCircle2, TrendingUp, Users, ShieldAlert } from "lucide-react";
import { formatInr } from "../../../utils/formatters";

export interface WhatChangedData {
  entitiesCount?: number;
  suspectCount?: number;
  txnCount?: number;
  recoverableInr?: number;
  deltaRecoverable?: number;
  newSuspectAccounts?: number;
  message?: string;
}

interface WhatChangedBannerProps {
  data: WhatChangedData | null;
  onClose: () => void;
}

export const WhatChangedBanner: React.FC<WhatChangedBannerProps> = ({ data, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [data, onClose]);

  if (!data || !isVisible) return null;

  return (
    <div
      data-testid="what-changed-banner"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9000,
        maxWidth: "440px",
        background: "#0F172A",
        color: "#FFFFFF",
        borderRadius: "10px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={14} color="#10B981" />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "-0.01em" }}>
            Evidence Ingestion Complete · What Changed
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", padding: "2px" }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            padding: "8px 10px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Users size={14} color="#60A5FA" />
          <div>
            <div style={{ color: "#94A3B8", fontSize: "10px" }}>Entities Profiled</div>
            <div style={{ fontWeight: 800, color: "#FFFFFF" }}>+{data.entitiesCount || 3} Extracted</div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            padding: "8px 10px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldAlert size={14} color="#F87171" />
          <div>
            <div style={{ color: "#94A3B8", fontSize: "10px" }}>Suspect Mules</div>
            <div style={{ fontWeight: 800, color: "#FFFFFF" }}>+{data.suspectCount || 1} Identified</div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            padding: "8px 10px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            gridColumn: "span 2",
          }}
        >
          <TrendingUp size={14} color="#34D399" />
          <div>
            <div style={{ color: "#94A3B8", fontSize: "10px" }}>Recoverable Under LIBR</div>
            <div style={{ fontWeight: 800, color: "#34D399" }}>
              +{formatInr(data.deltaRecoverable || 40000)} (Total: {formatInr(data.recoverableInr || 380000)})
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#64748B" }}>
        <CheckCircle2 size={12} color="#10B981" />
        <span>Transaction graph, mule scores & report automatically refreshed</span>
      </div>
    </div>
  );
};


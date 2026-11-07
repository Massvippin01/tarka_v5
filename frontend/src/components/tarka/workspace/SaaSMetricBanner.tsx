import React from "react";
import {
  Clock,
  Scale,
  Fingerprint,
  Network,
  TrendingUp,
} from "lucide-react";
import type { CaseWorkspace } from "../../../context/TarkaGlobalContext";

interface SaaSMetricBannerProps {
  cases: CaseWorkspace[];
}

export const SaaSMetricBanner: React.FC<SaaSMetricBannerProps> = ({ cases }) => {
  const totalGoldenHour = cases.filter((c) => c.goldenHourRemainingMins > 0).length;
  const totalLoss = cases.reduce((acc, c) => acc + (c.bookedLossInr || 0), 0);
  const totalShielded = cases.reduce((acc, c) => acc + (c.commercialShieldedInr || c.recoverableInr || 0), 0);
  const totalExhibits = cases.reduce((acc, c) => acc + (c.artifacts?.length || 0), 0);
  const totalSyndicateLinks = cases.reduce((acc, c) => acc + (c.syndicateLinks?.length || 0), 0);

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const recoveryPct = totalLoss > 0 ? Math.round((totalShielded / totalLoss) * 100) : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: "10px",
        padding: "10px 14px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        boxSizing: "border-box",
      }}
    >
      {/* Metric 1: Golden Hour SLA */}
      <div
        style={{
          background: totalGoldenHour > 0 ? "#FFFBEB" : "#F8FAFC",
          border: `1px solid ${totalGoldenHour > 0 ? "#FDE68A" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={13} color={totalGoldenHour > 0 ? "#D97706" : "#64748B"} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: totalGoldenHour > 0 ? "#92400E" : "#475569" }}>
              GOLDEN HOUR (180M SLA)
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: totalGoldenHour > 0 ? "#FEF3C7" : "#E2E8F0",
              color: totalGoldenHour > 0 ? "#B45309" : "#64748B",
            }}
          >
            NCRP 1930
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: totalGoldenHour > 0 ? "#78350F" : "#0F172A" }}>
            {totalGoldenHour} ACTIVE
          </span>
          <span style={{ fontSize: "9.5px", color: totalGoldenHour > 0 ? "#B45309" : "#64748B", fontWeight: 700 }}>
            {cases[0]?.goldenHourRemainingMins ? `${cases[0].goldenHourRemainingMins}m left` : "Compliant"}
          </span>
        </div>
      </div>

      {/* Metric 2: Total Reported Loss */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <TrendingUp size={13} color="#E11D48" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B" }}>
              CUMULATIVE EXPOSURE
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#FFF1F2",
              color: "#BE123C",
            }}
          >
            {cases.length} Cases
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {formatCurrency(totalLoss)}
          </span>
          <span style={{ fontSize: "9.5px", color: "#64748B", fontWeight: 600 }}>
            Booked Loss
          </span>
        </div>
      </div>

      {/* Metric 3: Protected Capital under §106/§107 */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Scale size={13} color="#059669" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B" }}>
              SHIELDED CAPITAL §106/107
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#ECFDF5",
              color: "#047857",
            }}
          >
            {recoveryPct}% Ratio
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#047857" }}>
            {formatCurrency(totalShielded)}
          </span>
          <span style={{ fontSize: "9.5px", color: "#059669", fontWeight: 700 }}>
            Provisional Lien
          </span>
        </div>
      </div>

      {/* Metric 4: Syndicate Clusters */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Network size={13} color="#4F46E5" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B" }}>
              SYNDICATE ANCHORS
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#EEF2FF",
              color: "#4338CA",
            }}
          >
            I4C Cross-FIR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#312E81" }}>
            {totalSyndicateLinks} ANCHORS
          </span>
          <span style={{ fontSize: "9.5px", color: "#4F46E5", fontWeight: 700 }}>
            JA4 · TAC · BSSID
          </span>
        </div>
      </div>

      {/* Metric 5: Evidence Integrity */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Fingerprint size={13} color="#0284C7" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B" }}>
              EVIDENCE INTEGRITY
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#F0F9FF",
              color: "#0369A1",
            }}
          >
            100% AIR-GAP
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {totalExhibits} EXHIBITS
          </span>
          <span style={{ fontSize: "9.5px", color: "#0284C7", fontWeight: 700 }}>
            SHA-256 Verified
          </span>
        </div>
      </div>
    </div>
  );
};

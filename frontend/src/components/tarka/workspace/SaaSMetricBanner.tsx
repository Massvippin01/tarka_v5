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
          background: totalGoldenHour > 0 ? "#FFFBEB" : "#FFFFFF",
          border: `1px solid ${totalGoldenHour > 0 ? "#FDE68A" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={14} color={totalGoldenHour > 0 ? "#D97706" : "#64748B"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: totalGoldenHour > 0 ? "#92400E" : "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Golden Hour (180m SLA)
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: totalGoldenHour > 0 ? "#FEF3C7" : "#F1F5F9",
              color: totalGoldenHour > 0 ? "#B45309" : "#64748B",
            }}
          >
            NCRP 1930
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: totalGoldenHour > 0 ? "#92400E" : "#0F172A" }}>
            {totalGoldenHour} ACTIVE
          </span>
          <span style={{ fontSize: "11px", color: totalGoldenHour > 0 ? "#B45309" : "#64748B", fontWeight: 600 }}>
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
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={14} color="#E11D48" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Cumulative Exposure
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#FFF1F2",
              color: "#BE123C",
            }}
          >
            {cases.length} Cases
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {formatCurrency(totalLoss)}
          </span>
          <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
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
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Scale size={14} color="#059669" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Shielded Capital §106/107
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#ECFDF5",
              color: "#047857",
            }}
          >
            {recoveryPct}% Ratio
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#047857" }}>
            {formatCurrency(totalShielded)}
          </span>
          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
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
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Network size={14} color="#4F46E5" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Syndicate Anchors
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#EEF2FF",
              color: "#4338CA",
            }}
          >
            I4C Cross-FIR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#312E81" }}>
            {totalSyndicateLinks} ANCHORS
          </span>
          <span style={{ fontSize: "11px", color: "#4F46E5", fontWeight: 600 }}>
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
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Fingerprint size={14} color="#0284C7" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Evidence Integrity
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#F0F9FF",
              color: "#0369A1",
            }}
          >
            100% AIR-GAP
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {totalExhibits} EXHIBITS
          </span>
          <span style={{ fontSize: "11px", color: "#0284C7", fontWeight: 600 }}>
            SHA-256 Verified
          </span>
        </div>
      </div>
    </div>
  );
};

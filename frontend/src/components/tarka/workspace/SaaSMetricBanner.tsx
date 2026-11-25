import React from "react";
import {
  Clock,
  Scale,
  Fingerprint,
  Network,
  TrendingUp,
} from "lucide-react";
import type { CaseWorkspace } from "../../../context/TarkaGlobalContext";
import { selectDashboardFinancials } from "../../../selectors/dashboardSelectors";
import { formatInr } from "../../../utils/formatters";

interface SaaSMetricBannerProps {
  cases: CaseWorkspace[];
  activeFilter?: string;
  onFilterChange?: (filter: "ALL" | "GOLDEN_HOUR" | "SYNDICATE" | "ACTION_PENDING" | "COURT_READY" | "CLOSED" | "ARCHIVED") => void;
}

export const SaaSMetricBanner: React.FC<SaaSMetricBannerProps> = ({
  cases,
  activeFilter,
  onFilterChange,
}) => {
  const fin = selectDashboardFinancials(cases);
  const totalExhibits = cases.reduce((acc, c) => acc + (c.artifacts?.length || 0), 0);

  return (
    <div
      data-testid="saas-metric-banner"
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
        data-testid="kpi-golden-hour"
        onClick={() => onFilterChange?.(activeFilter === "GOLDEN_HOUR" ? "ALL" : "GOLDEN_HOUR")}
        style={{
          background: fin.goldenHourActiveCount > 0 ? "#FFFBEB" : "#F8FAFC",
          border: `1px solid ${activeFilter === "GOLDEN_HOUR" ? "#D97706" : fin.goldenHourActiveCount > 0 ? "#FDE68A" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: activeFilter === "GOLDEN_HOUR" ? "0 0 0 2px rgba(217,119,6,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={13} color={fin.goldenHourActiveCount > 0 ? "#D97706" : "#64748B"} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: fin.goldenHourActiveCount > 0 ? "#92400E" : "#475569" }}>
              GOLDEN HOUR (180M SLA)
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "3px",
              background: fin.goldenHourActiveCount > 0 ? "#FEF3C7" : "#E2E8F0",
              color: fin.goldenHourActiveCount > 0 ? "#B45309" : "#64748B",
            }}
          >
            NCRP 1930
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: fin.goldenHourActiveCount > 0 ? "#78350F" : "#0F172A" }}>
            {fin.goldenHourActiveCount} ACTIVE
          </span>
          <span style={{ fontSize: "9.5px", color: fin.goldenHourActiveCount > 0 ? "#B45309" : "#64748B", fontWeight: 700 }}>
            {cases[0]?.goldenHourRemainingMins ? `${cases[0].goldenHourRemainingMins}m left` : "Compliant"}
          </span>
        </div>
      </div>

      {/* Metric 2: Total Reported Loss */}
      <div
        data-testid="kpi-total-loss"
        onClick={() => onFilterChange?.("ALL")}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${activeFilter === "ALL" ? "#2563EB" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: activeFilter === "ALL" ? "0 0 0 2px rgba(37,99,235,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
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
            {formatInr(fin.totalReportedLossInr)}
          </span>
          <span style={{ fontSize: "9.5px", color: "#64748B", fontWeight: 600 }}>
            Booked Loss
          </span>
        </div>
      </div>

      {/* Metric 3: Protected Capital under §106/§107 */}
      <div
        data-testid="kpi-shielded-capital"
        onClick={() => onFilterChange?.(activeFilter === "ACTION_PENDING" ? "ALL" : "ACTION_PENDING")}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${activeFilter === "ACTION_PENDING" ? "#059669" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: activeFilter === "ACTION_PENDING" ? "0 0 0 2px rgba(5,150,105,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
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
            {fin.recoveryPercentage}% Ratio
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#047857" }}>
            {formatInr(fin.totalFrozenInr > 0 ? fin.totalFrozenInr : fin.totalRecoverableInr)}
          </span>
          <span style={{ fontSize: "9.5px", color: "#059669", fontWeight: 700 }}>
            {fin.totalFrozenInr > 0 ? "Bank Frozen" : "Provisional Lien"}
          </span>
        </div>
      </div>

      {/* Metric 4: Syndicate Clusters */}
      <div
        data-testid="kpi-syndicate-anchors"
        onClick={() => onFilterChange?.(activeFilter === "SYNDICATE" ? "ALL" : "SYNDICATE")}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${activeFilter === "SYNDICATE" ? "#4F46E5" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: activeFilter === "SYNDICATE" ? "0 0 0 2px rgba(79,70,229,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
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
            {fin.totalCrossFirLinks} ANCHORS
          </span>
          <span style={{ fontSize: "9.5px", color: "#4F46E5", fontWeight: 700 }}>
            JA4 · TAC · BSSID
          </span>
        </div>
      </div>

      {/* Metric 5: Evidence Integrity */}
      <div
        data-testid="kpi-evidence-integrity"
        onClick={() => onFilterChange?.(activeFilter === "COURT_READY" ? "ALL" : "COURT_READY")}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${activeFilter === "COURT_READY" ? "#0284C7" : "#E2E8F0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: activeFilter === "COURT_READY" ? "0 0 0 2px rgba(2,132,199,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
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

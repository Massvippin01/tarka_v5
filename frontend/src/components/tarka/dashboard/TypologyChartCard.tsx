import React from "react";
import { PieChart } from "lucide-react";
import type { TypologyCount } from "../../../selectors/dashboardSelectors";
import { formatInr } from "../../../utils/formatters";

interface TypologyChartCardProps {
  typologies: TypologyCount[];
  onSelectTypology?: (typology: string) => void;
  selectedTypology?: string | null;
}

export const TypologyChartCard: React.FC<TypologyChartCardProps> = ({
  typologies,
  onSelectTypology,
  selectedTypology,
}) => {
  const totalCases = typologies.reduce((acc, t) => acc + t.count, 0);

  return (
    <div
      data-testid="typology-chart-card"
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PieChart size={13} color="#4F46E5" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: 800, color: "#0F172A" }}>
              Cyber Typology Breakdown
            </h3>
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Distribution by Indian cybercrime classification
            </span>
          </div>
        </div>
        {selectedTypology && (
          <button
            type="button"
            onClick={() => onSelectTypology?.("")}
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Stacked bar visualization */}
      <div
        style={{
          display: "flex",
          height: "12px",
          borderRadius: "6px",
          overflow: "hidden",
          marginBottom: "14px",
          background: "#F1F5F9",
        }}
      >
        {typologies.map((t) => {
          const pct = totalCases > 0 ? (t.count / totalCases) * 100 : 0;
          return (
            <div
              key={t.typology}
              style={{
                width: `${pct}%`,
                background: t.color,
                transition: "width 0.3s ease",
              }}
              title={`${t.typology}: ${t.count} cases (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Typology rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {typologies.map((t) => {
          const isSelected = selectedTypology === t.typology;
          const pct = totalCases > 0 ? Math.round((t.count / totalCases) * 100) : 0;

          return (
            <div
              key={t.typology}
              onClick={() => onSelectTypology?.(isSelected ? "" : t.typology)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: "6px",
                background: isSelected ? "#EEF2FF" : "#F8FAFC",
                border: `1px solid ${isSelected ? "#818CF8" : "#F1F5F9"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: t.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? "#312E81" : "#1E293B",
                  }}
                >
                  {t.typology}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "#059669", fontWeight: 700 }}>
                  {formatInr(t.lossInr)}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background: "#E2E8F0",
                    color: "#334155",
                    minWidth: "22px",
                    textAlign: "center",
                  }}
                >
                  {t.count} ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

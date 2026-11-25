import React from "react";
import { Landmark, Lock } from "lucide-react";
import type { BankMuleCount } from "../../../selectors/dashboardSelectors";
import { formatInr } from "../../../utils/formatters";

interface TopBanksCardProps {
  banks: BankMuleCount[];
}

export const TopBanksCard: React.FC<TopBanksCardProps> = ({ banks }) => {
  return (
    <div
      data-testid="top-banks-card"
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
              background: "#F0FDF4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Landmark size={13} color="#16A34A" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: 800, color: "#0F172A" }}>
              Nodal Bank Mule Concentration
            </h3>
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Commercial banks harboring flagged intermediary accounts
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "4px",
            background: "#ECFDF5",
            color: "#059669",
            border: "1px solid #A7F3D0",
          }}
        >
          Nodal Escalations
        </span>
      </div>

      {/* List of banks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto" }}>
        {banks.map((b) => {
          return (
            <div
              key={b.bankName}
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                  {b.bankName}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    border: "1px solid #FEE2E2",
                  }}
                >
                  {b.muleAccountCount} Mules
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                <span style={{ color: "#64748B" }}>
                  Trafficked:{" "}
                  <strong style={{ fontFamily: "var(--font-mono)", color: "#1E293B" }}>
                    {formatInr(b.totalTraffickedInr)}
                  </strong>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#059669", fontWeight: 700 }}>
                  <Lock size={9} />
                  <span>{Math.round(b.frozenRatio * 100)}% Frozen</span>
                </span>
              </div>

              {/* Progress track */}
              <div
                style={{
                  height: "4px",
                  borderRadius: "2px",
                  background: "#E2E8F0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(b.frozenRatio * 100)}%`,
                    background: "#059669",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


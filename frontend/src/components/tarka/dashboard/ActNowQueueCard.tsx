import React from "react";
import { ArrowRight, Zap, ShieldCheck } from "lucide-react";
import type { ActNowQueueItem } from "../../../selectors/dashboardSelectors";
import { formatInr } from "../../../utils/formatters";
import type { ActiveRoute } from "../../../context/TarkaGlobalContext";

interface ActNowQueueCardProps {
  items: ActNowQueueItem[];
  onNavigateToCase: (caseId: string, route: ActiveRoute) => void;
}

export const ActNowQueueCard: React.FC<ActNowQueueCardProps> = ({
  items,
  onNavigateToCase,
}) => {
  return (
    <div
      data-testid="act-now-queue-card"
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
          paddingBottom: "10px",
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#FEF3C7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={13} color="#D97706" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: 800, color: "#0F172A" }}>
              Act-Now Priority Queue
            </h3>
            <span style={{ fontSize: "10.5px", color: "#64748B" }}>
              Golden-Hour statutory freeze directives & immediate nodal mandates
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: "12px",
            background: items.length > 0 ? "#FEE2E2" : "#F1F5F9",
            color: items.length > 0 ? "#B91C1C" : "#64748B",
            border: `1px solid ${items.length > 0 ? "#FECACA" : "#E2E8F0"}`,
          }}
        >
          {items.length} Actionable
        </span>
      </div>

      {/* Item List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: "360px",
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#64748B",
              fontSize: "12px",
            }}
          >
            <ShieldCheck size={28} color="#10B981" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontWeight: 700, color: "#0F172A" }}>Queue is clear</p>
            <p style={{ margin: "4px 0 0", fontSize: "11px" }}>No cases requiring immediate statutory intervention.</p>
          </div>
        ) : (
          items.map((item) => {
            const isGolden = item.slaMinsRemaining > 0;
            return (
              <div
                key={item.caseId}
                data-testid={`queue-item-${item.caseId}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: isGolden ? "1px solid #FDE68A" : "1px solid #E2E8F0",
                  background: isGolden ? "#FFFBEB" : "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Left: Case Info & Action Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#1E293B",
                      }}
                    >
                      {item.firNumber}
                    </span>
                    <span style={{ fontSize: "10px", color: "#64748B" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>
                      {item.complainantName}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: isGolden ? "#FEF3C7" : "#F1F5F9",
                        color: isGolden ? "#B45309" : "#64748B",
                      }}
                    >
                      {isGolden ? `${item.slaMinsRemaining}m SLA` : "SLA Expired"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#0F172A",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.urgentActionTitle}
                  </div>

                  <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                    Recoverable Pool:{" "}
                    <strong style={{ color: "#059669", fontFamily: "var(--font-mono)" }}>
                      {formatInr(item.recoverableInr)}
                    </strong>{" "}
                    · {item.policeStation}
                  </div>
                </div>

                {/* Right: CTA Button */}
                <button
                  type="button"
                  onClick={() => onNavigateToCase(item.caseId, item.targetRoute)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: isGolden ? "#D97706" : "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                >
                  <span>Act Now</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

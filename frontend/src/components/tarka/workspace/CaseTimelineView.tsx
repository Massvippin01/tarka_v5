import React from "react";
import { Zap } from "lucide-react";
import type { CaseWorkspace, ActiveRoute } from "../../../context/TarkaGlobalContext";

interface CaseTimelineViewProps {
  cases: CaseWorkspace[];
  activeCaseId: string;
  onSelectCase: (caseId: string, stage?: ActiveRoute) => void;
}

export const CaseTimelineView: React.FC<CaseTimelineViewProps> = ({
  cases,
  activeCaseId,
  onSelectCase,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflowY: "auto",
        padding: "16px 20px",
        gap: "14px",
        scrollbarWidth: "thin",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
            STATUTORY INCIDENT-TO-COURT CHRONOLOGICAL ROADMAP
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "10.5px", color: "#64748B" }}>
            Tracks the critical 180-minute Golden Hour SLA window for provisional lien freeze under BNSS §106.
          </p>
        </div>

        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            background: "#ECFDF5",
            color: "#047857",
            border: "1px solid #A7F3D0",
          }}
        >
          NCRP 1930 Helpline Stratum-2 Sync
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {cases.map((c) => {
          const isActive = c.caseId === activeCaseId;
          const isGoldenHour = c.goldenHourRemainingMins > 0;

          return (
            <div
              key={c.caseId}
              onClick={() => onSelectCase(c.caseId)}
              style={{
                background: "#FFFFFF",
                border: isActive ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: isActive ? "0 2px 8px rgba(79, 70, 229, 0.12)" : "0 1px 3px rgba(0,0,0,0.03)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                    {c.caseId}
                  </span>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#334155" }}>
                    {c.title}
                  </span>
                </div>

                {isGoldenHour ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "#FEF3C7",
                      color: "#92400E",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    <Zap size={11} color="#D97706" />
                    <span>{c.goldenHourRemainingMins}m SLA Window Active</span>
                  </span>
                ) : (
                  <span style={{ fontSize: "10px", color: "#BE123C", fontWeight: 800 }}>
                    Golden hour expired
                  </span>
                )}
              </div>

              {/* Visual 4-Milestone Timeline Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "6px" }}>
                <div style={{ padding: "6px 8px", background: "#F1F5F9", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>T + 00m : FRAUD INFLOW</div>
                  <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>
                    Debit: ₹{(c.bookedLossInr).toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ padding: "6px 8px", background: "#F0F9FF", borderRadius: "5px", border: "1px solid #BAE6FD" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#0369A1" }}>T + 15m : 1930 INTAKE</div>
                  <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#0369A1", marginTop: "2px" }}>
                    {c.ncrpAckNo}
                  </div>
                </div>

                <div style={{ padding: "6px 8px", background: isGoldenHour ? "#FEF3C7" : "#ECFDF5", borderRadius: "5px", border: `1px solid ${isGoldenHour ? "#FDE68A" : "#A7F3D0"}` }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: isGoldenHour ? "#92400E" : "#047857" }}>
                    T + 120m : §106 PROVISIONAL LIEN
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: 800, color: isGoldenHour ? "#92400E" : "#047857", marginTop: "2px" }}>
                    Recoverable: ₹{((c.recoverableInr || c.commercialShieldedInr || 0)).toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ padding: "6px 8px", background: "#F5F3FF", borderRadius: "5px", border: "1px solid #DDD6FE" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#6D28D9" }}>STAGE 06 : BSA §63 SEAL</div>
                  <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6D28D9", marginTop: "2px" }}>
                    {c.gatesPassed >= 4 ? "Court-Ready Certificate" : "Awaiting Final Review"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

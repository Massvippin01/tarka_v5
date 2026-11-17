import React from "react";
import {
  Link2,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { CaseWorkspace, ActiveRoute } from "../../../context/TarkaGlobalContext";

interface CaseBoardViewProps {
  cases: CaseWorkspace[];
  activeCaseId: string;
  onSelectCase: (caseId: string, stage?: ActiveRoute) => void;
  onOpenCompare: (caseId: string, linkedCaseId: string) => void;
}

const BOARD_COLUMNS: {
  id: Exclude<ActiveRoute, "workspace">;
  num: string;
  title: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
}[] = [
  { id: "intake", num: "01", title: "Intake & Triage", badgeBg: "#ECFDF5", badgeText: "#047857", accentColor: "#10B981" },
  { id: "entities", num: "02", title: "Entity Resolution", badgeBg: "#EEF2FF", badgeText: "#4338CA", accentColor: "#6366F1" },
  { id: "attribution", num: "03", title: "Telecom & Ingress", badgeBg: "#F0F9FF", badgeText: "#0369A1", accentColor: "#0284C7" },
  { id: "network", num: "04", title: "Mule Network & Flow", badgeBg: "#FEF3C7", badgeText: "#B45309", accentColor: "#F59E0B" },
  { id: "taint-engine", num: "05", title: "Taint & Lien §107", badgeBg: "#FFF1F2", badgeText: "#BE123C", accentColor: "#E11D48" },
  { id: "court-proof", num: "06", title: "Court Proof Sealed", badgeBg: "#F5F3FF", badgeText: "#6D28D9", accentColor: "#8B5CF6" },
];

export const CaseBoardView: React.FC<CaseBoardViewProps> = ({
  cases,
  activeCaseId,
  onSelectCase,
  onOpenCompare,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        height: "100%",
        width: "100%",
        overflowX: "auto",
        padding: "12px 14px",
        boxSizing: "border-box",
        scrollbarWidth: "thin",
        background: "#F8FAFC",
      }}
    >
      {BOARD_COLUMNS.map((col) => {
        const columnCases = cases.filter((c) => c.currentStage === col.id);

        return (
          <div
            key={col.id}
            style={{
              width: "280px",
              minWidth: "280px",
              display: "flex",
              flexDirection: "column",
              background: "#F1F5F9",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: "8px 12px",
                background: "#FFFFFF",
                borderBottom: `2px solid ${col.accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: col.badgeBg,
                    color: col.badgeText,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {col.num}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1E293B" }}>
                  {col.title}
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  background: "#F1F5F9",
                  color: "#64748B",
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {columnCases.length}
              </span>
            </div>

            {/* Column Cards Container */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                scrollbarWidth: "thin",
              }}
            >
              {columnCases.map((c) => {
                const isActive = c.caseId === activeCaseId;
                const shielded = c.recoverableInr || c.commercialShieldedInr || 0;
                const ratio = c.bookedLossInr > 0 ? Math.round((shielded / c.bookedLossInr) * 100) : 0;

                return (
                  <div
                    key={c.caseId}
                    onClick={() => onSelectCase(c.caseId, col.id)}
                    style={{
                      background: "#FFFFFF",
                      border: isActive ? "2px solid #4F46E5" : "1px solid #CBD5E1",
                      borderRadius: "6px",
                      padding: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: isActive ? "0 2px 8px rgba(79, 70, 229, 0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      transition: "transform 0.12s ease, box-shadow 0.12s ease",
                    }}
                    className="hover:translate-y-[-1px] hover:shadow-md"
                  >
                    {/* Top Row: Case ID + SLA */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          color: "#0F172A",
                        }}
                      >
                        {c.caseId}
                      </span>
                      {c.goldenHourRemainingMins > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: "#FEF3C7",
                            color: "#92400E",
                            border: "1px solid #FCD34D",
                          }}
                        >
                          <Zap size={9} color="#D97706" />
                          <span>{c.goldenHourRemainingMins}m</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: "9px", color: "#BE123C", fontWeight: 800 }} title={c.firNumber}>
                          Expired · {c.firNumber}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#1E293B",
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {c.title}
                    </div>

                    {/* Loss & Shielded Bar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px" }}>
                        <span style={{ color: "#64748B" }}>Loss: <b>{formatCurrency(c.bookedLossInr)}</b></span>
                        <span style={{ color: ratio >= 70 ? "#059669" : "#B45309", fontWeight: 700 }}>
                          {ratio}% Secured
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, ratio)}%`,
                            height: "100%",
                            background: ratio >= 70 ? "#10B981" : "#F59E0B",
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Syndicate Links Pills */}
                    {c.syndicateLinks && c.syndicateLinks.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        {Array.from(
                          new Map(c.syndicateLinks.map((link: { linkedCaseId: string }) => [link.linkedCaseId, link])).values()
                        ).map((link, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCompare(c.caseId, link.linkedCaseId);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "#EEF2FF",
                              color: "#4338CA",
                              border: "1px solid #C7D2FE",
                              cursor: "pointer",
                            }}
                          >
                            <Link2 size={9} />
                            <span>{link.linkedCaseId}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer Row: Lead IO & Open Button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "6px",
                        borderTop: "1px solid #F1F5F9",
                        fontSize: "9.5px",
                        color: "#64748B",
                        marginTop: "2px",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>
                        {c.leadInvestigator}
                      </span>
                      <span
                        style={{
                          color: "#4F46E5",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        Inspect <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}

              {columnCases.length === 0 && (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#94A3B8",
                    fontStyle: "italic",
                  }}
                >
                  No cases in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useState } from "react";
import { Search, FolderOpen, AlertTriangle } from "lucide-react";
import { useUrlSync } from "../../store/useCaseStore";
import { CANONICAL_CASES } from "../../fixtures/cases";

interface CaseNotFoundScreenProps {
  caseId: string | null;
}

export const CaseNotFoundScreen: React.FC<CaseNotFoundScreenProps> = ({ caseId }) => {
  const { navigateCase } = useUrlSync();
  const [searchTerm, setSearchTerm] = useState("");

  const availableCases = Object.values(CANONICAL_CASES).map((c) => ({
    id: c.caseId,
    fir: c.caseId === "CASE-2026-001" ? "FIR · Cyber Crime PS" : c.firNumber,
    victim: c.caseId === "CASE-2026-001" ? "Victim Record [Protected]" : c.complainant.name,
    loss: c.financials.bookedLossInr,
    typology: c.typology,
    station: c.policeStation
  }));

  const filteredCases = availableCases.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.fir.toLowerCase().includes(q) ||
      c.victim.toLowerCase().includes(q) ||
      c.typology.toLowerCase().includes(q)
    );
  });

  return (
    <div
      data-case-id={caseId || "unknown"}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "75vh",
        padding: "40px 24px",
        color: "#F8FAFC",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "rgba(225, 29, 72, 0.12)",
          border: "1px solid rgba(225, 29, 72, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "#FB7185",
        }}
      >
        <AlertTriangle size={32} />
      </div>

      <h1
        style={{
          fontSize: "26px",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: "8px",
          color: "#FFFFFF",
        }}
      >
        Case Not Found
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: "#94A3B8",
          maxWidth: "540px",
          lineHeight: "1.6",
          marginBottom: "28px",
        }}
      >
        The requested case identifier{" "}
        <code
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            padding: "2px 8px",
            borderRadius: "4px",
            color: "#F43F5E",
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        >
          {caseId || "UNKNOWN_ID"}
        </code>{" "}
        does not exist in the active forensic database or authenticated multi-agency registry.
      </p>

      {/* SEARCH BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "480px",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: "10px",
          padding: "8px 14px",
          gap: "10px",
          marginBottom: "32px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Search size={18} style={{ color: "#64748B" }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search valid cases by FIR, Complainant or Case ID..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F8FAFC",
            fontSize: "13.5px",
            width: "100%",
          }}
        />
      </div>

      {/* QUICK CASE SELECTOR CARDS */}
      <div style={{ width: "100%", maxWidth: "680px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#64748B",
            marginBottom: "12px",
            textAlign: "left",
          }}
        >
          Available Active Investigation Workspaces:
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "12px",
            textAlign: "left",
          }}
        >
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigateCase(c.id, "intake")}
              style={{
                background: "rgba(30, 41, 59, 0.65)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "10px",
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.5)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.65)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "13px", color: "#38BDF8" }}>
                  {c.id}
                </span>
                <span style={{ fontSize: "11px", color: "#94A3B8" }}>{c.fir}</span>
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC", marginBottom: "4px" }}>
                {c.victim}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11.5px",
                  color: "#64748B",
                  marginTop: "8px",
                }}
              >
                <span>{c.typology.replace(/_/g, " ")}</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>
                  ₹{(c.loss).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
        <button
          type="button"
          onClick={() => navigateCase(null, "workspace")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(51, 65, 85, 0.6)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            color: "#F8FAFC",
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FolderOpen size={15} />
          Return to Workspaces Hub
        </button>
      </div>
    </div>
  );
};

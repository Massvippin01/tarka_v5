import React from "react";
import {
  X,
  Link2,
  ShieldAlert,
  Fingerprint,
  Wifi,
  Smartphone,
} from "lucide-react";
import type { CaseWorkspace } from "../../../context/TarkaGlobalContext";

interface CrossCaseComparatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseA: CaseWorkspace | null;
  caseB: CaseWorkspace | null;
  onNavigateToCase: (caseId: string) => void;
}

export const CrossCaseComparatorDrawer: React.FC<CrossCaseComparatorDrawerProps> = ({
  isOpen,
  onClose,
  caseA,
  caseB,
  onNavigateToCase,
}) => {
  if (!isOpen || !caseA || !caseB) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100050,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "720px",
          maxWidth: "90vw",
          height: "100%",
          background: "#FFFFFF",
          boxShadow: "-8px 0 32px rgba(15, 23, 42, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 18px",
            background: "#0F172A",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link2 size={16} color="#38BDF8" />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800 }}>
                CROSS-CASE SYNDICATE LINK COMPARATOR
              </div>
              <div style={{ fontSize: "10px", color: "#94A3B8" }}>
                I4C Samanvaya & NCRP Multi-FIR Hardware/Telecom Correlation
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Comparison Body */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Top Banner: Dual Case Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Case A */}
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "12px",
                background: "#F8FAFC",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                  {caseA.caseId}
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "1px 5px", background: "#EEF2FF", color: "#4338CA", borderRadius: "3px" }}>
                  Active Focus
                </span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B" }}>{caseA.title}</div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>FIR: {caseA.firNumber} · {caseA.policeStation}</div>
              <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#0F172A" }}>
                Loss: ₹{(caseA.bookedLossInr).toLocaleString("en-IN")}
              </div>
              <button
                type="button"
                onClick={() => onNavigateToCase(caseA.caseId)}
                style={{
                  marginTop: "6px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #C7D2FE",
                  background: "#FFFFFF",
                  color: "#4F46E5",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Inspect Case A Workbench →
              </button>
            </div>

            {/* Case B */}
            <div
              style={{
                border: "1px solid #C7D2FE",
                borderRadius: "8px",
                padding: "12px",
                background: "#EEF2FF",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#312E81" }}>
                  {caseB.caseId}
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "1px 5px", background: "#FEF3C7", color: "#92400E", borderRadius: "3px" }}>
                  Linked Syndicate
                </span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1E1B4B" }}>{caseB.title}</div>
              <div style={{ fontSize: "10px", color: "#475569" }}>FIR: {caseB.firNumber} · {caseB.policeStation}</div>
              <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#1E1B4B" }}>
                Loss: ₹{(caseB.bookedLossInr).toLocaleString("en-IN")}
              </div>
              <button
                type="button"
                onClick={() => onNavigateToCase(caseB.caseId)}
                style={{
                  marginTop: "6px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Switch to Case B Workbench →
              </button>
            </div>
          </div>

          {/* Section: Verified Shared Anchors */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Verified Shared Infrastructure Anchors (100% Deterministic Match)
            </div>

            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #CBD5E1", color: "#475569" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Anchor Type</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Observed Value</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Forensic Significance</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Statutory Admissibility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#4338CA" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Wifi size={12} color="#4F46E5" />
                        <span>Wi-Fi BSSID</span>
                      </div>
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#BE123C" }}>
                      74:DA:38:A2:11:BC
                    </td>
                    <td style={{ padding: "6px 10px" }}>Identical portable Poco X5 AP tethered sessions in both FIRs</td>
                    <td style={{ padding: "6px 10px", color: "#059669", fontWeight: 700 }}>BSA §63(4) Stanza</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#047857" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Fingerprint size={12} color="#10B981" />
                        <span>JA4 TLS Hash</span>
                      </div>
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857" }}>
                      t13d1516h2_8daaf6
                    </td>
                    <td style={{ padding: "6px 10px" }}>Identical modified banking client binary used across all 4 CBS logins</td>
                    <td style={{ padding: "6px 10px", color: "#059669", fontWeight: 700 }}>ISO/IEC 27037 Telemetry</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#D97706" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Smartphone size={12} color="#F59E0B" />
                        <span>Device TAC</span>
                      </div>
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#D97706" }}>
                      86749206 (Samsung M34)
                    </td>
                    <td style={{ padding: "6px 10px" }}>Physical handset TAC matches across Delhi and Cyberabad cell sectors</td>
                    <td style={{ padding: "6px 10px", color: "#059669", fontWeight: 700 }}>DoT EIR Database</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Inter-Case Statutory Assessment */}
          <div
            style={{
              padding: "10px 14px",
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldAlert size={14} color="#D97706" />
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#92400E" }}>
                INTER-STATE SYNDICATE THRESHOLD EVALUATION
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "10.5px", color: "#78350F", lineHeight: 1.4 }}>
              Combined exposure across {caseA.caseId} (₹{(caseA.bookedLossInr / 100000).toFixed(2)}L) and {caseB.caseId} (₹{(caseB.bookedLossInr / 100000).toFixed(2)}L) exceeds inter-state task force thresholds. Both cases share identical Wi-Fi hardware and TLS signatures, warranting joint seizure under BNSS §106/§107.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 18px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "5px 12px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close Comparator
          </button>
        </div>
      </div>
    </div>
  );
};

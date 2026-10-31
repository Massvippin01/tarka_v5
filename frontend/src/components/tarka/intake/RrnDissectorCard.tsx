import React from "react";
import { Clock, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { type DecodedRailReference } from "../../../utils/intakeFalsifier";

export interface RrnDissectorCardProps {
  rrnInput: string;
  onRrnChange: (val: string) => void;
  onReset: () => void;
  decoded: DecodedRailReference;
  isForgedRrn: boolean;
  onToggleForgeRrn?: () => void;
}

export const RrnDissectorCard: React.FC<RrnDissectorCardProps> = ({
  rrnInput,
  onRrnChange,
  onReset,
  decoded,
  isForgedRrn,
  onToggleForgeRrn,
}) => {
  const isAdmissible = decoded.admissibilityVerdict === "ADMISSIBLE";

  // Segment characters into 1 | 3 | 2 | 6
  const char0 = rrnInput[0] || "—";
  const char1to3 = [rrnInput[1] || "—", rrnInput[2] || "—", rrnInput[3] || "—"];
  const char4to5 = [rrnInput[4] || "—", rrnInput[5] || "—"];
  const char6to11 = [
    rrnInput[6] || "—",
    rrnInput[7] || "—",
    rrnInput[8] || "—",
    rrnInput[9] || "—",
    rrnInput[10] || "—",
    rrnInput[11] || "—",
  ];

  // Offset calculation for needle
  const offsetSeconds = isForgedRrn ? 3000 : 14.0;
  const needlePercent = isForgedRrn ? 94 : 50 + (14 / 180) * 42; // ~53.3%

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "8px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Clock size={13} color="#4F46E5" />
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", margin: 0, letterSpacing: "-0.01em" }}>
            NPCI 12-Digit RRN Dissector
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {onToggleForgeRrn && (
            <button
              type="button"
              onClick={onToggleForgeRrn}
              style={{
                fontSize: "9.5px",
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: "3px",
                border: isForgedRrn ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                background: isForgedRrn ? "#FFF1F2" : "#F8FAFC",
                color: isForgedRrn ? "#BE123C" : "#475569",
                cursor: "pointer",
              }}
            >
              {isForgedRrn ? "Skew +50m" : "Simulate Skew"}
            </button>
          )}

          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "1.5px 6px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              background: isAdmissible ? "#ECFDF5" : "#FFF1F2",
              color: isAdmissible ? "#047857" : "#BE123C",
              border: `1px solid ${isAdmissible ? "#A7F3D0" : "#FECDD3"}`,
            }}
          >
            {isAdmissible ? (
              <>
                <CheckCircle2 size={9} color="#059669" />
                <span>NTP SPEC OK</span>
              </>
            ) : (
              <>
                <AlertTriangle size={9} color="#E11D48" />
                <span>CLOCK SKEW</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* RRN Input Box + Reset Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <input
          type="text"
          aria-label="12-digit NPCI RRN number"
          value={rrnInput}
          maxLength={12}
          onChange={(e) => onRrnChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
          placeholder="12-digit RRN..."
          style={{
            flex: 1,
            height: "25px",
            padding: "0 6px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#09090B",
            background: "#F8FAFC",
            border: "1px solid #CBD5E1",
            borderRadius: "4px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={onReset}
          style={{
            height: "25px",
            padding: "0 6px",
            fontSize: "10px",
            fontWeight: 600,
            color: "#475569",
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "4px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
          title="Reset to default transaction RRN #626510149921"
        >
          <RotateCcw size={9} />
          <span>Reset</span>
        </button>
      </div>

      {/* 12-Slot Segmented Digits: 1 | 3 | 2 | 6 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          userSelect: "none",
          gap: "1px",
          padding: "1px 0",
        }}
      >
        {/* Byte 0: Year (1 slot) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: "19px",
              height: "23px",
              borderRadius: "3px",
              border: "1px solid #C7D2FE",
              background: "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: "11px",
              color: "#4338CA",
            }}
          >
            {char0}
          </div>
          <span style={{ fontSize: "8px", fontWeight: 600, color: "#64748B", marginTop: "2px" }}>
            Yr &apos;26
          </span>
        </div>

        <div style={{ color: "#CBD5E1", fontFamily: "var(--font-mono)", fontSize: "10px", alignSelf: "center", marginBottom: "10px" }}>
          |
        </div>

        {/* Bytes 1-3: Julian Day (3 slots) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1px" }}>
            {char1to3.map((c, i) => (
              <div
                key={`j-${i}`}
                style={{
                  width: "19px",
                  height: "23px",
                  borderRadius: "3px",
                  border: "1px solid #A7F3D0",
                  background: "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  color: "#047857",
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <span style={{ fontSize: "8px", fontWeight: 600, color: "#64748B", marginTop: "2px" }}>
            Day 265 (22-Sep)
          </span>
        </div>

        <div style={{ color: "#CBD5E1", fontFamily: "var(--font-mono)", fontSize: "10px", alignSelf: "center", marginBottom: "10px" }}>
          |
        </div>

        {/* Bytes 4-5: Hour (2 slots) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1px" }}>
            {char4to5.map((c, i) => (
              <div
                key={`h-${i}`}
                style={{
                  width: "19px",
                  height: "23px",
                  borderRadius: "3px",
                  border: "1px solid #FDE68A",
                  background: "#FFFBEB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  color: "#B45309",
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <span style={{ fontSize: "8px", fontWeight: 600, color: "#64748B", marginTop: "2px" }}>
            Hour 10:00
          </span>
        </div>

        <div style={{ color: "#CBD5E1", fontFamily: "var(--font-mono)", fontSize: "10px", alignSelf: "center", marginBottom: "10px" }}>
          |
        </div>

        {/* Bytes 6-11: STAN Trace (6 slots) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1px" }}>
            {char6to11.map((c, i) => (
              <div
                key={`s-${i}`}
                style={{
                  width: "17px",
                  height: "23px",
                  borderRadius: "3px",
                  border: "1px solid #DDD6FE",
                  background: "#F5F3FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: "10.5px",
                  color: "#6D28D9",
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <span style={{ fontSize: "8px", fontWeight: 600, color: "#64748B", marginTop: "2px" }}>
            STAN #149921
          </span>
        </div>
      </div>

      {/* Decoded Plain-English Forensic Sentence */}
      <div
        style={{
          fontSize: "10px",
          color: "#475569",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "5px",
          padding: "5px 7px",
          lineHeight: 1.35,
        }}
      >
        <span style={{ fontWeight: 700, color: "#09090B" }}>Decoded Rail: </span>
        <span>
          NPCI UPI Switch dispatched at{" "}
          <strong style={{ color: "#4338CA", fontFamily: "var(--font-mono)" }}>10:00:14 IST</strong> on{" "}
          <strong style={{ color: "#09090B" }}>22-Sep-2026</strong> (Day 265), STAN{" "}
          <strong style={{ color: "#6D28D9", fontFamily: "var(--font-mono)" }}>#{rrnInput.slice(6) || "149921"}</strong>.
        </span>
      </div>

      {/* NTP Clock Offset Drift Ruler (-180s to +180s) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "9.5px" }}>
          <span style={{ color: "#64748B", fontWeight: 600 }}>NPCI Switch NTP Drift</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: isAdmissible ? "#047857" : "#BE123C",
            }}
          >
            {isForgedRrn ? "Δ +3,000s SKEW (> 180s Limit)" : `Δ +${offsetSeconds.toFixed(1)}s (IN SPEC)`}
          </span>
        </div>

        {/* Ruler Track */}
        <div
          style={{
            position: "relative",
            height: "7px",
            background: "#F1F5F9",
            borderRadius: "3px",
            border: "1px solid #E2E8F0",
            overflow: "hidden",
          }}
        >
          {/* Shaded In-Spec Band */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "15%",
              right: "15%",
              background: "#A7F3D0",
              borderLeft: "1px solid #6EE7B7",
              borderRight: "1px solid #6EE7B7",
            }}
            title="Admissible NPCI switch clock window (-180s to +180s)"
          />

          {/* 0s Center Tick */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: "2px",
              background: "#64748B",
            }}
            title="0s exact NTP reference"
          />

          {/* Needle Marker */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${needlePercent}%`,
              width: "7px",
              transform: "translateX(-50%)",
              borderRadius: "2px",
              background: isAdmissible ? "#4F46E5" : "#E11D48",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              transition: "all 0.3s ease",
            }}
            title={`Current measured offset: ${offsetSeconds}s`}
          />
        </div>

        {/* Ruler Axis Labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "8px",
            fontFamily: "var(--font-mono)",
            color: "#94A3B8",
            padding: "0 1px",
          }}
        >
          <span>-180s</span>
          <span style={{ color: "#64748B", fontWeight: 600 }}>0s (NTP Ref)</span>
          <span>+180s</span>
        </div>
      </div>
    </div>
  );
};

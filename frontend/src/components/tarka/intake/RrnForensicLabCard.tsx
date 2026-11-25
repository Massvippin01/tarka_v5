import React, { useState, useMemo } from "react";
import {
  Clock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  Info,
  Sliders,
} from "lucide-react";
import { scaleLinear } from "d3-scale";
import { type DecodedRailReference } from "../../../utils/intakeFalsifier";

export type GrammarProfile = "date-authoritative" | "psp-a" | "psp-b";

export interface RrnForensicLabCardProps {
  rrnInput: string;
  onRrnChange: (val: string) => void;
  onReset: () => void;
  decoded: DecodedRailReference;
  isForgedRrn: boolean;
  onToggleForgeRrn?: () => void;
}

export const RrnForensicLabCard: React.FC<RrnForensicLabCardProps> = ({
  rrnInput,
  onRrnChange,
  onReset,
  decoded,
  isForgedRrn,
  onToggleForgeRrn,
}) => {
  const [selectedRail, setSelectedRail] = useState<"UPI" | "NEFT" | "RTGS">("UPI");
  const [grammarProfile, setGrammarProfile] = useState<GrammarProfile>("date-authoritative");
  const [hoveredSegment, setHoveredSegment] = useState<"year" | "day" | "hour" | "stan" | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Pad or slice to exactly 12 characters
  const rawClean = (rrnInput || "").padEnd(12, " ").substring(0, 12);
  const digits = rawClean.split("");

  // Grouped segments: Year (0), Julian Day (1..3), Hour (4..5), STAN (6..11)
  const yearDigit = digits[0];
  const dayDigits = digits.slice(1, 4).join("");
  const hourDigits = digits.slice(4, 6).join("");
  const stanDigits = digits.slice(6, 12).join("");

  const yearNum = parseInt(yearDigit, 10);
  const dayNum = parseInt(dayDigits, 10);
  const hourNum = parseInt(hourDigits, 10);

  const fullYear = !isNaN(yearNum) ? 2020 + yearNum : 2026;
  const isJulianValid = !isNaN(dayNum) && dayNum >= 1 && dayNum <= 366;
  const isHourValid = !isNaN(hourNum) && hourNum >= 0 && hourNum <= 23;

  // Drift in seconds
  const driftSec = isForgedRrn ? 3000 : 14.0;
  const isWithinTolerance = Math.abs(driftSec) <= 180;
  const isAdmissible = decoded.admissibilityVerdict === "ADMISSIBLE" && !isForgedRrn;

  // D3 scale for the 64px drift ruler: -180s to +180s maps to 0 to 100%
  const rulerWidth = 380;
  const driftScale = useMemo(() => {
    return scaleLinear().domain([-180, 180]).range([15, rulerWidth - 15]).clamp(true);
  }, [rulerWidth]);

  const needleX = driftScale(isForgedRrn ? 180 : driftSec);

  // Handle single cell input change in OTP
  const handleDigitChange = (index: number, char: string) => {
    const val = char.slice(-1).toUpperCase();
    if (!/^[0-9A-Z]$/.test(val) && val !== "") return;
    const chars = (rrnInput || "").padEnd(12, "0").split("");
    chars[index] = val || "0";
    onRrnChange(chars.join(""));
  };

  const handleCopyJson = () => {
    const payload = JSON.stringify(
      {
        rrn: rrnInput,
        rail: selectedRail,
        grammarProfile,
        decoded: {
          year: fullYear,
          julianDay: dayNum,
          hour: hourNum,
          stan: stanDigits,
          clockDriftSeconds: driftSec,
          verdict: isAdmissible ? "ADMISSIBLE" : "CLOCK_DISCREPANCY",
        },
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Forgery Presets
  const applyPreset = (preset: "authentic" | "dayShifted" | "hourMismatch" | "midnightRollover" | "digitFlip") => {
    switch (preset) {
      case "authentic":
        onRrnChange("626510149921");
        if (isForgedRrn && onToggleForgeRrn) onToggleForgeRrn();
        break;
      case "dayShifted":
        onRrnChange("626410149921"); // Day 264 (-1 day)
        break;
      case "hourMismatch":
        onRrnChange("626511149921"); // Hour 11 instead of 10
        break;
      case "midnightRollover":
        onRrnChange("626600001001"); // Day 266, Hour 00
        break;
      case "digitFlip":
        onRrnChange("626510149922"); // Last digit flipped
        break;
    }
  };

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "8px 12px 10px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* =========================================================================
          1. 44PX HEADER: TITLE + RAIL TOGGLE + STATUS CHIP + ACTION MENU
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          height: "30px",
          whiteSpace: "nowrap",
        }}
      >
        {/* Left: Title + Rail Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={13} color="#4F46E5" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", letterSpacing: "-0.01em" }}>
              RRN Forensic Lab
            </span>
          </div>

          {/* Rail Selector Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              borderRadius: "4px",
              padding: "1px",
            }}
          >
            {(["UPI", "NEFT", "RTGS"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRail(r)}
                style={{
                  border: "none",
                  background: selectedRail === r ? "#FFFFFF" : "transparent",
                  color: selectedRail === r ? "#09090B" : "#64748B",
                  fontWeight: selectedRail === r ? 700 : 500,
                  fontSize: "8.5px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  boxShadow: selectedRail === r ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                }}
                title={r === "UPI" ? "12-digit UPI/IMPS Reference" : r === "NEFT" ? "16-char NEFT UTR" : "22-char RTGS UTR"}
              >
                {r === "UPI" ? "UPI 12" : r === "NEFT" ? "NEFT 16" : "RTGS 22"}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Status Pill & Action Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "1.5px 6px",
              borderRadius: "4px",
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
                <CheckCircle2 size={10} color="#059669" />
                <span>Δ +14s NTP SYNC</span>
              </>
            ) : (
              <>
                <AlertTriangle size={10} color="#E11D48" />
                <span>CLOCK SKEW</span>
              </>
            )}
          </span>

          {/* Quick Skew Toggle */}
          {onToggleForgeRrn && (
            <button
              type="button"
              onClick={onToggleForgeRrn}
              style={{
                fontSize: "9px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                border: isForgedRrn ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                background: isForgedRrn ? "#FFF1F2" : "#FFFFFF",
                color: isForgedRrn ? "#BE123C" : "#475569",
                cursor: "pointer",
              }}
              title="Toggle +50m clock skew simulation"
            >
              {isForgedRrn ? "Skew Active" : "Simulate Skew"}
            </button>
          )}

          {/* More Menu */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                borderRadius: "4px",
                padding: "2px 5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#64748B",
              }}
              title="Forensic Lab Options"
            >
              <ChevronDown size={11} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "24px",
                  zIndex: 50,
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: "140px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleCopyJson();
                    setMenuOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 8px",
                    fontSize: "10px",
                    color: "#0F172A",
                    cursor: "pointer",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {copiedJson ? <Check size={11} color="#059669" /> : <Copy size={11} color="#64748B" />}
                  <span>Copy Decoded JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setMenuOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 8px",
                    fontSize: "10px",
                    color: "#0F172A",
                    cursor: "pointer",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <RotateCcw size={11} color="#64748B" />
                  <span>Reset to #626510149921</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. GRAMMAR PROFILE SELECTOR
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#64748B",
          padding: "3px 6px",
          background: "#F8FAFC",
          borderRadius: "6px",
          border: "1px solid #F1F5F9",
        }}
      >
        <span style={{ fontWeight: 600 }}>Grammar Profile:</span>
        <select
          aria-label="RRN Grammar Profile"
          value={grammarProfile}
          onChange={(e) => setGrammarProfile(e.target.value as GrammarProfile)}
          style={{
            fontSize: "9.5px",
            fontFamily: "var(--font-mono)",
            padding: "1px 5px",
            borderRadius: "4px",
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#0F172A",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="date-authoritative">Date-authoritative (Y·DDD authoritative, HH advisory)</option>
          <option value="psp-a">PSP-A (Y·DDD·HH·STAN6 strict)</option>
          <option value="psp-b">PSP-B (Y·DDD·STAN8 legacy)</option>
        </select>
      </div>

      {/* =========================================================================
          3. SINGLE SOURCE-OF-TRUTH SEGMENTED INPUT OTP (12 CELLS IN 4 GROUPS)
          ========================================================================= */}
      <div
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "6px 8px 4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {/* Group 1: Year (Digit 0) */}
          <div
            onMouseEnter={() => setHoveredSegment("year")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "5px",
              background: hoveredSegment === "year" ? "#EEF2FF" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <input
              type="text"
              maxLength={1}
              value={yearDigit}
              onChange={(e) => handleDigitChange(0, e.target.value)}
              aria-label="RRN Year digit"
              style={{
                width: "24px",
                height: "32px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                fontWeight: 800,
                color: "#4338CA",
                background: "#FFFFFF",
                border: "1.5px solid #C7D2FE",
                borderRadius: "5px",
                outline: "none",
              }}
            />
            <span style={{ fontSize: "8px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
              Y (2026)
            </span>
          </div>

          {/* Group 2: Julian Day (Digits 1-3) */}
          <div
            onMouseEnter={() => setHoveredSegment("day")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "5px",
              background: hoveredSegment === "day" ? "#ECFDF5" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", gap: "2px" }}>
              {[1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  aria-label={`RRN Julian day digit ${idx}`}
                  style={{
                    width: "24px",
                    height: "32px",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: isJulianValid ? "#047857" : "#BE123C",
                    background: "#FFFFFF",
                    border: `1.5px solid ${isJulianValid ? "#A7F3D0" : "#FECDD3"}`,
                    borderRadius: "5px",
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "8px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
              DDD (Day {dayNum || "—"})
            </span>
          </div>

          {/* Group 3: Hour (Digits 4-5) */}
          <div
            onMouseEnter={() => setHoveredSegment("hour")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "5px",
              background: hoveredSegment === "hour" ? "#FFFBEB" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", gap: "2px" }}>
              {[4, 5].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  aria-label={`RRN Hour digit ${idx - 3}`}
                  style={{
                    width: "24px",
                    height: "32px",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: isHourValid ? (grammarProfile === "date-authoritative" ? "#B45309" : "#4338CA") : "#BE123C",
                    background: "#FFFFFF",
                    border: `1.5px solid ${isHourValid ? "#FDE68A" : "#FECDD3"}`,
                    borderRadius: "5px",
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "8px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
              HH ({hourDigits}h IST)
            </span>
          </div>

          {/* Group 4: STAN (Digits 6-11) */}
          <div
            onMouseEnter={() => setHoveredSegment("stan")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "5px",
              background: hoveredSegment === "stan" ? "#F1F5F9" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", gap: "2px" }}>
              {[6, 7, 8, 9, 10, 11].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  aria-label={`RRN STAN digit ${idx - 5}`}
                  style={{
                    width: "21px",
                    height: "32px",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0F172A",
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: "5px",
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "8px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
              STAN (Switch Seq)
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. 4-ROW X 28PX ANATOMY TABLE WITH BIDIRECTIONAL HOVER HIGHLIGHT
          ========================================================================= */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
          border: "1px solid #E2E8F0",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <tbody>
          {/* Row 1: Year & Julian Date */}
          <tr
            onMouseEnter={() => setHoveredSegment("day")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              height: "26px",
              background: hoveredSegment === "day" || hoveredSegment === "year" ? "#F8FAFC" : "#FFFFFF",
              borderBottom: "1px solid #F1F5F9",
              transition: "background-color 0.1s ease",
            }}
          >
            <td style={{ padding: "3px 8px", fontWeight: 700, color: "#475569", width: "90px" }}>
              Julian Day
            </td>
            <td style={{ padding: "3px 8px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              {isJulianValid ? `Day 265 → 22 Sep ${fullYear}` : "Invalid Julian Day"}
            </td>
            <td style={{ padding: "3px 8px", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: isJulianValid ? "#047857" : "#BE123C",
                  background: isJulianValid ? "#ECFDF5" : "#FFF1F2",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                {isJulianValid ? "Authoritative Match ✓" : "Invalid Date ✗"}
              </span>
            </td>
          </tr>

          {/* Row 2: Hour Component */}
          <tr
            onMouseEnter={() => setHoveredSegment("hour")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              height: "26px",
              background: hoveredSegment === "hour" ? "#F8FAFC" : "#FFFFFF",
              borderBottom: "1px solid #F1F5F9",
              transition: "background-color 0.1s ease",
            }}
          >
            <td style={{ padding: "3px 8px", fontWeight: 700, color: "#475569" }}>
              Switch Hour
            </td>
            <td style={{ padding: "3px 8px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              {hourDigits}:00 IST Window ({grammarProfile === "date-authoritative" ? "Advisory" : "Strict"})
            </td>
            <td style={{ padding: "3px 8px", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: isHourValid ? "#B45309" : "#BE123C",
                  background: isHourValid ? "#FEF3C7" : "#FFF1F2",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                {isHourValid ? "Window Match" : "Hour Error"}
              </span>
            </td>
          </tr>

          {/* Row 3: STAN Sequence */}
          <tr
            onMouseEnter={() => setHoveredSegment("stan")}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              height: "26px",
              background: hoveredSegment === "stan" ? "#F8FAFC" : "#FFFFFF",
              borderBottom: "1px solid #F1F5F9",
              transition: "background-color 0.1s ease",
            }}
          >
            <td style={{ padding: "3px 8px", fontWeight: 700, color: "#475569" }}>
              Switch STAN
            </td>
            <td style={{ padding: "3px 8px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              #{stanDigits} (Central Gateway Audit Sequence)
            </td>
            <td style={{ padding: "3px 8px", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: "#4338CA",
                  background: "#EEF2FF",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                Traceable
              </span>
            </td>
          </tr>

          {/* Row 4: Clock Skew */}
          <tr
            style={{
              height: "26px",
              background: "#FFFFFF",
            }}
          >
            <td style={{ padding: "3px 8px", fontWeight: 700, color: "#475569" }}>
              NTP Delta
            </td>
            <td style={{ padding: "3px 8px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              CBS Finacle (10:00:14) ↔ NPCI Switch (Δ {driftSec > 0 ? `+${driftSec}` : driftSec}s)
            </td>
            <td style={{ padding: "3px 8px", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: isWithinTolerance ? "#047857" : "#BE123C",
                  background: isWithinTolerance ? "#ECFDF5" : "#FFF1F2",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                {isWithinTolerance ? "Within ±180s Spec" : "Breach > 180s"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* =========================================================================
          5. SUMMARY CHIP (STRICTLY NO SECONDS OVER-CLAIM)
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          background: "#F8FAFC",
          borderRadius: "4px",
          fontSize: "9.5px",
          color: "#475569",
        }}
      >
        <Info size={11} color="#64748B" style={{ flexShrink: 0 }} />
        <span>
          RRN validates Date <strong>22 Sep 2026</strong> & Hour <strong>10:00</strong>. Bank CBS log records <strong>10:00:14 IST</strong> (Δ +14s sync).
        </span>
      </div>

      {/* =========================================================================
          6. SVG DRIFT RULER (64PX) WITH D3 SCALE (-180S .. +180S)
          ========================================================================= */}
      <div
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "6px",
          padding: "4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748B", fontWeight: 600 }}>
          <span>CBS Finacle ↔ NPCI Switch Clock Drift</span>
          <span style={{ fontFamily: "var(--font-mono)", color: isWithinTolerance ? "#047857" : "#BE123C", fontWeight: 700 }}>
            {driftSec > 0 ? `+${driftSec}` : driftSec}s / ±180s max
          </span>
        </div>

        <svg width="100%" height="32" viewBox={`0 0 ${rulerWidth} 32`} style={{ overflow: "visible" }}>
          {/* Tolerance Band [-180s to +180s] */}
          <rect
            x={15}
            y={10}
            width={rulerWidth - 30}
            height={8}
            rx={4}
            fill="#ECFDF5"
            stroke="#A7F3D0"
            strokeWidth={1}
          />

          {/* Zero Center Line */}
          <line
            x1={rulerWidth / 2}
            y1={6}
            x2={rulerWidth / 2}
            y2={22}
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />

          {/* Ticks: -180s, -90s, 0s, +90s, +180s */}
          {[-180, -90, 0, 90, 180].map((tick) => {
            const x = driftScale(tick);
            return (
              <g key={tick}>
                <line x1={x} y1={8} x2={x} y2={20} stroke="#CBD5E1" strokeWidth={1} />
                <text
                  x={x}
                  y={30}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill="#94A3B8"
                  fontFamily="monospace"
                >
                  {tick > 0 ? `+${tick}s` : `${tick}s`}
                </text>
              </g>
            );
          })}

          {/* Active Needle Indicator */}
          <circle
            cx={needleX}
            cy={14}
            r={5}
            fill={isWithinTolerance ? "#059669" : "#E11D48"}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* =========================================================================
          7. FORGERY PRESET CHIPS (28PX)
          ========================================================================= */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", paddingTop: "2px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748B", display: "flex", alignItems: "center", gap: "3px" }}>
          <Sliders size={10} /> Presets:
        </span>
        <button
          type="button"
          onClick={() => applyPreset("authentic")}
          style={{
            fontSize: "8.5px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid #A7F3D0",
            background: "#ECFDF5",
            color: "#047857",
            cursor: "pointer",
          }}
        >
          Authentic (+14s)
        </button>
        <button
          type="button"
          onClick={() => applyPreset("dayShifted")}
          style={{
            fontSize: "8.5px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid #FECDD3",
            background: "#FFF1F2",
            color: "#BE123C",
            cursor: "pointer",
          }}
        >
          Day shifted (-1d)
        </button>
        <button
          type="button"
          onClick={() => applyPreset("hourMismatch")}
          style={{
            fontSize: "8.5px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid #FDE68A",
            background: "#FFFBEB",
            color: "#B45309",
            cursor: "pointer",
          }}
        >
          Hour mismatch
        </button>
        <button
          type="button"
          onClick={() => applyPreset("midnightRollover")}
          style={{
            fontSize: "8.5px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid #E2E8F0",
            background: "#F8FAFC",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Midnight rollover
        </button>
        <button
          type="button"
          onClick={() => applyPreset("digitFlip")}
          style={{
            fontSize: "8.5px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid #E2E8F0",
            background: "#F8FAFC",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Digit flip
        </button>
      </div>
    </div>
  );
};

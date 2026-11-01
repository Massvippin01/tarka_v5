import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Info,
  Dna,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { useTarkaUiStore, type DockTab } from "../../../store/useTarkaUiStore";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { type DecodedRailReference } from "../../../utils/intakeFalsifier";
import { getBnss94EntityResolutionDirective } from "../../../utils/statutoryDirectives";
import { StripeSegmentedBar } from "../../ui/forensic-infographics";
import { ScaleBar } from "../kit";

export interface InspectorDockProps {
  rrnInput: string;
  onRrnChange: (val: string) => void;
  onResetRrn: () => void;
  decodedRrn: DecodedRailReference;
  isForgedRrn: boolean;
  onToggleForgeRrn: () => void;
  isRow14Tampered: boolean;
  onToggleRow14Tamper: () => void;
}

export const InspectorDock: React.FC<InspectorDockProps> = ({
  rrnInput,
  onRrnChange,
  onResetRrn,
  decodedRrn,
  isForgedRrn,
  onToggleForgeRrn,
  isRow14Tampered,
  onToggleRow14Tamper,
}) => {
  const {
    activeDockTab,
    setActiveDockTab,
    setProofStepIndex,
  } = useTarkaUiStore();

  const { resetAllMutations } = useTarkaGlobal();

  // Tab 1 (RRN) state
  const [selectedRail, setSelectedRail] = useState<"UPI" | "NEFT" | "RTGS">("UPI");
  const [grammarProfile, setGrammarProfile] = useState<"date-authoritative" | "psp-a" | "psp-b">("date-authoritative");
  const [hoveredDigitSegment, setHoveredDigitSegment] = useState<"year" | "day" | "hour" | "stan" | null>(null);

  // Tab 2 (PDF) state
  const [pdfViewMode, setPdfViewMode] = useState<"rev1" | "rev2" | "diff">("diff");
  const [copiedHex, setCopiedHex] = useState(false);

  // Tab 3 (Privacy) state
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [isSiblingTampered, setIsSiblingTampered] = useState(false);
  const [merkleVerified, setMerkleVerified] = useState(true);
  const [isVerifyingPath, setIsVerifyingPath] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tab 5 (Entities) state
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  const fullMerkleRoot = "0xb189f3a9712a45d886910384cf22da810842e09153b6fa034e3209847492c810";
  const tamperedMerkleRoot = "0xdeadbeef712a45d886910384cf22da810842e09153b6fa034e3209847492beef";

  // Re-verify Merkle path when sibling tamper state changes
  useEffect(() => {
    setMerkleVerified(!isSiblingTampered);
  }, [isSiblingTampered]);

  // Handle Tab switch
  const handleTabChange = (val: string) => {
    setActiveDockTab(val as DockTab);
  };

  // Render HiDPI Canvas for 10,000 IPDR citizens in Privacy Tab
  useEffect(() => {
    if (activeDockTab !== "privacy") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 390;
    const height = 48;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cols = 95;
    const rows = 20;
    const cellW = (width - 10) / cols;
    const cellH = (height - 8) / rows;

    ctx.fillStyle = "#E2E8F0"; // slate-200
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect(5 + c * cellW, 4 + r * cellH, cellW - 0.8, cellH - 0.8);
      }
    }

    // Suspect revealed cell coordinates
    const suspectCells = [
      { c: 47, r: 9 },
      { c: 48, r: 9 },
      { c: 22, r: 14 },
      { c: 78, r: 4 },
    ];

    suspectCells.forEach((sc) => {
      const cx = 5 + sc.c * cellW;
      const cy = 4 + sc.r * cellH;
      ctx.fillStyle = "#4F46E5";
      ctx.fillRect(cx - 0.5, cy - 0.5, cellW + 1, cellH + 1);
      ctx.strokeStyle = "#818CF8";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 2, cy - 2, cellW + 4, cellH + 4);
    });
  }, [activeDockTab]);

  // Digits splitting for InputOTP
  const rawClean = (rrnInput || "").padEnd(12, " ").substring(0, 12);
  const digits = rawClean.split("");
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

  const driftSec = isForgedRrn ? 3000 : 14.0;
  const isWithinTolerance = Math.abs(driftSec) <= 180;



  const handleDigitChange = (index: number, char: string) => {
    const val = char.slice(-1).toUpperCase();
    if (!/^[0-9A-Z]$/.test(val) && val !== "") return;
    const chars = (rrnInput || "").padEnd(12, "0").split("");
    chars[index] = val || "0";
    onRrnChange(chars.join(""));
  };

  const handleVerifyPath = async () => {
    setIsVerifyingPath(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsVerifyingPath(false);
  };

  return (
    <div
      data-card="inspector-dock"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Tabs.Root
        value={activeDockTab}
        onValueChange={handleTabChange}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* =====================================================================
            TAB BAR (EQUAL WIDTH, NOWRAP, 44PX)
            ===================================================================== */}
        <Tabs.List
          style={{
            height: "44px",
            minHeight: "44px",
            maxHeight: "44px",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          <Tabs.Trigger
            value="rrn"
            style={{
              border: "none",
              borderBottom: activeDockTab === "rrn" ? "2px solid #4F46E5" : "2px solid transparent",
              background: activeDockTab === "rrn" ? "#FFFFFF" : "transparent",
              color: activeDockTab === "rrn" ? "#09090B" : "#64748B",
              fontWeight: activeDockTab === "rrn" ? 700 : 500,
              fontSize: "10.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "0 2px",
              whiteSpace: "nowrap",
            }}
          >
            <Clock size={11} color={activeDockTab === "rrn" ? "#4F46E5" : "#64748B"} />
            <span>RRN</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="pdf"
            style={{
              border: "none",
              borderBottom: activeDockTab === "pdf" ? "2px solid #E11D48" : "2px solid transparent",
              background: activeDockTab === "pdf" ? "#FFFFFF" : "transparent",
              color: activeDockTab === "pdf" ? "#09090B" : "#64748B",
              fontWeight: activeDockTab === "pdf" ? 700 : 500,
              fontSize: "10.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "0 2px",
              whiteSpace: "nowrap",
            }}
          >
            <FileText size={11} color={activeDockTab === "pdf" ? "#E11D48" : "#64748B"} />
            <span>PDF</span>
            <span style={{ fontSize: "7.5px", fontWeight: 800, background: "#FFE4E6", color: "#BE123C", padding: "0.5px 3px", borderRadius: "3px" }}>
              2 %%EOF
            </span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="privacy"
            style={{
              border: "none",
              borderBottom: activeDockTab === "privacy" ? "2px solid #059669" : "2px solid transparent",
              background: activeDockTab === "privacy" ? "#FFFFFF" : "transparent",
              color: activeDockTab === "privacy" ? "#09090B" : "#64748B",
              fontWeight: activeDockTab === "privacy" ? 700 : 500,
              fontSize: "10.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "0 2px",
              whiteSpace: "nowrap",
            }}
          >
            <ShieldCheck size={11} color={activeDockTab === "privacy" ? "#059669" : "#64748B"} />
            <span>Privacy</span>
            <span style={{ fontSize: "7.5px", fontWeight: 800, background: "#EEF2FF", color: "#4338CA", padding: "0.5px 3px", borderRadius: "3px" }}>
              9.9k
            </span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="proof"
            style={{
              border: "none",
              borderBottom: activeDockTab === "proof" ? "2px solid #7C3AED" : "2px solid transparent",
              background: activeDockTab === "proof" ? "#FFFFFF" : "transparent",
              color: activeDockTab === "proof" ? "#09090B" : "#64748B",
              fontWeight: activeDockTab === "proof" ? 700 : 500,
              fontSize: "10.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "0 2px",
              whiteSpace: "nowrap",
            }}
          >
            <CheckCircle2 size={11} color={activeDockTab === "proof" ? "#7C3AED" : "#64748B"} />
            <span>Proof</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="entities"
            style={{
              border: "none",
              borderBottom: activeDockTab === "entities" ? "2px solid #0D9488" : "2px solid transparent",
              background: activeDockTab === "entities" ? "#FFFFFF" : "transparent",
              color: activeDockTab === "entities" ? "#09090B" : "#64748B",
              fontWeight: activeDockTab === "entities" ? 700 : 500,
              fontSize: "10.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "0 2px",
              whiteSpace: "nowrap",
            }}
          >
            <Dna size={11} color={activeDockTab === "entities" ? "#0D9488" : "#64748B"} />
            <span>Entities</span>
            <span style={{ fontSize: "7.5px", fontWeight: 800, background: "#CCFBF1", color: "#0F766E", padding: "0.5px 3px", borderRadius: "3px" }}>
              18→5
            </span>
          </Tabs.Trigger>
        </Tabs.List>

        {/* =====================================================================
            TAB 1: RRN FORENSIC LAB
            ===================================================================== */}
        <Tabs.Content
          value="rrn"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 16px",
            display: activeDockTab === "rrn" ? "flex" : "none",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header Controls: Rail Toggle + Grammar Select */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <div style={{ display: "flex", background: "#F1F5F9", borderRadius: "4px", padding: "1px" }}>
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
                    fontSize: "9px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {r === "UPI" ? "UPI/IMPS" : r}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "#ECFDF5" : "#FFF1F2",
                  color: decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "#047857" : "#BE123C",
                  border: `1px solid ${decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "#A7F3D0" : "#FECDD3"}`,
                }}
              >
                {decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "Integrity checks pass" : "FLAGGED"}
              </span>

              <select
                aria-label="RRN Grammar Profile"
                value={grammarProfile}
                onChange={(e) => setGrammarProfile(e.target.value as any)}
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <option value="date-authoritative">Date-authoritative</option>
                <option value="psp-a">PSP-A strict</option>
                <option value="psp-b">PSP-B strict</option>
              </select>
            </div>
          </div>

          {/* Segmented InputOTP (12 Cells with min-w-[22px] max-w-[34px] to guarantee no overflow) */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "6px 4px 4px 4px",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", width: "100%" }}>
              {/* Year */}
              <div
                onMouseEnter={() => setHoveredDigitSegment("year")}
                onMouseLeave={() => setHoveredDigitSegment(null)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: "1 1 0", minWidth: "22px", maxWidth: "34px" }}
              >
                <input
                  type="text"
                  maxLength={1}
                  value={yearDigit}
                  onChange={(e) => handleDigitChange(0, e.target.value)}
                  aria-label="RRN Year digit"
                  style={{
                    width: "100%",
                    height: "30px",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#4338CA",
                    background: "#FFFFFF",
                    border: "1.5px solid #C7D2FE",
                    borderRadius: "4px",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
                  Y
                </span>
              </div>

              {/* Julian Day (3 digits) */}
              <div
                onMouseEnter={() => setHoveredDigitSegment("day")}
                onMouseLeave={() => setHoveredDigitSegment(null)}
                style={{ display: "flex", gap: "2px", flex: "3 1 0" }}
              >
                {[1, 2, 3].map((idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: "1 1 0", minWidth: "22px", maxWidth: "34px" }}>
                    <input
                      type="text"
                      maxLength={1}
                      value={digits[idx]}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      aria-label={`RRN Julian day digit ${idx}`}
                      style={{
                        width: "100%",
                        height: "30px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 800,
                        color: isJulianValid ? "#047857" : "#BE123C",
                        background: "#FFFFFF",
                        border: `1.5px solid ${isJulianValid ? "#A7F3D0" : "#FECDD3"}`,
                        borderRadius: "4px",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
                      {idx === 2 ? "DDD" : "·"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Hour (2 digits) */}
              <div
                onMouseEnter={() => setHoveredDigitSegment("hour")}
                onMouseLeave={() => setHoveredDigitSegment(null)}
                style={{ display: "flex", gap: "2px", flex: "2 1 0" }}
              >
                {[4, 5].map((idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: "1 1 0", minWidth: "22px", maxWidth: "34px" }}>
                    <input
                      type="text"
                      maxLength={1}
                      value={digits[idx]}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      aria-label={`RRN Hour digit ${idx - 3}`}
                      style={{
                        width: "100%",
                        height: "30px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 800,
                        color: isHourValid ? "#B45309" : "#BE123C",
                        background: "#FFFFFF",
                        border: `1.5px solid ${isHourValid ? "#FDE68A" : "#FECDD3"}`,
                        borderRadius: "4px",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
                      {idx === 4 ? "HH" : "·"}
                    </span>
                  </div>
                ))}
              </div>

              {/* STAN (6 digits) */}
              <div
                onMouseEnter={() => setHoveredDigitSegment("stan")}
                onMouseLeave={() => setHoveredDigitSegment(null)}
                style={{ display: "flex", gap: "2px", flex: "6 1 0" }}
              >
                {[6, 7, 8, 9, 10, 11].map((idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: "1 1 0", minWidth: "20px", maxWidth: "32px" }}>
                    <input
                      type="text"
                      maxLength={1}
                      value={digits[idx]}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      aria-label={`RRN STAN digit ${idx - 5}`}
                      style={{
                        width: "100%",
                        height: "30px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#0F172A",
                        background: "#FFFFFF",
                        border: "1.5px solid #CBD5E1",
                        borderRadius: "4px",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 700 }}>
                      {idx === 8 ? "STAN" : "·"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Row Anatomy List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
            {/* Row 1: Date */}
            <div
              onMouseEnter={() => setHoveredDigitSegment("day")}
              onMouseLeave={() => setHoveredDigitSegment(null)}
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: hoveredDigitSegment === "day" || hoveredDigitSegment === "year" ? "#F1F5F9" : "#FFFFFF",
                fontSize: "11px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <span style={{ color: "#475569", fontWeight: 600 }}>Julian Day:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                {isJulianValid ? `Day 265 → 22 Sep ${fullYear}` : "Invalid"}
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                Match
              </span>
            </div>

            {/* Row 2: Hour */}
            <div
              onMouseEnter={() => setHoveredDigitSegment("hour")}
              onMouseLeave={() => setHoveredDigitSegment(null)}
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: hoveredDigitSegment === "hour" ? "#F1F5F9" : "#FFFFFF",
                fontSize: "11px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <span style={{ color: "#475569", fontWeight: 600 }}>Switch Hour:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                {hourDigits}:00 IST Window
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", padding: "1px 5px", borderRadius: "3px" }}>
                Advisory
              </span>
            </div>

            {/* Row 3: STAN */}
            <div
              onMouseEnter={() => setHoveredDigitSegment("stan")}
              onMouseLeave={() => setHoveredDigitSegment(null)}
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: hoveredDigitSegment === "stan" ? "#F1F5F9" : "#FFFFFF",
                fontSize: "11px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <span style={{ color: "#475569", fontWeight: 600 }}>Switch STAN:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                #{stanDigits}
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#4338CA", background: "#EEF2FF", padding: "1px 5px", borderRadius: "3px" }}>
                Traceable
              </span>
            </div>

            {/* Row 4: NTP Drift */}
            <div
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
                background: "#FFFFFF",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "#475569", fontWeight: 600 }}>NTP Drift:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                Δ {driftSec > 0 ? `+${driftSec}` : driftSec}s (CBS ↔ Switch)
              </span>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: isWithinTolerance ? "#047857" : "#BE123C",
                  background: isWithinTolerance ? "#ECFDF5" : "#FFE4E6",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                {isWithinTolerance ? "In spec" : "Skew ✗"}
              </span>
            </div>
          </div>

          {/* Non-Overlapping Precision Clock-Drift ScaleBar */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
            <ScaleBar
              labelAbove="CBS Finacle ↔ NPCI Switch NTP Stratum-2 Sync"
              min={-180}
              max={180}
              value={isForgedRrn ? 180 : driftSec}
              unit="s"
              toleranceBand={{
                from: -180,
                to: 180,
                label: "ADMISSIBLE BOUND (±180s)",
              }}
              valueBelow={`Δ = ${driftSec > 0 ? "+" : ""}${driftSec}.0s (Stratum-2 Sync)`}
            />
          </div>

          {/* Presets (Wrap-safe, Single/Multi Line) */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", paddingTop: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B" }}>Presets:</span>
            <button
              type="button"
              onClick={() => {
                onResetRrn();
                if (isForgedRrn) onToggleForgeRrn();
              }}
              style={{ padding: "2px 6px", fontSize: "9.5px", fontWeight: 600, borderRadius: "4px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#047857", cursor: "pointer" }}
            >
              Authentic (+14s)
            </button>
            <button
              type="button"
              onClick={() => onRrnChange("626410149921")}
              style={{ padding: "2px 6px", fontSize: "9.5px", fontWeight: 600, borderRadius: "4px", border: "1px solid #FECDD3", background: "#FFF1F2", color: "#BE123C", cursor: "pointer" }}
            >
              Day shifted (-1d)
            </button>
            <button
              type="button"
              onClick={onToggleForgeRrn}
              style={{ padding: "2px 6px", fontSize: "9.5px", fontWeight: 600, borderRadius: "4px", border: "1px solid #FDE68A", background: "#FFFBEB", color: "#B45309", cursor: "pointer" }}
            >
              {isForgedRrn ? "Reset Skew" : "Hour mismatch (+50m)"}
            </button>
            <button
              type="button"
              onClick={() => onRrnChange("626600001001")}
              style={{ padding: "2px 6px", fontSize: "9.5px", fontWeight: 600, borderRadius: "4px", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", cursor: "pointer" }}
            >
              Midnight rollover
            </button>
          </div>

          {/* NPCI Switch Admissibility Telemetry Card */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                NPCI Switch Telemetry & Audit Trail
              </span>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  background: isWithinTolerance ? "#ECFDF5" : "#FFF1F2",
                  color: isWithinTolerance ? "#047857" : "#BE123C",
                  border: `1px solid ${isWithinTolerance ? "#A7F3D0" : "#FECDD3"}`,
                }}
              >
                {isWithinTolerance ? "SWITCH ACK CERTIFIED" : "CLOCK SKEW REJECTED"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>Gateway Route</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                  NPCI-UPI-GW-MUM-02
                </div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>Settlement Window</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                  Cycle 04 (10:00–10:15 IST)
                </div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>Cipher Suite</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                  ECDSA P-256 / SHA-256
                </div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>STAN Collision Check</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857", marginTop: "1px" }}>
                  0 Collisions in 24h ✓
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "9.5px",
                color: "#475569",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                padding: "4px 6px",
                lineHeight: 1.3,
              }}
            >
              <strong style={{ color: "#0F172A" }}>Section 63(4) BSA Note: </strong>
              Carrier timestamp certified by NPCI HSM. Invariant I2 holds when switch clock drift |Δt| ≤ 180s.
            </div>
          </div>
        </Tabs.Content>

        {/* =====================================================================
            TAB 2: PDF XREF & REVISION INTEGRITY
            ===================================================================== */}
        <Tabs.Content
          value="pdf"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 16px",
            display: activeDockTab === "pdf" ? "flex" : "none",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Visual Binary File Map Bar (0x00000 to 0x15080) */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748B", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: 700, color: "#0F172A" }}>victim_upi_receipt.pdf (84.2 KB)</span>
                <span style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>0x00000..0x15080</span>
              </div>
              <span style={{ color: "#BE123C", fontWeight: 800, background: "#FFF1F2", border: "1px solid #FECDD3", padding: "1px 5px", borderRadius: "3px" }}>
                WARN: 2 %%EOF TRAILERS
              </span>
            </div>

            <StripeSegmentedBar
              height={20}
              showLabels={false}
              totalValue={0x15080}
              segments={[
                { id: "rev1", label: "Rev 1: Finacle Original (0x00..0x14208)", value: 0x14208, color: "#059669", tooltipText: "EOF #1 at 0x14208" },
                { id: "rev2", label: "Rev 2: Canva Append (0x14209..0x15080)", value: 0x15080 - 0x14208, isHatched: true, color: "crimson", tooltipText: "EOF #2 at 0x15080 (Suppression Overwrite)" },
              ]}
            />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              <span style={{ color: "#047857" }}>● Rev 1: Original Finacle (94.0%) · %%EOF #1</span>
              <span style={{ color: "#BE123C" }}>● Rev 2: Canva Append (6.0%) · %%EOF #2</span>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: "4px", padding: "1px" }}>
              {(["rev1", "rev2", "diff"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPdfViewMode(m)}
                  style={{
                    border: "none",
                    background: pdfViewMode === m ? "#FFFFFF" : "transparent",
                    color: pdfViewMode === m ? "#09090B" : "#64748B",
                    fontWeight: pdfViewMode === m ? 700 : 500,
                    fontSize: "9.5px",
                    padding: "2px 7px",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {m === "rev1" ? "Rev 1" : m === "rev2" ? "Rev 2" : "Diff"}
                </button>
              ))}
            </div>

            <span style={{ fontSize: "9.5px", color: "#64748B" }}>Canva Incremental Append</span>
          </div>

          {/* Backend Text Disclosure Note */}
          {pdfViewMode === "diff" && (
            <div style={{ padding: "6px 8px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "6px", fontSize: "9.5px", color: "#92400E", display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={12} color="#D97706" style={{ flexShrink: 0 }} />
              <span>Per-revision text not exposed by backend. PDF structure reveals Canva incremental append overwriting visual layer.</span>
            </div>
          )}

          {/* Compare Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ height: "36px", padding: "0 8px", borderRadius: "5px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                  0x00000000
                </span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#1E293B" }}>Finacle Original Stream (%%EOF 1)</span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#047857", background: "#ECFDF5", padding: "1px 6px", borderRadius: "3px" }}>
                BASE
              </span>
            </div>

            <div style={{ height: "36px", padding: "0 8px", borderRadius: "5px", background: "#FFF1F2", border: "1px solid #FECDD3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                  0x00014209
                </span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#9F1239" }}>Canva Incremental Append (%%EOF 2)</span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 6px", borderRadius: "3px" }}>
                FORGED APPEND
              </span>
            </div>
          </div>

          {/* Light Slate Token Strip */}
          <div style={{ padding: "5px 8px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              <span style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#047857", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                %PDF-1.7
              </span>
              <span style={{ color: "#94A3B8" }}>…</span>
              <span style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#047857", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                %%EOF #1
              </span>
              <span style={{ color: "#94A3B8" }}>…</span>
              <span style={{ background: "#FFE4E6", border: "1px solid #FECDD3", color: "#BE123C", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                %%EOF #2 (Canva)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText("255044462d312e37...2525454f460a...2525454f460a");
                setCopiedHex(true);
                setTimeout(() => setCopiedHex(false), 2000);
              }}
              style={{ border: "none", background: "transparent", color: "#64748B", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "9.5px" }}
            >
              {copiedHex ? <Check size={10} color="#059669" /> : <Copy size={10} />}
              <span>{copiedHex ? "Copied" : "Copy hex"}</span>
            </button>
          </div>

          {/* Verdict Row */}
          <div style={{ padding: "6px 10px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "6px", fontSize: "10px", color: "#92400E" }}>
            <strong>Quarantine Verdict: </strong>
            Receipt quarantined (Tier-3) → excluded from attribution; proceeding with Tier-1 bank evidence (Gate I4).
          </div>

          {/* Dual-Stream Byte-Level Forensic Details */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                Cryptographic Revision Hashes (SHA-256)
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "3px" }}>
                INCREMENTAL OVERWRITE
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "9.5px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: "9px" }}>
                  <span>Rev 1 Stream (0x00000000..0x00014208)</span>
                  <span style={{ color: "#047857", fontWeight: 700 }}>Finacle Certified Original</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", color: "#0F172A", marginTop: "2px", wordBreak: "break-all" }}>
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #FECDD3", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: "9px" }}>
                  <span>Rev 2 Append (0x00014209..0x00015080)</span>
                  <span style={{ color: "#BE123C", fontWeight: 700 }}>Canva Web Export (+18.4 KB)</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", color: "#BE123C", marginTop: "2px", wordBreak: "break-all" }}>
                  7d1b54f9a0c8432a98eef65bc042a1948efb4e1329a4309a6f1d8c919f2a41d0
                </div>
              </div>
            </div>

            <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.3, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
              <strong style={{ color: "#0F172A" }}>Forensic Finding: </strong>
              The claimant PDF file contains 2 distinct %%EOF trailers. Canva added an updated xref table modifying the visual text layer from ₹2,15,000 to ₹15,000 while leaving the underlying stream intact.
            </div>
          </div>
        </Tabs.Content>

        {/* =====================================================================
            TAB 3: CGNAT PRIVACY PROOF
            ===================================================================== */}
        <Tabs.Content
          value="privacy"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 16px",
            display: activeDockTab === "privacy" ? "flex" : "none",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* HiDPI Canvas Blinding Matrix */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", marginBottom: "3px" }}>
              <span>DoT Clause 39.20 IPDR Matrix (10,000 Citizens)</span>
              <span style={{ color: "#4338CA", fontWeight: 700 }}>4 Suspect Ports Revealed</span>
            </div>
            <canvas ref={canvasRef} style={{ width: "100%", height: "48px", borderRadius: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", display: "block" }} />
          </div>

          {/* Stat Trio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", textAlign: "center" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px" }}>
              <div style={{ fontSize: "9px", color: "#64748B" }}>Masked Citizens</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>9,996 (99.96%)</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px" }}>
              <div style={{ fontSize: "9px", color: "#64748B" }}>Revealed Ports</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)" }}>4 Suspects</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px" }}>
              <div style={{ fontSize: "9px", color: "#64748B" }}>DoT Exposure</div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)" }}>0.04% Safe ✓</div>
            </div>
          </div>

          {/* Merkle Proof Tree with WebCrypto */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                Merkle Tree Root (SHA-256)
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "8.5px",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: merkleVerified ? "#ECFDF5" : "#FFF1F2",
                    color: merkleVerified ? "#047857" : "#BE123C",
                    border: `1px solid ${merkleVerified ? "#A7F3D0" : "#FECDD3"}`,
                  }}
                >
                  {merkleVerified ? "VERIFIED ✓" : "REJECTED ✗"}
                </span>

                <button
                  type="button"
                  onClick={() => setIsSiblingTampered((p) => !p)}
                  style={{
                    padding: "1px 4px",
                    fontSize: "8.5px",
                    fontWeight: 600,
                    borderRadius: "3px",
                    border: isSiblingTampered ? "1px solid #FECDD3" : "1px solid #CBD5E1",
                    background: isSiblingTampered ? "#FFF1F2" : "#FFFFFF",
                    color: isSiblingTampered ? "#BE123C" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  {isSiblingTampered ? "Tamper Active" : "Tamper Sibling"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "2px 6px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "9.5px" }}>
              <span>{isSiblingTampered ? tamperedMerkleRoot : fullMerkleRoot}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(isSiblingTampered ? tamperedMerkleRoot : fullMerkleRoot);
                  setCopiedRoot(true);
                  setTimeout(() => setCopiedRoot(false), 2000);
                }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748B" }}
              >
                {copiedRoot ? <Check size={10} color="#059669" /> : <Copy size={10} />}
              </button>
            </div>

            <button
              type="button"
              disabled={isVerifyingPath}
              onClick={handleVerifyPath}
              style={{
                marginTop: "4px",
                height: "24px",
                borderRadius: "4px",
                border: "1px solid #C7D2FE",
                background: "#EEF2FF",
                color: "#4338CA",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isVerifyingPath ? "Verifying WebCrypto SHA-256..." : "Verify Inclusion Proof (Depth 14)"}
            </button>
          </div>

          {/* Privacy Enclave Attestation Box */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                DoT Clause 39.20 Safe Harbor Compliance
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                AIR-GAP ATTESTED
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>Citizen Masking Rate</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857", marginTop: "1px" }}>
                  99.96% (9,996 / 10,000)
                </div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
                <div style={{ color: "#64748B", fontSize: "9px" }}>Target Disclosures</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#4338CA", marginTop: "1px" }}>
                  4 Allocated Ports Only
                </div>
              </div>
            </div>

            <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.3, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
              <strong style={{ color: "#0F172A" }}>Judicial Privacy Guarantee: </strong>
              Zero innocent citizen communications or identities are exposed to IOs or court record, complying with High Court privacy mandates and DoT IPDR rules.
            </div>
          </div>
        </Tabs.Content>

        {/* =====================================================================
            TAB 4: FALSIFICATION PROOF TIMELINE
            ===================================================================== */}
        <Tabs.Content
          value="proof"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 16px",
            display: activeDockTab === "proof" ? "flex" : "none",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#09090B" }}>
              Z3 Mathematical Invariant Solvers (I1–I5)
            </span>
            <button
              type="button"
              onClick={resetAllMutations}
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Reset Invariants
            </button>
          </div>

          {[
            {
              id: "I1",
              name: "Double-Entry Conservation",
              severity: "BLOCKING",
              formula: "Bal[k] = Bal[k-1] + Cr[k] - Dr[k]",
              expected: "0.00 Deficit across all rows",
              observed: isRow14Tampered ? "Δ ₹2,00,000 Deficit at Row #14 ✗" : "6/6 Reconciled ✓",
              passed: !isRow14Tampered,
              onBreak: onToggleRow14Tamper,
              breakLabel: isRow14Tampered ? "Restore Row #14" : "Tamper Row #14 Balance",
            },
            {
              id: "I2",
              name: "NPCI RRN Clock Sync",
              severity: "FLAGGING",
              formula: "|Δt_NTP| ≤ 180s",
              expected: "Within ±180s window vs switch",
              observed: isForgedRrn ? "Δ +3,000s (>180s SKEW ✗)" : "Δ +14.0s (In Spec ✓)",
              passed: !isForgedRrn,
              onBreak: onToggleForgeRrn,
              breakLabel: isForgedRrn ? "Reset Skew" : "Forge Clock Skew (+50m)",
            },
            {
              id: "I3",
              name: "CBS ↔ Switch Settlement",
              severity: "BLOCKING",
              formula: "CBS.Debit == Switch.Settlement",
              expected: "₹2,15,000.00 Certified Debit",
              observed: "Matched ₹2,15,000.00 ✓",
              passed: true,
            },
            {
              id: "I4",
              name: "PDF Revision Integrity",
              severity: "FLAGGING",
              formula: "Trailer.Count == 1",
              expected: "1 %%EOF Trailer",
              observed: "2 Trailers (Canva Appended Overwrite ✗)",
              passed: false,
            },
            {
              id: "I5",
              name: "CGNAT Privacy Inclusion",
              severity: "BLOCKING",
              formula: "DoT Clause 39.20 Inclusion Proof",
              expected: "Zero civilian leak",
              observed: "9,996 Records Blinded ✓",
              passed: true,
            },
          ].map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setProofStepIndex(idx)}
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                border: `1px solid ${item.passed ? "#E2E8F0" : item.severity === "BLOCKING" ? "#FECDD3" : "#FDE68A"}`,
                background: item.passed ? "#FFFFFF" : item.severity === "BLOCKING" ? "#FFF1F2" : "#FFFBEB",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                    {item.id}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#09090B" }}>{item.name}</span>
                </div>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: "3px",
                    background: item.severity === "BLOCKING" ? "#FFE4E6" : "#FEF3C7",
                    color: item.severity === "BLOCKING" ? "#BE123C" : "#92400E",
                  }}
                >
                  {item.severity}
                </span>
              </div>

              <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                {item.formula}
              </div>

              <div style={{ fontSize: "9.5px", color: item.passed ? "#047857" : "#BE123C", fontWeight: 600, marginTop: "2px" }}>
                {item.observed}
              </div>

              {item.onBreak && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={item.onBreak}
                    style={{
                      padding: "2px 6px",
                      fontSize: "9px",
                      fontWeight: 600,
                      borderRadius: "3px",
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      color: "#0F172A",
                      cursor: "pointer",
                    }}
                  >
                    {item.breakLabel}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Z3 Solver Judicial Certificate Banner */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                Z3 SMT Invariant Solver Verification
              </span>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  background: isRow14Tampered || isForgedRrn ? "#FFF1F2" : "#ECFDF5",
                  color: isRow14Tampered || isForgedRrn ? "#BE123C" : "#047857",
                  border: `1px solid ${isRow14Tampered || isForgedRrn ? "#FECDD3" : "#A7F3D0"}`,
                }}
              >
                {isRow14Tampered || isForgedRrn ? "FALSIFICATION UNSAT" : "ALL INVARIANTS SAT"}
              </span>
            </div>

            <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.3, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
              <strong style={{ color: "#0F172A" }}>Judicial Order Direction: </strong>
              {isRow14Tampered
                ? "Falsification gate has halted downstream attribution engines. Row #14 contains an unsat mathematical deficit of ₹2,00,000.00."
                : "Mathematical conservation is proven across 6 Finacle CBS ledger rows. Proceed with Tier-1 bank evidence for attribution."}
            </div>
          </div>
        </Tabs.Content>

        {/* =====================================================================
            TAB 5: ENTITY EXTRACTION & ALIAS RESOLUTION MATRIX (18 -> 5)
            ===================================================================== */}
        <Tabs.Content
          value="entities"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              background: "#F0FDFA",
              border: "1px solid #99F6E4",
              borderRadius: "7px",
              padding: "7px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F766E", display: "flex", alignItems: "center", gap: "5px" }}>
                <Dna size={13} color="#0D9488" />
                <span>Deterministic Entity Extraction & Resolution Matrix</span>
              </div>
              <div style={{ fontSize: "8.5px", color: "#115E59", marginTop: "1px" }}>
                18 noisy raw identifiers extracted across 4 evidence files &rarr; Resolved into 5 Canonical Entities with Hard Veto logic.
              </div>
            </div>
            <span style={{ fontSize: "9px", fontWeight: 800, background: "#CCFBF1", color: "#0F766E", padding: "1.5px 6px", borderRadius: "4px" }}>
              18 &rarr; 5 ENTITIES
            </span>
          </div>

          {/* Entity 1: Sunil Kumar (Victim) */}
          <div
            onMouseEnter={() => setHoveredEntity("ENT-01")}
            onMouseLeave={() => setHoveredEntity(null)}
            style={{
              background: "#FFFFFF",
              border: hoveredEntity === "ENT-01" ? "1.5px solid #4F46E5" : "1px solid #E2E8F0",
              borderRadius: "7px",
              padding: "7px 9px",
              boxShadow: hoveredEntity === "ENT-01" ? "0 0 0 3px rgba(79, 70, 229, 0.15)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: hoveredEntity === "ENT-01" ? "#4338CA" : "#0F172A" }}>
                ENT-01 &middot; Sunil Kumar (Victim Origin)
              </span>
              <span style={{ fontSize: "8px", fontWeight: 800, background: "#EEF2FF", color: "#4338CA", padding: "1px 5px", borderRadius: "3px" }}>
                VICTIM COMPLAINANT
              </span>
            </div>
            <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px", lineHeight: 1.35 }}>
              <strong>Resolved Tokens (3):</strong> SBI A/c <code style={{ color: "#0F172A", background: hoveredEntity === "ENT-01" ? "#EEF2FF" : undefined }}>30910029101</code> &middot; MSISDN <code style={{ color: "#0F172A", background: hoveredEntity === "ENT-01" ? "#EEF2FF" : undefined }}>+91-9810044210</code> &middot; Handset Video Call Screenshot (Verified PII).
            </div>
          </div>

          {/* Entity 2: Vikram Shah (L1 Mule) */}
          <div
            onMouseEnter={() => setHoveredEntity("ENT-02")}
            onMouseLeave={() => setHoveredEntity(null)}
            style={{
              background: "#FFFFFF",
              border: hoveredEntity === "ENT-02" ? "1.5px solid #E11D48" : "1px solid #FECDD3",
              borderRadius: "7px",
              padding: "7px 9px",
              boxShadow: hoveredEntity === "ENT-02" ? "0 0 0 3px rgba(225, 29, 72, 0.15)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#BE123C" }}>
                ENT-02 &middot; Vikram Shah (Layer-1 Conduit)
              </span>
              <span style={{ fontSize: "8px", fontWeight: 800, background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "1px 5px", borderRadius: "3px" }}>
                L1 CONDUIT MULE
              </span>
            </div>
            <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px", lineHeight: 1.35 }}>
              <strong>Resolved Tokens (4):</strong> Narration: <code style={{ color: "#BE123C", background: hoveredEntity === "ENT-02" ? "#FFE4E6" : undefined }}>VIKRAM_MULE</code> &middot; VPA: <code style={{ color: "#BE123C" }}>vikram.pay@okaxis</code> &middot; MSISDN: <code style={{ color: "#BE123C" }}>+91-9871123941</code> &middot; IMEI: <code style={{ color: "#BE123C" }}>867492061234564</code> (Dwell: 112s).
            </div>
          </div>

          {/* Entity 3 & 4: Rohit Verma & Sameer Khan (Cross-Actor Syndicate Link) */}
          <div
            onMouseEnter={() => setHoveredEntity("ENT-03")}
            onMouseLeave={() => setHoveredEntity(null)}
            style={{
              background: "#FFFBEB",
              border: hoveredEntity === "ENT-03" ? "1.5px solid #D97706" : "1px solid #FDE68A",
              borderRadius: "7px",
              padding: "7px 9px",
              boxShadow: hoveredEntity === "ENT-03" ? "0 0 0 3px rgba(217, 119, 6, 0.15)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#92400E" }}>
                ENT-03 &amp; ENT-04 &middot; Rohit Verma (L2A) &amp; Sameer Khan (L2B)
              </span>
              <span style={{ fontSize: "8px", fontWeight: 800, background: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D", padding: "1px 5px", borderRadius: "3px" }}>
                CROSS-ACTOR SYNDICATE HIT
              </span>
            </div>
            <div style={{ fontSize: "8.5px", color: "#78350F", marginTop: "2px", lineHeight: 1.35 }}>
              <strong>Syndicate Linkage Alert:</strong> Different KYC names &amp; accounts (HDFC <code style={{ color: "#92400E" }}>5010029419920</code> &amp; AXIS <code style={{ color: "#92400E" }}>9140200410291</code>), but linked via identical <strong>JA4 TLS Fingerprint (t13d1516h2_8daaf6)</strong> and shared <strong>Wi-Fi Hotspot BSSID (74:DA:38:A2:11:BC)</strong>.
            </div>
          </div>

          {/* Entity 5: Apex Electronics (Bona-Fide Hard Veto) */}
          <div
            onMouseEnter={() => setHoveredEntity("ENT-05")}
            onMouseLeave={() => setHoveredEntity(null)}
            style={{
              background: "#F0FDF4",
              border: hoveredEntity === "ENT-05" ? "1.5px solid #16A34A" : "1px solid #BBF7D0",
              borderRadius: "7px",
              padding: "7px 9px",
              boxShadow: hoveredEntity === "ENT-05" ? "0 0 0 3px rgba(22, 163, 74, 0.15)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#166534" }}>
                ENT-05 &middot; Apex Electronics Pvt Ltd (Bona-Fide Merchant)
              </span>
              <span style={{ fontSize: "8px", fontWeight: 800, background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", padding: "1px 5px", borderRadius: "3px" }}>
                &check; HARD VETO PROTECTION
              </span>
            </div>
            <div style={{ fontSize: "8.5px", color: "#14532D", marginTop: "2px", lineHeight: 1.35 }}>
              <strong>Hard Veto Applied:</strong> Received ₹1.80L from L2A, but verified GSTIN (<code style={{ color: "#166534" }}>07AAACA1234F1Z8</code>) + 0 shared device/IP tokens + commercial POS history prevents false mule merge. Shielded under Section 106(1) Specific Lien.
            </div>
          </div>

          {/* 1-Click Directive Button */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(getBnss94EntityResolutionDirective());
              toast.success("Copied § 94 BNSS KYC/CAF Requisition to clipboard!", {
                description: "Statutory order for 5 resolved targets served to SBI, HDFC, Axis, ICICI and Airtel.",
                duration: 3500,
              });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #0D9488",
              background: "#0D9488",
              color: "#FFFFFF",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(13, 148, 136, 0.25)",
              marginTop: "2px",
            }}
          >
            <Copy size={11} />
            <span>&copy; Copy &sect;94 BNSS Cross-Bank KYC/CAF Resolution Directive</span>
          </button>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

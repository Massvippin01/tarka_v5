import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  FileSpreadsheet,
  Shield,
} from "lucide-react";
import { type LedgerRowData } from "../../../utils/intakeFalsifier";

export type ValidatedLedgerRow = LedgerRowData & {
  expectedBalance?: number;
  status?: "SAT" | "UNSAT" | "REORDERED";
};

export interface LedgerCardProps {
  rows: ValidatedLedgerRow[];
  isRow14Tampered: boolean;
  customRow14Balance: string;
  onCustomBalanceChange: (val: string) => void;
  onResetRow14Balance: () => void;
  onSelectRrn: (rrn: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const LedgerCard: React.FC<LedgerCardProps> = ({
  rows,
  isRow14Tampered,
  customRow14Balance,
  onCustomBalanceChange,
  onResetRow14Balance,
  onSelectRrn,
  searchTerm,
  onSearchChange,
  searchInputRef,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [timeMode, setTimeMode] = useState<"IST" | "UTC">("IST");
  const [flashDownstream, setFlashDownstream] = useState(false);
  const prevCustomBalRef = useRef(customRow14Balance);

  // Cascade pulse on rows 15-16 when row 14 balance is altered
  useEffect(() => {
    if (prevCustomBalRef.current !== customRow14Balance) {
      prevCustomBalRef.current = customRow14Balance;
      setFlashDownstream(true);
      const timer = setTimeout(() => setFlashDownstream(false), 600);
      return () => clearTimeout(timer);
    }
  }, [customRow14Balance]);

  const handleCopySha = () => {
    navigator.clipboard.writeText("3f8a412e8b2c9d1109aa77f1b29c5e3170d496a793c12a884efb01449de1e9b1");
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatTimestamp = (iso: string) => {
    const parts = iso.split("T");
    const time = parts[1] || "";
    if (timeMode === "UTC") {
      const [h, m, s] = time.split(":").map(Number);
      let totalMin = h * 60 + m - 330;
      if (totalMin < 0) totalMin += 1440;
      const utcH = Math.floor(totalMin / 60);
      const utcM = totalMin % 60;
      return `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}:${s ?? 0}Z`;
    }
    return time;
  };

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <div>
        {/* =========================================================================
            HEADER ROW 1: TITLE + METADATA CHIPS + SHA256 + INVARIANT FORMULA
            ========================================================================= */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #E2E8F0",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            whiteSpace: "nowrap",
          }}
        >
          {/* Left: Title + File + Tier Badge + Short Hash */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FileSpreadsheet size={14} color="#059669" />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#09090B", letterSpacing: "-0.01em" }}>
                SBI Core Banking Ledger
              </span>
            </div>

            <span
              style={{
                fontSize: "10.5px",
                fontFamily: "var(--font-mono)",
                color: "#475569",
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                padding: "1px 5px",
                borderRadius: "4px",
                fontWeight: 500,
              }}
            >
              sbi_finacle_cbs.csv
            </span>

            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#64748B",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "1px 5px",
                borderRadius: "4px",
              }}
            >
              6 Rows · Tier-1 HSM
            </span>

            <button
              type="button"
              onClick={handleCopySha}
              title="Click to copy full SHA-256 evidence hash"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "9.5px",
                fontFamily: "var(--font-mono)",
                color: "#64748B",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "1px 5px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              <span>sha256: 3f8a…e9b1</span>
              {copiedHash ? <Check size={10} color="#059669" /> : <Copy size={10} color="#94A3B8" />}
            </button>
          </div>

          {/* Right: Invariant Equation Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                padding: "2px 6px",
                borderRadius: "4px",
                background: isRow14Tampered ? "#FFF1F2" : "#ECFDF5",
                color: isRow14Tampered ? "#BE123C" : "#047857",
                border: isRow14Tampered ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                transition: "all 0.15s ease",
              }}
            >
              {isRow14Tampered
                ? "Bal[14] ≠ Expected (-₹2.00L Deficit) ✗"
                : "Bal[k] = Bal[k-1] + Cr - Dr ✓"}
            </span>
          </div>
        </div>

        {/* =========================================================================
            HEADER ROW 2: SEARCH INPUT + TIME ZONE TOGGLE + ROW COUNT
            ========================================================================= */}
        <div
          style={{
            padding: "5px 12px",
            borderBottom: "1px solid #F1F5F9",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "11px",
          }}
        >
          {/* Left: Search filter with '/' badge */}
          <div style={{ position: "relative", width: "170px" }}>
            <Search
              size={11}
              color="#94A3B8"
              style={{ position: "absolute", left: "7px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Filter ledger rows by UTR, narration, or RRN"
              placeholder="Filter UTR / Narration... (/)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                height: "23px",
                padding: "0 20px 0 22px",
                fontSize: "10.5px",
                borderRadius: "4px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
                title="Clear filter (Esc)"
              >
                ×
              </button>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "8.5px",
                  fontFamily: "var(--font-mono)",
                  color: "#94A3B8",
                  background: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  padding: "0 3px",
                  borderRadius: "2px",
                  pointerEvents: "none",
                }}
              >
                /
              </span>
            )}
          </div>

          {/* Right: Time Zone Toggle + Row Count */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748B", fontSize: "10.5px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                padding: "1px",
              }}
            >
              <button
                type="button"
                onClick={() => setTimeMode("IST")}
                style={{
                  border: "none",
                  background: timeMode === "IST" ? "#F1F5F9" : "transparent",
                  color: timeMode === "IST" ? "#09090B" : "#64748B",
                  fontWeight: timeMode === "IST" ? 700 : 500,
                  fontSize: "9px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                IST (+5:30)
              </button>
              <button
                type="button"
                onClick={() => setTimeMode("UTC")}
                style={{
                  border: "none",
                  background: timeMode === "UTC" ? "#F1F5F9" : "transparent",
                  color: timeMode === "UTC" ? "#09090B" : "#64748B",
                  fontWeight: timeMode === "UTC" ? 700 : 500,
                  fontSize: "9px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                UTC
              </button>
            </div>

            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              Showing <strong style={{ color: "#09090B" }}>{rows.length}</strong> of 6 rows
            </span>
          </div>
        </div>

        {/* =========================================================================
            WRAP-SAFE COMPACT CONFLICT ALERT STRIP
            ========================================================================= */}
        <div
          style={{
            padding: "4px 12px",
            background: "rgba(255, 241, 242, 0.6)",
            borderBottom: "1px solid #FECDD3",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px",
            fontSize: "10.5px",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {/* Left: Suspect Receipt */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
            <AlertCircle size={11} color="#E11D48" style={{ flexShrink: 0 }} />
            <span style={{ color: "#64748B" }}>Receipt:</span>
            <strong style={{ color: "#BE123C", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
              ₹15,000.00
            </strong>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: "#BE123C",
                background: "#FFE4E6",
                border: "1px solid #FECDD3",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              Canva
            </span>
          </div>

          {/* Center: Conflict Delta */}
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: "#BE123C",
              fontFamily: "var(--font-mono)",
              background: "#FFFFFF",
              border: "1px solid #FECDD3",
              padding: "1px 5px",
              borderRadius: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              flexShrink: 0,
            }}
          >
            ≠ Δ ₹2,00,000.00 Hidden Debit
          </div>

          {/* Right: Certified Finacle Settlement */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
            <span style={{ color: "#64748B" }}>Finacle:</span>
            <strong style={{ color: "#047857", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
              ₹2,15,000.00
            </strong>
            <button
              type="button"
              onClick={() => onSelectRrn("626510149921")}
              title="Click to populate RRN dissector with this reference"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "#047857",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                padding: "1px 4px",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              <span>#626510149921</span>
              <ExternalLink size={8.5} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            DATA GRID: FIXED COMPACT COLUMNS (NO HORIZONTAL SCROLL)
            ========================================================================= */}
        <div style={{ overflowX: "hidden", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <table style={{ tableLayout: "fixed", width: "100%", maxWidth: "100%", boxSizing: "border-box", borderCollapse: "collapse", textAlign: "left", fontSize: "10.5px" }}>
            <colgroup>
              <col style={{ width: "34px" }} />
              <col style={{ width: "62px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "94px" }} />
              <col style={{ width: "64px" }} />
              <col style={{ width: "78px" }} />
              <col style={{ width: "78px" }} />
              <col style={{ width: "102px" }} />
              <col style={{ width: "42px" }} />
            </colgroup>
            <thead>
              <tr style={{ height: "28px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 700, fontSize: "10px" }}>
                <th style={{ padding: "3px 4px", textAlign: "center", fontFamily: "var(--font-mono)" }}>Row</th>
                <th style={{ padding: "3px 4px", fontFamily: "var(--font-mono)" }}>Time</th>
                <th style={{ padding: "3px 6px" }}>Counterparty & Narration</th>
                <th style={{ padding: "3px 4px", fontFamily: "var(--font-mono)" }}>RRN / UTR</th>
                <th style={{ padding: "3px 4px" }}>Rail</th>
                <th style={{ padding: "3px 4px", textAlign: "right", fontFamily: "var(--font-mono)" }}>Debit (₹)</th>
                <th style={{ padding: "3px 4px", textAlign: "right", fontFamily: "var(--font-mono)" }}>Credit (₹)</th>
                <th style={{ padding: "3px 4px", textAlign: "right", fontFamily: "var(--font-mono)" }}>Balance (₹)</th>
                <th style={{ padding: "3px 4px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isDisputed = row.sequenceNo === 14;
                const isUnsat = row.status === "UNSAT" || (isDisputed && isRow14Tampered);
                const isDownstream = (row.sequenceNo === 15 || row.sequenceNo === 16);

                let rowBg = "transparent";
                let rowBorderLeft = "3px solid transparent";
                if (isUnsat) {
                  rowBg = "#FFF1F2";
                  rowBorderLeft = "3px solid #E11D48";
                } else if (isDisputed) {
                  rowBg = "rgba(254, 243, 199, 0.15)";
                  rowBorderLeft = "3px solid #F59E0B";
                }

                return (
                  <tr
                    key={row.id}
                    className={isDownstream && flashDownstream ? "flash-downstream" : ""}
                    style={{
                      height: "34px",
                      background: rowBg,
                      borderLeft: rowBorderLeft,
                      borderBottom: "1px solid #F1F5F9",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {/* Row Seq */}
                    <td style={{ padding: "3px 4px", textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#64748B" }}>
                      #{row.sequenceNo}
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: "3px 4px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatTimestamp(row.timestamp)}
                    </td>

                    {/* Counterparty & Narration */}
                    <td style={{ padding: "3px 6px", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: isDisputed ? 700 : 600,
                            color: isDisputed ? "#09090B" : "#334155",
                            fontSize: "11px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                          title={row.description}
                        >
                          {row.description}
                        </span>
                        {isDisputed && (
                          <span
                            style={{
                              fontSize: "8px",
                              fontWeight: 700,
                              padding: "1px 3px",
                              borderRadius: "2px",
                              background: isUnsat ? "#FFE4E6" : "#FEF3C7",
                              color: isUnsat ? "#BE123C" : "#92400E",
                              border: `1px solid ${isUnsat ? "#FECDD3" : "#FDE68A"}`,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {isUnsat ? "Falsified" : "Mule"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* RRN / UTR dedicated column */}
                    <td style={{ padding: "3px 4px", fontFamily: "var(--font-mono)", fontSize: "9.5px", overflow: "hidden" }}>
                      {row.rrn !== "—" ? (
                        <button
                          type="button"
                          onClick={() => onSelectRrn(row.rrn)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#475569",
                            cursor: "pointer",
                            padding: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: "9.5px",
                            textAlign: "left",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                            width: "100%",
                          }}
                          title={`Click to inspect RRN ${row.rrn}`}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                        >
                          {row.rrn}
                        </button>
                      ) : (
                        <span style={{ color: "#94A3B8" }}>—</span>
                      )}
                    </td>

                    {/* Rail Pill */}
                    <td style={{ padding: "3px 4px" }}>
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 700,
                          padding: "1px 4px",
                          borderRadius: "3px",
                          whiteSpace: "nowrap",
                          background:
                            row.sequenceNo === 11
                              ? "#F1F5F9"
                              : row.sequenceNo === 13
                              ? "#ECFDF5"
                              : row.sequenceNo === 14
                              ? isUnsat
                                ? "#FFE4E6"
                                : "#FEF3C7"
                              : "#EEF2FF",
                          color:
                            row.sequenceNo === 11
                              ? "#475569"
                              : row.sequenceNo === 13
                              ? "#047857"
                              : row.sequenceNo === 14
                              ? isUnsat
                                ? "#BE123C"
                                : "#92400E"
                              : "#4338CA",
                          border: `1px solid ${
                            row.sequenceNo === 11
                              ? "#E2E8F0"
                              : row.sequenceNo === 13
                              ? "#A7F3D0"
                              : row.sequenceNo === 14
                              ? isUnsat
                                ? "#FECDD3"
                                : "#FDE68A"
                              : "#C7D2FE"
                          }`,
                        }}
                      >
                        {row.sequenceNo === 11
                          ? "OPENING"
                          : row.sequenceNo === 13
                          ? "NEFT CR"
                          : row.sequenceNo === 14
                          ? "UPI MULE"
                          : "RETAIL"}
                      </span>
                    </td>

                    {/* Debit (₹) */}
                    <td
                      style={{
                        padding: "3px 4px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "10.5px",
                        color: "#BE123C",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {row.debit > 0
                        ? `-₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Credit (₹) */}
                    <td
                      style={{
                        padding: "3px 4px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "10.5px",
                        color: "#047857",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {row.credit > 0
                        ? `+₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Balance (₹) (Inline editable on Row #14) */}
                    <td style={{ padding: "3px 4px", textAlign: "right", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {isDisputed ? (
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "2px" }}>
                          <span style={{ color: "#94A3B8", fontSize: "9.5px" }}>₹</span>
                          <input
                            type="text"
                            aria-label="Row #14 Closing Balance in Rupees"
                            value={customRow14Balance}
                            onChange={(e) => onCustomBalanceChange(e.target.value)}
                            style={{
                              width: "66px",
                              height: "20px",
                              padding: "1px 2px",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              borderRadius: "3px",
                              border: isUnsat ? "1px solid #FECDD3" : "1px solid #F59E0B",
                              background: isUnsat ? "#FFF1F2" : "#FFFFFF",
                              color: isUnsat ? "#BE123C" : "#09090B",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                            title="Edit Row #14 closing balance to test mathematical falsification"
                          />
                          <button
                            type="button"
                            onClick={onResetRow14Balance}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#94A3B8",
                              cursor: "pointer",
                              padding: "1px",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Reset to original CBS balance (₹5,22,440.00)"
                          >
                            <RotateCcw size={9} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "10.5px",
                            color: isUnsat ? "#BE123C" : "#09090B",
                          }}
                        >
                          ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: "3px 4px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          fontSize: "8.5px",
                          fontWeight: 700,
                          background: isUnsat ? "#FFF1F2" : "#ECFDF5",
                          color: isUnsat ? "#BE123C" : "#047857",
                          border: `1px solid ${isUnsat ? "#FECDD3" : "#A7F3D0"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isUnsat ? "FAIL ✗" : "VALID ✓"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM AUDIT STRIP: HSM HARDWARE STAMP & STATUTORY ADMISSIBILITY NOTE
          ========================================================================= */}
      <div
        style={{
          padding: "5px 12px",
          background: "#F8FAFC",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "9.5px",
          color: "#64748B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Shield size={11} color="#059669" />
          <span>
            Tier-1 HSM Conservation Verified · RBI Circular Compliant
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#94A3B8" }}>
          SBI-FINACLE-10.2-PROD
        </span>
      </div>
    </div>
  );
};

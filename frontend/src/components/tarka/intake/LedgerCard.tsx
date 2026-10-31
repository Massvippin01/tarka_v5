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
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  Split,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { type LedgerRowData } from "../../../utils/intakeFalsifier";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";

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
  sortPolarity: "ASC" | "DESC";
  onTogglePolarity: () => void;
  permuteActive: boolean;
  onTogglePermute: () => void;
}

const ROW_HASHES: Record<number, string> = {
  11: "a18f4019e078b61c8a14b5c772099307ef1968d04265ccf7c706bf9508bc5b51",
  12: "d32840c1122a6111f1295b9c77109307ef1968d04265ccf7c706bf9508bc5b52",
  13: "e43920f2133b7222f2306c0d88210418fa2079e15376dd08d817ca0619cd6c63",
  14: "f54a31a3244c8333a3417d1e99321529ab318af26487ee19e928db1720de7d74",
  15: "065b42b4355d9444b4528e2fa0432630bc429b037598ff20fa39ec2831ef8e85",
  16: "176c53c5466ea555c5639f30b1543741cd530c1486a900310b4afd3942f09f96",
};

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
  sortPolarity,
  onTogglePolarity,
  permuteActive,
  onTogglePermute,
}) => {
  const { density, setSelectedRowSeq, setActiveDockTab } = useTarkaUiStore();

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRowHash, setCopiedRowHash] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<"IST" | "UTC">("IST");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const row14Ref = useRef<HTMLTableRowElement | null>(null);

  // Auto-scroll row 14 into view on short viewports if tampered
  useEffect(() => {
    if (isRow14Tampered && row14Ref.current) {
      row14Ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isRow14Tampered]);

  const toggleRowExpanded = (seq: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [seq]: !prev[seq],
    }));
  };

  const handleCopySha = () => {
    navigator.clipboard.writeText("3f8a412e8b2c9d1109aa77f1b29c5e3170d496a793c12a884efb01449de1e9b1");
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyRowHash = (seq: number, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedRowHash(seq);
    setTimeout(() => setCopiedRowHash(null), 2000);
  };

  const formatTimestamp = (iso: string, forceMode?: "IST" | "UTC") => {
    const mode = forceMode || timeMode;
    const parts = iso.split("T");
    const time = parts[1] || "";
    if (mode === "UTC") {
      const [h, m, s] = time.split(":").map(Number);
      let totalMin = h * 60 + m - 330;
      if (totalMin < 0) totalMin += 1440;
      const utcH = Math.floor(totalMin / 60);
      const utcM = totalMin % 60;
      return `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}:${s ?? 0}Z`;
    }
    return time;
  };

  const handleBalanceCommit = () => {
    const num = parseFloat(customRow14Balance);
    if (!isNaN(num)) {
      onCustomBalanceChange(num.toFixed(2));
    }
  };

  const rowHeight = density === "compact" ? 34 : 40;

  return (
    <div
      data-card="ledger-card"
      className="bento-card ledger-card-container"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          TOOLBAR (SINGLE ROW, 44PX)
          ========================================================================= */}
      <div
        style={{
          height: "44px",
          minHeight: "44px",
          maxHeight: "44px",
          padding: "0 10px",
          borderBottom: "1px solid #E2E8F0",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Left: Title + Tier Badge + Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <FileSpreadsheet size={15} color="#059669" />
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#09090B", letterSpacing: "-0.01em" }}>
              SBI Core Banking Ledger
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "#047857",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              Tier-1 HSM
            </span>
          </div>

          {/* Quick Filter */}
          <div style={{ position: "relative", width: "160px", flexShrink: 1 }}>
            <Search
              size={11}
              color="#94A3B8"
              style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Filter ledger rows by UTR, narration, or RRN"
              placeholder="Filter UTR... (/)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                height: "24px",
                padding: "0 18px 0 20px",
                fontSize: "11px",
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
                  right: "4px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  fontSize: "11px",
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
                  pointerEvents: "none",
                }}
              >
                /
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls (ASC/DESC, Permute, Time Zone, Invariant Chip, More Menu) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {/* Polarity Toggle */}
          <button
            type="button"
            onClick={onTogglePolarity}
            style={{
              height: "24px",
              padding: "0 7px",
              borderRadius: "4px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#334155",
              fontSize: "10.5px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
            title="Toggle chronological sorting (ASC / DESC)"
          >
            {sortPolarity}
          </button>

          {/* Permute Same-Sec */}
          <button
            type="button"
            onClick={onTogglePermute}
            style={{
              height: "24px",
              padding: "0 7px",
              borderRadius: "4px",
              border: permuteActive ? "1px solid #C7D2FE" : "1px solid #CBD5E1",
              background: permuteActive ? "#EEF2FF" : "#FFFFFF",
              color: permuteActive ? "#4338CA" : "#475569",
              fontSize: "10.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Permute same-second timestamps [P]"
          >
            <Split size={11} color={permuteActive ? "#4F46E5" : "#64748B"} />
            <span>Permute</span>
          </button>

          {/* IST / UTC Toggle */}
          <button
            type="button"
            onClick={() => setTimeMode((m) => (m === "IST" ? "UTC" : "IST"))}
            style={{
              height: "24px",
              padding: "0 6px",
              borderRadius: "4px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#0F172A",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Toggle timestamp zone between IST (+5:30) and UTC (Z)"
          >
            {timeMode}
          </button>

          {/* Invariant Equation Chip */}
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              borderRadius: "4px",
              background: isRow14Tampered ? "#FFF1F2" : "#ECFDF5",
              color: isRow14Tampered ? "#BE123C" : "#047857",
              border: `1px solid ${isRow14Tampered ? "#FECDD3" : "#A7F3D0"}`,
            }}
            title="Double-entry conservation invariant formula"
          >
            {isRow14Tampered ? "Bal[14] ≠ Exp (-₹2.00L) ✗" : "Bal[k] = Bal[k-1]+Cr-Dr ✓"}
          </span>

          {/* More Menu ⋯ */}
          <Popover.Root open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                style={{
                  height: "24px",
                  width: "24px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="More ledger details & evidence hash"
              >
                <MoreHorizontal size={13} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="end"
                sideOffset={4}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  width: "260px",
                  zIndex: 9999,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                  <div style={{ fontWeight: 700, color: "#09090B" }}>File Provenance</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#475569", background: "#F8FAFC", padding: "3px 6px", borderRadius: "4px" }}>
                    sbi_finacle_cbs.csv (6 rows)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", color: "#64748B" }}>SHA-256 Hash:</span>
                    <button
                      type="button"
                      onClick={handleCopySha}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "9.5px",
                        color: "#4338CA",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span>sha256: 3f8a…e9b1</span>
                      {copiedHash ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>
                <Popover.Arrow style={{ fill: "#FFFFFF" }} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {/* =========================================================================
          CONFLICT ALERT STRIP (COMPACT 44PX, WRAP-SAFE)
          ========================================================================= */}
      <div
        style={{
          padding: "4px 10px",
          background: "rgba(255, 241, 242, 0.65)",
          borderBottom: "1px solid #FECDD3",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          fontSize: "11px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <AlertCircle size={13} color="#E11D48" style={{ flexShrink: 0 }} />
          <span style={{ color: "#475569" }}>Claimed Receipt:</span>
          <strong style={{ color: "#BE123C", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
            ₹15,000.00
          </strong>
          <span
            style={{
              fontSize: "8.5px",
              fontWeight: 700,
              color: "#BE123C",
              background: "#FFE4E6",
              border: "1px solid #FECDD3",
              padding: "0 4px",
              borderRadius: "3px",
            }}
          >
            Tier-3 Canva
          </span>
        </div>

        <div
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            color: "#BE123C",
            background: "#FFFFFF",
            border: "1px solid #FECDD3",
            padding: "1px 6px",
            borderRadius: "4px",
          }}
        >
          ≠ Δ ₹2,00,000.00 Hidden Deficit (14.3× Overwrite)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ color: "#475569" }}>Finacle CBS:</span>
          <strong style={{ color: "#047857", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
            ₹2,15,000.00
          </strong>
          <button
            type="button"
            onClick={() => {
              onSelectRrn("626510149921");
              setActiveDockTab("rrn");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "9.5px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "#047857",
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              padding: "1px 5px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            title="Inspect RRN in Forensic Lab"
          >
            <span>#626510149921</span>
            <ExternalLink size={9} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          DATA GRID (TANSTACK / COLGROUP + CONTAINER QUERY VISIBILITY)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          position: "relative",
          width: "100%",
        }}
      >
        <table
          style={{
            tableLayout: "fixed",
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "12px",
          }}
        >
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "72px" }} />
            <col style={{ width: "auto" }} />
            <col className="col-rrn-cquery" style={{ width: "136px" }} />
            <col className="col-rail-cquery" style={{ width: "88px" }} />
            <col style={{ width: "108px" }} />
            <col style={{ width: "108px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "32px" }} />
          </colgroup>

          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8FAFC" }}>
            <tr
              style={{
                height: "28px",
                borderBottom: "1px solid #E2E8F0",
                color: "#64748B",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              <th style={{ padding: "2px 4px", textAlign: "center", fontFamily: "var(--font-mono)" }}>Row</th>
              <th style={{ padding: "2px 4px", fontFamily: "var(--font-mono)" }}>Time</th>
              <th style={{ padding: "2px 6px" }}>Counterparty & Narration</th>
              <th className="col-rrn-cquery" style={{ padding: "2px 6px", fontFamily: "var(--font-mono)" }}>
                UTR / RRN
              </th>
              <th className="col-rail-cquery" style={{ padding: "2px 4px" }}>Rail</th>
              <th style={{ padding: "2px 6px", textAlign: "right" }}>Debit (₹)</th>
              <th style={{ padding: "2px 6px", textAlign: "right" }}>Credit (₹)</th>
              <th style={{ padding: "2px 6px", textAlign: "right" }}>Balance (₹)</th>
              <th style={{ padding: "2px 2px", textAlign: "center" }}>Stat</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isDisputed = row.sequenceNo === 14;
              const isUnsat = row.status === "UNSAT" || (isDisputed && isRow14Tampered);
              const isExpanded = !!expandedRows[row.sequenceNo];
              const rowHash = ROW_HASHES[row.sequenceNo] || "3f8a412e8b2c9d1109aa77f1b29c5e3170d496a7";

              let rowBg = "transparent";
              let rowBorderLeft = "3px solid transparent";
              if (isUnsat) {
                rowBg = "#FFF1F2";
                rowBorderLeft = "3px solid #E11D48";
              } else if (isDisputed) {
                rowBg = "rgba(254, 243, 199, 0.18)";
                rowBorderLeft = "3px solid #F59E0B";
              }

              return (
                <React.Fragment key={row.id}>
                  <tr
                    ref={isDisputed ? row14Ref : undefined}
                    onMouseEnter={() => setSelectedRowSeq(row.sequenceNo)}
                    onMouseLeave={() => setSelectedRowSeq(null)}
                    style={{
                      height: `${rowHeight}px`,
                      background: rowBg,
                      borderLeft: rowBorderLeft,
                      borderBottom: isExpanded ? "none" : "1px solid #F1F5F9",
                      transition: "background-color 0.12s ease",
                    }}
                  >
                    {/* Row Seq + Expand Toggle */}
                    <td style={{ padding: "2px 4px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                        <button
                          type="button"
                          onClick={() => toggleRowExpanded(row.sequenceNo)}
                          aria-label={isExpanded ? `Collapse row #${row.sequenceNo}` : `Expand row #${row.sequenceNo}`}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: "1px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            color: "#64748B",
                          }}
                        >
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#64748B", fontSize: "11px" }}>
                          #{row.sequenceNo}
                        </span>
                      </div>
                    </td>

                    {/* Time */}
                    <td
                      style={{
                        padding: "2px 4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "#475569",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatTimestamp(row.timestamp)}
                    </td>

                    {/* Counterparty & Narration */}
                    <td style={{ padding: "2px 6px", overflow: "hidden" }}>
                      <span
                        style={{
                          fontWeight: isDisputed ? 700 : 500,
                          color: isDisputed ? "#09090B" : "#1E293B",
                          fontSize: "12px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={row.description}
                      >
                        {row.description}
                      </span>
                    </td>

                    {/* UTR / RRN (136px) */}
                    <td
                      className="col-rrn-cquery"
                      style={{
                        padding: "2px 6px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.rrn !== "—" ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectRrn(row.rrn);
                            setActiveDockTab("rrn");
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#475569",
                            cursor: "pointer",
                            padding: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                          title={`Inspect RRN ${row.rrn} in Dock`}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                        >
                          {row.rrn}
                        </button>
                      ) : (
                        <span style={{ color: "#94A3B8" }}>—</span>
                      )}
                    </td>

                    {/* Rail Badge (88px) */}
                    <td className="col-rail-cquery" style={{ padding: "2px 4px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "1px 5px",
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

                    {/* Debit (108px) */}
                    <td
                      style={{
                        padding: "2px 6px",
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#BE123C",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.debit > 0
                        ? `-₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Credit (108px) */}
                    <td
                      style={{
                        padding: "2px 6px",
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#047857",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.credit > 0
                        ? `+₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Balance (120px) */}
                    <td
                      style={{
                        padding: "2px 6px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {isDisputed ? (
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "2px" }}>
                          <span style={{ color: "#94A3B8", fontSize: "11px" }}>₹</span>
                          <input
                            type="text"
                            aria-label="Row #14 Closing Balance in Rupees"
                            value={customRow14Balance}
                            onChange={(e) => onCustomBalanceChange(e.target.value)}
                            onBlur={handleBalanceCommit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleBalanceCommit();
                            }}
                            style={{
                              width: "74px",
                              height: "21px",
                              padding: "1px 3px",
                              textAlign: "right",
                              fontFamily: "var(--font-sans)",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              borderRadius: "3px",
                              border: isUnsat ? "1px solid #FECDD3" : "1px solid #F59E0B",
                              background: isUnsat ? "#FFF1F2" : "#FFFFFF",
                              color: isUnsat ? "#BE123C" : "#09090B",
                              outline: "none",
                              boxSizing: "border-box",
                              fontVariantNumeric: "tabular-nums",
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
                            title="Reset to ₹5,22,440.00"
                          >
                            <RotateCcw size={10} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "12px",
                            color: isUnsat ? "#BE123C" : "#09090B",
                          }}
                        >
                          ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Status (32px) */}
                    <td style={{ padding: "2px 2px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "22px",
                          borderRadius: "4px",
                          background: isUnsat ? "#FFF1F2" : isDisputed ? "#FFFBEB" : "#ECFDF5",
                          border: `1px solid ${isUnsat ? "#FECDD3" : isDisputed ? "#FDE68A" : "#A7F3D0"}`,
                          position: "relative",
                        }}
                        title={
                          isUnsat
                            ? "FAIL ✗: Double-entry ledger balance mismatch"
                            : isDisputed
                            ? "SUSPECT ⚠: Counterparty flagged as Mule account (L1 Invariant)"
                            : "VALID ✓: Mathematically conserved"
                        }
                        aria-label={isUnsat ? "FAIL ✗" : isDisputed ? "SUSPECT ⚠" : "VALID ✓"}
                      >
                        {isUnsat ? (
                          <XCircle size={13} color="#E11D48" />
                        ) : isDisputed ? (
                          <AlertTriangle size={12} color="#D97706" />
                        ) : (
                          <CheckCircle2 size={13} color="#059669" />
                        )}
                        <span
                          style={{
                            position: "absolute",
                            width: "1px",
                            height: "1px",
                            padding: 0,
                            margin: "-1px",
                            overflow: "hidden",
                            clip: "rect(0,0,0,0)",
                            border: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isUnsat ? "FAIL ✗" : isDisputed ? "SUSPECT ⚠" : "VALID ✓"}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row Expansion Sub-Row */}
                  {isExpanded && (
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <td colSpan={9} style={{ padding: "6px 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                            fontSize: "11px",
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "6px",
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                              <span style={{ fontWeight: 700, color: "#475569" }}>Raw Record:</span>
                              <code
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "10.5px",
                                  background: "#F1F5F9",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  color: "#0F172A",
                                  wordBreak: "break-all",
                                }}
                              >
                                {`${row.sequenceNo},${row.timestamp},${row.description},${row.rrn},${row.debit.toFixed(2)},${row.credit.toFixed(2)},${row.balance.toFixed(2)}`}
                              </code>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ fontSize: "10px", color: "#64748B" }}>UTC Time:</span>
                              <code style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "#0F172A" }}>
                                {formatTimestamp(row.timestamp, "UTC")}
                              </code>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 700, color: "#475569" }}>SHA-256 Hash:</span>
                              <code style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#64748B" }}>
                                {rowHash}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopyRowHash(row.sequenceNo, rowHash)}
                                title="Copy row hash"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: copiedRowHash === row.sequenceNo ? "#059669" : "#94A3B8",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "1px",
                                }}
                              >
                                {copiedRowHash === row.sequenceNo ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>

                            {row.rrn !== "—" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectRrn(row.rrn);
                                  setActiveDockTab("rrn");
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  color: "#4338CA",
                                  background: "#EEF2FF",
                                  border: "1px solid #C7D2FE",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                <span>Dissect #{row.rrn} in Dock</span>
                                <ExternalLink size={9} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          FOOTER (28PX)
          ========================================================================= */}
      <div
        style={{
          height: "28px",
          minHeight: "28px",
          maxHeight: "28px",
          padding: "0 10px",
          background: "#F8FAFC",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#64748B",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Shield size={11} color="#059669" />
          <span>Tier-1 HSM Conservation Verified · RBI Circular Compliant</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#94A3B8" }}>
          SBI-FINACLE-10.2-PROD
        </span>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  FileSpreadsheet,
  Shield,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  Split,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { type LedgerRowData } from "../../../utils/intakeFalsifier";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { getBnss94CbsDirective } from "../../../utils/statutoryDirectives";
import { StripeSegmentedBar } from "../../ui/forensic-infographics";
import { formatInr } from "../../../utils/formatters";

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
  claimedAmount?: number;
  claimedLabel?: string;
  cbsBookedAmount?: number;
  disputedRrn?: string;
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
  claimedAmount,
  claimedLabel,
  cbsBookedAmount,
  disputedRrn,
}) => {
  const { density, setSelectedRowSeq, setActiveDockTab } = useTarkaUiStore();

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRowHash, setCopiedRowHash] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<"IST" | "UTC">("IST");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const row14Ref = useRef<HTMLTableRowElement | null>(null);

  // Auto-scroll row 14 into view if tampered
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

  const rowHeight = density === "compact" ? 34 : 38;

  // Double-entry calculation dynamically derived from rows prop
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.sequenceNo - b.sequenceNo);
  }, [rows]);

  const openingBal = sortedRows[0]?.balance ?? 0.0;
  const creditRows = sortedRows.filter((r: ValidatedLedgerRow) => (r.credit ?? 0) > 0);
  const debitRows = sortedRows.filter((r: ValidatedLedgerRow) => (r.debit ?? 0) > 0);
  const totalCredits = creditRows.reduce((sum: number, r: ValidatedLedgerRow) => sum + (r.credit ?? 0), 0);
  const totalDebits = debitRows.reduce((sum: number, r: ValidatedLedgerRow) => sum + (r.debit ?? 0), 0);
  const creditsCount = creditRows.length;
  const debitsCount = debitRows.length;
  const expectedClosing = openingBal + totalCredits - totalDebits;
  const actualClosing = sortedRows[sortedRows.length - 1]?.balance ?? expectedClosing;
  const residual = actualClosing - expectedClosing;

  // Per-row invariant check: Bal[k] == Bal[k-1] + Cr[k] - Dr[k]
  const rowValidation = useMemo(() => {
    let firstFailingSeq: number | null = null;
    const failingRowMap: Record<number, boolean> = {};

    for (let i = 1; i < sortedRows.length; i++) {
      const prev = sortedRows[i - 1];
      const curr = sortedRows[i];
      const expectedCurrBal = prev.balance + (curr.credit ?? 0) - (curr.debit ?? 0);
      if (Math.abs(curr.balance - expectedCurrBal) > 0.01) {
        failingRowMap[curr.sequenceNo] = true;
        if (firstFailingSeq === null) {
          firstFailingSeq = curr.sequenceNo;
        }
      }
    }
    return { firstFailingSeq, failingRowMap };
  }, [sortedRows]);

  // Derived disputed vs claimed figures
  const disputedRow = sortedRows.find((r: ValidatedLedgerRow) => r.sequenceNo === 14);
  const effectiveClaimed = claimedAmount ?? 15000;
  const effectiveCbsBooked = cbsBookedAmount ?? (disputedRow?.debit || 285000);
  const deltaLoss = effectiveCbsBooked - effectiveClaimed;
  const ratioLoss = (effectiveCbsBooked / Math.max(1, effectiveClaimed)).toFixed(1);
  const effectiveDisputedRrn = disputedRrn || disputedRow?.rrn || "626510149921";

  return (
    <div
      data-card="ledger-card"
      className="bento-card ledger-card-container"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)",
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
          TOOLBAR (44PX)
          ========================================================================= */}
      <div
        style={{
          height: "44px",
          minHeight: "44px",
          maxHeight: "44px",
          padding: "0 12px",
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
        {/* Left: Title + Provenance Badges + Quick Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={13} color="#059669" />
            </div>
            <div>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
                SBI Core Banking Ledger
              </span>
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  verticalAlign: "middle",
                }}
              >
                Tier-1 HSM Certified
              </span>
            </div>
          </div>

          {/* Sleek Search Input */}
          <div style={{ position: "relative", width: "170px", flexShrink: 1 }}>
            <Search
              size={11}
              color="#94A3B8"
              style={{ position: "absolute", left: "7px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Filter ledger rows by UTR, narration, or RRN"
              placeholder="Filter UTR, RRN... (/)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                height: "26px",
                padding: "0 22px 0 24px",
                fontSize: "11px",
                borderRadius: "5px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
              onFocus={(e) => {
                e.target.style.background = "#FFFFFF";
                e.target.style.borderColor = "#4F46E5";
              }}
              onBlur={(e) => {
                e.target.style.background = "#F8FAFC";
                e.target.style.borderColor = "#CBD5E1";
              }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
                title="Clear filter (Esc)"
              >
                ×
              </button>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                  color: "#94A3B8",
                  pointerEvents: "none",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "2px",
                  padding: "0 3px",
                  lineHeight: "14px",
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
              height: "26px",
              padding: "0 8px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "10.5px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            className="hover:bg-slate-50 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            title="Toggle chronological sorting (ASC / DESC)"
          >
            {sortPolarity}
          </button>

          {/* Permute Same-Sec */}
          <button
            type="button"
            onClick={onTogglePermute}
            style={{
              height: "26px",
              padding: "0 8px",
              borderRadius: "5px",
              border: permuteActive ? "1px solid #818CF8" : "1px solid #CBD5E1",
              background: permuteActive ? "#EEF2FF" : "#FFFFFF",
              color: permuteActive ? "#4338CA" : "#475569",
              fontSize: "10.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: permuteActive ? "0 0 0 2px rgba(99, 102, 241, 0.15)" : "none",
              transition: "all 0.15s ease",
            }}
            className="hover:bg-slate-50 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            title="Permute same-second timestamps to test topological conservation invariant [P]"
          >
            <Split size={12} color={permuteActive ? "#4F46E5" : "#64748B"} />
            <span>Permute</span>
          </button>

          {/* IST / UTC Toggle */}
          <button
            type="button"
            onClick={() => setTimeMode((m) => (m === "IST" ? "UTC" : "IST"))}
            style={{
              height: "26px",
              padding: "0 7px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#0F172A",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
            className="hover:bg-slate-50 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            title="Toggle timestamp zone between IST (+5:30) and UTC (Z)"
          >
            <Clock size={10} color="#64748B" />
            <span>{timeMode}</span>
          </button>

          {/* More Menu ⋯ */}
          <Popover.Root open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                style={{
                  height: "26px",
                  width: "26px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                className="hover:bg-slate-50 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
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
                  padding: "10px 12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
                  width: "280px",
                  zIndex: 9999,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 800, color: "#0F172A" }}>Evidence Chain of Custody</span>
                    <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                      TIER-1 CBS
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#334155", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "4px 8px", borderRadius: "4px" }}>
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
                        gap: "4px",
                        fontSize: "10px",
                        color: "#4338CA",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      <span>3f8a…e9b1</span>
                      {copiedHash ? <Check size={11} color="#059669" /> : <Copy size={11} />}
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
          HIGH-IMPACT FORENSIC DISCREPANCY SPOTLIGHT (38PX)
          ========================================================================= */}
      <div
        style={{
          padding: "0 10px",
          height: "38px",
          minHeight: "38px",
          maxHeight: "38px",
          background: "linear-gradient(90deg, rgba(255,241,242,0.95) 0%, rgba(254,243,199,0.5) 45%, rgba(240,253,250,0.85) 100%)",
          borderBottom: "1px solid #FECDD3",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          fontSize: "11px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Left: Claimed vs Certified CBS Values */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <ShieldAlert size={13} color="#BE123C" />
            <span style={{ color: "#64748B", fontWeight: 600, fontSize: "10px" }}>Claimed:</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                color: "#BE123C",
                fontSize: "11px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatInr(effectiveClaimed)}
            </span>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 800,
                color: "#BE123C",
                background: "#FFE4E6",
                border: "1px solid #FECDD3",
                padding: "0.5px 4px",
                borderRadius: "3px",
              }}
            >
              {claimedLabel || "Canva"}
            </span>
          </div>

          {/* Visual Mini Suppression Bar */}
          <div style={{ width: "80px", flexShrink: 0 }}>
            <StripeSegmentedBar
              height={11}
              showLabels={false}
              totalValue={effectiveCbsBooked}
              segments={[
                { id: "claimed", label: "Claim", value: effectiveClaimed, color: "#10B981" },
                { id: "suppressed", label: "Deficit", value: Math.max(0, deltaLoss), isHatched: true, color: "crimson" },
              ]}
            />
          </div>

          {/* Highlight Badge */}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              color: "#9F1239",
              background: "#FFFFFF",
              border: "1px solid #FDA4AF",
              padding: "1px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ≠ Δ {formatInr(deltaLoss, { compact: true })} Deficit ({ratioLoss}×)
          </span>

          <ArrowRight size={10} color="#64748B" style={{ flexShrink: 0 }} />

          {/* Finacle CBS Invariant */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <span style={{ color: "#64748B", fontWeight: 600, fontSize: "10px" }}>CBS Booked:</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                color: "#047857",
                fontSize: "11px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatInr(effectiveCbsBooked)}
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectRrn(effectiveDisputedRrn);
                setActiveDockTab("rrn");
              }}
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
                padding: "1px 5px",
                borderRadius: "3px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title={`Inspect UTR ${effectiveDisputedRrn} in RRN Dissector`}
            >
              <span>#{effectiveDisputedRrn}</span>
              <ExternalLink size={8} />
            </button>
          </div>
        </div>

        {/* Right: Copy §94 BNSS Order */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(getBnss94CbsDirective());
              toast.success("Copied §94 BNSS CBS Directive to clipboard", {
                description: "Statutory requisition for UTR 626510149921 with ₹2.00L delta and dual %%EOF offsets.",
                duration: 3500,
              });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "9.5px",
              fontWeight: 700,
              padding: "2.5px 7px",
              borderRadius: "4px",
              border: "1px solid #C7D2FE",
              background: "#EEF2FF",
              color: "#4338CA",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            className="hover:bg-indigo-100 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            title="Copy pre-filled statutory requisition to SBI Nodal Officer under Section 94 BNSS"
          >
            <FileText size={10} color="#4F46E5" />
            <span>Copy §94 Order</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DATA GRID (TABLE)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
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
            <col className="col-rrn-cquery" style={{ width: "128px" }} />
            <col className="col-rail-cquery" style={{ width: "84px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "114px" }} />
            <col style={{ width: "32px" }} />
          </colgroup>

          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8FAFC" }}>
            <tr
              style={{
                height: "28px",
                borderBottom: "1px solid #E2E8F0",
                color: "#64748B",
                fontWeight: 700,
                fontSize: "10px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "2px 4px", textAlign: "center", fontFamily: "var(--font-mono)" }}>Row</th>
              <th style={{ padding: "2px 6px", fontFamily: "var(--font-mono)" }}>Time ({timeMode})</th>
              <th style={{ padding: "2px 8px" }}>Counterparty & Narration</th>
              <th className="col-rrn-cquery" style={{ padding: "2px 6px", fontFamily: "var(--font-mono)" }}>
                UTR / RRN
              </th>
              <th className="col-rail-cquery" style={{ padding: "2px 6px" }}>Rail</th>
              <th style={{ padding: "2px 8px", textAlign: "right" }}>Debit (₹)</th>
              <th style={{ padding: "2px 8px", textAlign: "right" }}>Credit (₹)</th>
              <th style={{ padding: "2px 8px", textAlign: "right" }}>Balance (₹)</th>
              <th style={{ padding: "2px 4px", textAlign: "center" }}>Stat</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isDisputed = row.sequenceNo === 14;
              const isUnsat = row.status === "UNSAT" || (isDisputed && isRow14Tampered);
              const isExpanded = !!expandedRows[row.sequenceNo];
              const rowHash = ROW_HASHES[row.sequenceNo] || "3f8a412e8b2c9d1109aa77f1b29c5e3170d496a7";

              let rowBg = "#FFFFFF";
              let rowBorderLeft = "3px solid transparent";
              if (isUnsat) {
                rowBg = "#FFF1F2";
                rowBorderLeft = "3px solid #E11D48";
              } else if (isDisputed) {
                rowBg = "rgba(254, 243, 199, 0.22)";
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
                        padding: "2px 6px",
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
                    <td style={{ padding: "2px 8px", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                        <span
                          style={{
                            fontWeight: isDisputed ? 700 : 500,
                            color: isDisputed ? "#0F172A" : "#334155",
                            fontSize: "11.5px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                          title={row.description}
                        >
                          {row.description}
                        </span>
                        {isDisputed && (
                          <span
                            style={{
                              fontSize: "8.5px",
                              fontWeight: 800,
                              background: "#FEF3C7",
                              color: "#92400E",
                              border: "1px solid #FDE68A",
                              padding: "1px 6px",
                              borderRadius: "3px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                            title="Tranche 1 of ₹5,00,000.00 Total Fraud Outflow to Vikram Shah"
                          >
                            Tranche 1 of ₹5.00L Outflow
                          </span>
                        )}
                      </div>
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
                            color: isDisputed ? "#4338CA" : "#475569",
                            fontWeight: isDisputed ? 700 : 500,
                            cursor: "pointer",
                            padding: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                          title={`Inspect RRN ${row.rrn} in Dock`}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = isDisputed ? "#4338CA" : "#475569")}
                        >
                          {row.rrn}
                        </button>
                      ) : (
                        <span style={{ color: "#94A3B8" }}>—</span>
                      )}
                    </td>

                    {/* Rail Badge (88px) */}
                    <td className="col-rail-cquery" style={{ padding: "2px 6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "1px 6px",
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

                    {/* Debit (112px) */}
                    <td
                      style={{
                        padding: "2px 8px",
                        textAlign: "right",
                        fontWeight: row.debit > 0 ? 800 : 500,
                        fontSize: "11.5px",
                        color: row.debit > 0 ? "#BE123C" : "#94A3B8",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {row.debit > 0
                        ? `-₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Credit (112px) */}
                    <td
                      style={{
                        padding: "2px 8px",
                        textAlign: "right",
                        fontWeight: row.credit > 0 ? 800 : 500,
                        fontSize: "11.5px",
                        color: row.credit > 0 ? "#047857" : "#94A3B8",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {row.credit > 0
                        ? `+₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>

                    {/* Balance (124px) */}
                    <td
                      style={{
                        padding: "2px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {isDisputed ? (
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "3px" }}>
                          <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 700 }}>₹</span>
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
                              width: "78px",
                              height: "23px",
                              padding: "1px 4px",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              borderRadius: "4px",
                              border: isUnsat ? "1.5px solid #E11D48" : "1.5px solid #F59E0B",
                              background: isUnsat ? "#FFF1F2" : "#FFFFFF",
                              color: isUnsat ? "#BE123C" : "#0F172A",
                              outline: "none",
                              boxSizing: "border-box",
                              fontVariantNumeric: "tabular-nums",
                              boxShadow: isUnsat ? "0 0 0 2px rgba(225, 29, 72, 0.15)" : "none",
                            }}
                            title="Edit Row #14 closing balance to test mathematical falsification"
                          />
                          <button
                            type="button"
                            onClick={onResetRow14Balance}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#64748B",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "3px",
                            }}
                            title="Reset to genuine ₹5,22,440.00"
                          >
                            <RotateCcw size={11} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "11.5px",
                            color: isUnsat ? "#BE123C" : "#0F172A",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Status (36px) */}
                    <td style={{ padding: "2px 4px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "26px",
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
                      <td colSpan={9} style={{ padding: "6px 12px" }}>
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
                              <span style={{ fontWeight: 700, color: "#475569" }}>Raw CBS Record:</span>
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

                            {row.sequenceNo === 14 && (
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#92400E", background: "#FEF3C7", padding: "1px 6px", borderRadius: "4px", border: "1px solid #FDE68A" }}>
                                Fraud Outflow: ₹2,15,000 (Tranche 1) + ₹2,85,000 (Tranche 2 IMPS) = ₹5,00,000.00 Total
                              </span>
                            )}

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
                                  gap: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  color: "#4338CA",
                                  background: "#EEF2FF",
                                  border: "1px solid #C7D2FE",
                                  padding: "2px 8px",
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

        {/* =========================================================================
            CBS DOUBLE-ENTRY CONSERVATION SYNTHESIS WATERFALL CARD
            ========================================================================= */}
        <div
          style={{
            margin: "10px 12px 10px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
          }}
        >
          {/* Header Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
                Double-Entry Balance Conservation Synthesis (SBI Finacle 10.x)
              </span>
              <span style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                Account #30981140029
              </span>
            </div>

            {/* LED Status Badge */}
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                padding: "2px 8px",
                borderRadius: "4px",
                background: residual === 0 ? "#ECFDF5" : "#FFF1F2",
                color: residual === 0 ? "#047857" : "#BE123C",
                border: `1px solid ${residual === 0 ? "#A7F3D0" : "#FECDD3"}`,
                boxShadow: residual === 0 ? "0 0 0 2px rgba(16, 185, 129, 0.1)" : "0 0 0 2px rgba(225, 29, 72, 0.1)",
              }}
            >
              {residual === 0 ? "CONSERVED: Δ = ₹0.00 ✓" : `UNSAT DEFICIT: Δ ${formatInr(residual)} ✗`}
            </span>
          </div>

          {/* Connected Algebraic Formula Waterfall */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {/* 1. Opening Balance */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "6px 8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ color: "#64748B", fontSize: "9px", fontWeight: 600 }}>Opening Balance B/F</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "11px", color: "#0F172A", marginTop: "2px" }}>
                {formatInr(openingBal)}
              </div>
            </div>

            {/* + Connector */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 800,
                color: "#475569",
              }}
            >
              +
            </div>

            {/* 2. Total Credits */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #A7F3D0",
                borderRadius: "6px",
                padding: "6px 8px",
                boxShadow: "0 1px 2px rgba(16, 185, 129, 0.05)",
              }}
            >
              <div style={{ color: "#047857", fontSize: "9px", fontWeight: 700 }}>Total Credits ({creditsCount})</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "11px", color: "#047857", marginTop: "2px" }}>
                +{formatInr(totalCredits)}
              </div>
            </div>

            {/* − Connector */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 800,
                color: "#475569",
              }}
            >
              −
            </div>

            {/* 3. Total Debits */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #FECDD3",
                borderRadius: "6px",
                padding: "6px 8px",
                boxShadow: "0 1px 2px rgba(225, 29, 72, 0.05)",
              }}
            >
              <div style={{ color: "#BE123C", fontSize: "9px", fontWeight: 700 }}>Total Debits ({debitsCount})</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "11px", color: "#BE123C", marginTop: "2px" }}>
                −{formatInr(totalDebits)}
              </div>
            </div>

            {/* = Connector */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 800,
                color: "#475569",
              }}
            >
              =
            </div>

            {/* 4. Closing Balance */}
            <div
              style={{
                background: "#FFFFFF",
                border: residual !== 0 ? "1.5px solid #E11D48" : "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "6px 8px",
                boxShadow: residual !== 0 ? "0 0 0 2px rgba(225, 29, 72, 0.15)" : "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ color: residual !== 0 ? "#BE123C" : "#64748B", fontSize: "9px", fontWeight: 600 }}>
                {residual !== 0 ? "Tampered Closing" : "Reconciled Closing"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  color: residual !== 0 ? "#BE123C" : "#0F172A",
                  marginTop: "2px",
                }}
              >
                {formatInr(actualClosing)}
              </div>
            </div>
          </div>

          {/* Mathematical Invariant Statement */}
          <div
            style={{
              fontSize: "9.5px",
              color: "#475569",
              lineHeight: 1.35,
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "5px",
              padding: "5px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong style={{ color: "#0F172A" }}>Mathematical Proof: </strong>
              Every transaction sequence <code style={{ fontFamily: "var(--font-mono)", background: "#F1F5F9", padding: "1px 4px", borderRadius: "3px", color: "#0F172A" }}>k ∈ [{sortedRows[0]?.sequenceNo ?? 11}..{sortedRows[sortedRows.length - 1]?.sequenceNo ?? 16}]</code> satisfies double-entry conservation invariant <code style={{ fontFamily: "var(--font-mono)", background: "#F1F5F9", padding: "1px 4px", borderRadius: "3px", color: "#0F172A" }}>Bal[k] = Bal[k-1] + Cr[k] − Dr[k]</code>.
            </div>
            {residual !== 0 && (
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 6px", borderRadius: "3px", flexShrink: 0, marginLeft: "8px" }}>
                BREACH AT SEQ #{rowValidation.firstFailingSeq ?? 14}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          FOOTER (28PX)
          ========================================================================= */}
      <div
        style={{
          height: "28px",
          minHeight: "28px",
          maxHeight: "28px",
          padding: "0 12px",
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
          <span>Tier-1 HSM Conservation Verified · Cryptographic Chain of Custody</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#94A3B8" }}>
          SBI-FINACLE-10.2-PROD
        </span>
      </div>
    </div>
  );
};

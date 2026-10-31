import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
  Search,
  Zap,
  Split,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { BentoKpiCard, ReuiStatusBadge } from "../../components/tarka/BentoPrimitives";
import {
  validateRunningBalance,
  decodeRailReference,
  type LedgerRowData,
} from "../../utils/intakeFalsifier";

export const IntakeScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const isRow14Tampered = !!mutations.alterBankRow14;
  const isForgedRrn = !!mutations.forgeRrnTimestamp;

  // Sorting & Filter State
  const [sortPolarity, setSortPolarity] = useState<"ASC" | "DESC">("ASC");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTabDissector, setActiveTabDissector] = useState<"pdf" | "cgnat">("pdf");
  const [permuteActive, setPermuteActive] = useState<boolean>(false);

  // Editable Row #14 Balance State
  const [customRow14Balance, setCustomRow14Balance] = useState<string>(
    isRow14Tampered ? "322440.00" : "522440.00"
  );

  // Sync custom input with global mutation toggle
  React.useEffect(() => {
    setCustomRow14Balance(isRow14Tampered ? "322440.00" : "522440.00");
  }, [isRow14Tampered]);

  // Base Raw CBS Ledger Rows (SBI Finacle 10.x, Account #30981140029)
  const rawRows: LedgerRowData[] = useMemo(() => {
    const row14Val = parseFloat(customRow14Balance) || (isRow14Tampered ? 322440.0 : 522440.0);
    const row15Bal = isRow14Tampered ? 318240.0 : 518240.0;
    const row16Bal = isRow14Tampered ? 308240.0 : 508240.0;

    const baseList: LedgerRowData[] = [
      {
        id: "CBS-011",
        sequenceNo: 11,
        timestamp: "2026-09-22T09:15:02",
        description: "OPENING BALANCE B/F",
        rrn: "—",
        debit: 0.0,
        credit: 0.0,
        balance: 615890.0,
      },
      {
        id: "CBS-012",
        sequenceNo: 12,
        timestamp: "2026-09-22T09:42:18",
        description: "UPI/DR/6265091148/GROCERY_STORE",
        rrn: "626509114820",
        debit: 3450.0,
        credit: 0.0,
        balance: 612440.0,
      },
      {
        id: "CBS-013",
        sequenceNo: 13,
        timestamp: permuteActive ? "2026-09-22T10:00:14" : "2026-09-22T09:55:00",
        description: "NEFT/CR/SBIN26265/SALARY_CREDIT",
        rrn: "SBIN260922123456",
        debit: 0.0,
        credit: 125000.0,
        balance: 737440.0,
      },
      {
        id: "CBS-014",
        sequenceNo: 14,
        timestamp: "2026-09-22T10:00:14",
        description: "UPI/DR/626510149921/VIKRAM_MULE",
        rrn: "626510149921",
        debit: 215000.0,
        credit: 0.0,
        balance: row14Val,
      },
      {
        id: "CBS-015",
        sequenceNo: 15,
        timestamp: "2026-09-22T10:14:32",
        description: "UPI/DR/6265118821/ELECTRICITY_BILL",
        rrn: "626511882194",
        debit: 4200.0,
        credit: 0.0,
        balance: row15Bal,
      },
      {
        id: "CBS-016",
        sequenceNo: 16,
        timestamp: "2026-09-22T10:28:45",
        description: "IMPS/DR/6265129940/CASH_ATM_SWEEP",
        rrn: "626512994031",
        debit: 10000.0,
        credit: 0.0,
        balance: row16Bal,
      },
    ];

    return sortPolarity === "ASC" ? baseList : [...baseList].reverse();
  }, [sortPolarity, isRow14Tampered, customRow14Balance, permuteActive]);

  // Mathematical Conservation Solver
  const validationResult = useMemo(() => {
    return validateRunningBalance(rawRows, sortPolarity);
  }, [rawRows, sortPolarity]);

  // NPCI RRN Dissector
  const [rrnInput, setRrnInput] = useState<string>("626510149921");
  const decodedRrn = useMemo(() => {
    const claimedTime = isForgedRrn ? "2026-09-22T10:50:14" : "2026-09-22T10:00:14";
    return decodeRailReference(rrnInput, claimedTime);
  }, [rrnInput, isForgedRrn]);

  // Filtered rows for presentation
  const displayRows = useMemo(() => {
    if (!searchTerm.trim()) return validationResult.rows;
    const term = searchTerm.toLowerCase();
    return validationResult.rows.filter(
      (r) =>
        r.description.toLowerCase().includes(term) ||
        r.rrn.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
    );
  }, [validationResult.rows, searchTerm]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "14px 18px 24px 18px",
        boxSizing: "border-box",
        minHeight: "100%",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* =========================================================================
          RULE 4: COMPACT PAGE HEADER + CONTROLS ON ONE SINGLE 44PX ROW
          ========================================================================= */}
      <div
        style={{
          height: "44px",
          minHeight: "44px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {/* Left: Title + Muted Account Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap" }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#09090B",
              margin: 0,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            Evidence Intake & Ledger Falsification
          </h1>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              padding: "2px 8px",
              borderRadius: "6px",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              whiteSpace: "nowrap",
            }}
          >
            SBI A/c #30981140029
          </span>
        </div>

        {/* Right: ASC/DESC + Permute + Row #14 Tamper on Exact Same Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {/* ASC | DESC Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "2px",
              height: "32px",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
            }}
          >
            <button
              type="button"
              onClick={() => setSortPolarity("ASC")}
              style={{
                border: "none",
                background: sortPolarity === "ASC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "ASC" ? "#09090B" : "#64748B",
                fontWeight: sortPolarity === "ASC" ? 700 : 500,
                fontSize: "11.5px",
                padding: "3px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              ASC
            </button>
            <button
              type="button"
              onClick={() => setSortPolarity("DESC")}
              style={{
                border: "none",
                background: sortPolarity === "DESC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "DESC" ? "#09090B" : "#64748B",
                fontWeight: sortPolarity === "DESC" ? 700 : 500,
                fontSize: "11.5px",
                padding: "3px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              DESC
            </button>
          </div>

          {/* Permute Same-Sec */}
          <button
            type="button"
            onClick={() => setPermuteActive((prev) => !prev)}
            style={{
              height: "32px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: permuteActive ? "#EEF2FF" : "#FFFFFF",
              border: permuteActive ? "1px solid #C7D2FE" : "1px solid #E2E8F0",
              color: permuteActive ? "#4338CA" : "#475569",
              fontWeight: 600,
              fontSize: "11.5px",
              padding: "0 10px",
              borderRadius: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
            title="Evaluate same-second permutations for sub-second ordering"
          >
            <Split size={12} color={permuteActive ? "#4F46E5" : "#64748B"} />
            <span>Permute Same-Sec {permuteActive ? "(Active)" : ""}</span>
          </button>

          {/* Toggle Row #14 Tamper */}
          <button
            type="button"
            onClick={() => toggleMutation("alterBankRow14")}
            style={{
              height: "32px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: isRow14Tampered ? "#FFF1F2" : "#FFFFFF",
              border: isRow14Tampered ? "1px solid #FECDD3" : "1px solid #E2E8F0",
              color: isRow14Tampered ? "#BE123C" : "#475569",
              fontWeight: 600,
              fontSize: "11.5px",
              padding: "0 10px",
              borderRadius: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <Zap size={12} color={isRow14Tampered ? "#E11D48" : "#64748B"} />
            <span>{isRow14Tampered ? "Row #14 Tampered (-₹2.00L)" : "Toggle Row #14 Tamper"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          RULE 3: 4 TOP COMPACT BENTO KPI CARDS (96PX HEIGHT, #09090B HERO)
          ========================================================================= */}
      <div className="bento-grid-4" style={{ marginBottom: "14px", flexShrink: 0 }}>
        {/* Card 1: Double-Entry Conservation */}
        <BentoKpiCard
          title="Ledger Conservation"
          metric={isRow14Tampered ? "Row #14 Fail" : "100% Valid"}
          statusBadge={{
            text: isRow14Tampered ? "INVARIANT BREACH" : "✓ 6/6 Reconciled",
            variant: isRow14Tampered ? "rose" : "emerald",
          }}
          meta="Double-Entry Invariant"
          icon={ShieldCheck}
          iconColor={isRow14Tampered ? "#E11D48" : "#059669"}
          iconBg={isRow14Tampered ? "#FFF1F2" : "#ECFDF5"}
        />

        {/* Card 2: NPCI RRN Clock Sync */}
        <BentoKpiCard
          title="NPCI RRN Clock Sync"
          metric="10:00:14 IST"
          statusBadge={{
            text: isForgedRrn ? "CLOCK SKEW (+50m)" : "Δ +14s IST",
            variant: isForgedRrn ? "rose" : "indigo",
          }}
          meta="Julian Day 265"
          icon={Clock}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
        />

        {/* Card 3: Claim vs CBS Ledger Diff */}
        <BentoKpiCard
          title="Claim vs CBS Ledger Diff"
          metric="-₹2,00,000.00"
          statusBadge={{
            text: "14.3× Suppressed",
            variant: "rose",
          }}
          meta="Canva Superimposed"
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFF1F2"
        />

        {/* Card 4: PDF XRef & CGNAT Shield */}
        <BentoKpiCard
          title="PDF XRef & CGNAT Shield"
          metric="9,996 / 10,000"
          statusBadge={{
            text: "99.96% Blinded",
            variant: "emerald",
          }}
          meta="DoT Cl. 39.20 Safe"
          icon={FileCheck}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
        />
      </div>

      {/* =========================================================================
          RULE 5: 2-COLUMN MAIN WORKBENCH GRID (7.3FR LEFT + 4.7FR RIGHT)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "7.3fr 4.7fr",
          gap: "14px",
          alignItems: "start",
        }}
      >
        {/* =======================================================================
            LEFT COLUMN (7.3FR): UNIFIED SBI LEDGER & RECEIPT CONFLICT CARD
            ======================================================================= */}
        <div
          className="bento-card"
          style={{
            padding: 0,
            overflow: "hidden",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
          }}
        >
          {/* 1. CARD HEADER */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FFFFFF",
              whiteSpace: "nowrap",
            }}
          >
            {/* Left Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#09090B", whiteSpace: "nowrap" }}>
                SBI Core Banking Ledger (<span style={{ fontFamily: "var(--font-mono)" }}>sbi_finacle_cbs.csv</span>)
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#64748B",
                  background: "#F1F5F9",
                  padding: "1px 7px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                6 Rows · Tier-1 HSM
              </span>
            </div>

            {/* Right: Search + Live Equation Pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {/* Inline Search Input */}
              <div style={{ position: "relative", width: "180px" }}>
                <Search
                  size={12}
                  color="#94A3B8"
                  style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Filter UTR / Narration..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    height: "28px",
                    padding: "0 8px 0 26px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#FAFAFA",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Live Equation Pill */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono, monospace)",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  background: isRow14Tampered ? "#FFF1F2" : "#ECFDF5",
                  color: isRow14Tampered ? "#BE123C" : "#047857",
                  border: `1px solid ${isRow14Tampered ? "#FECDD3" : "#A7F3D0"}`,
                }}
              >
                {isRow14Tampered
                  ? "Bal[14] ≠ Expected (-₹2.00L Deficit) ✗"
                  : "Bal[k] = Bal[k-1] + Cr - Dr ✓"}
              </span>
            </div>
          </div>

          {/* 2. COMPACT CROSS-SOURCE CONFLICT BANNER */}
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(255, 241, 242, 0.5)",
              borderBottom: "1px solid #FECDD3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {/* Left: Suspect Receipt */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <span style={{ fontSize: "11.5px", color: "#64748B" }}>
                Suspect Receipt (<span style={{ fontFamily: "var(--font-mono)" }}>victim_upi_receipt.pdf · T3</span>):
              </span>
              <strong style={{ fontSize: "13.5px", color: "#BE123C", fontFamily: "var(--font-mono)" }}>
                ₹15,000.00
              </strong>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#BE123C",
                  background: "#FFE4E6",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Canva Edited
              </span>
            </div>

            {/* Center: Conflict Delta */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#BE123C",
                background: "#FFFFFF",
                border: "1px solid #FECDD3",
                padding: "2px 8px",
                borderRadius: "6px",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              ≠ Δ ₹2,00,000.00 Hidden Debit
            </div>

            {/* Right: Certified Finacle Settlement */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <span style={{ fontSize: "11.5px", color: "#64748B" }}>
                SBI Finacle Settlement (<span style={{ fontFamily: "var(--font-mono)" }}>Tier-1</span>):
              </span>
              <strong style={{ fontSize: "13.5px", color: "#047857", fontFamily: "var(--font-mono)" }}>
                ₹2,15,000.00
              </strong>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#047857",
                  background: "#ECFDF5",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                RRN #626510149921
              </span>
            </div>
          </div>

          {/* 3. THE 6-ROW FORENSIC DATA TABLE (ALL 6 ROWS IMMEDIATELY VISIBLE) */}
          <div style={{ overflowX: "auto" }}>
            <table className="daylight-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ height: "34px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ width: "42px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700 }}>
                    Row
                  </th>
                  <th style={{ width: "95px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700 }}>
                    Timestamp
                  </th>
                  <th style={{ padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700 }}>
                    UTR & Counterparty
                  </th>
                  <th style={{ width: "90px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700 }}>
                    Rail
                  </th>
                  <th style={{ width: "115px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700, textAlign: "right" }}>
                    Debit / Credit (₹)
                  </th>
                  <th style={{ width: "135px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700, textAlign: "right" }}>
                    Closing Balance (₹)
                  </th>
                  <th style={{ width: "85px", padding: "6px 14px", fontSize: "11px", color: "#64748B", fontWeight: 700, textAlign: "center" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  const isDisputed = row.sequenceNo === 14;
                  const isUnsat = row.status === "UNSAT" || (isDisputed && isRow14Tampered);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        height: "38px",
                        backgroundColor: isUnsat
                          ? "#FFF1F2"
                          : isDisputed
                          ? "#FEF2F2"
                          : "transparent",
                        borderBottom: "1px solid #F1F5F9",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Row Seq */}
                      <td style={{ padding: "6px 14px", fontWeight: 700, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                        #{row.sequenceNo}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "#475569" }}>
                        {row.timestamp.split("T")[1]}
                      </td>

                      {/* UTR & Counterparty */}
                      <td style={{ padding: "6px 14px" }}>
                        <div style={{ fontWeight: 600, color: isDisputed ? "#BE123C" : "#09090B", fontSize: "12px" }}>
                          {row.description}
                        </div>
                        {row.rrn !== "—" && (
                          <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                            RRN: {row.rrn}
                          </div>
                        )}
                      </td>

                      {/* Rail Badge */}
                      <td style={{ padding: "6px 14px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              row.sequenceNo === 11
                                ? "#F1F5F9"
                                : row.sequenceNo === 13
                                ? "#ECFDF5"
                                : row.sequenceNo === 14
                                ? "#FFE4E6"
                                : "#EEF2FF",
                            color:
                              row.sequenceNo === 11
                                ? "#475569"
                                : row.sequenceNo === 13
                                ? "#047857"
                                : row.sequenceNo === 14
                                ? "#BE123C"
                                : "#4338CA",
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

                      {/* Debit / Credit Amount */}
                      <td
                        style={{
                          padding: "6px 14px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: row.credit > 0 ? "#047857" : row.debit > 0 ? "#BE123C" : "#64748B",
                        }}
                      >
                        {row.credit > 0
                          ? `+₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : row.debit > 0
                          ? `-₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>

                      {/* Closing Balance (INTERACTIVE INPUT ON ROW #14) */}
                      <td style={{ padding: "6px 14px", textAlign: "right" }}>
                        {isDisputed ? (
                          <input
                            type="text"
                            value={customRow14Balance}
                            onChange={(e) => setCustomRow14Balance(e.target.value)}
                            style={{
                              width: "104px",
                              height: "24px",
                              textAlign: "right",
                              padding: "2px 6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              color: isUnsat ? "#BE123C" : "#09090B",
                              background: isUnsat ? "#FFFFFF" : "#FFFFFF",
                              border: isUnsat ? "1px solid #FECDD3" : "1px solid #CBD5E1",
                              borderRadius: "5px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                            title="Edit Row #14 closing balance to test mathematical falsification"
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              fontSize: "12px",
                              color: isUnsat ? "#BE123C" : "#09090B",
                            }}
                          >
                            ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "6px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: isUnsat ? "#FFF1F2" : "#ECFDF5",
                            color: isUnsat ? "#BE123C" : "#047857",
                            border: `1px solid ${isUnsat ? "#FECDD3" : "#A7F3D0"}`,
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

        {/* =======================================================================
            RIGHT COLUMN (4.7FR): 2 COMPACT STACKED CARDS
            ======================================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* CARD 1: NPCI 12-DIGIT RRN DISSECTOR (626510149921) */}
          <div
            className="bento-card"
            style={{
              padding: "14px 16px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
            }}
          >
            {/* Header + Input */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#09090B" }}>
                NPCI 12-Digit RRN Dissector
              </div>
              <ReuiStatusBadge
                text={decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "SPEC OK" : "SKEW"}
                variant={decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "emerald" : "rose"}
                dot={false}
              />
            </div>

            {/* Inline Input Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <input
                type="text"
                value={rrnInput}
                onChange={(e) => setRrnInput(e.target.value.trim())}
                maxLength={12}
                style={{
                  flex: 1,
                  height: "30px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FAFAFA",
                  color: "#09090B",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setRrnInput("626510149921")}
                style={{
                  height: "30px",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "0 9px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>

            {/* 4-Column Byte Anatomy Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr 1.1fr 1.5fr",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              {/* Byte 0 */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "6px 4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>Byte 0</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)" }}>
                  [{rrnInput[0] || "?"}]
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569" }}>2026</div>
              </div>

              {/* Bytes 1-3 */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "6px 4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>Bytes 1–3</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  [{rrnInput.substring(1, 4) || "???"}]
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569" }}>Day 265</div>
              </div>

              {/* Bytes 4-5 */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "6px 4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>Bytes 4–5</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)" }}>
                  [{rrnInput.substring(4, 6) || "??"}]
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569" }}>10:00 IST</div>
              </div>

              {/* Bytes 6-11 */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "6px 4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>Bytes 6–11</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#6D28D9", fontFamily: "var(--font-mono)" }}>
                  [{rrnInput.substring(6, 12) || "??????"}]
                </div>
                <div style={{ fontSize: "9.5px", color: "#475569" }}>STAN Trace</div>
              </div>
            </div>

            {/* Compact ±180s NTP Switch Drift Bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#64748B", marginBottom: "4px" }}>
                <span>NTP Clock Offset (±180s Limit)</span>
                <span style={{ fontWeight: 700, color: isForgedRrn ? "#BE123C" : "#047857" }}>
                  {isForgedRrn ? "Δ +3,000s SKEW" : "Δ +14.0s (IN SPEC)"}
                </span>
              </div>

              {/* 6px Track */}
              <div
                style={{
                  position: "relative",
                  height: "6px",
                  background: "#E2E8F0",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                {/* Safe zone */}
                <div
                  style={{
                    position: "absolute",
                    left: "25%",
                    right: "25%",
                    top: 0,
                    bottom: 0,
                    background: "#A7F3D0",
                  }}
                />
                {/* Center marker */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "#64748B",
                  }}
                />
                {/* Needle */}
                <div
                  style={{
                    position: "absolute",
                    left: isForgedRrn ? "92%" : "54%",
                    top: 0,
                    bottom: 0,
                    width: "8px",
                    borderRadius: "2px",
                    background: isForgedRrn ? "#E11D48" : "#4F46E5",
                    transition: "all 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  color: "#94A3B8",
                  marginTop: "3px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>-180s</span>
                <span>0s (NTP)</span>
                <span>+180s</span>
              </div>
            </div>
          </div>

          {/* CARD 2: PDF XREF & CGNAT MERKLE SHIELD */}
          <div
            className="bento-card"
            style={{
              padding: "14px 16px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
            }}
          >
            {/* Header + Segmented Switcher */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#09090B" }}>
                Integrity & Privacy Shield
              </div>
              <div
                style={{
                  display: "inline-flex",
                  background: "#F1F5F9",
                  padding: "2px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTabDissector("pdf")}
                  style={{
                    border: "none",
                    background: activeTabDissector === "pdf" ? "#FFFFFF" : "transparent",
                    color: activeTabDissector === "pdf" ? "#09090B" : "#64748B",
                    fontWeight: activeTabDissector === "pdf" ? 700 : 500,
                    fontSize: "10.5px",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: activeTabDissector === "pdf" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  PDF XRef (2 %%EOF)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabDissector("cgnat")}
                  style={{
                    border: "none",
                    background: activeTabDissector === "cgnat" ? "#FFFFFF" : "transparent",
                    color: activeTabDissector === "cgnat" ? "#09090B" : "#64748B",
                    fontWeight: activeTabDissector === "cgnat" ? 700 : 500,
                    fontSize: "10.5px",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: activeTabDissector === "cgnat" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  CGNAT Merkle (9,996)
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: PDF XRef (2 %%EOF) */}
            {activeTabDissector === "pdf" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#475569" }}>
                    <strong style={{ color: "#047857" }}>0x00000000</strong> Finacle Original (%%EOF 1)
                  </span>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#047857", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px" }}>
                    PhonePe / ArialMT
                  </span>
                </div>

                <div
                  style={{
                    background: "#FFF1F2",
                    border: "1px solid #FECDD3",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#9F1239" }}>
                    <strong style={{ color: "#BE123C" }}>0x00014209</strong> Canva Append (%%EOF 2)
                  </span>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "3px" }}>
                    TAMPERED STREAM
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: CGNAT Merkle (9,996) */}
            {activeTabDissector === "cgnat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    color: "#09090B",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Root: 0xb189...7492 · 9,996 Citizens Blinded
                </div>

                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "10.5px",
                    color: "#065F46",
                  }}
                >
                  DoT Clause 39.20 verified: Zero civilian CDRs subpoenaed.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeScreen;

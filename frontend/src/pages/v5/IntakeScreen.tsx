import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Zap,
  Layers,
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

  // Conservation blocks (6 items #11 to #16)
  const conservationSegments = [
    { seq: "#11", ok: true },
    { seq: "#12", ok: true },
    { seq: "#13", ok: true },
    { seq: "#14", ok: !isRow14Tampered && !validationResult.discrepantRowId },
    { seq: "#15", ok: !isRow14Tampered && !validationResult.discrepantRowId },
    { seq: "#16", ok: !isRow14Tampered && !validationResult.discrepantRowId },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "16px 20px 32px 20px",
        boxSizing: "border-box",
        minHeight: "100%",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* =========================================================================
          PAGE SUBHEADER / CASE METADATA BAR
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "4px 2px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0F172A",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Evidence Intake & Ledger Falsification
            </h1>
            <ReuiStatusBadge text="Z3 SMT VERIFIED" variant="emerald" />
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span>State Bank of India CBS Reconciliation · Sunil Kumar (A/c #30981140029) · FIR #149/2026</span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#FFFFFF", padding: "2px 6px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", marginRight: "3px" }}>CBS Rows:</span>
              {conservationSegments.map((s, idx) => (
                <span
                  key={idx}
                  title={`Row ${s.seq}: ${s.ok ? "Conservation Verified" : "Discrepancy Detected"}`}
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: s.ok ? "#10B981" : "#F43F5E",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* ASC / DESC Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setSortPolarity("ASC")}
              style={{
                border: "none",
                background: sortPolarity === "ASC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "ASC" ? "#0F172A" : "#64748B",
                fontWeight: sortPolarity === "ASC" ? 700 : 500,
                fontSize: "11px",
                padding: "4px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              ASC (Oldest First)
            </button>
            <button
              type="button"
              onClick={() => setSortPolarity("DESC")}
              style={{
                border: "none",
                background: sortPolarity === "DESC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "DESC" ? "#0F172A" : "#64748B",
                fontWeight: sortPolarity === "DESC" ? 700 : 500,
                fontSize: "11px",
                padding: "4px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              DESC (Newest First)
            </button>
          </div>

          {/* Permute Same-Sec Button */}
          <button
            type="button"
            onClick={() => setPermuteActive((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: permuteActive ? "#EEF2FF" : "#FFFFFF",
              border: permuteActive ? "1px solid #C7D2FE" : "1px solid #E2E8F0",
              color: permuteActive ? "#4338CA" : "#475569",
              fontWeight: 600,
              fontSize: "11.5px",
              padding: "5px 11px",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
            title="Evaluate same-second permutations for sub-second ordering"
          >
            <Split size={13} color={permuteActive ? "#4F46E5" : "#64748B"} />
            <span>Permute Same-Sec {permuteActive ? "(Active)" : ""}</span>
          </button>

          {/* Direct Row #14 Tamper Toggle */}
          <button
            type="button"
            onClick={() => toggleMutation("alterBankRow14")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: isRow14Tampered ? "#FFF1F2" : "#FFFFFF",
              border: isRow14Tampered ? "1px solid #FECDD3" : "1px solid #E2E8F0",
              color: isRow14Tampered ? "#BE123C" : "#475569",
              fontWeight: 600,
              fontSize: "11.5px",
              padding: "5px 11px",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <Zap size={13} color={isRow14Tampered ? "#E11D48" : "#64748B"} />
            <span>{isRow14Tampered ? "Tampered (-₹2.00L)" : "Toggle Row #14 Tamper"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: 4 TOP BENTO KPI CARDS (MODELED ON SALEZY & FLOWMAIL EXECUTIVE KPIS)
          ========================================================================= */}
      <div className="bento-grid-4">
        {/* Card 1: Double-Entry Conservation */}
        <BentoKpiCard
          title="Ledger Conservation"
          metric={isRow14Tampered ? "Row #14 Fail" : "100% Valid"}
          metricColor={isRow14Tampered ? "#E11D48" : "#059669"}
          subtitle="6 CBS rows mathematically reconciled"
          statusBadge={{
            text: isRow14Tampered ? "INVARIANT BREACH" : "VERIFIED ✓",
            variant: isRow14Tampered ? "rose" : "emerald",
          }}
          delta={{
            value: isRow14Tampered ? "-₹2,00,000.00 Deficit" : "Bal[k-1]+Cr-Dr = Bal[k]",
            isWarning: isRow14Tampered,
            isPositive: !isRow14Tampered,
          }}
          icon={ShieldCheck}
          iconColor={isRow14Tampered ? "#E11D48" : "#059669"}
          iconBg={isRow14Tampered ? "#FFF1F2" : "#ECFDF5"}
          sparklineData={isRow14Tampered ? [100, 100, 100, 20, 20, 20] : [100, 100, 100, 100, 100, 100]}
        />

        {/* Card 2: NPCI RRN Clock Sync */}
        <BentoKpiCard
          title="NPCI RRN Clock Sync"
          metric="10:00:14 IST"
          metricColor="#4F46E5"
          subtitle="Julian Day 265 · Switch STAN #149921"
          statusBadge={{
            text: isForgedRrn ? "CLOCK DRIFT (+50m)" : "Δ +14s NTP SYNC",
            variant: isForgedRrn ? "rose" : "indigo",
          }}
          delta={{
            value: isForgedRrn ? "Outside ±180s Limit" : "In Spec: ±180s Window",
            isWarning: isForgedRrn,
            isPositive: !isForgedRrn,
          }}
          icon={Clock}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={[14, 14, 15, 14, 14, isForgedRrn ? 3000 : 14]}
        />

        {/* Card 3: Claim vs CBS Ledger Diff */}
        <BentoKpiCard
          title="Claim vs CBS Ledger Diff"
          metric="-₹2,00,000.00"
          metricColor="#E11D48"
          subtitle="Receipt ₹15,000 vs True CBS ₹2,15,000"
          statusBadge={{
            text: "14.3× SUPPRESSION",
            variant: "rose",
          }}
          delta={{
            value: "Forged PDF Receipt",
            isWarning: true,
            label: "Canva Superimposed",
          }}
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFF1F2"
          sparklineData={[15, 15, 15, 215, 215, 215]}
        />

        {/* Card 4: PDF XRef & CGNAT Shield */}
        <BentoKpiCard
          title="PDF XRef & CGNAT Shield"
          metric="9,996 / 10,000"
          metricColor="#059669"
          subtitle="Airtel IPDR masked · PDF Rev 2 Canva"
          statusBadge={{
            text: "MERKLE BLINDED",
            variant: "emerald",
          }}
          delta={{
            value: "DoT Cl. 39.20 Safe",
            isPositive: true,
            label: "Zero PII Leakage",
          }}
          icon={FileCheck}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          sparklineData={[9996, 9996, 9996, 9996, 9996, 9996]}
        />
      </div>

      {/* =========================================================================
          ROW 2: TWO-COLUMN WORKBENCH (7.5 COLS LEFT + 4.5 COLS RIGHT)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.65fr 1fr",
          gap: "14px",
          alignItems: "start",
        }}
      >
        {/* =======================================================================
            LEFT COLUMN (7.5 COLS): SBI FINACLE CBS DATA GRID & CONFLICT ENGINE
            ======================================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* 1. TOP CROSS-SOURCE CONFLICT STRIP */}
          <div
            className="bento-card"
            style={{
              padding: "14px 18px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={14} color="#64748B" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>
                  Cross-Source Evidentiary Conflict: Mobile Receipt vs. Core Banking Ledger
                </span>
              </div>
              <ReuiStatusBadge text="PRIMARY CONTRADICTION" variant="rose" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "14px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "12px 16px",
              }}
            >
              {/* Suspect Mobile Receipt */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                  Suspect Claimed Receipt (<span style={{ fontFamily: "var(--font-mono)" }}>victim_upi_receipt.pdf</span>)
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "22px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-sans)" }}>
                    ₹15,000.00
                  </span>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "#BE123C",
                      background: "#FFE4E6",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    14.3× SUPPRESSED
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  Complainant WhatsApp export · Canva altered layer
                </div>
              </div>

              {/* Conflict Operator */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#BE123C",
                  fontSize: "18px",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                ≠
              </div>

              {/* Certified Core Banking System */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                  Actual Core Banking Debit (<span style={{ fontFamily: "var(--font-mono)" }}>sbi_finacle_cbs.csv</span>)
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "6px", marginTop: "2px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "#047857",
                      background: "#ECFDF5",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    TIER-1 FINACLE 10.x
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-sans)" }}>
                    ₹2,15,000.00
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  State Bank of India Data Centre · SHA-256 HMAC
                </div>
              </div>
            </div>
          </div>

          {/* 2. MATHEMATICAL INVARIANT FORMULA BANNER */}
          <div
            className="bento-card"
            style={{
              padding: "12px 18px",
              background: isRow14Tampered ? "#FFF1F2" : "#F0FDF4",
              border: isRow14Tampered ? "1px solid #FECDD3" : "1px solid #BBF7D0",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isRow14Tampered ? (
                  <XCircle size={16} color="#BE123C" />
                ) : (
                  <CheckCircle2 size={16} color="#047857" />
                )}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: isRow14Tampered ? "#9F1239" : "#065F46",
                  }}
                >
                  Formula: Bal[k] = Bal[k-1] + Credit[k] - Debit[k]
                </span>
              </div>

              <div style={{ fontSize: "11.5px", fontWeight: 600, color: isRow14Tampered ? "#BE123C" : "#047857" }}>
                {isRow14Tampered ? (
                  <span>
                    Row #14: ₹7,37,440 - ₹2,15,000 = <strong>₹5,22,440.00</strong> ≠ Reported <strong>₹3,22,440.00</strong> (Δ -₹2,00,000.00)
                  </span>
                ) : (
                  <span>
                    Row #14: ₹7,37,440 - ₹2,15,000 = <strong>₹5,22,440.00</strong> (Exact 0.00 error · Invariant Verified)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. REUI FORENSIC DATA GRID (HIGH-CLARITY TABLE MATCHING SALEZY & HEALTH) */}
          <div
            className="bento-card"
            style={{
              overflow: "hidden",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {/* Table Toolbar */}
            <div
              style={{
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #E2E8F0",
                background: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                  SBI Core Banking Ledger (<span style={{ fontFamily: "var(--font-mono)" }}>sbi_finacle_cbs.csv</span>)
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748B",
                    background: "#F1F5F9",
                    padding: "1px 7px",
                    borderRadius: "4px",
                  }}
                >
                  {displayRows.length} Rows
                </span>
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", width: "220px" }}>
                <Search
                  size={13}
                  color="#94A3B8"
                  style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Filter rows, RRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 10px 5px 28px",
                    fontSize: "11.5px",
                    borderRadius: "7px",
                    border: "1px solid #CBD5E1",
                    background: "#FAFAFA",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Table Container */}
            <div style={{ overflowX: "auto" }}>
              <table className="daylight-table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>#</th>
                    <th style={{ width: "120px" }}>Timestamp</th>
                    <th>Description & RRN</th>
                    <th style={{ width: "105px" }}>Type</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Debit / Credit</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Closing Balance (₹)</th>
                    <th style={{ width: "95px", textAlign: "center" }}>Status</th>
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
                          backgroundColor: isUnsat
                            ? "#FFF5F5"
                            : isDisputed
                            ? "#FEF2F2"
                            : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* Sequence No */}
                        <td style={{ fontWeight: 700, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                          #{row.sequenceNo}
                        </td>

                        {/* Timestamp */}
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "#475569" }}>
                          {row.timestamp.split("T")[1]}
                        </td>

                        {/* Description & RRN */}
                        <td>
                          <div style={{ fontWeight: 600, color: isDisputed ? "#BE123C" : "#0F172A" }}>
                            {row.description}
                          </div>
                          {row.rrn !== "—" && (
                            <div style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "#64748B", marginTop: "1px" }}>
                              RRN: {row.rrn}
                            </div>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td>
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
                              ? "SALARY CR"
                              : row.sequenceNo === 14
                              ? "DISPUTED DR"
                              : "RETAIL DR"}
                          </span>
                        </td>

                        {/* Debit / Credit Amount */}
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
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
                        <td style={{ textAlign: "right" }}>
                          {isDisputed ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <input
                                type="text"
                                value={customRow14Balance}
                                onChange={(e) => setCustomRow14Balance(e.target.value)}
                                style={{
                                  width: "106px",
                                  textAlign: "right",
                                  padding: "3px 6px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "var(--font-mono)",
                                  color: isUnsat ? "#BE123C" : "#0F172A",
                                  background: isUnsat ? "#FFE4E6" : "#FFFFFF",
                                  border: isUnsat ? "1px solid #FECDD3" : "1px solid #CBD5E1",
                                  borderRadius: "6px",
                                  outline: "none",
                                }}
                                title="Edit Row #14 closing balance to test mathematical falsification"
                              />
                            </div>
                          ) : (
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: isUnsat ? "#BE123C" : "#0F172A",
                              }}
                            >
                              ₹{row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
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

            {/* Table Footer */}
            <div
              style={{
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#F8FAFC",
                borderTop: "1px solid #E2E8F0",
                fontSize: "11px",
                color: "#64748B",
              }}
            >
              <span>SBI Finacle 10.2 Server: Branch Code 01489 (Noida Sec 62)</span>
              <span>HMAC: 94a1...fe02 (Verified)</span>
            </div>
          </div>
        </div>

        {/* =======================================================================
            RIGHT COLUMN (4.5 COLS): PROTOCOL PACKET DISSECTOR & BINARY XREF
            ======================================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* CARD A: NPCI 12-DIGIT RRN PROTOCOL PACKET DISSECTOR */}
          <div
            className="bento-card"
            style={{
              padding: "16px 18px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                  NPCI 12-Digit RRN Protocol Dissector
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                  Standardized UPI/IMPS switch routing format
                </div>
              </div>
              <ReuiStatusBadge
                text={decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "SPEC COMPLIANT" : "CLOCK SKEW"}
                variant={decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "emerald" : "rose"}
              />
            </div>

            {/* Interactive RRN Input */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="text"
                  value={rrnInput}
                  onChange={(e) => setRrnInput(e.target.value.trim())}
                  maxLength={12}
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "16px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#FAFAFA",
                    color: "#0F172A",
                    outline: "none",
                  }}
                  title="Enter 12-digit UPI/IMPS RRN string (YDDDHHSSSSSS)"
                />
                <button
                  type="button"
                  onClick={() => setRrnInput("626510149921")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "7px 10px",
                    borderRadius: "7px",
                    border: "1px solid #E2E8F0",
                    background: "#F8FAFC",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* 4-Segment Byte Anatomy Ruler */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "6px" }}>
                Packet Byte Anatomy (ISO-8583 Grammar)
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 1.2fr 2fr",
                  gap: "6px",
                }}
              >
                {/* Byte 0 */}
                <div
                  style={{
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    borderRadius: "8px",
                    padding: "7px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#4338CA" }}>Byte 0 (Year)</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#3730A3", fontFamily: "var(--font-mono)" }}>
                    [{rrnInput[0] || "?"}]
                  </div>
                  <div style={{ fontSize: "10px", color: "#6366F1", marginTop: "1px" }}>
                    20{rrnInput[0] ? `2${rrnInput[0]}` : "26"}
                  </div>
                </div>

                {/* Bytes 1-3 */}
                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: "8px",
                    padding: "7px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#047857" }}>Bytes 1–3 (Julian)</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#065F46", fontFamily: "var(--font-mono)" }}>
                    [{rrnInput.substring(1, 4) || "???"}]
                  </div>
                  <div style={{ fontSize: "10px", color: "#10B981", marginTop: "1px" }}>
                    Day {decodedRrn.julianDay || 265} (22 Sep)
                  </div>
                </div>

                {/* Bytes 4-5 */}
                <div
                  style={{
                    background: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: "8px",
                    padding: "7px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#B45309" }}>Bytes 4–5 (Hour)</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#92400E", fontFamily: "var(--font-mono)" }}>
                    [{rrnInput.substring(4, 6) || "??"}]
                  </div>
                  <div style={{ fontSize: "10px", color: "#F59E0B", marginTop: "1px" }}>
                    {decodedRrn.hour || 10}:00 IST
                  </div>
                </div>

                {/* Bytes 6-11 */}
                <div
                  style={{
                    background: "#F5F3FF",
                    border: "1px solid #DDD6FE",
                    borderRadius: "8px",
                    padding: "7px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#6D28D9" }}>Bytes 6–11 (STAN Trace)</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#5B21B6", fontFamily: "var(--font-mono)" }}>
                    [{rrnInput.substring(6, 12) || "??????"}]
                  </div>
                  <div style={{ fontSize: "10px", color: "#8B5CF6", marginTop: "1px" }}>
                    Switch Audit #{decodedRrn.sequence || "149921"}
                  </div>
                </div>
              </div>
            </div>

            {/* Graduated Clock Drift Scale (±180s NTP Boundary) */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#64748B",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 600 }}>NTP Switch Clock Offset (±180s Limit)</span>
                <span style={{ fontWeight: 700, color: isForgedRrn ? "#BE123C" : "#047857" }}>
                  {isForgedRrn ? "Δ +3,000s (+50 min) FORGED" : "Δ +14.0s (IN SPEC)"}
                </span>
              </div>

              {/* Visual Ruler Track */}
              <div
                style={{
                  position: "relative",
                  height: "24px",
                  background: "#F1F5F9",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  overflow: "hidden",
                }}
              >
                {/* In-Spec Safe Zone (-180s to +180s) */}
                <div
                  style={{
                    position: "absolute",
                    left: "25%",
                    right: "25%",
                    top: 0,
                    bottom: 0,
                    background: "rgba(16, 185, 129, 0.12)",
                    borderLeft: "1px dashed #10B981",
                    borderRight: "1px dashed #10B981",
                  }}
                />

                {/* Center Zero Line */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "#94A3B8",
                  }}
                />

                {/* Indicator Pin */}
                <div
                  style={{
                    position: "absolute",
                    left: isForgedRrn ? "92%" : "54%",
                    top: "3px",
                    bottom: "3px",
                    width: "8px",
                    borderRadius: "4px",
                    background: isForgedRrn ? "#E11D48" : "#4F46E5",
                    boxShadow: isForgedRrn
                      ? "0 0 8px rgba(225, 29, 72, 0.6)"
                      : "0 0 6px rgba(79, 70, 229, 0.5)",
                    transition: "all 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9.5px",
                  color: "#94A3B8",
                  marginTop: "3px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>-180s</span>
                <span>-90s</span>
                <span style={{ fontWeight: 700, color: "#64748B" }}>0s (NTP)</span>
                <span>+90s</span>
                <span>+180s</span>
              </div>
            </div>
          </div>

          {/* CARD B: BINARY PDF XREF AUDIT & CGNAT MERKLE SHIELD */}
          <div
            className="bento-card"
            style={{
              padding: "16px 18px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              flex: 1,
            }}
          >
            {/* Header Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  background: "#F1F5F9",
                  padding: "2px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTabDissector("pdf")}
                  style={{
                    border: "none",
                    background: activeTabDissector === "pdf" ? "#FFFFFF" : "transparent",
                    color: activeTabDissector === "pdf" ? "#0F172A" : "#64748B",
                    fontWeight: activeTabDissector === "pdf" ? 700 : 500,
                    fontSize: "11px",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: activeTabDissector === "pdf" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  PDF Binary XRef Audit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabDissector("cgnat")}
                  style={{
                    border: "none",
                    background: activeTabDissector === "cgnat" ? "#FFFFFF" : "transparent",
                    color: activeTabDissector === "cgnat" ? "#0F172A" : "#64748B",
                    fontWeight: activeTabDissector === "cgnat" ? 700 : 500,
                    fontSize: "11px",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: activeTabDissector === "cgnat" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  CGNAT Merkle Shield
                </button>
              </div>

              <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
                {activeTabDissector === "pdf" ? "victim_upi_receipt.pdf" : "airtel_cgnat_ipdr.csv"}
              </span>
            </div>

            {/* TAB CONTENT 1: PDF BINARY XREF AUDIT */}
            {activeTabDissector === "pdf" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "11.5px", color: "#475569" }}>
                  Binary Byte-Offset Timeline (<span style={{ fontFamily: "var(--font-mono)" }}>148,474 bytes total</span>):
                </div>

                {/* Byte Blocks */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Block 1: Genuine PhonePe Generator */}
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: "8px",
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#065F46" }}>
                        Revision 1 (0x00000000 – 0x00014208)
                      </span>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#047857", background: "#DCFCE7", padding: "1px 5px", borderRadius: "3px" }}>
                        ORIGINAL %%EOF 1
                      </span>
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#475569", marginTop: "2px" }}>
                      Producer: <strong style={{ color: "#065F46" }}>PhonePe UPI Gateway</strong> · Font: ArialMT · Debit ₹2,15,000.00
                    </div>
                  </div>

                  {/* Block 2: Incremental Tamper Trailer */}
                  <div
                    style={{
                      background: "#FFF1F2",
                      border: "1px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#9F1239" }}>
                        Revision 2 (0x00014209 – 0x000234FA)
                      </span>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "3px" }}>
                        INCREMENTAL TRAILER %%EOF 2
                      </span>
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#475569", marginTop: "2px" }}>
                      Producer: <strong style={{ color: "#BE123C" }}>Canva / HelveticaModified</strong> · Overwrote stream to ₹15,000.00
                    </div>
                  </div>
                </div>

                {/* Finding Summary */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    color: "#475569",
                  }}
                >
                  <strong style={{ color: "#0F172A" }}>Forensic Finding:</strong> Incremental PDF trailer found after primary EOF. Text layer was re-rendered in web graphics software to conceal the actual ₹2,15,000 transaction.
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: CGNAT MERKLE SHIELD */}
            {activeTabDissector === "cgnat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "11.5px", color: "#475569" }}>
                  Airtel CGNAT Public IP: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>122.160.42.18</span> (Tower ID: NOIDA-SEC62)
                </div>

                {/* Merkle Tree Diagram */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {/* Root */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "#0F172A",
                      fontWeight: 700,
                    }}
                  >
                    Merkle Root: 0x4f8a92e1...c03b
                  </div>

                  {/* Branches */}
                  <div style={{ display: "flex", width: "100%", justifyContent: "space-around", gap: "8px" }}>
                    <div
                      style={{
                        flex: 1,
                        background: "#EEF2FF",
                        border: "1px solid #C7D2FE",
                        borderRadius: "6px",
                        padding: "5px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#4338CA" }}>Target Suspect Leaf</div>
                      <div style={{ fontSize: "10px", color: "#3730A3", fontFamily: "var(--font-mono)" }}>
                        Port 44321 → SESS-01
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        background: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        borderRadius: "6px",
                        padding: "5px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#047857" }}>9,996 Blinded Citizens</div>
                      <div style={{ fontSize: "10px", color: "#065F46", fontFamily: "var(--font-mono)" }}>
                        Zero PII Disclosed
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    color: "#065F46",
                  }}
                >
                  <strong style={{ color: "#047857" }}>DoT Clause 39.20 Compliant:</strong> 9,996 innocent citizen records are masked using cryptographic hashes. Court-admissible proof of inclusion is preserved without subpoenaing civilian CDRs.
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

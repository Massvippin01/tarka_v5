import React, { useState, useMemo, useEffect } from "react";
import {
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  FileCode,
  ShieldAlert,
  ArrowRightLeft,
  RotateCcw,
  Clock,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  BentoKpiCard,
  HatchedBarChart,
  SegmentedPillSwitcher,
} from "../../components/tarka/BentoPrimitives";
import {
  validateRunningBalance,
  decodeRailReference,
  analyzePdfStructuralIntegrity,
  buildCgnatMerkleShield,
  type LedgerRowData,
  type MerkleShieldResult,
} from "../../utils/intakeFalsifier";

export const IntakeScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Active sub-tab in Intake screen
  const [activeSubTab, setActiveSubTab] = useState<"balance" | "rrn" | "pdf" | "cgnat-pii">("balance");

  // Initial CBS Ledger Rows
  const initialRows: LedgerRowData[] = [
    {
      id: "row-1",
      sequenceNo: 1,
      timestamp: "2026-09-22 09:30:15",
      description: "OPENING_BALANCE",
      rrn: "N/A",
      debit: 0,
      credit: 0,
      balance: 4210.0,
    },
    {
      id: "row-2",
      sequenceNo: 2,
      timestamp: "2026-09-22 10:35:00",
      description: "UPI/CR/202602149921/VICTIM USER/OKSBI",
      rrn: "202602149921",
      debit: 0,
      credit: 50000.0, // Ground truth settled amount
      balance: 54210.0,
    },
    {
      id: "row-3",
      sequenceNo: 3,
      timestamp: "2026-09-22 10:35:00", // Same-second simultaneous transaction
      description: "IMPS/DR/OUTWARD_MULE_L2/ICICI",
      rrn: "202602149988",
      debit: 20000.0,
      credit: 0,
      balance: 34210.0,
    },
    {
      id: "row-4",
      sequenceNo: 4,
      timestamp: "2026-09-22 11:15:20",
      description: "ATM/CASH_WDL/DEL_SECTOR18",
      rrn: "TXN99281729",
      debit: 10000.0,
      credit: 0,
      balance: 24210.0,
    },
  ];

  const [rows, setRows] = useState<LedgerRowData[]>(initialRows);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  // Multi-Rail RRN Decoder State
  const [inputRrn, setInputRrn] = useState<string>("202602149921");
  const [claimedTxnTime, setClaimedTxnTime] = useState<string>("2026-09-22T10:35:00");

  // React to forgeRrnTimestamp mutation
  useEffect(() => {
    if (mutations.forgeRrnTimestamp) {
      setInputRrn("202602151240"); // Julian hour 12 vs claimed 10:35 (discrepancy)
    } else {
      setInputRrn("202602149921");
    }
  }, [mutations.forgeRrnTimestamp]);

  // Compute live conservation validation
  const validationResult = useMemo(() => {
    const effectiveRows = rows.map((r) => {
      if (r.id === "row-2" && (mutations.alterBankRow14 || mutations.balanceJumpFraud)) {
        return {
          ...r,
          credit: 150000.0, // Falsified jump
          balance: 154210.0,
        };
      }
      return r;
    });

    return validateRunningBalance(effectiveRows, sortOrder);
  }, [rows, sortOrder, mutations.alterBankRow14, mutations.balanceJumpFraud]);

  // Handle cell inline editing
  const handleCellChange = (id: string, field: "credit" | "debit" | "balance", value: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Decode RRN reference
  const decodedRrn = useMemo(() => {
    return decodeRailReference(inputRrn, claimedTxnTime);
  }, [inputRrn, claimedTxnTime]);

  // PDF Tamper Analysis
  const pdfAnalysis = useMemo(() => {
    return analyzePdfStructuralIntegrity({
      filename: "sbi_certified_statement_digital_arrest.pdf",
      sha256: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
      fileSizeBytes: 146227,
      eofMarkers: 2,
      hasOverlaidText: true,
    });
  }, []);

  // CGNAT Merkle Shield State
  const [isPiiMasked, setIsPiiMasked] = useState<boolean>(true);
  const [merkleResult, setMerkleResult] = useState<MerkleShieldResult | null>(null);

  useEffect(() => {
    const rawSubscribers = [
      { msisdn: "9871123941", privateIp: "10.142.88.19", port: 49210, publicIp: "103.21.144.92", time: "10:34:58 IST", isSuspect: true },
      { msisdn: "9810044912", privateIp: "10.142.88.22", port: 49214, publicIp: "103.21.144.92", time: "10:34:59 IST", isSuspect: false },
      { msisdn: "9711890021", privateIp: "10.142.88.45", port: 49220, publicIp: "103.21.144.92", time: "10:35:01 IST", isSuspect: false },
      { msisdn: "9958012849", privateIp: "10.142.88.90", port: 49228, publicIp: "103.21.144.92", time: "10:35:02 IST", isSuspect: false },
    ];
    buildCgnatMerkleShield(rawSubscribers).then(setMerkleResult);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* 1. Top Executive Title & Sub-Tab Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="bento-badge bento-badge-blue">
              <UploadCloud size={11} /> SCREEN 1: DIRTY-DATA FALSIFIER
            </span>
            <span className="bento-badge bento-badge-neutral font-mono-tabular">
              BSA § 63 & SUTRAM 2026 INTAKE
            </span>
          </div>
          <h1 style={{ margin: "2px 0 4px", fontSize: "22px", fontWeight: 700, color: "var(--bento-text-main)", letterSpacing: "-0.5px" }}>
            Real-Time Bank Ledger Falsifier & Evidence Shield
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--bento-text-muted)", maxWidth: "800px", lineHeight: 1.5 }}>
            Deterministic balance conservation verification, same-second transaction permutation solver, multi-rail reference decoding, and DPDP-compliant Merkle PII redaction.
          </p>
        </div>

        <SegmentedPillSwitcher
          options={[
            { id: "balance", label: "Balance Validator" },
            { id: "rrn", label: "Multi-Rail Decoder" },
            { id: "pdf", label: "PDF XRef Tamper" },
            { id: "cgnat-pii", label: "Merkle PII Shield" },
          ]}
          activeId={activeSubTab}
          onChange={(val) => setActiveSubTab(val as any)}
        />
      </div>

      {/* 2. Top 4 Executive KPI Cards */}
      <div className="bento-grid-4">
        <BentoKpiCard
          title="RUNNING BALANCE CONSERVATION"
          metric={validationResult.isValid ? "SATISFIED" : "UNSAT"}
          metricColor={validationResult.isValid ? "var(--bento-emerald)" : "var(--bento-crimson)"}
          delta={{
            value: validationResult.isValid ? "CONSERVED" : `Δ ₹${validationResult.discrepancyDelta.toLocaleString("en-IN")}`,
            isPositive: validationResult.isValid,
            isWarning: !validationResult.isValid,
            label: validationResult.isValid ? "Zero delta across ledger" : "Balance jump injected",
          }}
          subtitle="Conservation Invariant Check"
          icon={validationResult.isValid ? CheckCircle2 : ShieldAlert}
          iconColor={validationResult.isValid ? "var(--bento-emerald)" : "var(--bento-crimson)"}
          iconBg={validationResult.isValid ? "var(--bento-emerald-subtle)" : "var(--bento-crimson-subtle)"}
        />

        <BentoKpiCard
          title="MULTI-RAIL RRN INTEGRITY"
          metric={decodedRrn.isValid ? (decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "VALID RRN" : "CLOCK DRIFT") : "MALFORMED"}
          metricColor={decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "var(--bento-emerald)" : "var(--bento-amber)"}
          delta={{
            value: decodedRrn.rail,
            isPositive: decodedRrn.admissibilityVerdict === "ADMISSIBLE",
            label: decodedRrn.midnightRolloverGuard ? "±180s Midnight Guard" : "Non-standard rail",
          }}
          subtitle="NPCI Central Switch Clock Match"
          icon={Clock}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />

        <BentoKpiCard
          title="PDF XREF STRUCTURAL INTEGRITY"
          metric={pdfAnalysis.eofMarkerCount > 1 ? "TAMPERED" : "PRISTINE"}
          metricColor={pdfAnalysis.eofMarkerCount > 1 ? "var(--bento-crimson)" : "var(--bento-emerald)"}
          delta={{
            value: `${pdfAnalysis.eofMarkerCount} %%EOF TRAILERS`,
            isWarning: pdfAnalysis.eofMarkerCount > 1,
            label: `Baseline shift: +${pdfAnalysis.fontBaselineShiftPt}pt`,
          }}
          subtitle="Type1 Font & Trailer Dissection"
          icon={FileCode}
          iconColor="var(--bento-crimson)"
          iconBg="var(--bento-crimson-subtle)"
        />

        <BentoKpiCard
          title="CGNAT MERKLE PII SHIELD"
          metric="10,000 ROWS"
          metricColor="var(--bento-indigo)"
          delta={{
            value: "DPDP ACT 2023",
            isPositive: true,
            label: "Sibling proof verified",
          }}
          subtitle="Innocent Subscriber Masking"
          icon={Lock}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />
      </div>

      {/* 3. SUB-TAB 1: Running-Balance Conservation Validator */}
      {activeSubTab === "balance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Status Banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: validationResult.isValid ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: validationResult.isValid ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {validationResult.isValid ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <ShieldAlert size={24} color="#EF4444" />
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: validationResult.isValid ? "#059669" : "#DC2626" }}>
                  {validationResult.isValid
                    ? "RUNNING-BALANCE CONSERVATION: VALID (SAT)"
                    : `BALANCE JUMP DETECTED: CONSERVATION VIOLATED (|Δ| = ₹${validationResult.discrepancyDelta.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`}
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginTop: "2px" }}>
                  Invariant: <code className="font-mono-tabular">Bal[t] = Bal[t-1] - Debit[t] + Credit[t]</code> | Auto-Polarity: <strong className="font-mono-tabular">{sortOrder}</strong> | Same-Second Clusters Solved: <strong className="font-mono-tabular">{validationResult.sameSecondClustersDetected}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                <ArrowRightLeft size={13} />
                <span>Polarity: {sortOrder}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                className={`bento-btn bento-btn-sm ${mutations.alterBankRow14 ? "bento-btn-primary" : "bento-btn-secondary"}`}
                style={{
                  background: mutations.alterBankRow14 ? "#DC2626" : undefined,
                  borderColor: mutations.alterBankRow14 ? "#DC2626" : undefined,
                }}
              >
                <AlertTriangle size={13} />
                <span>{mutations.alterBankRow14 ? "Revert Balance Mutation" : "Simulate ₹1L Balance Jump"}</span>
              </button>
            </div>
          </div>

          {/* Hatched Bar Chart: Claimed vs Settled */}
          <HatchedBarChart
            title="Hatched Comparison Bar: Complainant Claim vs Core Banking Settlement"
            subtitle="RRN: 202602149921 | NPCI Settlement Timestamp: 10:35:00 IST"
            bars={[
              {
                id: "claimed",
                label: "Claimed (Extortion)",
                value: 150000,
                formattedValue: "₹1,50,000.00",
                sublabel: "Screenshot Claim",
                isHatched: true,
                isAccent: true,
                color: "#E11D48",
                callout: "Fabricated +₹1L Jump",
              },
              {
                id: "settled",
                label: "Settled (SBI Finacle)",
                value: 50000,
                formattedValue: "₹50,000.00",
                sublabel: "CBS Verified",
                isHatched: false,
                color: "#059669",
                callout: "Actual Bank Deposit",
              },
            ]}
          />

          {/* Interactive CBS Ledger Table */}
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Core Banking Ledger (Interactive Inline Cell Editing)
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Click into Credit, Debit, or Balance cells to edit values live. The conservation invariant will re-evaluate in &lt;1ms.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRows(initialRows)}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                <RotateCcw size={12} />
                <span>Reset Ledger</span>
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bento-border-subtle)", color: "var(--bento-text-muted)" }}>
                    <th style={{ padding: "10px 12px" }}>#</th>
                    <th style={{ padding: "10px 12px" }}>Timestamp (IST)</th>
                    <th style={{ padding: "10px 12px" }}>Description</th>
                    <th style={{ padding: "10px 12px" }}>RRN / Ref</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Debit (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Credit (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Balance (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Expected (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.rows.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid var(--bento-border-subtle)",
                        background: row.status === "UNSAT" ? "rgba(239, 68, 68, 0.08)" : undefined,
                      }}
                    >
                      <td style={{ padding: "10px 12px" }} className="font-mono-tabular">
                        {row.sequenceNo}
                      </td>
                      <td style={{ padding: "10px 12px" }} className="font-mono-tabular">
                        {row.timestamp}
                      </td>
                      <td style={{ padding: "10px 12px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.description}
                      </td>
                      <td style={{ padding: "10px 12px" }} className="font-mono-tabular">
                        {row.rrn}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <input
                          type="number"
                          value={row.debit}
                          onChange={(e) => handleCellChange(row.id, "debit", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "90px",
                            textAlign: "right",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--bento-border-subtle)",
                            background: "var(--bento-card-bg)",
                            color: "var(--bento-text-main)",
                          }}
                          className="font-mono-tabular"
                        />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <input
                          type="number"
                          value={row.credit}
                          onChange={(e) => handleCellChange(row.id, "credit", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "90px",
                            textAlign: "right",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: row.status === "UNSAT" ? "1px solid #DC2626" : "1px solid var(--bento-border-subtle)",
                            background: row.status === "UNSAT" ? "#FEF2F2" : "var(--bento-card-bg)",
                            color: row.status === "UNSAT" ? "#DC2626" : "var(--bento-text-main)",
                            fontWeight: row.status === "UNSAT" ? 700 : 500,
                          }}
                          className="font-mono-tabular"
                        />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <input
                          type="number"
                          value={row.balance}
                          onChange={(e) => handleCellChange(row.id, "balance", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100px",
                            textAlign: "right",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--bento-border-subtle)",
                            background: "var(--bento-card-bg)",
                            color: "var(--bento-text-main)",
                          }}
                          className="font-mono-tabular"
                        />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }} className="font-mono-tabular">
                        ₹{row.expectedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {row.status === "SAT" ? (
                          <span className="bento-badge bento-badge-emerald font-mono-tabular">SAT</span>
                        ) : (
                          <span className="bento-badge bento-badge-coral font-mono-tabular">UNSAT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: Multi-Rail Reference Decoder */}
      {activeSubTab === "rrn" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "6px" }}>
              Multi-Rail Reference Dissector & Julian Clock Synchronizer
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Dissects 12-digit UPI/IMPS RRNs (<code className="font-mono-tabular">YDDDHHSSSSSS</code>) with ±180-second midnight rollover guard, and decodes 22-character RBI RTGS and 16-character NEFT UTRs.
            </p>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted)", display: "block", marginBottom: "4px" }}>
                  TRANSACTION REFERENCE (RRN / UTR)
                </label>
                <input
                  type="text"
                  value={inputRrn}
                  onChange={(e) => setInputRrn(e.target.value)}
                  placeholder="e.g. 202602149921 or SBINR520260922001"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "var(--bento-card-bg)",
                    color: "var(--bento-text-main)",
                    fontSize: "14px",
                  }}
                  className="font-mono-tabular"
                />
              </div>

              <div style={{ minWidth: "200px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted)", display: "block", marginBottom: "4px" }}>
                  CLAIMED BANK TIME (ISO)
                </label>
                <input
                  type="text"
                  value={claimedTxnTime}
                  onChange={(e) => setClaimedTxnTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "var(--bento-card-bg)",
                    color: "var(--bento-text-main)",
                    fontSize: "13px",
                  }}
                  className="font-mono-tabular"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => {
                  setInputRrn("202602149921");
                  setClaimedTxnTime("2026-09-22T10:35:00");
                }}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                Preset: Ground Truth UPI (202602149921)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputRrn("202602151240");
                  setClaimedTxnTime("2026-09-22T10:35:00");
                }}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                Preset: Clock Discrepancy RRN (202602151240)
              </button>
              <button
                type="button"
                onClick={() => setInputRrn("SBINR520260922001")}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                Preset: RTGS UTR (SBINR520260922001)
              </button>
              <button
                type="button"
                onClick={() => setInputRrn("SBIN260922123456")}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                Preset: NEFT UTR (SBIN260922123456)
              </button>
            </div>

            {/* Decoded Breakdown Card */}
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                border: decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Rail: {decodedRrn.rail} — {decodedRrn.formatDescription}
                </div>
                <span
                  className={`bento-badge ${decodedRrn.admissibilityVerdict === "ADMISSIBLE" ? "bento-badge-emerald" : "bento-badge-coral"}`}
                >
                  {decodedRrn.admissibilityVerdict}
                </span>
              </div>

              <div className="bento-grid-4" style={{ marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Year Offset</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                    {decodedRrn.year || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Julian Day</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                    {decodedRrn.julianDay ? `Day ${decodedRrn.julianDay}` : "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Julian Hour (IST)</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                    {decodedRrn.hour !== undefined ? `${decodedRrn.hour}:00 IST` : "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Derived IST Timestamp</div>
                  <div style={{ fontSize: "13px", fontWeight: 600 }} className="font-mono-tabular">
                    {decodedRrn.derivedTimestampIST || "N/A"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", lineHeight: 1.5 }}>
                {decodedRrn.admissibilityNotes}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: PDF Structural XRef Tamper */}
      {activeSubTab === "pdf" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  PDF Structural Trailer & Type1 Font Metrics Inspector
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Target: <code className="font-mono-tabular">{pdfAnalysis.filename}</code> (SHA-256: {pdfAnalysis.sha256.slice(0, 16)}...)
                </div>
              </div>

              <span className={`bento-badge ${pdfAnalysis.verdict === "GENUINE_ORIGINAL" ? "bento-badge-emerald" : "bento-badge-coral"}`}>
                {pdfAnalysis.verdict}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              {pdfAnalysis.tamperFindings.map((finding, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>
                      {finding.code} (Byte Offset: <span className="font-mono-tabular">{finding.byteOffsetHex}</span>)
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
                      {finding.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: CGNAT Merkle PII Shield */}
      {activeSubTab === "cgnat-pii" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Privacy-Preserving CGNAT Subscriber Masker (DPDP Act, 2023 Compliant)
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Protects innocent cellular subscribers co-located under Public CGNAT IP 103.21.144.92 while cryptographically proving suspect inclusion.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPiiMasked((prev) => !prev)}
                className="bento-btn bento-btn-secondary bento-btn-sm"
              >
                {isPiiMasked ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{isPiiMasked ? "PII Redacted (Judicial Mode)" : "Reveal Plaintext (Lawful Intercept)"}</span>
              </button>
            </div>

            {merkleResult && (
              <>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "rgba(37, 99, 235, 0.05)",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                    marginBottom: "16px",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--bento-text-muted)" }}>Merkle Tree Root SHA-256: </span>
                  <code className="font-mono-tabular" style={{ color: "#2563EB", fontWeight: 700 }}>
                    {merkleResult.rootHash}
                  </code>
                </div>

                <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--bento-border-subtle)", color: "var(--bento-text-muted)" }}>
                        <th style={{ padding: "8px 12px" }}>ID</th>
                        <th style={{ padding: "8px 12px" }}>MSISDN (Subscriber)</th>
                        <th style={{ padding: "8px 12px" }}>Private IPv4</th>
                        <th style={{ padding: "8px 12px" }}>Source Port</th>
                        <th style={{ padding: "8px 12px" }}>Public NAT IP</th>
                        <th style={{ padding: "8px 12px" }}>Session Timestamp</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merkleResult.subscribers.map((sub) => (
                        <tr
                          key={sub.id}
                          style={{
                            borderBottom: "1px solid var(--bento-border-subtle)",
                            background: sub.isSuspect ? "rgba(239, 68, 68, 0.08)" : undefined,
                          }}
                        >
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">{sub.id}</td>
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">
                            {isPiiMasked ? sub.maskedMsisdn : (sub.isSuspect ? "+91-98711-23941" : "+91-98100-XXXXX")}
                          </td>
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">{sub.privateIp}</td>
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">{sub.sourcePort}</td>
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">{sub.publicIp}</td>
                          <td style={{ padding: "8px 12px" }} className="font-mono-tabular">{sub.timestampIST}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            {sub.isSuspect ? (
                              <span className="bento-badge bento-badge-coral font-mono-tabular">SUSPECT</span>
                            ) : (
                              <span className="bento-badge bento-badge-emerald font-mono-tabular">INNOCENT</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: "14px", borderRadius: "8px", background: "var(--bento-card-bg)", border: "1px solid var(--bento-border-subtle)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "6px" }}>
                    Cryptographic Sibling Inclusion Proof for Suspect (SUB-01):
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                    {merkleResult.inclusionProof.map((step, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="bento-badge bento-badge-blue font-mono-tabular">Level {idx + 1} ({step.position})</span>
                        <code className="font-mono-tabular" style={{ color: "var(--bento-text-muted)" }}>
                          {step.hash}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

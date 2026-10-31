import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  FileCode,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

interface BankStatementRow {
  rowNo: number;
  date: string;
  description: string;
  chqNo: string;
  debit: number;
  credit: number;
  balance: number;
  expectedBalance: number;
  isTampered: boolean;
}

export const IntakeScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // 1. Double-Entry Running Balance Table State
  const initialBankRows: BankStatementRow[] = [
    { rowNo: 11, date: "22-09-2026", description: "OPENING BALANCE B/F", chqNo: "-", debit: 0, credit: 0, balance: 500000, expectedBalance: 500000, isTampered: false },
    { rowNo: 12, date: "22-09-2026", description: "UPI/DR/202602148102/GROCERY STORE", chqNo: "UPI-8102", debit: 3450, credit: 0, balance: 496550, expectedBalance: 496550, isTampered: false },
    { rowNo: 13, date: "22-09-2026", description: "NEFT/CR/SALARY/INFOSYS LTD", chqNo: "N140921", debit: 0, credit: 125000, balance: 621550, expectedBalance: 621550, isTampered: false },
    {
      rowNo: 14,
      date: "22-09-2026",
      description: "UPI/DR/202602149921/CYBER MULE L1",
      chqNo: "UPI-9921",
      debit: 215000,
      credit: 0,
      balance: 406550, // When tampered: 506550 (+1,00,000 jump)
      expectedBalance: 406550,
      isTampered: false,
    },
    { rowNo: 15, date: "22-09-2026", description: "IMPS/DR/OUTWARD/UTILITY BILL", chqNo: "IMPS-021", debit: 4200, credit: 0, balance: 402350, expectedBalance: 402350, isTampered: false },
    { rowNo: 16, date: "22-09-2026", description: "ATM/CASH_WDL/SECTOR 18 NOIDA", chqNo: "ATM-991", debit: 10000, credit: 0, balance: 392350, expectedBalance: 392350, isTampered: false },
  ];

  // React to alterBankRow14 mutation
  const bankRows = useMemo(() => {
    const isTampered = mutations.alterBankRow14 || mutations.balanceJumpFraud;
    return initialBankRows.map((r) => {
      if (r.rowNo === 14) {
        return {
          ...r,
          balance: isTampered ? 506550 : 406550, // +₹1,00,000 false balance in doctored statement
          expectedBalance: 406550,
          isTampered: !!isTampered,
        };
      }
      return r;
    });
  }, [mutations.alterBankRow14, mutations.balanceJumpFraud]);

  const hasBalanceError = useMemo(() => bankRows.some((r) => r.isTampered), [bankRows]);

  // 2. RRN Clock State (Reacts to forgeRrnTimestamp mutation)
  const isRrnDrifted = mutations.forgeRrnTimestamp;
  const receiptClaimedTime = isRrnDrifted ? "10:50:00 IST (+15m Forged)" : "10:50:00 IST";

  // 3. Privacy Shield State
  const [isPrivacyUnmasked, setIsPrivacyUnmasked] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", padding: "12px 16px", gap: "10px", boxSizing: "border-box", overflow: "hidden" }}>
      {/* 1. SINGLE-LINE 4-PILL TELEMETRY STRIP (HEIGHT: 38PX, NO SCROLLING REQUIRED) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          height: "38px",
          flexShrink: 0,
        }}
      >
        {/* Pill 1: Balance Conservation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: hasBalanceError ? "1px solid #DC2626" : "1px solid var(--bento-border-subtle, #E2E8F0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {hasBalanceError ? <AlertTriangle size={14} color="#DC2626" /> : <CheckCircle2 size={14} color="#059669" />}
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              BALANCE CONSERVATION
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: hasBalanceError ? "#DC2626" : "#059669",
              background: hasBalanceError ? "rgba(220,38,38,0.1)" : "rgba(5,150,105,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {hasBalanceError ? "🚨 UNSAT Δ ₹1,00,000" : "✓ SAT 100% CONSERVED"}
          </span>
        </div>

        {/* Pill 2: RRN Cross-Check */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: isRrnDrifted ? "1px solid #D97706" : "1px solid var(--bento-border-subtle, #E2E8F0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={14} color={isRrnDrifted ? "#D97706" : "#2563EB"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              NPCI RRN CLOCK MATCH
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: isRrnDrifted ? "#D97706" : "#2563EB",
              background: isRrnDrifted ? "rgba(217,119,6,0.1)" : "rgba(37,99,235,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {isRrnDrifted ? "⚠️ +15m CLOCK DRIFT" : "✓ 10:00 IST SYNCED"}
          </span>
        </div>

        {/* Pill 3: PDF Structural Health */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid #DC2626",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCode size={14} color="#DC2626" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              PDF XREF INTEGRITY
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#DC2626",
              background: "rgba(220,38,38,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            🚨 2 %%EOF TRAILERS
          </span>
        </div>

        {/* Pill 4: Privacy Shield */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid var(--bento-border-subtle, #E2E8F0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={14} color="#2563EB" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              CGNAT CITIZEN SHIELD
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#059669",
              background: "rgba(5,150,105,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            9,996 / 10,000 MASKED
          </span>
        </div>
      </div>

      {/* 2. 12-COLUMN BENTO GRID: FITS ON ONE SCREEN ABOVE THE FOLD */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "10px", flex: 1, minHeight: 0 }}>
        {/* ========================================================================= */}
        {/* LEFT COLUMN (COL-SPAN-7): SIDE-BY-SIDE RECEIPT VS BANK + RUNNING BALANCE */}
        {/* ========================================================================= */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "10px", minHeight: 0, overflow: "hidden" }}>
          {/* Card 1: Visual Side-by-Side Receipt vs. Core Bank Infographic */}
          <div
            style={{
              background: "var(--bento-card-bg, #FFFFFF)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>
                  Visual Receipt Forgery vs. Core Banking Settlement Discrepancy
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                RRN: 202602149921
              </span>
            </div>

            {/* 3-Part Visual Infographic Diagram */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center", gap: "10px" }}>
              {/* Left Box: Smartphone Receipt Screenshot (Tier 3) */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #FECDD3",
                  background: "#FFF1F2",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#E11D48", textTransform: "uppercase" }}>
                    📱 Submitted Screenshot (Tier 3)
                  </span>
                  <span style={{ fontSize: "9px", background: "#E11D48", color: "#FFF", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                    UNAUTHENTICATED
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>Complainant Claimed Paid</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#9F1239" }} className="font-mono-tabular">
                    ₹15,000.00
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", display: "flex", flexDirection: "column", gap: "2px" }} className="font-mono-tabular">
                  <div>RRN: 202602149921</div>
                  <div style={{ color: isRrnDrifted ? "#E11D48" : "#475569", fontWeight: isRrnDrifted ? 700 : 500 }}>
                    Timestamp: {receiptClaimedTime}
                  </div>
                </div>
              </div>

              {/* Center Connector: Glowing Discrepancy Badge */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#DC2626",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 900,
                    boxShadow: "0 0 16px rgba(220, 38, 38, 0.45)",
                  }}
                >
                  ≠
                </div>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#DC2626", textAlign: "center", lineHeight: 1.1 }}>
                  Δ ₹2,00,000<br />MISMATCH
                </div>
              </div>

              {/* Right Box: SBI Core Banking Ledger (Tier 1) */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #A7F3D0",
                  background: "#ECFDF5",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
                    🏦 SBI Core Banking (Tier 1)
                  </span>
                  <span style={{ fontSize: "9px", background: "#059669", color: "#FFF", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                    ✓ FINACLE CERTIFIED
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#065F46" }}>Actual Settled Debit Amount</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#047857" }} className="font-mono-tabular">
                    ₹2,15,000.00
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#065F46", display: "flex", flexDirection: "column", gap: "2px" }} className="font-mono-tabular">
                  <div>RRN: 202602149921</div>
                  <div>Switch Time: 10:35:12 IST (NTP ±1ms)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Running Balance Table with Equation Banner */}
          <div
            style={{
              background: "var(--bento-card-bg, #FFFFFF)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
              minHeight: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Table Header Row with 1-Click Simulation Trigger */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>
                  Double-Entry Running Balance Conservation (Catches Doctored Row #14)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: mutations.alterBankRow14 ? "1px solid #DC2626" : "1px solid #E2E8F0",
                  background: mutations.alterBankRow14 ? "#FEF2F2" : "#F8FAFC",
                  color: mutations.alterBankRow14 ? "#DC2626" : "#475569",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={12} color={mutations.alterBankRow14 ? "#DC2626" : "#64748B"} />
                <span>{mutations.alterBankRow14 ? "Revert Row 14 Manipulation" : "⚡ Toggle Row 14 Tamper Simulation"}</span>
              </button>
            </div>

            {/* Visual Equation Banner */}
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: hasBalanceError ? "rgba(220, 38, 38, 0.08)" : "rgba(37, 99, 235, 0.06)",
                border: hasBalanceError ? "1px solid rgba(220, 38, 38, 0.3)" : "1px solid rgba(37, 99, 235, 0.2)",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <div style={{ color: hasBalanceError ? "#DC2626" : "var(--bento-text-main, #0F172A)" }}>
                <span>[ Row 13 Bal: ₹6,21,550 ]</span>
                <span style={{ margin: "0 4px", fontWeight: 800 }}>−</span>
                <span>[ Row 14 Debit: ₹2,15,000 ]</span>
                <span style={{ margin: "0 4px", fontWeight: 800 }}>=</span>
                <span style={{ fontWeight: 800, color: "#059669" }}>[ True Balance: ₹4,06,550 ]</span>
                {hasBalanceError && (
                  <>
                    <span style={{ margin: "0 6px", fontWeight: 900, color: "#DC2626" }}>≠</span>
                    <span style={{ fontWeight: 800, color: "#DC2626", background: "#FEE2E2", padding: "1px 6px", borderRadius: "4px" }}>
                      [ Doctored PDF Row #14: ₹5,06,550 (🚨 +₹1,00,000 Tampered!) ]
                    </span>
                  </>
                )}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: hasBalanceError ? "#DC2626" : "#059669",
                  textTransform: "uppercase",
                }}
              >
                {hasBalanceError ? "Conservation Invariant Broken" : "Conservation Invariant SAT"}
              </span>
            </div>

            {/* 6-Row Interactive Statement Table */}
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bento-border-subtle, #E2E8F0)", color: "var(--bento-text-muted, #64748B)" }}>
                    <th style={{ padding: "6px 8px" }}>Row</th>
                    <th style={{ padding: "6px 8px" }}>Date</th>
                    <th style={{ padding: "6px 8px" }}>Narration</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Debit (₹)</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Credit (₹)</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Balance (₹)</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bankRows.map((r) => (
                    <tr
                      key={r.rowNo}
                      style={{
                        borderBottom: "1px solid var(--bento-border-subtle, #F1F5F9)",
                        background: r.isTampered ? "rgba(220, 38, 38, 0.08)" : r.rowNo === 14 ? "rgba(37,99,235,0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "6px 8px", fontWeight: 700 }} className="font-mono-tabular">
                        #{r.rowNo}
                      </td>
                      <td style={{ padding: "6px 8px" }} className="font-mono-tabular">
                        {r.date}
                      </td>
                      <td style={{ padding: "6px 8px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: r.rowNo === 14 ? 700 : 500, color: r.isTampered ? "#DC2626" : "var(--bento-text-main, #0F172A)" }}>
                          {r.description}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: r.debit > 0 ? "#DC2626" : "inherit" }} className="font-mono-tabular">
                        {r.debit > 0 ? `₹${r.debit.toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: r.credit > 0 ? "#059669" : "inherit" }} className="font-mono-tabular">
                        {r.credit > 0 ? `₹${r.credit.toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: r.isTampered ? "#DC2626" : "var(--bento-text-main, #0F172A)" }} className="font-mono-tabular">
                        ₹{r.balance.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        {r.isTampered ? (
                          <span style={{ fontSize: "9px", background: "#DC2626", color: "#FFF", padding: "1px 6px", borderRadius: "3px", fontWeight: 800 }}>
                            🚨 TAMPERED
                          </span>
                        ) : (
                          <span style={{ fontSize: "9px", background: "rgba(5,150,105,0.1)", color: "#059669", padding: "1px 6px", borderRadius: "3px", fontWeight: 700 }}>
                            ✓ VALID
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (COL-SPAN-5): RRN ANATOMY, PDF STRUCTURAL & CGNAT SHIELD */}
        {/* ========================================================================= */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "10px", minHeight: 0, overflowY: "auto" }}>
          {/* Card 1: 12-Digit NPCI RRN Anatomy Card */}
          <div
            style={{
              background: "var(--bento-card-bg, #FFFFFF)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>
                NPCI 12-Digit RRN Anatomy (YDDDHHSSSSSS)
              </span>
              <span style={{ fontSize: "10px", background: "rgba(37,99,235,0.1)", color: "#2563EB", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                202602149921
              </span>
            </div>

            {/* 4 Connected Color-Coded Blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {/* Block 1: Year */}
              <div style={{ padding: "8px 6px", borderRadius: "6px", background: "#EEF2FF", border: "1px solid #C7D2FE", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color: "#4F46E5" }} className="font-mono-tabular">6</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#4338CA", textTransform: "uppercase" }}>Year Digit</div>
                <div style={{ fontSize: "9px", color: "#6366F1" }}>2026</div>
              </div>

              {/* Block 2: Julian Day */}
              <div style={{ padding: "8px 6px", borderRadius: "6px", background: "#ECFDF5", border: "1px solid #A7F3D0", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color: "#059669" }} className="font-mono-tabular">265</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>Julian Day</div>
                <div style={{ fontSize: "9px", color: "#10B981" }}>22 Sept</div>
              </div>

              {/* Block 3: Switch Hour (Alert on Mismatch) */}
              <div style={{ padding: "8px 6px", borderRadius: "6px", background: isRrnDrifted ? "#FEF2F2" : "#ECFDF5", border: isRrnDrifted ? "1px solid #FECDD3" : "1px solid #A7F3D0", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color: isRrnDrifted ? "#DC2626" : "#059669" }} className="font-mono-tabular">10</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: isRrnDrifted ? "#B91C1C" : "#047857", textTransform: "uppercase" }}>Switch Hour</div>
                <div style={{ fontSize: "9px", color: isRrnDrifted ? "#DC2626" : "#10B981", fontWeight: 700 }}>10:00 IST</div>
              </div>

              {/* Block 4: Sequence STAN */}
              <div style={{ padding: "8px 6px", borderRadius: "6px", background: "#F1F5F9", border: "1px solid #CBD5E1", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color: "#475569" }} className="font-mono-tabular">149921</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#334155", textTransform: "uppercase" }}>STAN Seq</div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>Central Gate</div>
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #64748B)", lineHeight: 1.4, marginTop: "2px" }}>
              {isRrnDrifted ? (
                <span style={{ color: "#DC2626", fontWeight: 700 }}>
                  🚨 Discrepancy Found: Extortion screenshot claims payment at 10:50 IST, but NPCI Central Switch RRN confirms execution hour is 10:00–10:35 IST (+15m drift).
                </span>
              ) : (
                <span>
                  ✓ NPCI Verification: Switch hour 10 matches Finacle core CBS execution at 10:35:12 IST within the standard ±180-second rollover tolerance window.
                </span>
              )}
            </div>
          </div>

          {/* Card 2: PDF Structural & Font Tamper Visual Card */}
          <div
            style={{
              background: "var(--bento-card-bg, #FFFFFF)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>
                PDF Structural & Font Tamper Analysis
              </span>
              <span style={{ fontSize: "9px", background: "#DC2626", color: "#FFF", padding: "1px 6px", borderRadius: "3px", fontWeight: 800 }}>
                CRITICAL ANOMALY
              </span>
            </div>

            {/* 2-Column Visual Diff */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Left Column: Official Bank PDF Baseline */}
              <div style={{ padding: "8px 10px", borderRadius: "8px", background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: "10px" }}>
                <div style={{ fontWeight: 800, color: "#059669", marginBottom: "4px" }}>
                  ✓ Official Bank PDF Baseline
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", color: "#475569" }} className="font-mono-tabular">
                  <div>Trailer: 1 %%EOF Marker</div>
                  <div>Font: Type1 FinacleSans</div>
                  <div>Signatures: Certified (SHA-256)</div>
                  <div>Byte Integrity: Unmodified</div>
                </div>
              </div>

              {/* Right Column: Submitted PDF Anomaly */}
              <div style={{ padding: "8px 10px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FECDD3", fontSize: "10px" }}>
                <div style={{ fontWeight: 800, color: "#DC2626", marginBottom: "4px" }}>
                  🚨 Submitted PDF (Doctored)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", color: "#991B1B" }} className="font-mono-tabular">
                  <div>Trailer: 2 %%EOF Markers (Appended)</div>
                  <div>Font: Arial Replacement @ Row 14</div>
                  <div>Baseline Shift: +2.4pt Overlay</div>
                  <div>Byte Offset: 0x0234FA Overwrite</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "#B91C1C", fontWeight: 600, lineHeight: 1.4 }}>
              Forensic Verdict: Incremental trailer appended post-generation to overwrite Row 14 credit figures in Foxit/Acrobat PDF Editor.
            </div>
          </div>

          {/* Card 3: CGNAT Innocent Citizen Privacy Shield Card */}
          <div
            style={{
              background: "var(--bento-card-bg, #FFFFFF)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>
                CGNAT Citizen Privacy Shield (DPDP Act, 2023)
              </span>
              <button
                type="button"
                onClick={() => setIsPrivacyUnmasked((p) => !p)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: isPrivacyUnmasked ? "rgba(220,38,38,0.1)" : "#F8FAFC",
                  color: isPrivacyUnmasked ? "#DC2626" : "var(--bento-text-secondary, #475569)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {isPrivacyUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{isPrivacyUnmasked ? "Re-mask Innocent PII" : "View Unmasked"}</span>
              </button>
            </div>

            {/* Visual Progress Bar of Ingested IPDR Rows */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, marginBottom: "3px" }}>
                <span style={{ color: "#059669" }}>9,996 Innocent Citizens (Masked)</span>
                <span style={{ color: "#DC2626" }}>4 Crime Sessions (Unmasked)</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: "99.96%", background: "#059669", height: "100%" }} />
                <div style={{ width: "0.04%", background: "#DC2626", height: "100%" }} />
              </div>
            </div>

            {/* Subscriber Details Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
              <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ color: "#64748B" }}>Public IPDR Gateway</div>
                <div style={{ fontWeight: 800, color: "var(--bento-text-main, #0F172A)" }}>103.21.144.92:49210</div>
              </div>
              <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ color: "#64748B" }}>Attributed Suspect</div>
                <div style={{ fontWeight: 800, color: "#DC2626" }}>
                  {isPrivacyUnmasked ? "+91-98711-23941" : "+91-XXXXX-3941"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #64748B)", lineHeight: 1.3 }}>
              Cryptographically verified by SHA-256 binary Merkle inclusion proof. Preserves statutory admissibility under Section 63 BSA while shielding non-accused subscribers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

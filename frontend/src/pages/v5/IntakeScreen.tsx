import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  FileCode,
  Shield,
  Activity,
  Layers,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { SaasExecutiveKpiCard } from "../../components/tarka/SaasExecutiveKpiCard";

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

  // 1. Double-Entry Running Balance Table State (Realistic Corporate / Retail UPI Statement)
  const initialBankRows: BankStatementRow[] = [
    { rowNo: 11, date: "22-09-2026", description: "OPENING BALANCE B/F", chqNo: "-", debit: 0, credit: 0, balance: 615890, expectedBalance: 615890, isTampered: false },
    { rowNo: 12, date: "22-09-2026", description: "UPI/DR/2626510148102/GROCERY_STORE/PYTM", chqNo: "UPI-8102", debit: 3450, credit: 0, balance: 612440, expectedBalance: 612440, isTampered: false },
    { rowNo: 13, date: "22-09-2026", description: "IMPS/CR/62651100981/SALARY_CORP/INFY", chqNo: "N140921", debit: 0, credit: 125000, balance: 737440, expectedBalance: 737440, isTampered: false },
    {
      rowNo: 14,
      date: "22-09-2026",
      description: "UPI/DR/2626510149921/VIKRAM_SHAH/SBIN",
      chqNo: "UPI-9921",
      debit: 215000,
      credit: 0,
      balance: 522440, // True: 737440 - 215000 = 522440. When tampered: 622440 (+1,00,000 false balance)
      expectedBalance: 522440,
      isTampered: false,
    },
    { rowNo: 15, date: "22-09-2026", description: "IMPS/DR/OUTWARD/ELECTRICITY_BILL", chqNo: "IMPS-021", debit: 4200, credit: 0, balance: 518240, expectedBalance: 518240, isTampered: false },
    { rowNo: 16, date: "22-09-2026", description: "ATM/WDL/SECTOR_18_NOIDA_DL049", chqNo: "ATM-991", debit: 10000, credit: 0, balance: 508240, expectedBalance: 508240, isTampered: false },
  ];

  // React to alterBankRow14 mutation
  const bankRows = useMemo(() => {
    const isTampered = mutations.alterBankRow14 || mutations.balanceJumpFraud;
    return initialBankRows.map((r) => {
      if (r.rowNo === 14) {
        return {
          ...r,
          balance: isTampered ? 622440 : 522440, // +₹1,00,000 false balance in doctored statement
          expectedBalance: 522440,
          isTampered: !!isTampered,
        };
      }
      return r;
    });
  }, [mutations.alterBankRow14, mutations.balanceJumpFraud]);

  const hasBalanceError = useMemo(() => bankRows.some((r) => r.isTampered), [bankRows]);

  // 2. Interactive RRN Live Input State
  const [typedRrn, setTypedRrn] = useState<string>("626510149921");
  const isRrnDrifted = mutations.forgeRrnTimestamp;

  // Parse typed RRN
  const rrnParsed = useMemo(() => {
    const sanitized = typedRrn.replace(/\D/g, "").padEnd(12, "0").slice(0, 12);
    const yearDigit = sanitized[0] || "6";
    const julianDay = sanitized.slice(1, 4) || "265";
    const hour = sanitized.slice(4, 6) || "10";
    const stanSeq = sanitized.slice(6, 12) || "149921";
    return { sanitized, yearDigit, julianDay, hour, stanSeq };
  }, [typedRrn]);

  // 3. Privacy Shield State
  const [isPrivacyUnmasked, setIsPrivacyUnmasked] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "16px 20px",
        gap: "14px",
        boxSizing: "border-box",
        overflowY: "auto",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* 1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (MIN-HEIGHT: 108PX, SALEZY / FLOWMAIL STYLE) */}
      <div className="saas-kpi-row">
        <SaasExecutiveKpiCard
          label="Balance Conservation"
          metric={hasBalanceError ? "₹1,00,000 Δ" : "₹5,22,440"}
          metricColor={hasBalanceError ? "#E11D48" : "#0F172A"}
          subtext={hasBalanceError ? "Row #14 balance doctored by +₹1,00,000" : "Row #14 balance mathematically conserved"}
          statusBadge={{
            text: hasBalanceError ? "TAMPER DETECTED" : "VERIFIED ✓",
            variant: hasBalanceError ? "rose" : "emerald",
          }}
          icon={hasBalanceError ? AlertTriangle : CheckCircle2}
          iconColor={hasBalanceError ? "#E11D48" : "#059669"}
          iconBg={hasBalanceError ? "#FFF1F2" : "#ECFDF5"}
        />

        <SaasExecutiveKpiCard
          label="NPCI RRN Clock Match"
          metric={isRrnDrifted ? "+50m Drift" : "10:00:00 IST"}
          metricColor={isRrnDrifted ? "#E11D48" : "#0F172A"}
          subtext={isRrnDrifted ? "Receipt claims 10:50 forged time vs 10:00 switch" : "Switch hour '10' perfectly matches transaction"}
          statusBadge={{
            text: isRrnDrifted ? "TIMESTAMP FORGED" : "SYNCHRONIZED",
            variant: isRrnDrifted ? "rose" : "emerald",
          }}
          icon={Clock}
          iconColor={isRrnDrifted ? "#E11D48" : "#4F46E5"}
          iconBg={isRrnDrifted ? "#FFF1F2" : "#EEF2FF"}
        />

        <SaasExecutiveKpiCard
          label="PDF XRef Integrity"
          metric="2 %%EOF Trails"
          metricColor="#D97706"
          subtext="Incremental update appended with Arial font swap"
          statusBadge={{
            text: "MANIPULATED",
            variant: "amber",
          }}
          icon={FileCode}
          iconColor="#D97706"
          iconBg="#FFFBEB"
        />

        <SaasExecutiveKpiCard
          label="Citizen Privacy Shield"
          metric="99.96% Masked"
          metricColor="#059669"
          subtext="9,996 innocent subscribers blinded under BSA § 63"
          statusBadge={{
            text: "BLIND MERKLE ACTIVE",
            variant: "emerald",
          }}
          icon={Shield}
          iconColor="#059669"
          iconBg="#ECFDF5"
        />
      </div>

      {/* 2. MAIN 12-COLUMN BENTO GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 7 COLUMNS (EVIDENCE COMPARISON + DOUBLE-ENTRY BANK CSV TABLE) */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 1: PHONE RECEIPT VS SBI CBS LEDGER COMPARISON */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
            }}
          >
            {/* Plain-English Takeaway Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={15} color="#4F46E5" />
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1E1B4B" }}>
                  What this means for IO: Suspect's screenshot claims ₹15,000, but SBI Core Banking settled ₹2,15,000 (+₹2,00,000 hidden fraud debit).
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: "5px",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-mono)",
                }}
              >
                PROVABLE FRAUD
              </span>
            </div>

            {/* Side-by-Side Comparison Boxes with Diagonal Hatched SVG Bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center" }}>
              {/* Left Box: Submitted Phone Receipt (Tier 3) */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#BE123C", textTransform: "uppercase" }}>
                    Suspect Phone Receipt
                  </span>
                  <span style={{ fontSize: "9.5px", background: "#FFE4E6", color: "#BE123C", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                    TIER 3 UNVERIFIED
                  </span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>
                  ₹15,000.00
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  Claimed Time: <strong className="font-mono-tabular" style={{ color: "#BE123C" }}>{isRrnDrifted ? "10:50:00 IST (+50m)" : "10:50:00 IST"}</strong>
                </div>

                {/* Mini SVG Hatched Bar for 15k */}
                <div style={{ width: "100%", height: "14px", background: "#FFE4E6", borderRadius: "4px", overflow: "hidden", marginTop: "4px" }}>
                  <div className="hatch-pattern-rose" style={{ width: "14%", height: "100%", background: "#E11D48" }} />
                </div>
              </div>

              {/* Center Connector Badge */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: "#E11D48",
                    color: "#FFFFFF",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 2px 6px rgba(225,29,72,0.3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ≠ Δ ₹2,00,000 MISMATCH
                </span>
                <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>
                  Doctored by +1333%
                </span>
              </div>

              {/* Right Box: SBI Core Banking System (Tier 1) */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>
                    SBI CBS Central Ledger
                  </span>
                  <span style={{ fontSize: "9.5px", background: "#D1FAE5", color: "#047857", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                    TIER 1 INDEPENDENT
                  </span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  ₹2,15,000.00
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  Settled Time: <strong className="font-mono-tabular" style={{ color: "#047857" }}>10:00:14 IST (NTP Sync)</strong>
                </div>

                {/* Mini SVG Hatched Bar for 2.15L (100% width) */}
                <div style={{ width: "100%", height: "14px", background: "#D1FAE5", borderRadius: "4px", overflow: "hidden", marginTop: "4px" }}>
                  <div className="hatch-pattern-emerald" style={{ width: "100%", height: "100%", background: "#059669" }} />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: BANK CSV RUNNING-BALANCE TABLE WITH HIGH-CONTRAST LEGIBILITY */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Table Header with Toggle Simulation Trigger */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>Bank Statement CSV Audit & Running-Balance Validator</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#F1F5F9", color: "#475569" }}>
                    BSA § 63(4) CERTIFIED
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  Verifies <code className="font-mono-tabular">Balance[k-1] + Credit[k] - Debit[k] = Balance[k]</code> across all statement rows.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: mutations.alterBankRow14 ? "1px solid #E11D48" : "1px solid #E2E8F0",
                  background: mutations.alterBankRow14 ? "#FFF1F2" : "#F8FAFC",
                  color: mutations.alterBankRow14 ? "#BE123C" : "#0F172A",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={13} color={mutations.alterBankRow14 ? "#E11D48" : "#4F46E5"} />
                <span>{mutations.alterBankRow14 ? "Revert Row #14 Tampering" : "⚡ Toggle Row 14 Tamper Simulation"}</span>
              </button>
            </div>

            {/* Formula Callout Banner */}
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: hasBalanceError ? "#FFF1F2" : "#F0FDF4",
                border: hasBalanceError ? "1px solid #FECDD3" : "1px solid #BBF7D0",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ color: hasBalanceError ? "#BE123C" : "#047857", fontWeight: 600 }}>
                <span>[Prev Bal #13: ₹7,37,440]</span>
                <span style={{ margin: "0 4px", fontWeight: 800 }}>−</span>
                <span>[Debit #14: ₹2,15,000]</span>
                <span style={{ margin: "0 4px", fontWeight: 800 }}>=</span>
                <span style={{ fontWeight: 800 }}>[True Bal: ₹5,22,440]</span>
                {hasBalanceError && (
                  <>
                    <span style={{ margin: "0 6px", fontWeight: 900, color: "#E11D48" }}>≠</span>
                    <span style={{ fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 6px", borderRadius: "4px" }}>
                      [Doctored Row #14 in PDF: ₹6,22,440 (🚨 +₹1,00,000 Jump)]
                    </span>
                  </>
                )}
              </div>
              <span style={{ fontSize: "10.5px", fontWeight: 800, color: hasBalanceError ? "#BE123C" : "#047857", textTransform: "uppercase" }}>
                {hasBalanceError ? "INVARIANT FAILS" : "INVARIANT CONSERVED ✓"}
              </span>
            </div>

            {/* 100% High-Contrast Legible Table */}
            <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <table className="bento-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Date</th>
                    <th>Narration</th>
                    <th style={{ textAlign: "right" }}>Debit (₹)</th>
                    <th style={{ textAlign: "right" }}>Credit (₹)</th>
                    <th style={{ textAlign: "right" }}>Balance (₹)</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bankRows.map((r) => (
                    <tr
                      key={r.rowNo}
                      style={{
                        background: r.isTampered ? "#FFF1F2" : r.rowNo === 14 ? "#EEF2FF" : "#FFFFFF",
                      }}
                    >
                      <td style={{ fontWeight: 800, color: "#0F172A" }}>#{r.rowNo}</td>
                      <td style={{ color: "#475569" }}>{r.date}</td>
                      <td style={{ maxWidth: "260px", color: r.isTampered ? "#BE123C" : "#0F172A", fontWeight: r.rowNo === 14 ? 700 : 500 }}>
                        {r.description}
                      </td>
                      <td style={{ textAlign: "right", color: r.debit > 0 ? "#E11D48" : "#94A3B8", fontWeight: r.debit > 0 ? 700 : 400 }}>
                        {r.debit > 0 ? `₹${r.debit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: r.credit > 0 ? "#059669" : "#94A3B8", fontWeight: r.credit > 0 ? 700 : 400 }}>
                        {r.credit > 0 ? `₹${r.credit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: r.isTampered ? "#BE123C" : "#0F172A",
                          fontSize: "13px",
                        }}
                      >
                        ₹{r.balance.toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {r.isTampered ? (
                          <span style={{ fontSize: "10px", background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "2px 7px", borderRadius: "5px", fontWeight: 800 }}>
                            🚨 TAMPERED
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "2px 7px", borderRadius: "5px", fontWeight: 700 }}>
                            VALID ✓
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

        {/* RIGHT COLUMN: 5 COLUMNS (NPCI RRN DECODER + PDF XREF + CITIZEN PRIVACY SHIELD) */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 2: 12-DIGIT NPCI RRN ANATOMICAL DECODER WITH LIVE INPUT */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={15} color="#4F46E5" />
                  <span>NPCI RRN 12-Digit Anatomical Decoder</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                  Cryptographically decodes Julian day and central switch hour.
                </div>
              </div>

              {/* Interactive RRN Live Input */}
              <input
                type="text"
                value={typedRrn}
                onChange={(e) => setTypedRrn(e.target.value)}
                maxLength={12}
                style={{
                  width: "130px",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  textAlign: "center",
                  background: "#F8FAFC",
                  color: "#0F172A",
                }}
                title="Type any 12-digit RRN to decode live"
              />
            </div>

            {/* 4 Anatomical Blocks with Top Indigo Accent Borders */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {/* Digit 1: Year */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderTop: "3px solid #4F46E5",
                  borderRadius: "8px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Year</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)" }}>
                  {rrnParsed.yearDigit}
                </div>
                <div style={{ fontSize: "10px", color: "#0F172A", fontWeight: 600 }}>202{rrnParsed.yearDigit}</div>
              </div>

              {/* Digits 2-4: Julian Day */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderTop: "3px solid #059669",
                  borderRadius: "8px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Julian Day</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)" }}>
                  {rrnParsed.julianDay}
                </div>
                <div style={{ fontSize: "10px", color: "#0F172A", fontWeight: 600 }}>22 Sept</div>
              </div>

              {/* Digits 5-6: Switch Hour */}
              <div
                style={{
                  background: isRrnDrifted ? "#FFF1F2" : "#F8FAFC",
                  border: isRrnDrifted ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                  borderTop: isRrnDrifted ? "3px solid #E11D48" : "3px solid #4F46E5",
                  borderRadius: "8px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: isRrnDrifted ? "#BE123C" : "#64748B", textTransform: "uppercase" }}>Hour (IST)</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: isRrnDrifted ? "#BE123C" : "#4F46E5", fontFamily: "var(--font-mono)" }}>
                  {rrnParsed.hour}:00
                </div>
                <div style={{ fontSize: "10px", color: isRrnDrifted ? "#BE123C" : "#0F172A", fontWeight: 600 }}>
                  {isRrnDrifted ? "≠ 10:50 Rec" : "Exact Match"}
                </div>
              </div>

              {/* Digits 7-12: STAN Sequence */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderTop: "3px solid #64748B",
                  borderRadius: "8px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>STAN Seq</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  {rrnParsed.stanSeq}
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>Unique Trace</div>
              </div>
            </div>
          </div>

          {/* CARD 4: PDF XREF STRUCTURAL & FONT TAMPER INSPECTOR */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                PDF XRef Structure & Font Tamper Inspector
              </div>
              <span style={{ fontSize: "10px", background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "2px 7px", borderRadius: "5px", fontWeight: 700 }}>
                NON-CANONICAL
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* Box 1: %%EOF Markers */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>XRef End-of-File Markers</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#E11D48", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
                  2 %%EOF Found
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  Bank statement was re-opened in Preview/Canva and incrementally saved with modified row #14 text.
                </div>
              </div>

              {/* Box 2: Embedded Font Discrepancy */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Font Stream Anomaly</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
                  Arial vs Finacle Helvetica
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  Row #14 balance glyphs use unhinted TrueType font distinct from CBS Finacle PostScript stream.
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: CGNAT INNOCENT CITIZEN PRIVACY MERKLE SHIELD */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={14} color="#059669" />
                  <span>CGNAT Innocent Citizen Merkle Shield (BSA § 63)</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                  Cryptographically blinds innocent subscribers sharing the public CGNAT IP pool.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivacyUnmasked(!isPrivacyUnmasked)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  background: isPrivacyUnmasked ? "#FFF1F2" : "#F8FAFC",
                  color: isPrivacyUnmasked ? "#BE123C" : "#475569",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isPrivacyUnmasked ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{isPrivacyUnmasked ? "Mask Citizens" : "Simulate Unmask"}</span>
              </button>
            </div>

            {/* Visual 99.96% Masked Progress Bar with Hatching */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
                <span>Innocent Subscribers Blinded (9,996)</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>Target Fraudsters Unmasked (4)</span>
              </div>
              <div style={{ width: "100%", height: "12px", background: "#E2E8F0", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                <div className="hatch-pattern" style={{ width: "99.96%", background: "#059669", height: "100%" }} />
                <div style={{ width: "0.04%", background: "#E11D48", height: "100%" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B" }}>HMAC Salted Blind Index</div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                  b189a9f2...e7492c
                </div>
              </div>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontSize: "10px", color: "#64748B" }}>Judicial Verification</div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669" }}>
                  Zero Collateral PII Leakage
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

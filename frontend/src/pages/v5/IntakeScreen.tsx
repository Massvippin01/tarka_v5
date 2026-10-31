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
  ChevronDown,
  ChevronUp,
  FileCheck2,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { BentoKpiCard, SalezyHatchedBarChart } from "../../components/tarka/BentoPrimitives";

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

  // 1. Polarity Switcher (ASC Oldest-First vs DESC Newest-First)
  const [polarity, setPolarity] = useState<"ASC" | "DESC">("ASC");

  // 2. Base Bank Statement Rows
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
      balance: 522440, // True balance: 737440 - 215000 = 522440. Tampered in doctored PDF: 622440 (+₹1,00,000 false balance)
      expectedBalance: 522440,
      isTampered: false,
    },
    { rowNo: 15, date: "22-09-2026", description: "IMPS/DR/OUTWARD/ELECTRICITY_BILL", chqNo: "IMPS-021", debit: 4200, credit: 0, balance: 518240, expectedBalance: 518240, isTampered: false },
    { rowNo: 16, date: "22-09-2026", description: "ATM/WDL/SECTOR_18_NOIDA_DL049", chqNo: "ATM-991", debit: 10000, credit: 0, balance: 508240, expectedBalance: 508240, isTampered: false },
  ];

  // Tamper State from global mutations or inline toggle
  const isRow14Tampered = mutations.alterBankRow14 || mutations.balanceJumpFraud;

  const bankRows = useMemo(() => {
    let list = initialBankRows.map((r) => {
      if (r.rowNo === 14) {
        return {
          ...r,
          balance: isRow14Tampered ? 622440 : 522440,
          expectedBalance: 522440,
          isTampered: !!isRow14Tampered,
        };
      }
      if (r.rowNo > 14 && isRow14Tampered) {
        // Downstream rows cascade with +₹1,00,000 false balance in doctored statement
        return {
          ...r,
          balance: r.balance + 100000,
          expectedBalance: r.balance,
          isTampered: true,
        };
      }
      return r;
    });

    if (polarity === "DESC") {
      list = [...list].reverse();
    }
    return list;
  }, [isRow14Tampered, polarity]);

  const hasBalanceError = useMemo(() => bankRows.some((r) => r.isTampered), [bankRows]);

  // 3. Interactive RRN Live Input State & Presets
  const [typedRrn, setTypedRrn] = useState<string>("626510149921");
  const isRrnDrifted = mutations.forgeRrnTimestamp || typedRrn === "630010149921";

  // Parse typed 12-digit RRN
  const rrnParsed = useMemo(() => {
    const sanitized = typedRrn.replace(/\D/g, "").padEnd(12, "0").slice(0, 12);
    const yearDigit = sanitized[0] || "6";
    const julianDay = sanitized.slice(1, 4) || "265";
    const hour = sanitized.slice(4, 6) || "10";
    const stanSeq = sanitized.slice(6, 12) || "149921";

    const julianNum = parseInt(julianDay, 10);
    const hourNum = parseInt(hour, 10);
    const isHourRollover = hourNum === 23;
    const isDateDrifted = julianNum !== 265 || isRrnDrifted;

    return {
      sanitized,
      yearDigit,
      julianDay,
      hour,
      stanSeq,
      julianNum,
      hourNum,
      isHourRollover,
      isDateDrifted,
    };
  }, [typedRrn, isRrnDrifted]);

  // 4. Privacy Shield State & Merkle Proof Inspector
  const [isPrivacyUnmasked, setIsPrivacyUnmasked] = useState(false);
  const [inspectMerkleBranch, setInspectMerkleBranch] = useState(false);

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
      {/* =========================================================================
          1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (BENTO-GRID-4 WITH BENTOKPICARD)
          ========================================================================= */}
      <div className="bento-grid-4">
        {/* Card 1: Ledger Conservation */}
        <BentoKpiCard
          title="Ledger Conservation"
          metric={hasBalanceError ? "Row #14 Fail" : "100% Valid"}
          metricColor={hasBalanceError ? "#E11D48" : "#0F172A"}
          subtitle={hasBalanceError ? "Row #14 balance doctored (+₹1,00,000)" : "6 CBS rows mathematically reconciled"}
          statusBadge={{
            text: hasBalanceError ? "INVARIANT BREACH" : "VERIFIED ✓",
            variant: hasBalanceError ? "rose" : "emerald",
          }}
          delta={{
            value: hasBalanceError ? "Δ +₹1,00,000" : "6/6 Reconciled",
            isWarning: hasBalanceError,
            isPositive: !hasBalanceError,
          }}
          icon={hasBalanceError ? AlertTriangle : CheckCircle2}
          iconColor={hasBalanceError ? "#E11D48" : "#059669"}
          iconBg={hasBalanceError ? "#FFF1F2" : "#ECFDF5"}
          sparklineData={hasBalanceError ? [100, 100, 100, 20, 10, 0] : [100, 100, 100, 100, 100, 100]}
        />

        {/* Card 2: NPCI RRN Clock Sync */}
        <BentoKpiCard
          title="NPCI RRN Clock Sync"
          metric={rrnParsed.isDateDrifted ? "+50m Drift" : "10:00:14 IST"}
          metricColor={rrnParsed.isDateDrifted ? "#E11D48" : "#0F172A"}
          subtitle={rrnParsed.isDateDrifted ? "Receipt claims 10:50:00 vs 10:00:14 switch" : "Julian Day 265 matches switch log"}
          statusBadge={{
            text: rrnParsed.isDateDrifted ? "CLOCK DISCREPANCY" : "Δ +14s NTP SYNC",
            variant: rrnParsed.isDateDrifted ? "rose" : "indigo",
          }}
          delta={{
            value: rrnParsed.isDateDrifted ? "+50m Drift" : "+14s NTP",
            isWarning: rrnParsed.isDateDrifted,
            isPositive: !rrnParsed.isDateDrifted,
          }}
          icon={Clock}
          iconColor={rrnParsed.isDateDrifted ? "#E11D48" : "#4F46E5"}
          iconBg={rrnParsed.isDateDrifted ? "#FFF1F2" : "#EEF2FF"}
          sparklineData={rrnParsed.isDateDrifted ? [14, 14, 15, 60, 180, 3000] : [14, 14, 15, 14, 13, 14]}
        />

        {/* Card 3: PDF Binary Integrity */}
        <BentoKpiCard
          title="PDF Binary Integrity"
          metric="2 %%EOF Trails"
          metricColor="#D97706"
          subtitle="Font replacement detected on Row #14"
          statusBadge={{
            text: "INCREMENTAL EDIT",
            variant: "amber",
          }}
          delta={{
            value: "Arial Injected",
            isWarning: true,
            label: "Canva Overlay",
          }}
          icon={FileCode}
          iconColor="#D97706"
          iconBg="#FFFBEB"
          sparklineData={[1, 1, 1, 2, 2, 2]}
        />

        {/* Card 4: Citizen Privacy Shield */}
        <BentoKpiCard
          title="Citizen Privacy Shield"
          metric="99.96% Masked"
          metricColor="#059669"
          subtitle="9,996 of 10,000 IPDR rows blinded"
          statusBadge={{
            text: "MERKLE SEALED",
            variant: "emerald",
          }}
          delta={{
            value: "4 Suspects Unmasked",
            isPositive: true,
            label: "BSA § 63 Clean",
          }}
          icon={Shield}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[99.9, 99.94, 99.96, 99.96, 99.96, 99.96]}
        />
      </div>

      {/* =========================================================================
          2. ROW 2: CLAIMED RECEIPT INFOGRAPHIC (7 COL) & NPCI RRN BIT-ANATOMY (5 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flexShrink: 0 }}>
        {/* ROW 2 LEFT (7 COLUMNS): CLAIMED RECEIPT VS CORE BANKING INFOGRAPHIC */}
        <div
          style={{
            gridColumn: "span 7",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Card Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={16} color="#E11D48" />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                  Receipt vs. Core Banking Discrepancy
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "5px",
                    background: "#FFF1F2",
                    color: "#BE123C",
                    border: "1px solid #FECDD3",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  PROVABLE TAMPERING
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                Suspect's screenshot claims ₹15,000, but SBI Finacle CBS settled ₹2,15,000 (Δ ₹2,00,000 hidden debit).
              </div>
            </div>
          </div>

          {/* Visual Grid: SalezyHatchedBarChart on Left + Stamped Evidence Cards on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px", alignItems: "center" }}>
            {/* Left: SalezyHatchedBarChart */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <SalezyHatchedBarChart
                claimedAmount={15000}
                settledAmount={215000}
                claimedLabel="Claimed Screenshot"
                settledLabel="SBI CBS Settled"
                height={190}
              />
            </div>

            {/* Right: Stacked Comparison Cards with Discrepancy Ratio */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Top Box: Claimed Phone Screenshot (Tier 3) */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#BE123C", textTransform: "uppercase" }}>
                    Tier 3 Unverified Screenshot
                  </span>
                  <span style={{ fontSize: "9px", background: "#FFE4E6", color: "#BE123C", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                    10:50:00 IST
                  </span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>
                  ₹15,000.00
                </div>
                <div style={{ fontSize: "10px", color: "#9F1239" }}>
                  Suspect WhatsApp capture · Lacks CBS digital cryptographic anchor
                </div>
              </div>

              {/* Bottom Box: SBI Core Banking Central Ledger (Tier 1) */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>
                    Tier 1 SBI Finacle Ledger
                  </span>
                  <span style={{ fontSize: "9px", background: "#D1FAE5", color: "#047857", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                    10:00:14 IST (NTP)
                  </span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                  ₹2,15,000.00
                </div>
                <div style={{ fontSize: "10px", color: "#065F46" }}>
                  Core Banking Switch record · Signed via ISO 17025 SHA-256 HSM
                </div>
              </div>

              {/* Visual 14.3x Discrepancy Ratio Meter */}
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                    Discrepancy Ratio
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>
                    14.3× (+1333%)
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "#E11D48",
                    color: "#FFFFFF",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 2px 6px rgba(225,29,72,0.25)",
                  }}
                >
                  Δ ₹2,00,000 Hidden Debit
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2 RIGHT (5 COLUMNS): 12-DIGIT NPCI RRN BIT-ANATOMY INFOGRAPHIC */}
        <div
          style={{
            gridColumn: "span 5",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Header with Title & Quick Preset Chips */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={16} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  12-Digit NPCI RRN Bit-Anatomy
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>
                Cryptographically parses Julian day, hour, and STAN trace.
              </div>
            </div>

            {/* Interactive RRN Live Input */}
            <input
              type="text"
              value={typedRrn}
              onChange={(e) => setTypedRrn(e.target.value)}
              maxLength={12}
              style={{
                width: "125px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                textAlign: "center",
                background: "#F8FAFC",
                color: "#0F172A",
                outline: "none",
              }}
              title="Type any 12-digit RRN to decode live"
            />
          </div>

          {/* Quick-Test Preset Chips */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setTypedRrn("626510149921")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                border: typedRrn === "626510149921" ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                background: typedRrn === "626510149921" ? "#EEF2FF" : "#F8FAFC",
                color: typedRrn === "626510149921" ? "#4338CA" : "#64748B",
                cursor: "pointer",
              }}
            >
              Valid RRN (22 Sep)
            </button>
            <button
              type="button"
              onClick={() => setTypedRrn("630010149921")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                border: typedRrn === "630010149921" ? "1px solid #E11D48" : "1px solid #E2E8F0",
                background: typedRrn === "630010149921" ? "#FFF1F2" : "#F8FAFC",
                color: typedRrn === "630010149921" ? "#BE123C" : "#64748B",
                cursor: "pointer",
              }}
            >
              Forged Date RRN
            </button>
            <button
              type="button"
              onClick={() => setTypedRrn("626523999999")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                border: typedRrn === "626523999999" ? "1px solid #059669" : "1px solid #E2E8F0",
                background: typedRrn === "626523999999" ? "#ECFDF5" : "#F8FAFC",
                color: typedRrn === "626523999999" ? "#047857" : "#64748B",
                cursor: "pointer",
              }}
            >
              Midnight 23:59 Rollover
            </button>
          </div>

          {/* Visual Segmented Bit-Bar (Proportional 1d + 3d + 2d + 6d) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1.1fr 1.8fr", gap: "6px" }}>
            {/* Digit 1: Year (1d) */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderTop: "3px solid #4F46E5",
                borderRadius: "8px",
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>[6] Year</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {rrnParsed.yearDigit}
              </div>
              <div style={{ fontSize: "9.5px", color: "#0F172A", fontWeight: 600 }}>202{rrnParsed.yearDigit}</div>
            </div>

            {/* Digits 2-4: Julian Day (3d) */}
            <div
              style={{
                background: rrnParsed.isDateDrifted ? "#FFF1F2" : "#F8FAFC",
                border: rrnParsed.isDateDrifted ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                borderTop: rrnParsed.isDateDrifted ? "3px solid #E11D48" : "3px solid #0EA5E9",
                borderRadius: "8px",
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: rrnParsed.isDateDrifted ? "#BE123C" : "#64748B", textTransform: "uppercase" }}>
                [{rrnParsed.julianDay}] Day
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: rrnParsed.isDateDrifted ? "#BE123C" : "#0EA5E9", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {rrnParsed.julianDay}
              </div>
              <div style={{ fontSize: "9.5px", color: rrnParsed.isDateDrifted ? "#BE123C" : "#0F172A", fontWeight: 600 }}>
                {rrnParsed.julianNum === 265 ? "22 Sep" : `Day ${rrnParsed.julianNum}`}
              </div>
            </div>

            {/* Digits 5-6: Switch Hour (2d) */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderTop: "3px solid #10B981",
                borderRadius: "8px",
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                [{rrnParsed.hour}] Hour
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {rrnParsed.hour}:00
              </div>
              <div style={{ fontSize: "9.5px", color: "#0F172A", fontWeight: 600 }}>IST Central</div>
            </div>

            {/* Digits 7-12: STAN Sequence (6d) */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderTop: "3px solid #8B5CF6",
                borderRadius: "8px",
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                [{rrnParsed.stanSeq}] STAN
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#8B5CF6", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                {rrnParsed.stanSeq}
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748B", fontWeight: 600 }}>Unique Trace ID</div>
            </div>
          </div>

          {/* Bottom Timeline Tolerance Meter (-180s to +180s IST Switch Rollover Window) */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#475569" }}>
                Switch Rollover Window: [-180s, +180s] IST
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: rrnParsed.isDateDrifted ? "#FFF1F2" : "#ECFDF5",
                  color: rrnParsed.isDateDrifted ? "#BE123C" : "#047857",
                  border: rrnParsed.isDateDrifted ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                }}
              >
                {rrnParsed.isDateDrifted ? "REJECTED (EXCEEDED)" : "ADMISSIBLE (BSA § 63)"}
              </span>
            </div>

            {/* Visual Tolerance Track */}
            <div style={{ position: "relative", height: "14px", background: "#E2E8F0", borderRadius: "7px", overflow: "hidden" }}>
              {/* Safe Green Zone */}
              <div style={{ position: "absolute", left: "25%", width: "50%", top: 0, bottom: 0, background: "rgba(16, 185, 129, 0.4)", borderRadius: "4px" }} />
              {/* Center Line (0s) */}
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "#64748B", zIndex: 2 }} />
              {/* Marker for Current Drift */}
              <div
                style={{
                  position: "absolute",
                  left: rrnParsed.isDateDrifted ? "92%" : "53.8%", // +14s relative to +/-180s
                  top: "2px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: rrnParsed.isDateDrifted ? "#E11D48" : "#059669",
                  border: "2px solid #FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  zIndex: 5,
                  transform: "translateX(-50%)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              <span>-180s</span>
              <span style={{ fontWeight: 700, color: rrnParsed.isDateDrifted ? "#BE123C" : "#059669" }}>
                {rrnParsed.isDateDrifted ? "Drift: +3,000s (+50m Mismatch)" : "Observed Drift: +14s NTP (Normal)"}
              </span>
              <span>+180s</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ROW 3: FULL 6-ROW BANK CSV TABLE (7 COL) & PDF XREF + CGNAT (5 COL)
          ========================================================================= */}
      <div className="bento-grid-12" style={{ flex: 1, minHeight: 0 }}>
        {/* ROW 3 LEFT (7 COLUMNS): FULL 6-ROW BANK CSV RUNNING-BALANCE TABLE */}
        <div
          style={{
            gridColumn: "span 7",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* Header with Title, Button & ASC/DESC Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileCheck2 size={16} color="#4F46E5" />
                <span>Bank Statement CSV & Running-Balance Validator</span>
                <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#F1F5F9", color: "#475569" }}>
                  BSA § 63(4) CERTIFIED
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>
                Reconciles double-entry conservation invariant across all statement rows.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* ASC / DESC Polarity Switcher */}
              <div style={{ display: "inline-flex", background: "#F1F5F9", padding: "2px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <button
                  type="button"
                  onClick={() => setPolarity("ASC")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: polarity === "ASC" ? "#FFFFFF" : "transparent",
                    color: polarity === "ASC" ? "#4F46E5" : "#64748B",
                    boxShadow: polarity === "ASC" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  ASC (Oldest)
                </button>
                <button
                  type="button"
                  onClick={() => setPolarity("DESC")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: polarity === "DESC" ? "#FFFFFF" : "transparent",
                    color: polarity === "DESC" ? "#4F46E5" : "#64748B",
                    boxShadow: polarity === "DESC" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  DESC (Newest)
                </button>
              </div>

              {/* Toggle Row #14 Tamper Button */}
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: isRow14Tampered ? "1px solid #E11D48" : "1px solid #E2E8F0",
                  background: isRow14Tampered ? "#FFF1F2" : "#F8FAFC",
                  color: isRow14Tampered ? "#BE123C" : "#0F172A",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={12} color={isRow14Tampered ? "#E11D48" : "#4F46E5"} />
                <span>{isRow14Tampered ? "Revert Row #14" : "⚡ Toggle Row #14 Tamper (-₹2.0L)"}</span>
              </button>
            </div>
          </div>

          {/* Formula Callout Banner */}
          <div
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              background: hasBalanceError ? "#FFF1F2" : "#F0FDF4",
              border: hasBalanceError ? "1px solid #FECDD3" : "1px solid #BBF7D0",
              fontSize: "11.5px",
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <div style={{ color: hasBalanceError ? "#BE123C" : "#047857", fontWeight: 600 }}>
              <span>Balance[k-1] (₹7,37,440)</span>
              <span style={{ margin: "0 3px", fontWeight: 800 }}>+</span>
              <span>Credit[k] (₹0)</span>
              <span style={{ margin: "0 3px", fontWeight: 800 }}>−</span>
              <span>Debit[k] (₹2,15,000)</span>
              <span style={{ margin: "0 3px", fontWeight: 800 }}>=</span>
              <span style={{ fontWeight: 800 }}>True Balance[k] (₹5,22,440)</span>
              {hasBalanceError && (
                <>
                  <span style={{ margin: "0 5px", fontWeight: 900, color: "#E11D48" }}>≠</span>
                  <span style={{ fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "4px" }}>
                    Reported: ₹6,22,440 🚨 (+₹1,00,000 False Balance)
                  </span>
                </>
              )}
            </div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: hasBalanceError ? "#BE123C" : "#047857", textTransform: "uppercase" }}>
              {hasBalanceError ? "INVARIANT BREACH ✗" : "CONSERVED ✓"}
            </span>
          </div>

          {/* High-Clarity Table (ALL 6 ROWS VISIBLE, STRICT NO-WRAPPING ON DATE) */}
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              flex: 1,
              minHeight: 0,
            }}
          >
            <table className="bento-table" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ width: "45px", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>Row</th>
                  <th style={{ width: "96px", minWidth: "96px", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>Date</th>
                  <th style={{ padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>Narration</th>
                  <th style={{ width: "105px", minWidth: "105px", textAlign: "right", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>Debit (₹)</th>
                  <th style={{ width: "105px", minWidth: "105px", textAlign: "right", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>Credit (₹)</th>
                  <th style={{ width: "115px", minWidth: "115px", textAlign: "right", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>Balance (₹)</th>
                  <th style={{ width: "95px", minWidth: "92px", textAlign: "center", padding: "8px 10px", fontSize: "10.5px", fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map((r) => (
                  <tr
                    key={r.rowNo}
                    style={{
                      background: r.isTampered ? "#FFF1F2" : r.rowNo === 14 ? "#F0F4FF" : "#FFFFFF",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "7px 10px", fontWeight: 800, color: "#0F172A", borderBottom: "1px solid #F1F5F9", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                      #{r.rowNo}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#475569", borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap", minWidth: "96px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {r.date}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        color: r.isTampered ? "#BE123C" : "#0F172A",
                        fontWeight: r.rowNo === 14 ? 700 : 500,
                        borderBottom: "1px solid #F1F5F9",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "11px",
                      }}
                      title={r.description}
                    >
                      {r.description}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: r.debit > 0 ? "#E11D48" : "#94A3B8", fontWeight: r.debit > 0 ? 700 : 400, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {r.debit > 0 ? `₹${r.debit.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: r.credit > 0 ? "#059669" : "#94A3B8", fontWeight: r.credit > 0 ? 700 : 400, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {r.credit > 0 ? `₹${r.credit.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: r.isTampered ? "#BE123C" : "#0F172A",
                        fontSize: "11.5px",
                        borderBottom: "1px solid #F1F5F9",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ₹{r.balance.toLocaleString("en-IN")}
                      {r.isTampered && r.rowNo === 14 && (
                        <span style={{ display: "block", fontSize: "9px", color: "#E11D48", fontWeight: 700 }}>
                          Δ +₹1,00,000 Jump
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                      {r.isTampered ? (
                        <span style={{ fontSize: "9px", background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "2px 5px", borderRadius: "4px", fontWeight: 800 }}>
                          🚨 TAMPERED
                        </span>
                      ) : (
                        <span style={{ fontSize: "9px", background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "2px 5px", borderRadius: "4px", fontWeight: 700 }}>
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

        {/* ROW 3 RIGHT (5 COLUMNS): PDF XREF LAYER STACK + CGNAT CITIZEN MERKLE SHIELD */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "12px", minHeight: 0 }}>
          {/* SUB-CARD 1: PDF XREF 2-LAYER REVISION TIMELINE */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "14px 18px",
              boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCode size={15} color="#D97706" />
                <span>PDF XRef Structure & Font Tamper Stack</span>
              </div>
              <span style={{ fontSize: "9.5px", background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3", padding: "2px 6px", borderRadius: "4px", fontWeight: 800 }}>
                2 %%EOF FOUND
              </span>
            </div>

            {/* Visual 2-Layer Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Revision 1: Original Clean CBS Export */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: "4px" }}>
                      REV 1 @ 0x0000
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                      SBI Finacle Type1 PostScript Font
                    </span>
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "2px" }}>
                    Initial bank statement export · Genuine cryptographic signature
                  </div>
                </div>
                <CheckCircle2 size={15} color="#059669" />
              </div>

              {/* Revision 2: Incremental Overwrite */}
              <div
                style={{
                  background: "#FFF1F2",
                  border: "1px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "4px" }}>
                      REV 2 @ 0x234FA
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#BE123C" }}>
                      Incremental %%EOF Trailer + Arial Injection
                    </span>
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#9F1239", marginTop: "2px" }}>
                    Row #14 balance glyphs replaced in external canvas tool (2.4pt baseline shift)
                  </div>
                </div>
                <AlertTriangle size={15} color="#E11D48" />
              </div>
            </div>
          </div>

          {/* SUB-CARD 2: CGNAT INNOCENT CITIZEN PRIVACY MERKLE SHIELD */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "14px 18px",
              boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} color="#059669" />
                <span>CGNAT Citizen Merkle Shield (BSA § 63)</span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setInspectMerkleBranch(!inspectMerkleBranch)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: inspectMerkleBranch ? "#EEF2FF" : "#F8FAFC",
                    color: inspectMerkleBranch ? "#4338CA" : "#475569",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span>{inspectMerkleBranch ? "Hide Proof" : "Inspect Merkle Proof"}</span>
                  {inspectMerkleBranch ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivacyUnmasked(!isPrivacyUnmasked)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    background: isPrivacyUnmasked ? "#FFF1F2" : "#F8FAFC",
                    color: isPrivacyUnmasked ? "#BE123C" : "#475569",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isPrivacyUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{isPrivacyUnmasked ? "Mask" : "Unmask"}</span>
                </button>
              </div>
            </div>

            {/* Proportion Bar: 9,996 Blinded vs 4 Unmasked */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", marginBottom: "3px" }}>
                <span>Innocent Subscribers Masked (9,996)</span>
                <span style={{ fontWeight: 800, color: "#059669" }}>Suspect Sessions (4)</span>
              </div>
              <div style={{ width: "100%", height: "10px", background: "#E2E8F0", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: "99.96%", background: "#059669", height: "100%" }} />
                <div style={{ width: "0.04%", background: "#E11D48", height: "100%" }} />
              </div>
            </div>

            {/* Expandable Merkle Proof Branch Inspector */}
            {inspectMerkleBranch ? (
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontWeight: 800, color: "#4F46E5" }}>
                  Cryptographic Inclusion Path (Leaf → Root):
                </div>
                <div style={{ color: "#0F172A" }}>
                  1. Leaf Hash: <code style={{ color: "#059669" }}>b189a9f28d10...e7492c</code> (Suspect Port 44321)
                </div>
                <div style={{ color: "#0F172A" }}>
                  2. Sibling Hash (Right): <code>c4321908aa12...991823</code> (Blinded Pool)
                </div>
                <div style={{ color: "#0F172A" }}>
                  3. Parent Node (Left): <code>d9812401bc77...884102</code>
                </div>
                <div style={{ color: "#0F172A", fontWeight: 700 }}>
                  4. Merkle Root: <code style={{ color: "#4F46E5" }}>e0192834fa99...112349</code>
                </div>
                <div style={{ fontSize: "9.5px", color: "#059669", marginTop: "2px", fontWeight: 700 }}>
                  ✓ Cryptographically Verified under Section 63 BSA — Zero Collateral PII Disclosed.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 8px" }}>
                  <div style={{ fontSize: "9.5px", color: "#64748B" }}>HMAC Salted Root</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                    e0192834...112349
                  </div>
                </div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 8px" }}>
                  <div style={{ fontSize: "9.5px", color: "#64748B" }}>Judicial Verification</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#059669" }}>
                    Zero PII Spillage ✓
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Re-export as IntakeFalsifierScreen for complete compatibility
export const IntakeFalsifierScreen = IntakeScreen;

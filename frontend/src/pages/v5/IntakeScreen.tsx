import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowDown,
  Shield,
  Clock,
  Lock,
  Zap,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const IntakeScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const isRow14Tampered = mutations.alterBankRow14;

  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(false);

  // 10 Column Events for Cashflow Discrepancy Chart
  // (4 Historical T-minus Context + 6 Statement Events #11 to #16)
  const chartEvents = [
    { label: "T-4h", name: "Pre-Incident Baseline", cbs: 48, claim: 48, discrepancy: 0, tag: "NORMAL" },
    { label: "T-3h", name: "Pre-Incident Steady", cbs: 52, claim: 52, discrepancy: 0, tag: "NORMAL" },
    { label: "T-2h", name: "Pre-Incident Activity", cbs: 61, claim: 61, discrepancy: 0, tag: "NORMAL" },
    { label: "T-1h", name: "Opening Ledger State", cbs: 61.5, claim: 61.5, discrepancy: 0, tag: "NORMAL" },
    { label: "#11", name: "Row #11 Opening Balance", cbs: 61.5, claim: 61.5, discrepancy: 0, tag: "VERIFIED" },
    { label: "#12", name: "Row #12 Grocery UPI", cbs: 61.2, claim: 61.2, discrepancy: 0, tag: "VERIFIED" },
    { label: "#13", name: "Row #13 Salary Inflow", cbs: 73.7, claim: 73.7, discrepancy: 0, tag: "VERIFIED" },
    {
      label: "#14 !",
      name: "Row #14 Extortion Transfer",
      cbs: 21.5, // ₹2,15,000 true debit
      claim: 1.5, // ₹15,000 suspect screenshot
      discrepancy: -20.0, // -₹2.00 Lakhs discrepancy!
      tag: "DISPUTED",
    },
    { label: "#15", name: "Row #15 Utility Bill", cbs: 51.8, claim: 51.8, discrepancy: 0, tag: "VERIFIED" },
    { label: "#16", name: "Row #16 ATM Sweep", cbs: 50.8, claim: 50.8, discrepancy: 0, tag: "VERIFIED" },
  ];

  // Donut Chart Segments for NPCI 12-Digit RRN Breakdown (#626510149921)
  const rrnSegments = [
    { name: "Year Digit", digits: "1d", value: "[6] 2026", color: "#10B981", pct: 8.33 },
    { name: "Julian Day", digits: "3d", value: "[265] 22 Sep", color: "#34D399", pct: 25.0 },
    { name: "Switch Hour", digits: "2d", value: "[10] 10:00", color: "#3B82F6", pct: 16.67 },
    { name: "STAN Trace", digits: "6d", value: "#149921", color: "#8B5CF6", pct: 41.67 },
    { name: "NTP Skew", digits: "OK", value: "+14.0s IST", color: "#F59E0B", pct: 8.33 },
  ];

  const donutRadius = 55;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // CBS Ledger Transactions for Row 3 Center Table
  const baseTransactions = [
    {
      date: "22 Sep · #12",
      description: "UPI/DR/6265091148/GROCERY",
      category: "Retail Debit",
      categoryColor: { bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24" },
      amount: "-₹3,450.00",
      isCredit: false,
      balance: "₹6,12,440.00",
      isTampered: false,
    },
    {
      date: "22 Sep · #13",
      description: "NEFT/CR/SBIN26265/SALARY",
      category: "Salary Inflow",
      categoryColor: { bg: "rgba(16, 185, 129, 0.15)", text: "#34D399" },
      amount: "+₹1,25,000.00",
      isCredit: true,
      balance: "₹7,37,440.00",
      isTampered: false,
    },
    {
      date: "22 Sep · #14",
      description: "UPI/DR/626510149921/VIKRAM_MULE",
      category: "Disputed RRN",
      categoryColor: { bg: "rgba(239, 68, 68, 0.18)", text: "#F87171" },
      amount: "-₹2,15,000.00",
      isCredit: false,
      balance: isRow14Tampered ? "₹3,22,440.00 !" : "₹5,22,440.00",
      isTampered: isRow14Tampered,
    },
    {
      date: "22 Sep · #15",
      description: "UPI/DR/6265118821/UTILITY_BILL",
      category: "Utility Bill",
      categoryColor: { bg: "rgba(139, 92, 246, 0.15)", text: "#A78BFA" },
      amount: "-₹4,200.00",
      isCredit: false,
      balance: isRow14Tampered ? "₹3,18,240.00" : "₹5,18,240.00",
      isTampered: isRow14Tampered,
    },
    {
      date: "22 Sep · #16",
      description: "IMPS/DR/6265129940/ATM_SWEEP",
      category: "Transfer",
      categoryColor: { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA" },
      amount: "-₹10,000.00",
      isCredit: false,
      balance: isRow14Tampered ? "₹3,08,240.00" : "₹5,08,240.00",
      isTampered: isRow14Tampered,
    },
  ];

  const sortedTransactions = tableSortAsc
    ? [...baseTransactions].reverse()
    : baseTransactions;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        maxWidth: "1480px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* =========================================================================
          ROW 1: 4 EQUAL KPI CARDS (MODELED 1:1 ON TASKFORGE FINANCIAL METRICS)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "18px",
          height: "148px",
        }}
      >
        {/* CARD 1: VERIFIED CBS BALANCE (TASKFORGE TOTAL BALANCE CARD) */}
        <div
          style={{
            position: "relative",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #031A08 0%, #021406 50%, #010B03 100%)",
            border: isRow14Tampered
              ? "1px solid rgba(239, 68, 68, 0.4)"
              : "1px solid rgba(16, 185, 129, 0.28)",
            padding: "20px 22px",
            boxShadow: "0 20px 60px rgba(0, 100, 60, 0.2)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* Subtle top-right ambient blur glow */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "-40px",
              width: "160px",
              height: "140px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "18px",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#8E9893" }}>
              Verified CBS Balance
            </div>
            <div
              className="tf-hero-number"
              style={{
                marginTop: "4px",
                color: "#FFFFFF",
              }}
            >
              {isRow14Tampered ? "₹3,22,440.00" : "₹5,22,440.00"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: isRow14Tampered ? "#EF4444" : "#10B981",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{isRow14Tampered ? "▼" : "▲"}</span>
              <span>
                {isRow14Tampered
                  ? "-₹2.00L Row #14 Δ"
                  : "100% conserved (6/6 rows)"}
              </span>
            </div>

            {/* Smooth SVG Bezier Spline Curve with glowing peak circle dot */}
            <div style={{ position: "absolute", right: 0, bottom: "-4px" }}>
              <svg width="130" height="55" viewBox="0 0 130 55" fill="none">
                <path
                  d="M4 48C18 15 38 60 58 35C75 15 92 50 126 6"
                  stroke="#E2E8F0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.85"
                />
                <circle
                  cx="126"
                  cy="6"
                  r="5"
                  fill="#FFFFFF"
                  stroke="#10B981"
                  strokeWidth="3"
                  style={{
                    filter: "drop-shadow(0 0 8px #10B981)",
                  }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 2: SBI SETTLED DEBIT (TIER-1) (TASKFORGE INCOME CARD) */}
        <div className="tf-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#8E9893" }}>
                SBI Settled Debit (Tier-1)
              </div>
              <div className="tf-hero-number" style={{ marginTop: "4px" }}>
                ₹2,15,000.00
              </div>
            </div>

            {/* Circular Mint/Emerald Badge */}
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10B981",
              }}
            >
              <Check size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#10B981", marginBottom: "6px" }}>
              100% Finacle HSM Signed
            </div>
            <div className="tf-progress-track">
              <div className="tf-progress-fill-emerald" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        {/* CARD 3: CLAIMED SCREENSHOT (TIER-3) (TASKFORGE EXPENSES CARD) */}
        <div className="tf-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#8E9893" }}>
                Claimed Screenshot (Tier-3)
              </div>
              <div className="tf-hero-number" style={{ marginTop: "4px" }}>
                ₹15,000.00
              </div>
            </div>

            {/* Circular Rose/Coral Badge */}
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
              }}
            >
              <ArrowDown size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444", marginBottom: "6px" }}>
              7% of True Debit (Δ ₹2.00L Hidden)
            </div>
            <div className="tf-progress-track">
              <div className="tf-progress-fill-coral" style={{ width: "52%" }} />
            </div>
          </div>
        </div>

        {/* CARD 4: CGNAT CITIZEN SHIELD (TASKFORGE SAVINGS CARD) */}
        <div className="tf-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#8E9893" }}>
                CGNAT Citizen Shield
              </div>
              <div className="tf-hero-number" style={{ marginTop: "4px" }}>
                9,996 Masked
              </div>
            </div>

            {/* Pill Badge BSA § 63 Merkle */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#D4D4D8",
              }}
            >
              BSA § 63 Merkle
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#10B981", marginBottom: "6px" }}>
              99.96% Innocent PII Blinded
            </div>
            <div className="tf-progress-track">
              <div className="tf-progress-fill-emerald" style={{ width: "99.9%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: THE 3 SIGNATURE TASKFORGE INFOGRAPHIC CARDS
          (3 Cols: Budgets | 5.5 Cols: Cashflow Overview | 3.5 Cols: Donut Breakdown)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 5.5fr 3.5fr",
          gap: "18px",
        }}
      >
        {/* LEFT CARD (3 COLS): FORENSIC INTEGRITY GATES (TASKFORGE BUDGETS CARD) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 className="tf-card-title" style={{ margin: 0 }}>
              Forensic Integrity Gates
            </h2>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#10B981" }}>
              4 Active Rules
            </span>
          </div>

          {/* 4 Clean Borderless Progress Items (NO nested boxes!) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Item 1: Running-Balance Math */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>
                    Running-Balance Math
                  </div>
                  <div style={{ fontSize: "11px", color: "#8E9893", marginTop: "1px" }}>
                    {isRow14Tampered ? "Row #14 Falsified Δ -₹2.00L" : "6 of 6 CBS Rows Conserved"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: isRow14Tampered ? "#EF4444" : "#F8FAFC",
                  }}
                >
                  {isRow14Tampered ? "50%" : "100%"}
                </div>
              </div>
              <div className="tf-progress-track" style={{ marginTop: "6px" }}>
                <div
                  className={isRow14Tampered ? "tf-progress-fill-coral" : "tf-progress-fill-emerald"}
                  style={{ width: isRow14Tampered ? "50%" : "100%" }}
                />
              </div>
            </div>

            {/* Item 2: NPCI RRN Clock Sync */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>
                    NPCI RRN Clock Sync
                  </div>
                  <div style={{ fontSize: "11px", color: "#8E9893", marginTop: "1px" }}>
                    +14s of ±180s IST Window
                  </div>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>
                  92%
                </div>
              </div>
              <div className="tf-progress-track" style={{ marginTop: "6px" }}>
                <div className="tf-progress-fill-emerald" style={{ width: "92%" }} />
              </div>
            </div>

            {/* Item 3: PDF XRef Trailer Audit */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>
                    PDF XRef Trailer Audit
                  </div>
                  <div style={{ fontSize: "11px", color: "#8E9893", marginTop: "1px" }}>
                    2 of 1 %%EOF Markers (Canva Overlay)
                  </div>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#EF4444" }}>
                  50%
                </div>
              </div>
              <div className="tf-progress-track" style={{ marginTop: "6px" }}>
                <div className="tf-progress-fill-coral" style={{ width: "50%" }} />
              </div>
            </div>

            {/* Item 4: Font Stream Authenticity */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#F8FAFC" }}>
                    Font Stream Authenticity
                  </div>
                  <div style={{ fontSize: "11px", color: "#8E9893", marginTop: "1px" }}>
                    Row #14 Arial Glyph Swap
                  </div>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#F59E0B" }}>
                  83%
                </div>
              </div>
              <div className="tf-progress-track" style={{ marginTop: "6px" }}>
                <div className="tf-progress-fill-amber" style={{ width: "83%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER CARD (5.5 COLS): LEDGER & CLAIM CASHFLOW OVERVIEW (TASKFORGE VERTICAL PILL-TRACK CHART) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 className="tf-card-title" style={{ margin: 0 }}>
                Ledger & Claim Discrepancy Overview
              </h2>
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "11.5px", color: "#8E9893" }}>
                  Net Unaccounted Fraud Discrepancy
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#EF4444",
                    letterSpacing: "-0.02em",
                    marginTop: "1px",
                  }}
                >
                  -₹2,00,000.00
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
              {/* Toggle Row #14 Tamper Pill Button */}
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: isRow14Tampered
                    ? "rgba(239, 68, 68, 0.16)"
                    : "rgba(16, 185, 129, 0.12)",
                  border: isRow14Tampered
                    ? "1px solid rgba(239, 68, 68, 0.35)"
                    : "1px solid rgba(16, 185, 129, 0.25)",
                  color: isRow14Tampered ? "#F87171" : "#10B981",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Zap size={11} color={isRow14Tampered ? "#EF4444" : "#10B981"} />
                <span>{isRow14Tampered ? "Tamper Active" : "Toggle Row #14 Tamper"}</span>
              </button>

              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#10B981" }} />
                  <span style={{ fontSize: "11px", color: "#8E9893" }}>SBI CBS Settled</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#6EE7B7" }} />
                  <span style={{ fontSize: "11px", color: "#8E9893" }}>Claimed / Reported</span>
                </div>
              </div>
            </div>
          </div>

          {/* Taskforge Vertical Pill-Track Chart Body (height: 190px) */}
          <div style={{ position: "relative", height: "190px", marginTop: "12px" }}>
            {/* Horizontal Grid Hairlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: "38px",
                  right: 0,
                  top: `${frac * 78}%`,
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              />
            ))}

            {/* Left Y-Axis Labels */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: "24px",
                width: "36px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontSize: "9px",
                color: "#71717A",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              <span>₹8L</span>
              <span>₹4L</span>
              <span>₹0</span>
              <span>-₹2L</span>
            </div>

            {/* 10 Vertical Pill Tracks */}
            <div
              style={{
                position: "absolute",
                left: "44px",
                right: 0,
                top: 0,
                bottom: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              {chartEvents.map((evt, idx) => {
                const isHovered = activeBarIndex === idx;
                const isRow14 = evt.label === "#14 !";
                const maxVal = 80; // Scale max in lakhs/10k
                const cbsHeight = Math.max(14, (evt.cbs / maxVal) * 120);
                const claimHeight = Math.max(8, (evt.claim / maxVal) * 120);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setActiveBarIndex(idx)}
                    onMouseLeave={() => setActiveBarIndex(null)}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "32px",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Tooltip on Hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: "absolute",
                            bottom: "165px",
                            zIndex: 60,
                            background: "#090E0C",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
                            whiteSpace: "nowrap",
                            fontSize: "11px",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#FFFFFF" }}>
                            {evt.name} ({evt.label})
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "4px" }}>
                            <span style={{ color: "#8E9893" }}>CBS Settled:</span>
                            <span style={{ color: "#10B981", fontWeight: 700 }}>
                              ₹{(evt.cbs * 10000).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "2px" }}>
                            <span style={{ color: "#8E9893" }}>Claimed / Rec:</span>
                            <span style={{ color: "#6EE7B7", fontWeight: 700 }}>
                              ₹{(evt.claim * 10000).toLocaleString("en-IN")}
                            </span>
                          </div>
                          {isRow14 && (
                            <div style={{ marginTop: "4px", color: "#EF4444", fontWeight: 700 }}>
                              Discrepancy: -₹2,00,000 (Falsified Screenshot)
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Dark Emerald Rounded Track with Paired Vertical Bars */}
                    <div
                      style={{
                        width: "28px",
                        height: "135px",
                        background: isRow14
                          ? "rgba(239, 68, 68, 0.12)"
                          : isHovered
                          ? "rgba(16, 185, 129, 0.18)"
                          : "rgba(16, 185, 129, 0.08)",
                        borderRadius: "8px",
                        padding: "4px",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: "3px",
                        boxSizing: "border-box",
                        border: isRow14
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : isHovered
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Bar 1: CBS Truth */}
                      <div
                        style={{
                          width: "8px",
                          height: `${cbsHeight}px`,
                          borderRadius: "3px",
                          background: isRow14
                            ? "#EF4444"
                            : "linear-gradient(180deg, #10B981 0%, #059669 100%)",
                          boxShadow: isRow14
                            ? "0 0 8px rgba(239, 68, 68, 0.5)"
                            : "0 0 8px rgba(16, 185, 129, 0.3)",
                          transition: "height 0.3s ease",
                        }}
                      />

                      {/* Bar 2: Claim / Screenshot */}
                      <div
                        style={{
                          width: "8px",
                          height: `${claimHeight}px`,
                          borderRadius: "3px",
                          background: isRow14
                            ? "rgba(239, 68, 68, 0.4)"
                            : "linear-gradient(180deg, #6EE7B7 0%, #34D399 100%)",
                          transition: "height 0.3s ease",
                        }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: isRow14 ? 700 : 500,
                        color: isRow14 ? "#EF4444" : isHovered ? "#FFFFFF" : "#71717A",
                        marginTop: "6px",
                      }}
                    >
                      {evt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT CARD (3.5 COLS): NPCI 12-DIGIT RRN BREAKDOWN (TASKFORGE DONUT CARD) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="tf-card-title" style={{ margin: 0 }}>
              NPCI RRN #626510149921
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.12)",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              12 DIGITS
            </span>
          </div>

          {/* Donut Chart + Breakdown List Body */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "10px",
            }}
          >
            {/* Left: SVG Multi-Segment Donut Chart */}
            <div
              style={{
                position: "relative",
                width: "140px",
                height: "140px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                style={{ transform: "rotate(-90deg)" }}
              >
                {rrnSegments.reduce<
                  {
                    element: React.ReactNode;
                    offset: number;
                  }[]
                >((acc, seg, idx) => {
                  const dash = (seg.pct / 100) * donutCircumference;
                  const prevOffset =
                    acc.length > 0 ? acc[acc.length - 1].offset : 0;
                  const el = (
                    <circle
                      key={idx}
                      cx="70"
                      cy="70"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={18}
                      strokeDasharray={`${dash} ${donutCircumference}`}
                      strokeDashoffset={-prevOffset}
                      strokeLinecap="butt"
                    />
                  );
                  acc.push({ element: el, offset: prevOffset + dash });
                  return acc;
                }, []).map((x) => x.element)}
              </svg>

              {/* Center Donut Hole Content */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: "10px", fontWeight: 500, color: "#8E9893" }}>
                  RRN Clock
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: "-0.02em",
                  }}
                >
                  10:00 IST
                </span>
              </div>
            </div>

            {/* Right: 5-Row Breakdown List */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              {rrnSegments.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                      }}
                    />
                    <span style={{ color: "#D4D4D8" }}>{item.name}</span>
                  </div>
                  <span style={{ fontFamily: "var(--tf-font-mono)", color: "#FFFFFF", fontWeight: 600 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Link */}
          <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "8px" }}>
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#10B981",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
              }}
            >
              Verify RRN against NPCI Switch →
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: THE 3 BOTTOM CARDS
          (3 Cols: PDF & Merkle | 5.5 Cols: CBS Ledger Table | 3.5 Cols: Admissibility)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 5.5fr 3.5fr",
          gap: "18px",
        }}
      >
        {/* BOTTOM-LEFT (3 COLS): PDF & MERKLE SIGNATURES (TASKFORGE UPCOMING BILLS) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 className="tf-card-title" style={{ margin: 0 }}>
              PDF & Merkle Signatures
            </h2>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#10B981", cursor: "pointer" }}>
              Inspect Proof
            </span>
          </div>

          {/* 3 Ultra-Clean Rows Separated by Subtle Hairlines */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Row 1: Rev 1 Finacle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "10px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#F8FAFC" }}>
                  Rev 1 · SBI Finacle PostScript
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "2px" }}>
                  Offset 0x0000 · HSM Signed
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#10B981",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                ✓ VALID
              </span>
            </div>

            {/* Row 2: Rev 2 Canva Overlay */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "10px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#F8FAFC" }}>
                  Rev 2 · Incremental %%EOF
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "2px" }}>
                  Offset 0x234FA · Canva Overlay
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#EF4444",
                  background: "rgba(239, 68, 68, 0.12)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                +2.4pt Shift
              </span>
            </div>

            {/* Row 3: BSA § 63 Merkle Root */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#F8FAFC" }}>
                  BSA § 63 Merkle Root
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "2px" }}>
                  10,000 Airtel CGNAT Rows
                </div>
              </div>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  fontFamily: "var(--tf-font-mono)",
                  color: "#10B981",
                }}
              >
                b189...7492
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER (5.5 COLS): CBS RUNNING-BALANCE TABLE (TASKFORGE TRANSACTION TABLE — ZERO SCROLLBARS) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "18px 22px",
          }}
        >
          {/* Table Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 className="tf-card-title" style={{ margin: 0 }}>
              CBS Transaction Ledger
            </h2>
            <button
              type="button"
              onClick={() => setTableSortAsc((prev) => !prev)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#8E9893",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "3px 8px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {tableSortAsc ? "ASC ↑" : "DESC ↓"}
            </button>
          </div>

          {/* Table Column Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 2fr 1.3fr 1.2fr 1.2fr",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "#71717A",
            }}
          >
            <span>Date & Row</span>
            <span>Description / UTR</span>
            <span>Category</span>
            <span>Amount</span>
            <span style={{ textAlign: "right" }}>Running Balance</span>
          </div>

          {/* 5 Clean Airy Rows (Height: ~42px each, perfectly visible) */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sortedTransactions.map((tx, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 2fr 1.3fr 1.2fr 1.2fr",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom:
                    idx < sortedTransactions.length - 1
                      ? "1px solid rgba(255, 255, 255, 0.04)"
                      : "none",
                  fontSize: "11px",
                }}
              >
                {/* Date & Row */}
                <span style={{ color: "#8E9893", fontFamily: "var(--tf-font-mono)", fontSize: "10.5px" }}>
                  {tx.date}
                </span>

                {/* Description / UTR */}
                <span
                  style={{
                    color: tx.isTampered ? "#F87171" : "#FFFFFF",
                    fontWeight: 600,
                    fontFamily: "var(--tf-font-mono)",
                    fontSize: "10.5px",
                  }}
                >
                  {tx.description}
                </span>

                {/* Category Soft Pill */}
                <div>
                  <span
                    style={{
                      background: tx.categoryColor.bg,
                      color: tx.categoryColor.text,
                      padding: "2px 7px",
                      borderRadius: "5px",
                      fontSize: "9.5px",
                      fontWeight: 600,
                    }}
                  >
                    {tx.category}
                  </span>
                </div>

                {/* Amount */}
                <span
                  style={{
                    color: tx.isCredit ? "#10B981" : "#EF4444",
                    fontWeight: 600,
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {tx.amount}
                </span>

                {/* Running Balance */}
                <span
                  style={{
                    textAlign: "right",
                    color: tx.isTampered ? "#EF4444" : "#FFFFFF",
                    fontWeight: 700,
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {tx.balance}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM-RIGHT (3.5 COLS): EVIDENTIARY ADMISSIBILITY TARGETS (TASKFORGE FINANCIAL GOALS) */}
        <div
          className="tf-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 className="tf-card-title" style={{ margin: 0 }}>
              Evidentiary Admissibility
            </h2>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#10B981" }}>
              BSA § 63 Ready
            </span>
          </div>

          {/* 3 Horizontal Goal Rows with Dark Rounded Icon Square */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Goal 1: Double-Entry Invariant */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10B981",
                  flexShrink: 0,
                }}
              >
                <Shield size={18} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#FFFFFF" }}>
                    Double-Entry Invariant
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: isRow14Tampered ? "#EF4444" : "#10B981",
                    }}
                  >
                    {isRow14Tampered ? "83%" : "100%"}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "1px" }}>
                  {isRow14Tampered ? "₹3.08L of ₹5.08L Balance" : "₹5.08L of ₹5.08L Balance"}
                </div>
                <div className="tf-progress-track" style={{ marginTop: "5px" }}>
                  <div
                    className={isRow14Tampered ? "tf-progress-fill-coral" : "tf-progress-fill-emerald"}
                    style={{ width: isRow14Tampered ? "83%" : "100%" }}
                  />
                </div>
              </div>
            </div>

            {/* Goal 2: Switch RRN Window */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10B981",
                  flexShrink: 0,
                }}
              >
                <Clock size={18} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#FFFFFF" }}>
                    Switch RRN Window
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#10B981" }}>
                    92%
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "1px" }}>
                  +14s of ±180s Max Tolerance
                </div>
                <div className="tf-progress-track" style={{ marginTop: "5px" }}>
                  <div className="tf-progress-fill-emerald" style={{ width: "92%" }} />
                </div>
              </div>
            </div>

            {/* Goal 3: Citizen PII Redaction */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10B981",
                  flexShrink: 0,
                }}
              >
                <Lock size={18} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#FFFFFF" }}>
                    Citizen PII Redaction
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#10B981" }}>
                    99.9%
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#8E9893", marginTop: "1px" }}>
                  9,996 of 10,000 Rows Blinded
                </div>
                <div className="tf-progress-track" style={{ marginTop: "5px" }}>
                  <div className="tf-progress-fill-emerald" style={{ width: "99.9%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeScreen;

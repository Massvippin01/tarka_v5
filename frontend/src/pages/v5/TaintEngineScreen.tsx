import React, { useState, useMemo } from "react";
import {
  GitFork,
  Scale,
  Lock,
  UserX,
  Store,
  Copy,
  Check,
  Sliders,
  DollarSign,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Accounting Rule Selection
  const [selectedRule, setSelectedRule] = useState<TaintRule>("LIBR");

  // Freeze Budget K slider (1 to 6 accounts)
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);

  // Compute Engine State
  const engineState = useMemo(() => {
    return computeTaintEngine(mutations.injectMerchantCleanDeposit, freezeBudgetK);
  }, [mutations.injectMerchantCleanDeposit, freezeBudgetK]);

  // Active BNSS notice selection (106 vs 107)
  const [selectedNoticeType, setSelectedNoticeType] = useState<"106" | "107">("106");

  // BNSS Draft State
  const bnssDrafts = useMemo(() => {
    return generateBnssDrafts("ICICI 001405008129", "ICICI Bank", 120000);
  }, []);

  const activeDraft = useMemo(() => {
    return selectedNoticeType === "106" ? bnssDrafts.notice106 : bnssDrafts.application107;
  }, [selectedNoticeType, bnssDrafts]);

  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(activeDraft.draftText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isInjectClean = mutations.injectMerchantCleanDeposit;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "10px 14px",
        gap: "10px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 1. SINGLE-LINE 4-PILL TELEMETRY STRIP (HEIGHT: 38PX, NO VERTICAL SCROLL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          height: "38px",
          flexShrink: 0,
        }}
      >
        {/* Pill 1: Initial Victim Loss */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(225,29,72,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserX size={14} color="#E11D48" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              DEFRAUDED LOSS
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#E11D48",
              background: "rgba(225,29,72,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ₹{(engineState.summary.initialVictimLoss / 100000).toFixed(2)}L (T+0 Loss)
          </span>
        </div>

        {/* Pill 2: LIBR Recoverable */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(5,150,105,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Scale size={14} color="#059669" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              LIBR RECOVERABLE
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
            ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L (ROSCOE V. WINDER)
          </span>
        </div>

        {/* Pill 3: Dinic Min-Cut Freeze Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: engineState.minCut.isFreezeComplete ? "1px solid rgba(5,150,105,0.3)" : "1px solid rgba(217,119,6,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={14} color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              DINIC MIN-CUT FREEZE
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: engineState.minCut.isFreezeComplete ? "#059669" : "#D97706",
              background: engineState.minCut.isFreezeComplete ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {engineState.minCut.isFreezeComplete ? `SAT (K=${freezeBudgetK}) · ZERO LEAKAGE` : `LEAKING ₹${(engineState.minCut.residualLeakageAmount / 100000).toFixed(2)}L`}
          </span>
        </div>

        {/* Pill 4: BNSS Statutory Split */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(79,70,229,0.25)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <GitFork size={14} color="#4F46E5" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              BNSS 2023 DUAL-TRACK
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#4F46E5",
              background: "rgba(79,70,229,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            § 106 LIEN & § 107 DEBIT FREEZE
          </span>
        </div>
      </div>

      {/* 2. MAIN 12-COLUMN BENTO INFOGRAPHIC WORKSPACE (HEIGHT: CALC(100% - 48PX), OVERFLOW: HIDDEN) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 7 COLS (VISUAL MULE FLOW DIAGRAM + DINIC MIN-CUT SLIDER) */}
        <div
          style={{
            gridColumn: "span 7",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 1: VISUAL MULE MONEY TRAIL FLOW DIAGRAM (TE-DAG) */}
          <div
            style={{
              flex: "1 1 60%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            {/* Header with Title and Injection Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <GitFork size={15} color="#4F46E5" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Time-Expanded DAG Money Trail & Node Classification
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#059669",
                      background: "rgba(5,150,105,0.08)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    ZERO CYCLES GUARANTEED
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted, #94A3B8)" }}>
                  Dynamic node expansion: Mule accounts vs Innocent Merchant GST distinction.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation("injectMerchantCleanDeposit")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: isInjectClean ? "1px solid #059669" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: isInjectClean ? "rgba(5,150,105,0.12)" : "var(--bento-canvas-subtle, #F8FAFC)",
                  color: isInjectClean ? "#047857" : "var(--bento-text-secondary, #475569)",
                  cursor: "pointer",
                }}
                title="Injects ₹2.5L clean commercial funds into Merchant account to prove LIBR protects innocent capital"
              >
                <DollarSign size={11} />
                <span>{isInjectClean ? "Clean Deposit Injected (+₹2.5L)" : "Inject Clean Deposit (+₹2.5L)"}</span>
              </button>
            </div>

            {/* Visual Left-to-Right TE-DAG Pipeline Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr 1.3fr",
                gap: "8px",
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Column 1: Layer 0 Victim & Layer 1 Mule */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Victim Node */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(225,29,72,0.04)",
                    border: "1px solid rgba(225,29,72,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#E11D48", textTransform: "uppercase" }}>
                      VICTIM SOURCE (T+0)
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                      09:30 IST
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Sunil Kumar (Victim)
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    SBI 30910029101
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    -₹5,00,000.00
                  </div>
                </div>

                {/* Layer 1 Mule Node */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(217,119,6,0.06)",
                    border: "1px solid rgba(217,119,6,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                      LAYER 1 MULE
                    </span>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#DC2626", background: "rgba(220,38,38,0.1)", padding: "1px 4px", borderRadius: "3px" }}>
                      § 107 FULL FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Vikram Shah
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    SBI 41088291083 (Dwell: 112s)
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Total Inflow: ₹5,00,000
                  </div>
                </div>
              </div>

              {/* Column 2: Layer 2 Mule Splits (A & B) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Layer 2 Mule A */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(217,119,6,0.04)",
                    border: "1px solid rgba(217,119,6,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                      MULE L2 (SPLIT A)
                    </span>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#DC2626", background: "rgba(220,38,38,0.1)", padding: "1px 4px", borderRadius: "3px" }}>
                      § 107 FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Rohit Verma
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    HDFC 5010029419920
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Tainted: ₹3,00,000
                  </div>
                </div>

                {/* Layer 2 Mule B */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(217,119,6,0.04)",
                    border: "1px solid rgba(217,119,6,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                      MULE L2 (SPLIT B)
                    </span>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#DC2626", background: "rgba(220,38,38,0.1)", padding: "1px 4px", borderRadius: "3px" }}>
                      § 107 FREEZE
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Sameer Khan
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    AXIS 9140200410291
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Tainted: ₹2,00,000
                  </div>
                </div>
              </div>

              {/* Column 3: Layer 3 Terminal (Innocent Merchant & ATM Cashout) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Innocent Merchant Node (GST Protected) */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(5,150,105,0.06)",
                    border: "1px solid rgba(5,150,105,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: 1.2,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Store size={11} color="#059669" />
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
                        INNOCENT MERCHANT
                      </span>
                    </div>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: "#059669", background: "rgba(5,150,105,0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                      § 106 LIEN ONLY
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Apex Electronics Pvt Ltd
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                    GST: 07AAACA1234F1Z8 · ICICI
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <span style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)" }}>Total Balance:</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--bento-text-primary, #0F172A)" }}>
                      ₹{engineState.nodes.find((n) => n.id === "node-merchant-l3")?.totalBalance.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", color: "#059669", fontWeight: 700 }}>LIBR Lien Mark:</span>
                    <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#059669" }}>
                      ₹{engineState.nodes.find((n) => n.id === "node-merchant-l3")?.taintLibr.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* ATM Cashout Sink */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "rgba(100,116,139,0.06)",
                    border: "1px solid rgba(100,116,139,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: 0.8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>
                      ATM CASH EXIT
                    </span>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#64748B", background: "rgba(100,116,139,0.1)", padding: "1px 4px", borderRadius: "3px" }}>
                      TERMINAL SINK
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Noida Sec 18 ATM DL-049
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#DC2626", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    Dispensed: ₹1,20,000 (Physical Cash)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: DINIC MIN-CUT FREEZE VERIFIER & RESIDUAL LEAKAGE SLIDER */}
          <div
            style={{
              flex: "1 1 40%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sliders size={14} color="#4F46E5" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  Dinic Min-Cut Freeze Budget Optimizer (K = {freezeBudgetK})
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: engineState.minCut.isFreezeComplete ? "#059669" : "#D97706",
                    background: engineState.minCut.isFreezeComplete ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {engineState.minCut.isFreezeComplete ? "100% FLOW CONTAINED" : "RESIDUAL ESCAPE DETECTED"}
                </span>
              </div>

              <span style={{ fontSize: "10px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                Capacity = {engineState.minCut.minCutCapacity} Nodes
              </span>
            </div>

            {/* Interactive Slider Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>K=1</span>
              <input
                type="range"
                min={1}
                max={6}
                value={freezeBudgetK}
                onChange={(e) => setFreezeBudgetK(Number(e.target.value))}
                style={{ flex: 1, cursor: "pointer", accentColor: "#4F46E5" }}
              />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>K=6</span>
            </div>

            {/* Verdict Explanation Box */}
            <div
              style={{
                fontSize: "10px",
                lineHeight: 1.4,
                padding: "6px 10px",
                borderRadius: "6px",
                background: engineState.minCut.isFreezeComplete ? "rgba(5,150,105,0.08)" : "rgba(217,119,6,0.08)",
                border: engineState.minCut.isFreezeComplete ? "1px solid rgba(5,150,105,0.25)" : "1px solid rgba(217,119,6,0.25)",
                color: engineState.minCut.isFreezeComplete ? "#065F46" : "#92400E",
              }}
            >
              {engineState.minCut.verdictDetail}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5 COLS (3-WAY ACCOUNTING ENGINE + BNSS NOTICE DRAFT GENERATOR) */}
        <div
          style={{
            gridColumn: "span 5",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 3: 3-WAY TAINT ACCOUNTING COMPARISON (LIBR VS FIFO VS PRO-RATA) */}
          <div
            style={{
              flex: "1 1 45%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale size={15} color="#4F46E5" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  Accounting State Machine Comparison
                </span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                HIGH COURT MANDATE
              </span>
            </div>

            {/* 3 Metric Comparison Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {/* LIBR Card */}
              <div
                onClick={() => setSelectedRule("LIBR")}
                style={{
                  background: selectedRule === "LIBR" ? "rgba(5,150,105,0.08)" : "var(--bento-canvas-subtle, #F8FAFC)",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "LIBR" ? "1.5px solid #059669" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
                  LIBR (HC RULE) ★
                </div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "8px", color: "var(--bento-text-muted, #94A3B8)", lineHeight: 1.2 }}>
                  Lowest intermediate cap; clean funds protected.
                </div>
              </div>

              {/* FIFO Card */}
              <div
                onClick={() => setSelectedRule("FIFO")}
                style={{
                  background: selectedRule === "FIFO" ? "rgba(79,70,229,0.08)" : "var(--bento-canvas-subtle, #F8FAFC)",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "FIFO" ? "1.5px solid #4F46E5" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>
                  FIFO (FIRST-IN)
                </div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "8px", color: "var(--bento-text-muted, #94A3B8)", lineHeight: 1.2 }}>
                  First funds in presumed spent first.
                </div>
              </div>

              {/* Pro-Rata Card */}
              <div
                onClick={() => setSelectedRule("PRO_RATA")}
                style={{
                  background: selectedRule === "PRO_RATA" ? "rgba(217,119,6,0.08)" : "var(--bento-canvas-subtle, #F8FAFC)",
                  padding: "8px",
                  borderRadius: "8px",
                  border: selectedRule === "PRO_RATA" ? "1.5px solid #D97706" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#D97706", textTransform: "uppercase" }}>
                  PRO-RATA
                </div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                  ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                </div>
                <div style={{ fontSize: "8px", color: "var(--bento-text-muted, #94A3B8)", lineHeight: 1.2 }}>
                  Proportional commingled pool fraction.
                </div>
              </div>
            </div>

            {/* Clean Funds Protected Banner */}
            <div
              style={{
                fontSize: "10px",
                lineHeight: 1.4,
                padding: "6px 8px",
                borderRadius: "6px",
                background: isInjectClean ? "rgba(5,150,105,0.08)" : "var(--bento-canvas-subtle, #F8FAFC)",
                border: isInjectClean ? "1px solid rgba(5,150,105,0.25)" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                color: isInjectClean ? "#047857" : "var(--bento-text-muted, #94A3B8)",
              }}
            >
              {engineState.summary.divergenceNotes}
            </div>
          </div>

          {/* CARD 4: DUAL-TRACK BNSS STATUTORY NOTICE GENERATOR */}
          <div
            style={{
              flex: "1 1 55%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  MHA SOP 02.01.2026 Statutory Notice
                </span>
              </div>

              {/* Notice Type Switcher (106 vs 107) */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedNoticeType("106")}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: selectedNoticeType === "106" ? "1px solid #059669" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: selectedNoticeType === "106" ? "rgba(5,150,105,0.12)" : "transparent",
                    color: selectedNoticeType === "106" ? "#047857" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  § 106 Lien Notice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNoticeType("107")}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: selectedNoticeType === "107" ? "1px solid #DC2626" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: selectedNoticeType === "107" ? "rgba(220,38,38,0.12)" : "transparent",
                    color: selectedNoticeType === "107" ? "#B91C1C" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  § 107 Full Freeze
                </button>
              </div>
            </div>

            {/* Notice Draft Text Box */}
            <div
              style={{
                flex: 1,
                background: "var(--bento-canvas-subtle, #F8FAFC)",
                borderRadius: "8px",
                border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                lineHeight: 1.4,
                color: "var(--bento-text-primary, #0F172A)",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                minHeight: 0,
              }}
            >
              {activeDraft.draftText}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)" }}>
                Target: <strong>ICICI Cyber Liaison Desk</strong> (48h Statutory Deadline)
              </div>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: isCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? "Copied to Clipboard" : "Copy BNSS Notice"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

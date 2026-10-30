import React, { useState, useMemo } from "react";
import {
  GitFork,
  Scale,
  Lock,
  UserX,
  Store,
  Copy,
  Check,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  BentoKpiCard,
  SemiCircleGauge,
  SegmentedPillSwitcher,
} from "../../components/tarka/BentoPrimitives";
import {
  computeTaintEngine,
  generateBnssDrafts,
} from "../../utils/taintLienEngine";

type TaintRule = "LIBR" | "FIFO" | "PRO_RATA";

export const TaintEngineScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<"dag" | "accounting" | "min-cut" | "bnss">("dag");

  // Accounting Rule Selection
  const [selectedRule, setSelectedRule] = useState<TaintRule>("LIBR");

  // Freeze Budget K slider (1 to 6 accounts)
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);

  // Compute Engine State
  const engineState = useMemo(() => {
    return computeTaintEngine(mutations.injectMerchantCleanDeposit, freezeBudgetK);
  }, [mutations.injectMerchantCleanDeposit, freezeBudgetK]);

  // Compute % Contained for SemiCircleGauge
  const containmentPercentage = useMemo(() => {
    if (engineState.minCut.isFreezeComplete) return 100;
    const initial = engineState.summary.initialVictimLoss;
    const leaked = engineState.minCut.residualLeakageAmount;
    return Math.max(0, Math.min(100, Math.round(((initial - leaked) / initial) * 100)));
  }, [engineState]);

  // BNSS Draft State
  const bnssDrafts = useMemo(() => {
    return generateBnssDrafts("ICICI 001405008129", "ICICI Bank", 120000);
  }, []);

  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(type);
    setTimeout(() => setCopiedDraft(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* 1. Header & Tab Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="bento-badge bento-badge-blue">
              <GitFork size={11} /> SCREEN 3: TIME-EXPANDED DAG & TAINT ENGINE
            </span>
            <span className="bento-badge bento-badge-neutral font-mono-tabular">
              BNSS § 106/107 & ROSCOE V. WINDER
            </span>
          </div>
          <h1 style={{ margin: "2px 0 4px", fontSize: "22px", fontWeight: 700, color: "var(--bento-text-main)", letterSpacing: "-0.5px" }}>
            Multi-Accounting Taint Tracer & Dinic Min-Cut Freeze Verifier
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--bento-text-muted)", maxWidth: "800px", lineHeight: 1.5 }}>
            Time-Expanded DAG transformation eliminates wash cycles, exact 3-way accounting state machine (LIBR vs FIFO vs Pro-Rata), Dinic min-cut freeze budget optimizer, and dual-track BNSS statutory notice drafting.
          </p>
        </div>

        <SegmentedPillSwitcher
          options={[
            { id: "dag", label: "Time-Expanded DAG" },
            { id: "accounting", label: "LIBR vs FIFO vs Pro-Rata" },
            { id: "min-cut", label: "Dinic Min-Cut Verifier" },
            { id: "bnss", label: "BNSS § 106/107 Notices" },
          ]}
          activeId={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </div>

      {/* 2. Top 4 Bento KPI Cards */}
      <div className="bento-grid-4">
        <BentoKpiCard
          title="VICTIM TRUST PROPERTY LOSS"
          metric={`₹${(engineState.summary.initialVictimLoss / 100000).toFixed(2)}L`}
          metricColor="var(--bento-crimson)"
          delta={{
            value: "₹5,00,000.00",
            isWarning: true,
            label: "T+0 Incident Loss",
          }}
          subtitle="Complainant Defrauded Capital"
          icon={UserX}
          iconColor="var(--bento-crimson)"
          iconBg="var(--bento-crimson-subtle)"
        />

        <BentoKpiCard
          title="LIBR RECOVERABLE TAINT"
          metric={`₹${(engineState.summary.librRecoverable / 100000).toFixed(2)}L`}
          metricColor="var(--bento-emerald)"
          delta={{
            value: "ROSCOE V. WINDER",
            isPositive: true,
            label: engineState.summary.divergenceDetected ? "Clean funds protected" : "Concordant accounting",
          }}
          subtitle="Rajasthan HC Precedent Capped"
          icon={Scale}
          iconColor="var(--bento-emerald)"
          iconBg="var(--bento-emerald-subtle)"
        />

        <BentoKpiCard
          title="DINIC MIN-CUT FREEZE STATUS"
          metric={engineState.minCut.isFreezeComplete ? "SATISFIED" : "LEAKING"}
          metricColor={engineState.minCut.isFreezeComplete ? "var(--bento-emerald)" : "var(--bento-amber)"}
          delta={{
            value: `Budget K=${freezeBudgetK}`,
            isPositive: engineState.minCut.isFreezeComplete,
            isWarning: !engineState.minCut.isFreezeComplete,
            label: engineState.minCut.isFreezeComplete ? "Zero leakage" : `₹${(engineState.minCut.residualLeakageAmount / 100000).toFixed(2)}L leaking`,
          }}
          subtitle="Graph Flow Containment"
          icon={Lock}
          iconColor={engineState.minCut.isFreezeComplete ? "var(--bento-emerald)" : "var(--bento-amber)"}
          iconBg={engineState.minCut.isFreezeComplete ? "var(--bento-emerald-subtle)" : "var(--bento-amber-subtle)"}
        />

        <BentoKpiCard
          title="PROTECTED MERCHANT CAPITAL"
          metric={`₹${(engineState.summary.cleanFundsProtectedLibr / 100000).toFixed(2)}L`}
          metricColor="var(--bento-indigo)"
          delta={{
            value: "GST REGISTERED",
            isPositive: true,
            label: "Legitimate Commerce Shield",
          }}
          subtitle="Innocent Merchant Protection"
          icon={Store}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />
      </div>

      {/* 3. SUB-TAB 1: Time-Expanded DAG */}
      {activeTab === "dag" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Alert */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "rgba(37, 99, 235, 0.05)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <GitFork size={24} color="#2563EB" />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Zero-Cycle Guaranteed Time-Expanded Directed Acyclic Graph (TE-DAG)
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginTop: "2px" }}>
                  Every account state node is parameterized as <code className="font-mono-tabular">(Account_i, t_k)</code>. Cyclic wash transactions cannot produce infinite loops in SMT verification.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation("injectMerchantCleanDeposit")}
              className={`bento-btn bento-btn-sm ${mutations.injectMerchantCleanDeposit ? "bento-btn-primary" : "bento-btn-secondary"}`}
              style={{
                background: mutations.injectMerchantCleanDeposit ? "#7C3AED" : undefined,
                borderColor: mutations.injectMerchantCleanDeposit ? "#7C3AED" : undefined,
              }}
            >
              <Store size={13} />
              <span>{mutations.injectMerchantCleanDeposit ? "Revert Clean Deposit" : "Inject ₹2.5L Clean Deposit (LIBR Divergence)"}</span>
            </button>
          </div>

          {/* TE-DAG Node Cards Flow */}
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "16px" }}>
              Chronological Node States & Flow Sequence
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {engineState.nodes.map((node) => (
                <div
                  key={node.id}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: node.isFrozen ? "1px solid #DC2626" : "1px solid var(--bento-border-subtle)",
                    background: node.isFrozen ? "rgba(239, 68, 68, 0.05)" : "var(--bento-card-bg)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: node.classification === "VICTIM" ? "rgba(37, 99, 235, 0.1)" : node.classification === "INNOCENT_MERCHANT" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {node.classification === "INNOCENT_MERCHANT" ? <Store size={16} color="#059669" /> : node.classification === "VICTIM" ? <UserX size={16} color="#2563EB" /> : <Lock size={16} color="#DC2626" />}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                          Layer {node.layer}: {node.accountHolder}
                        </span>
                        <span className={`bento-badge ${node.classification === "INNOCENT_MERCHANT" ? "bento-badge-emerald" : node.classification === "VICTIM" ? "bento-badge-blue" : "bento-badge-coral"}`}>
                          {node.classification}
                        </span>
                        {node.isFrozen && <span className="bento-badge bento-badge-coral font-mono-tabular">FROZEN (§ 106)</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--bento-text-muted)", marginTop: "2px" }} className="font-mono-tabular">
                        {node.bankName} | Acct: {node.accountNumber} | Timestamp: {node.timestampIST} | Dwell Time: {node.dwellTimeSeconds}s
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "var(--bento-text-muted)", textTransform: "uppercase" }}>
                        Total Balance
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }} className="font-mono-tabular">
                        ₹{node.totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "var(--bento-text-muted)", textTransform: "uppercase" }}>
                        LIBR Taint
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#2563EB" }} className="font-mono-tabular">
                        ₹{node.taintLibr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: LIBR vs FIFO vs Pro-Rata */}
      {activeTab === "accounting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Exact 3-Way Forensic Accounting Convention Comparison
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Compare recoverable amounts under Lowest Intermediate Balance Rule (LIBR), First-In First-Out (FIFO), and Pari Passu Pro-Rata.
                </div>
              </div>

              <SegmentedPillSwitcher
                options={[
                  { id: "LIBR", label: "LIBR (Roscoe v. Winder)" },
                  { id: "FIFO", label: "FIFO (Clayton's Case)" },
                  { id: "PRO_RATA", label: "Pro-Rata (Pari Passu)" },
                ]}
                activeId={selectedRule}
                onChange={(val) => setSelectedRule(val as any)}
              />
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: engineState.summary.divergenceDetected ? "rgba(124, 58, 237, 0.05)" : "rgba(16, 185, 129, 0.05)",
                border: engineState.summary.divergenceDetected ? "1px solid rgba(124, 58, 237, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className={`bento-badge ${engineState.summary.divergenceDetected ? "bento-badge-purple" : "bento-badge-emerald"}`}>
                  {engineState.summary.divergenceDetected ? "ACCOUNTING DIVERGENCE ACTIVE" : "CONCORDANT RESULTS"}
                </span>
                <span style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  {engineState.summary.divergenceNotes}
                </span>
              </div>

              <div className="bento-grid-4" style={{ marginTop: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>LIBR Recoverable</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }} className="font-mono-tabular">
                    ₹{engineState.summary.librRecoverable.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--bento-text-muted)" }}>Capped at lowest balance</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>FIFO Recoverable</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#DC2626" }} className="font-mono-tabular">
                    ₹{engineState.summary.fifoRecoverable.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--bento-text-muted)" }}>Assumes dirty spent first</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Pro-Rata Recoverable</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#2563EB" }} className="font-mono-tabular">
                    ₹{engineState.summary.proRataRecoverable.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--bento-text-muted)" }}>Fractional apportionment</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Merchant Clean Shield</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#7C3AED" }} className="font-mono-tabular">
                    ₹{engineState.summary.cleanFundsProtectedLibr.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--bento-text-muted)" }}>Protected from police lien</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: Dinic Min-Cut Verifier */}
      {activeTab === "min-cut" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Dinic Min-Cut Freeze Completeness & Residual Path Verifier
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Finds the minimum capacity cut of bank accounts that completely severs victim source funds from cashout sinks.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>
                  Freeze Budget K: <strong className="font-mono-tabular">{freezeBudgetK} Accounts</strong>
                </span>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={freezeBudgetK}
                  onChange={(e) => setFreezeBudgetK(parseInt(e.target.value, 10))}
                  style={{ accentColor: "#2563EB", cursor: "pointer", width: "120px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px", alignItems: "center" }}>
              <SemiCircleGauge
                percentage={containmentPercentage}
                label="FUND FLOW CONTAINMENT"
                sublabel={`Budget K=${freezeBudgetK} Accounts`}
                summaryText={engineState.minCut.isFreezeComplete ? "FULL CONTAINMENT (SAT)" : "RESIDUAL ESCAPE ALERT"}
                color={engineState.minCut.isFreezeComplete ? "var(--bento-emerald)" : "var(--bento-amber)"}
              />

              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: engineState.minCut.isFreezeComplete ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                  border: engineState.minCut.isFreezeComplete ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className={`bento-badge ${engineState.minCut.isFreezeComplete ? "bento-badge-emerald" : "bento-badge-coral"}`}>
                    {engineState.minCut.verdict}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                    Min-Cut Capacity: <strong className="font-mono-tabular">{engineState.minCut.minCutCapacity} Accounts</strong>
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "var(--bento-text-main)", lineHeight: 1.5, marginBottom: "12px" }}>
                  {engineState.minCut.verdictDetail}
                </div>

                {engineState.minCut.residualPaths.length > 0 && (
                  <div style={{ padding: "10px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)", fontSize: "11px", color: "#DC2626" }}>
                    <strong>Leaking Path: </strong>
                    <span className="font-mono-tabular">{engineState.minCut.residualPaths[0].join(" → ")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: BNSS § 106/107 Notices */}
      {activeTab === "bnss" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "4px" }}>
              Dual-Track BNSS Statutory Requisition & Attachment Generator
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "20px" }}>
              Automated legal drafting compliant with Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 and MHA SOP of 02.01.2026.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Notice 106(1) */}
              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--bento-border-subtle)", background: "var(--bento-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span className="bento-badge bento-badge-amber">SECTION 106(1) BNSS</span>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)", marginTop: "4px" }}>
                      Administrative Debit Lien Notice (24h)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(bnssDrafts.notice106.draftText, "106")}
                    className="bento-btn bento-btn-secondary bento-btn-sm"
                  >
                    {copiedDraft === "106" ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedDraft === "106" ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  value={bnssDrafts.notice106.draftText}
                  style={{
                    width: "100%",
                    height: "260px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "#0F172A",
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    resize: "none",
                  }}
                />
              </div>

              {/* Application 107(1) */}
              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--bento-border-subtle)", background: "var(--bento-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span className="bento-badge bento-badge-blue">SECTION 107(1) BNSS</span>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)", marginTop: "4px" }}>
                      Magistrate Attachment Application (48h)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(bnssDrafts.application107.draftText, "107")}
                    className="bento-btn bento-btn-secondary bento-btn-sm"
                  >
                    {copiedDraft === "107" ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedDraft === "107" ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  value={bnssDrafts.application107.draftText}
                  style={{
                    width: "100%",
                    height: "260px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "#0F172A",
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    resize: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

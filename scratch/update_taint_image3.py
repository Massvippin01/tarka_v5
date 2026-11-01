import re

path = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add SemiCircleGauge import if not present
if 'SemiCircleGauge' not in c:
    c = c.replace(
        'import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";',
        'import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";\nimport { SemiCircleGauge } from "../../components/tarka/BentoPrimitives";'
    )
    if 'Store' not in c:
        c = c.replace(
            'Building,',
            'Building, Store,'
        )

# 2. Update Right Panel with Recoverable Flow Containment (Image 3)
old_right_panel = '''            {/* CARD 1: DUAL CONTAINMENT & RECOVERY WATERFALL */}
            <SectionCard
              title="Dual Containment & Recovery Waterfall"
              subtitle="Measures outward graph leakage and net recoverable funds after irreversible cashouts."
              icon={Scale}
              iconColor="#059669"
              badgeText="ROSCOE V. WINDER"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
                {/* Metric Summary Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#166534" }}>FLOW CONTAINMENT</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#15803D" }}>
                      <AnimatedCounter value={containmentPct} suffix="%" />
                    </div>
                    <div style={{ fontSize: "8px", color: "#166534" }}>
                      {engineState.minCut.isFreezeComplete ? "0 Open Escape Routes ✓" : "Outward Leakage"}
                    </div>
                  </div>

                  <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#0369A1" }}>NET RECOVERABLE</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#0284C7" }}>
                      <AnimatedCounter value={netRecoverable} prefix="₹" />
                    </div>
                    <div style={{ fontSize: "8px", color: "#0369A1" }}>76.0% Held under Liens</div>
                  </div>
                </div>

                {/* Horizontal Recovery Waterfall */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Rupee Recovery Waterfall:
                  </div>
                  <div style={{ display: "flex", height: "14px", borderRadius: "3px", overflow: "hidden", gap: "1px" }}>
                    {/* Cashed Out: 24% */}
                    <div style={{ width: "24%", background: "#F43F5E" }} title="ATM Cashout: ₹1,20,000 (Irrecoverable)" />
                    {/* Mule Retained: 40% */}
                    <div style={{ width: "40%", background: "#F59E0B" }} title="Mule §107 Hold: ₹2,00,000 (Frozen)" />
                    {/* Merchant Lien: 36% */}
                    <div style={{ width: "36%", background: "#0284C7" }} title="Merchant §106 Lien: ₹1,80,000 (Specific)" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "8px", color: "#64748B" }}>
                    <span style={{ color: "#E11D48", fontWeight: 700 }}>−₹1.2L Cashout (24%)</span>
                    <span style={{ color: "#B45309", fontWeight: 700 }}>₹2.0L Mule Hold (40%)</span>
                    <span style={{ color: "#0284C7", fontWeight: 700 }}>₹1.8L §106 Lien (36%)</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* CARD 2: SHARED-AXIS 3-RULE COMPARISON */}
            <SectionCard
              title="3-Rule Shared-Axis Accounting Comparison"
              subtitle="LIBR vs FIFO vs Pro-Rata plotted on a single ₹0 to ₹5.0L rupee axis."
              icon={Sliders}
              iconColor="#4F46E5"
              badgeText="CAPITAL SHIELD"
              badgeVariant="indigo"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px", justifyContent: "center" }}>
                {/* 3 Bars on Shared Axis */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* LIBR */}
                  <div
                    onClick={() => setSelectedRule("LIBR")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "LIBR" ? "#ECFDF5" : "transparent",
                      border: selectedRule === "LIBR" ? "1px solid #A7F3D0" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#047857" }}>LIBR (Lowest Intermediate Balance) ★</span>
                      <span style={{ color: "#047857" }}>₹3,80,000 (Clean Capital 100% Saved)</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: "76%", height: "100%", background: "#10B981", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* FIFO */}
                  <div
                    onClick={() => setSelectedRule("FIFO")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "FIFO" ? "#EEF2FF" : "transparent",
                      border: selectedRule === "FIFO" ? "1px solid #C7D2FE" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#4338CA" }}>FIFO (First In, First Out)</span>
                      <span style={{ color: "#4338CA" }}>₹2,00,000 (Withdrawals Deplete Taint)</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: "40%", height: "100%", background: "#6366F1", borderRadius: "4px" }} />
                    </div>
                  </div>

                  {/* Pro-Rata */}
                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "transparent",
                      border: selectedRule === "PRO_RATA" ? "1px solid #FDE68A" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700 }}>
                      <span style={{ color: "#B45309" }}>Pro-Rata (Proportional Commingling)</span>
                      <span style={{ color: "#B45309" }}>{isInjectClean ? "₹2,74,000 (Commingled Fraction)" : "₹3,80,000"}</span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                      <div style={{ width: isInjectClean ? "55%" : "76%", height: "100%", background: "#F59E0B", borderRadius: "4px" }} />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "8px", color: "#64748B", marginTop: "2px", borderTop: "1px solid #F1F5F9", paddingTop: "4px" }}>
                  Selected: <strong>{selectedRule}</strong> · Statutory Precedent: <strong>Roscoe v. Winder (1915)</strong>
                </div>
              </div>
            </SectionCard>'''

new_right_panel = '''            {/* RECOVERABLE FLOW CONTAINMENT & 3-RULE DOCTRINES (IMAGE 3) */}
            <SectionCard
              title="Recoverable Flow Containment"
              subtitle="Measures outward graph leakage and net recoverable funds under judicial doctrines."
              icon={Scale}
              iconColor="#059669"
              badgeText="ROSCOE V. WINDER"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
                {/* Semicircle Gauge Card matching Image 3 */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <SemiCircleGauge
                    percentage={containmentPct}
                    label="Recoverable Flow Contained"
                    sublabel={`Dinic Budget K = ${freezeBudgetK} Accounts`}
                    summaryText={engineState.minCut.isFreezeComplete ? "✓ 100% Flow Sealed · No Outward Leakage" : "⚠ Residual Leakage to Terminal Sink"}
                    color={engineState.minCut.isFreezeComplete ? "#059669" : "#D97706"}
                    size={160}
                  />

                  {/* Dual Outflow Metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", width: "100%", marginTop: "4px", paddingTop: "6px", borderTop: "1px solid #E2E8F0" }}>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "7.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Victim Outflow</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>₹5,00,000</div>
                    </div>
                    <div style={{ textAlign: "center", background: "#FFFFFF", padding: "4px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "7.5px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Frozen in Lien</div>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                        ₹{(500000 - engineState.minCut.residualLeakageAmount).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Accounting Rule Cards matching Image 3 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px" }}>
                  <div
                    onClick={() => setSelectedRule("LIBR")}
                    style={{
                      background: selectedRule === "LIBR" ? "#ECFDF5" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "LIBR" ? "2px solid #059669" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#047857" }}>LIBR (HC) ★</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.librRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Caps taint at lowest bal.</div>
                  </div>

                  <div
                    onClick={() => setSelectedRule("FIFO")}
                    style={{
                      background: selectedRule === "FIFO" ? "#EEF2FF" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "FIFO" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#4F46E5" }}>FIFO</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.fifoRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Oldest credits spent first.</div>
                  </div>

                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                      padding: "6px 5px",
                      borderRadius: "6px",
                      border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7px", color: "#64748B", lineHeight: "1.1" }}>Commingled fraction.</div>
                  </div>
                </div>

                <div style={{ fontSize: "8.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 8px", borderRadius: "5px" }}>
                  <strong>Selected Rule:</strong> {selectedRule} · Recoverable: <strong style={{ color: "#0F172A" }}>₹{(selectedRule === "LIBR" ? engineState.summary.librRecoverable : selectedRule === "FIFO" ? engineState.summary.fifoRecoverable : engineState.summary.proRataRecoverable).toLocaleString("en-IN")}</strong>
                </div>

                {/* Transition to Statutory Orders View */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceMode("orders")}
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    width: "100%",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#059669",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <span>📋 Draft BNSS §106/§107 Orders</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </SectionCard>'''

if old_right_panel in c:
    c = c.replace(old_right_panel, new_right_panel)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("TAINT RIGHT PANEL UPDATED WITH GAUGE & 3 RULES")
else:
    print("OLD RIGHT PANEL NOT FOUND")

# 3. Update the Time-Expanded DAG View (left panel when flowViewType === 'dag')
old_dag_view = '''                    /* =============================================================
                       TIME-EXPANDED DAG VIEW
                       ============================================================= */
                    <div style={{ padding: "12px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {/* Layer 0 & 1 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 0 & 1 · Fraud Inception
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FECDD3", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#E11D48" }}>VICTIM · 09:30:15 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Sunil Kumar</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 30910029101</div>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#E11D48" }}>-₹5,00,000.00</div>
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#D97706" }}>MULE L1 · 09:34:58 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Vikram Shah</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 41088291083 · Dwell: 112s</div>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#B45309" }}>Inflow: ₹5,00,000</div>
                          </div>
                        </div>

                        {/* Layer 2 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 2 · Split Conduits
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#B45309" }}>MULE L2A · 09:38:20 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Rohit Verma</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>HDFC 5010029419920</div>
                            <div style={{ fontSize: "9px", color: "#0F172A" }}>Inflow: ₹3.00L | Retained: ₹1.20L</div>
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#B45309" }}>MULE L2B · 09:41:05 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Sameer Khan</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>AXIS 9140200410291</div>
                            <div style={{ fontSize: "9px", color: "#0F172A" }}>Inflow: ₹2.00L | Retained: ₹80,000</div>
                          </div>
                        </div>

                        {/* Layer 3 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Layer 3 · Sinks & Liens
                          </div>
                          <div style={{ background: "#FFFFFF", border: "1px solid #BAE6FD", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#0284C7" }}>MERCHANT · §106 LIEN ONLY</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>Apex Electronics Pvt Ltd</div>
                            <div style={{ fontSize: "9px", color: "#64748B" }}>GST: 07AAACA1234F1Z8</div>
                            <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0284C7" }}>Specific Lien: ₹1,80,000</div>
                          </div>
                          <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "6px", padding: "8px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#E11D48" }}>ATM SINK · 09:44:00 IST</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#991B1B" }}>Noida Sec 18 ATM DL-049</div>
                            <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#E11D48" }}>Cash Out: ₹1,20,000</div>
                          </div>
                        </div>
                      </div>
                    </div>'''

new_dag_view = '''                    /* =============================================================
                       CONNECTED 5-COLUMN TIME-EXPANDED DAG VIEW (MATCHING IMAGE 3)
                       ============================================================= */
                    <div style={{ padding: "10px", height: "100%", overflowY: "auto", display: "grid", gridTemplateColumns: "1.2fr 45px 1.2fr 45px 1.4fr", gap: "4px", alignItems: "stretch", boxSizing: "border-box" }}>
                      {/* COLUMN 1: Victim Source & Mule Layer 1 */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 0: Victim Source */}
                        <div style={{ background: "#FFFFFF", border: "1.5px solid #FECDD3", borderRadius: "8px", padding: "8px 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>Victim Source</span>
                            <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>09:30:15 IST</span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sunil Kumar</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>SBI 30910029101</div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            -₹5,00,000.00
                          </div>
                        </div>

                        {/* Node 1: Mule Layer 1 (Vikram Shah) */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #059669",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule Layer 1</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 4px", borderRadius: "3px" }}>
                              § 107 FROZEN
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram Shah</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                          <div style={{ fontSize: "11px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            Inflow: ₹5,00,000
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 2: Bridge 1 -> 2 Wires */}
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <svg width="100%" height="100%" viewBox="0 0 45 220" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                          <path d="M 0 170 C 22 170, 22 45, 43 45" fill="none" stroke="#4F46E5" strokeWidth="2" strokeDasharray="3 2" />
                          <path d="M 0 185 C 22 185, 22 175, 43 175" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "3 2"} />
                        </svg>
                        <div style={{ position: "absolute", left: "50%", top: "35%", transform: "translate(-50%, -50%)", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "3px", padding: "1px 3px", fontSize: "7px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                          ₹3.0L Outflow ↓
                        </div>
                      </div>

                      {/* COLUMN 3: Stage 2 (Rohit Verma & Sameer Khan) */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 2A: Rohit Verma */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split A)</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 2 ? "#047857" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Rohit Verma</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>HDFC 5010029419920</div>
                          <div style={{ fontSize: "8.5px", color: "#0F172A", marginTop: "2px" }}>
                            Inflow: <strong>₹3,00,000</strong> | Forwarded to Apex: <strong>₹1,80,000</strong> | Retained & Frozen (§107): <strong>₹1,20,000</strong>
                          </div>
                        </div>

                        {/* Node 2B: Sameer Khan */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: freezeBudgetK >= 3 ? "1.5px solid #059669" : "1.5px solid #E11D48",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split B)</span>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK ESCAPE"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sameer Khan</div>
                          <div style={{ fontSize: "8.5px", color: "#64748B" }}>AXIS 9140200410291</div>
                          <div style={{ fontSize: "8.5px", color: "#0F172A", marginTop: "2px" }}>
                            Inflow: <strong>₹2,00,000</strong> | ATM Cashout: <strong>₹1,20,000</strong> | Retained & Frozen (§107): <strong>₹80,000</strong>
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 4: Bridge 2 -> 3 Wires */}
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <svg width="100%" height="100%" viewBox="0 0 45 220" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                          <path d="M 0 45 C 22 45, 22 45, 43 45" fill="none" stroke="#059669" strokeWidth="2" />
                          <path d="M 0 175 C 22 175, 22 175, 43 175" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "3 2"} />
                        </svg>
                      </div>

                      {/* COLUMN 5: Stage 3 (Apex Electronics & Noida ATM DL-049) */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                        {/* Node 3: Apex Electronics (Innocent Merchant) */}
                        <div
                          onClick={() => setActiveWorkspaceMode("orders")}
                          style={{
                            background: "#FFFFFF",
                            border: "1.5px solid #059669",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Store size={12} color="#059669" />
                              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>Innocent Merchant</span>
                            </div>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 4px", borderRadius: "3px" }}>
                              § 106 LIEN ONLY
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Apex Electronics Pvt Ltd</div>
                          <div style={{ fontSize: "8px", color: "#64748B" }}>GST: 07AAACA1234F1Z8 · ICICI Bank</div>

                          <div style={{ marginTop: "3px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginBottom: "1px" }}>
                              <span style={{ color: "#047857", fontWeight: 700 }}>{isInjectClean ? "₹2.50L Clean" : "Clean Working Capital: ₹0"}</span>
                              <span style={{ color: "#BE123C", fontWeight: 700 }}>Tainted Inflow: ₹1.80L (§ 106 Lien)</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                              <div style={{ width: isInjectClean ? "58%" : "0%", background: "#059669", height: "100%" }} />
                              <div style={{ width: isInjectClean ? "42%" : "100%", background: "#E11D48", height: "100%" }} />
                            </div>
                          </div>
                          <div style={{ fontSize: "7.5px", color: "#E11D48", marginTop: "2px" }}>
                            100% Tainted Inflow (₹1.80L) locked under §106 Specific Lien. Click '+ Inject Clean Deposit' to simulate commingled merchant working capital.
                          </div>
                        </div>

                        {/* Node 4: Noida Sec 18 ATM */}
                        <div
                          style={{
                            background: "#F8FAFC",
                            border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                            borderRadius: "8px",
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Building size={12} color="#64748B" />
                              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Terminal Sink</span>
                            </div>
                            <span style={{ fontSize: "8px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", padding: "0.5px 4px", borderRadius: "3px" }}>
                              {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Noida Sec 18 ATM DL-049</div>
                          <div style={{ fontSize: "10px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#BE123C" : "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            Dispensed: ₹1,20,000 (Cash Out)
                          </div>
                        </div>
                      </div>
                    </div>'''

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

if old_dag_view in c:
    c = c.replace(old_dag_view, new_dag_view)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("TAINT CONNECTED DAG VIEW UPDATED WITH 5-COLUMN SVG WIRES")
else:
    print("OLD DAG VIEW NOT FOUND")

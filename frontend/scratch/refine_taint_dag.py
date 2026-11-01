path = "src/pages/v5/TaintEngineScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Check if AnimatedCounter is imported
if "AnimatedCounter" not in text:
    old_imp = 'import { StripeSegmentedBar } from "../../components/ui/forensic-infographics";'
    new_imp = 'import { StripeSegmentedBar, AnimatedCounter } from "../../components/ui/forensic-infographics";'
    if old_imp in text:
        text = text.replace(old_imp, new_imp, 1)

# 2. Find and replace the 5-column grid section
dag_start_marker = '{/* 5-Column Connected Flow Pipeline Architecture */}'
dag_end_marker = '{/* Dinic Min-Cut Freeze Budget Controller Docked at Bottom */}'

assert dag_start_marker in text, "dag_start_marker not found"
assert dag_end_marker in text, "dag_end_marker not found"

start_idx = text.find(dag_start_marker)
end_idx = text.find(dag_end_marker)

new_dag_block = '''{/* 5-Column Connected Flow Pipeline Architecture */}
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: "220px",
                  position: "relative",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "1.1fr 50px 1.15fr 50px 1.35fr",
                  gap: "6px",
                  alignItems: "stretch",
                  boxSizing: "border-box",
                }}
              >
                {/* COLUMN 1: Stage 1 (Victim & L1 Mule) */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", height: "100%" }}>
                  {/* Node 0: Victim Source */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFF1F2",
                      border: "1px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#BE123C", textTransform: "uppercase" }}>Victim Source</span>
                      <span style={{ fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>09:30:15 IST</span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sunil Kumar</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 30910029101</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      -₹5,00,000.00
                    </div>
                  </div>

                  {/* Connecting Conduit */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "22px" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, width: "2px", background: "repeating-linear-gradient(to bottom, #4F46E5 0, #4F46E5 3px, transparent 3px, transparent 6px)" }} />
                    <span style={{ position: "relative", zIndex: 1, fontSize: "8px", fontWeight: 800, color: "#FFFFFF", background: "#4F46E5", padding: "1.5px 6px", borderRadius: "4px", fontFamily: "var(--font-mono)" }}>
                      ₹5.0L Outflow ↓
                    </span>
                  </div>

                  {/* Node 1: Mule Layer 1 (Vikram Shah) */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: freezeBudgetK >= 1 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule Layer 1</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 1 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 1 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 1 ? "§ 107 FROZEN" : "UNFROZEN"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Vikram Shah</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>SBI 41088291083 (Dwell: 112s)</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Inflow: ₹5,00,000
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", marginTop: "4px" }}>
                      Mule Typology: 98/100 · Pass-Through Conduit (Dwell: 112s)
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Bridge 1 -> 2 Wires */}
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <svg width="100%" height="100%" viewBox="0 0 50 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <defs>
                      <style>{`
                        @keyframes taintFlowPulse {
                          from { stroke-dashoffset: 24; }
                          to { stroke-dashoffset: 0; }
                        }
                        .wire-pulse-active {
                          animation: taintFlowPulse 1.2s linear infinite;
                        }
                        .wire-pulse-leak {
                          animation: taintFlowPulse 0.6s linear infinite;
                        }
                      `}</style>
                      <marker id="bridgeArrowIndigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4F46E5" />
                      </marker>
                      <marker id="bridgeArrowEmerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                      </marker>
                      <marker id="bridgeArrowRose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E11D48" />
                      </marker>
                    </defs>
                    {/* Rohit Verma Wire: Thicker (60% flow) with curve from bottom of Col 1 up to top of Col 3 */}
                    <path d="M 0 70 C 25 70, 25 28, 48 28" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5 3" className="wire-pulse-active" markerEnd="url(#bridgeArrowIndigo)" />
                    {/* Sameer Khan Wire: 40% flow horizontal bridge */}
                    <path d="M 0 76 C 25 76, 25 76, 48 76" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2.5" strokeDasharray={freezeBudgetK >= 3 ? "none" : "5 3"} className={freezeBudgetK >= 3 ? "" : "wire-pulse-leak"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />
                  </svg>
                  <div style={{ position: "absolute", left: "50%", top: "42%", transform: "translate(-50%, -50%)", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: "#4338CA", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹3.0L (60%)
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "76%", transform: "translate(-50%, -50%)", background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", border: freezeBudgetK >= 3 ? "1px solid #A7F3D0" : "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹2.0L (40%)
                  </div>
                </div>

                {/* COLUMN 3: Stage 2 (Rohit Verma & Sameer Khan) */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", height: "100%" }}>
                  {/* Node 2A: Rohit Verma */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: freezeBudgetK >= 2 ? "1.5px solid #059669" : "1.5px solid #FECDD3",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split A)</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 2 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 2 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 2 ? "§ 107 FROZEN" : "UNFROZEN"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Rohit Verma</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>HDFC 5010029419920</div>
                    <div style={{ fontSize: "9px", color: "#0F172A", marginTop: "2px" }}>
                      Inflow: <strong>₹3,00,000</strong> · Forwarded: <strong>₹1,80,000</strong>
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "3px", padding: "1px 4px", marginTop: "4px" }}>
                      Mule Typology: 94/100 · Split Conduit (Shared JA4 & BSSID)
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
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>Mule L2 (Split B)</span>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#ECFDF5" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#047857" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 3 ? "§ 107 FROZEN" : "LEAK ESCAPE"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Sameer Khan</div>
                    <div style={{ fontSize: "9px", color: "#64748B" }}>AXIS 9140200410291</div>
                    <div style={{ fontSize: "9px", color: "#0F172A", marginTop: "2px" }}>
                      Inflow: <strong>₹2,00,000</strong> · ATM Cashout: <strong>₹1,20,000</strong>
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "3px", padding: "1px 4px", marginTop: "4px" }}>
                      Mule Typology: 94/100 · Split Conduit (Shared JA4 & BSSID)
                    </div>
                  </div>
                </div>

                {/* COLUMN 4: Bridge 2 -> 3 Wires */}
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <svg width="100%" height="100%" viewBox="0 0 50 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <path d="M 0 28 C 25 28, 25 28, 48 28" fill="none" stroke="#059669" strokeWidth="2" markerEnd="url(#bridgeArrowEmerald)" />
                    <path d="M 0 76 C 25 76, 25 76, 48 76" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "4 2"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />
                  </svg>
                  <div style={{ position: "absolute", left: "50%", top: "24%", transform: "translate(-50%, -50%)", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹1.80L POS
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "76%", transform: "translate(-50%, -50%)", background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", border: freezeBudgetK >= 3 ? "1px solid #CBD5E1" : "1px solid #FECDD3", borderRadius: "3px", padding: "1px 4px", fontSize: "7.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    ₹1.20L ATM
                  </div>
                </div>

                {/* COLUMN 5: Stage 3 (Apex Electronics & Noida ATM DL-049) */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", height: "100%" }}>
                  {/* Node 3: Apex Electronics (Innocent Merchant) */}
                  <div
                    onClick={() => setActiveWorkspaceMode("orders")}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #059669",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Store size={12} color="#059669" />
                        <span style={{ fontSize: "9px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>Innocent Merchant</span>
                      </div>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "0.5px 5px", borderRadius: "3px" }}>
                        § 106 LIEN ONLY
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Apex Electronics Pvt Ltd</div>
                    <div style={{ fontSize: "8.5px", color: "#64748B" }}>GST: 07AAACA1234F1Z8 · ICICI Bank</div>

                    <div style={{ marginTop: "5px" }}>
                      <StripeSegmentedBar
                        height={16}
                        showLabels={true}
                        totalValue={isInjectClean ? 430000 : 180000}
                        segments={
                          isInjectClean
                            ? [
                                { id: "clean", label: "Clean GST", value: 250000, color: "#10B981" },
                                { id: "lien", label: "§106 Lien", value: 180000, isHatched: true, color: "crimson", tooltipText: "Tainted Inflow Frozen" },
                              ]
                            : [
                                { id: "lien", label: "§106 Lien (100%)", value: 180000, isHatched: true, color: "crimson", tooltipText: "100% Inflow Frozen" },
                              ]
                        }
                      />
                    </div>

                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "3px", padding: "1px 4px", marginTop: "4px" }}>
                      Mule Typology: 06/100 · Bona-Fide Merchant (Counter-Evidence: Active GSTIN)
                    </div>
                  </div>

                  {/* Node 4: Noida Sec 18 ATM */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: freezeBudgetK >= 3 ? "1px solid #E2E8F0" : "1.5px solid #E11D48",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Building size={12} color="#64748B" />
                        <span style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Terminal Sink</span>
                      </div>
                      <span style={{ fontSize: "8.5px", fontWeight: 800, background: freezeBudgetK >= 3 ? "#F1F5F9" : "#FFF1F2", color: freezeBudgetK >= 3 ? "#475569" : "#BE123C", padding: "0.5px 5px", borderRadius: "3px" }}>
                        {freezeBudgetK >= 3 ? "SEALED EXIT" : "DISPENSING LEAK"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>Noida Sec 18 ATM DL-049</div>
                    <div style={{ fontSize: "10.5px", fontWeight: 800, color: freezeBudgetK >= 3 ? "#64748B" : "#E11D48", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Dispensed: ₹1,20,000 (Cash Out)
                    </div>
                  </div>
                </div>
              </div>

              '''

text = text[:start_idx] + new_dag_block + text[end_idx:]

# 3. Add Judicial Precedent Card in Right Panel
old_note_block = '''                <div style={{ fontSize: "9.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 7px", borderRadius: "5px", marginTop: "4px" }}>
                  <strong>Selected Accounting Rule:</strong> {selectedRule} · Recoverable: <strong>₹{ruleRecoverableAmount.toLocaleString("en-IN")}</strong>
                </div>
              </div>'''

new_note_block = '''                <div style={{ fontSize: "9.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 7px", borderRadius: "5px", marginTop: "4px" }}>
                  <strong>Selected Accounting Rule:</strong> {selectedRule} · Recoverable: <strong>₹{ruleRecoverableAmount.toLocaleString("en-IN")}</strong>
                </div>

                {/* Judicial Precedent & Statutory Lien Anchor Card */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Judicial Precedent & Lien Anchor
                    </span>
                    <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "0.5px 4px", borderRadius: "3px" }}>
                      BNSS §106 / §107
                    </span>
                  </div>
                  <div style={{ fontSize: "9px", color: "#475569", lineHeight: 1.35 }}>
                    <strong>Lowest Intermediate Balance Rule (LIBR):</strong> Originating in <em>Roscoe v. Winder [1915]</em>, equity presumes tainted outflows are spent first, capping lien recovery strictly at the lowest trough balance before subsequent bona-fide commercial deposits.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #CBD5E1", paddingTop: "4px", marginTop: "2px", fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    <span>PROOF REF: LIBR-2026-HC</span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>✓ ZERO INNOCENT DILUTION</span>
                  </div>
                </div>
              </div>'''

assert old_note_block in text, "old_note_block not found"
text = text.replace(old_note_block, new_note_block, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("TaintEngineScreen.tsx DAG & Right Panel refined!")


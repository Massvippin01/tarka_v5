import sys

path = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

idx1 = c.find('RIGHT SUPPORT PANEL')
idx1 = c.rfind('{/*', 0, idx1)
idx2 = c.find('</main>', idx1)

new_panel = '''{/* =====================================================================
              RIGHT SUPPORT PANEL (4 COLUMNS): RECOVERABLE FLOW CONTAINMENT (IMAGE 3)
              ===================================================================== */}
          <div
            style={{
              gridColumn: "span 4",
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflow: "hidden",
            }}
          >
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
            </SectionCard>
          </div>
        '''

c = c[:idx1] + new_panel + c[idx2:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('SUCCESSFULLY REPLACED RIGHT PANEL')

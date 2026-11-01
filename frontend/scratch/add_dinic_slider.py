path = "src/pages/v5/TaintEngineScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

target_marker = '{/* Real-Time Reachability Cut Matrix (4 Routes) */}'
assert target_marker in text, "target_marker not found"

slider_block = '''{/* Continuous Interactive Dinic Slider Track matching Image 5 */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", boxShadow: "0 1px 2px rgba(15,23,42,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                      K=1 (Single Lien)
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: engineState.minCut.isFreezeComplete ? "#059669" : "#D97706", fontFamily: "var(--font-mono)" }}>
                      {engineState.minCut.isFreezeComplete ? "OPTIMAL CUT: K = 3 (100% FLOW CONTAINED ✓)" : `BUDGET K = ${freezeBudgetK} (LEAK DETECTED ⚠)`}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                      K=6 (Exhaustive Freeze)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={freezeBudgetK}
                    onChange={(e) => setFreezeBudgetK(parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#4F46E5",
                      cursor: "pointer",
                      height: "6px",
                      margin: "4px 0",
                    }}
                    title="Drag to simulate Dinic Min-Cut budget threshold K across mule layers"
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    <span>Unsealed</span>
                    <span>Partial (40% Leak)</span>
                    <span style={{ color: "#4F46E5", fontWeight: 800 }}>★ Min-Cut Optimal (K=3)</span>
                    <span>Redundant</span>
                    <span>Max Lien</span>
                  </div>
                </div>

                {/* Real-Time Reachability Cut Matrix (4 Routes) */}'''

text = text.replace(target_marker, slider_block, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Dinic continuous slider track added!")


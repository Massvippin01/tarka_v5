import sys

with open('src/pages/v5/TaintEngineScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
old_import = 'import { BentoKpiCard, SemiCircleGauge } from "../../components/tarka/BentoPrimitives";'
new_import = 'import { BentoKpiCard, SemiCircleGauge } from "../../components/tarka/BentoPrimitives";\nimport { StripeSegmentedBar } from "../../components/ui/forensic-infographics";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)

# 2. Replace Apex flat bar
old_bar = """                    <div style={{ marginTop: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", marginBottom: "1.5px" }}>
                        <span style={{ color: "#047857", fontWeight: 700 }}>{isInjectClean ? "₹2.50L Clean" : "Clean Working: ₹0"}</span>
                        <span style={{ color: "#BE123C", fontWeight: 700 }}>₹1.80L Specific Lien</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
                        <div style={{ width: isInjectClean ? "58%" : "0%", background: "#059669", height: "100%" }} />
                        <div style={{ width: isInjectClean ? "42%" : "100%", background: "#E11D48", height: "100%" }} />
                      </div>
                    </div>"""

new_bar = """                    <div style={{ marginTop: "5px" }}>
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
                    </div>"""

if old_bar in content:
    content = content.replace(old_bar, new_bar, 1)

# 3. Add animated pulse style to SVG wires
old_defs = """                    <defs>
                      <marker id="bridgeArrowIndigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4F46E5" />
                      </marker>
                      <marker id="bridgeArrowEmerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                      </marker>
                      <marker id="bridgeArrowRose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E11D48" />
                      </marker>
                    </defs>"""

new_defs = """                    <defs>
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
                    </defs>"""

if old_defs in content:
    content = content.replace(old_defs, new_defs, 1)

# Update wire paths with animated class
old_paths = """                    <path d="M 0 195 C 25 195, 25 50, 48 50" fill="none" stroke="#4F46E5" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#bridgeArrowIndigo)" />
                    <path d="M 0 215 C 25 215, 25 215, 48 215" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2" strokeDasharray={freezeBudgetK >= 3 ? "none" : "4 2"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />"""

new_paths = """                    {/* Rohit Verma Wire: Thicker (60% flow) with pulse */}
                    <path d="M 0 195 C 25 195, 25 50, 48 50" fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray="6 3" className="wire-pulse-active" markerEnd="url(#bridgeArrowIndigo)" />
                    {/* Sameer Khan Wire: 40% flow with leak pulse if unsealed */}
                    <path d="M 0 215 C 25 215, 25 215, 48 215" fill="none" stroke={freezeBudgetK >= 3 ? "#059669" : "#E11D48"} strokeWidth="2.5" strokeDasharray={freezeBudgetK >= 3 ? "none" : "6 3"} className={freezeBudgetK >= 3 ? "" : "wire-pulse-leak"} markerEnd={freezeBudgetK >= 3 ? "url(#bridgeArrowEmerald)" : "url(#bridgeArrowRose)"} />"""

if old_paths in content:
    content = content.replace(old_paths, new_paths, 1)

with open('src/pages/v5/TaintEngineScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("TaintEngineScreen updated successfully!")


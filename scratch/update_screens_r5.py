import re

# 1. UPDATE AttributionScreen.tsx
attrib_path = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx'
with open(attrib_path, 'r', encoding='utf-8') as f:
    ac = f.read()

# Replace the Z3 Caliper SectionCard content with Image 2 exact visual
old_caliper = '''              {/* Precision ScaleBar for Z3 Clock Offset */}
              <ScaleBar
                labelAbove="CBS Finacle ↔ Airtel PGW NTP Sync"
                min={-5.0}
                max={5.0}
                value={clockOffset}
                unit="s"
                toleranceBand={{
                  from: -1.2,
                  to: 0.8,
                  label: "FEASIBLE BOUND [-1.2s, +0.8s]",
                }}
                valueBelow={`Δ = ${clockOffset >= 0 ? "+" : ""}${clockOffset.toFixed(1)}s (Stratum-2 Sync)`}
              />

              {/* Slider Controller */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F1F5F9", padding: "4px 8px", borderRadius: "5px" }}>
                <Sliders size={12} color="#64748B" />
                <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#475569" }}>Test Clock Skew:</span>
                <input
                  type="range"
                  min="-5.0"
                  max="5.0"
                  step="0.1"
                  value={clockOffset}
                  onChange={(e) => setClockOffset(parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: "pointer", height: "4px" }}
                />
                <button
                  type="button"
                  onClick={() => setClockOffset(0.0)}
                  style={{ fontSize: "8px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
                >
                  Reset NTP (0.0s)
                </button>
              </div>'''

new_caliper = '''              {/* Exact Z3 SMT Number Line Infographic matching Image 2 */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]
                  </span>
                  <span style={{ fontSize: "9.5px", color: isZ3Sat ? "#059669" : "#DC2626", fontWeight: 800, background: isZ3Sat ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${isZ3Sat ? "#A7F3D0" : "#FECDD3"}`, padding: "1.5px 6px", borderRadius: "4px" }}>
                    {isZ3Sat ? "Z3 SOLVER: SAT ✓" : "Z3 SOLVER: UNSAT ✗"}
                  </span>
                </div>

                {/* Number Line Track */}
                <div style={{ position: "relative", height: "18px", background: "#E2E8F0", borderRadius: "9px", overflow: "hidden", margin: "4px 0" }}>
                  {/* Feasible Interval Shading: [-1.2s, +0.8s] spanning 38% to 58% of 10s range */}
                  <div style={{ position: "absolute", left: "38%", width: "20%", top: 0, bottom: 0, background: "rgba(16, 185, 129, 0.45)", borderRadius: "4px" }} />
                  {/* Center Line: 0.0s */}
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "#64748B", zIndex: 2 }} />
                  {/* Active Marker */}
                  <div
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${(Math.max(-5, Math.min(5, clockOffset)) / 5) * 48}%)`,
                      top: "3px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: isZ3Sat ? "#059669" : "#DC2626",
                      border: "2px solid #FFFFFF",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      zIndex: 5,
                      transform: "translateX(-50%)",
                      transition: "left 0.1s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                  <span>-5.0s</span>
                  <span style={{ color: "#047857", fontWeight: 700 }}>-1.2s</span>
                  <span style={{ fontWeight: 800, color: isZ3Sat ? "#059669" : "#DC2626" }}>
                    Δt = {clockOffset >= 0 ? "+" : ""}{clockOffset.toFixed(1)}s ({clockOffset === 0 ? "NTP Sync" : isZ3Sat ? "Stratum-2 Feasible" : "Out of Spec"})
                  </span>
                  <span style={{ color: "#047857", fontWeight: 700 }}>+0.8s</span>
                  <span>+5.0s</span>
                </div>
              </div>

              {/* Slider Controller */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F1F5F9", padding: "4px 8px", borderRadius: "5px" }}>
                <Sliders size={12} color="#64748B" />
                <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#475569" }}>Test Clock Skew:</span>
                <input
                  type="range"
                  min="-5.0"
                  max="5.0"
                  step="0.1"
                  value={clockOffset}
                  onChange={(e) => setClockOffset(parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: "pointer", height: "4px" }}
                />
                <button
                  type="button"
                  onClick={() => setClockOffset(0.0)}
                  style={{ fontSize: "8px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
                >
                  Reset NTP (0.0s)
                </button>
              </div>'''

if old_caliper in ac:
    ac = ac.replace(old_caliper, new_caliper)
    with open(attrib_path, 'w', encoding='utf-8') as f:
        f.write(ac)
    print("ATTRIBUTION Z3 CALIPER UPDATED SUCCESSFULLY")
else:
    print("OLD CALIPER NOT FOUND")

# Also add the shared TAC banner above Card 1
old_c1_header = '''              {/* TimelineStrip: SIM-Swap Precursor */}'''
new_c1_header = '''              {/* SHARED TAC 86749206 BANNER (Image 2) */}
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "5px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={12} color="#059669" />
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#047857" }}>
                  SHARED TAC 86749206 · SAME PHYSICAL CHIPSET CHASSIS (Samsung Galaxy M34)
                </span>
              </div>

              {/* TimelineStrip: SIM-Swap Precursor */}'''

with open(attrib_path, 'r', encoding='utf-8') as f:
    ac = f.read()

if old_c1_header in ac:
    ac = ac.replace(old_c1_header, new_c1_header)
    with open(attrib_path, 'w', encoding='utf-8') as f:
        f.write(ac)
    print("ATTRIBUTION CHASSIS BANNER ADDED")

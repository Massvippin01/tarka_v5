import sys

path = "src/pages/v5/AttributionScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add import
old_import = 'import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";'
new_import = '''import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
import { AnimatedCounter, PrecisionVernierGauge } from "../../components/ui/forensic-infographics";'''

if "forensic-infographics" not in text:
    assert old_import in text, "old_import not found"
    text = text.replace(old_import, new_import, 1)

# 2. Upgrade Funnel Chart Header Pills & SVG Visual Funnel Bars
# Find the block starting at {/* Visual Funnel Chart
target_header_old = '''            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#64748B", fontWeight: 700 }}>
              <span>Step 1: SBI (340)</span>
              <span>Step 2: HDFC (41)</span>
              <span>Step 3: Axis (6)</span>
              <span>Step 4: Paytm (1 ★)</span>
            </div>'''

target_header_new = '''            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;
                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: isTarget ? "#ECFDF5" : isChecked ? "#F1F5F9" : "#F8FAFC",
                      border: isTarget ? "1px solid #A7F3D0" : isChecked ? "1px solid #CBD5E1" : "1px dashed #CBD5E1",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: isTarget ? "#047857" : isChecked ? "#1E293B" : "#94A3B8",
                      boxShadow: isTarget ? "0 0 0 1px rgba(16,185,129,0.3)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: "8.5px", opacity: 0.7 }}>Step {idx + 1}:</span>
                    <span>{stage.bank}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        background: isTarget ? "#059669" : isChecked ? "#4F46E5" : "#94A3B8",
                        color: "#FFFFFF",
                        padding: "0.5px 5px",
                        borderRadius: "3px",
                        fontSize: "9px",
                        marginLeft: "2px",
                      }}
                    >
                      <AnimatedCounter value={count} duration={260} suffix={isTarget ? " ★" : ""} />
                    </span>
                  </div>
                );
              })}
            </div>'''

assert target_header_old in text, "target_header_old not found"
text = text.replace(target_header_old, target_header_new, 1)

# Now find the SVG block
svg_search_start = text.find('{/* SVG Visual Funnel Bars */}')
svg_search_end = text.find('{/* Bottom Status Ticker */}')
assert svg_search_start != -1 and svg_search_end != -1, "SVG block bounds not found"

old_svg_block = text[svg_search_start:svg_search_end]

new_svg_block = '''{/* SVG Visual Funnel Bars with Sankey Flow Taper Ribbons */}
            <svg
              width="100%"
              height={isCompact ? "75" : "88"}
              viewBox="0 0 460 88"
              preserveAspectRatio="none"
              style={{ overflow: "visible" }}
            >
              <defs>
                <pattern id="funnelHatchCompact" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1.2" opacity="0.25" />
                </pattern>
                <linearGradient id="solidFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="50%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="sankeyTaperGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.28" />
                </linearGradient>
                <style>{`
                  @keyframes sankeySpinePulse {
                    from { stroke-dashoffset: 16; }
                    to { stroke-dashoffset: 0; }
                  }
                  .sankey-pulse-spine {
                    animation: sankeySpinePulse 0.8s linear infinite;
                  }
                  @keyframes targetPulseAnim {
                    0%, 100% { stroke-opacity: 0.4; }
                    50% { stroke-opacity: 1; }
                  }
                  .target-pulse-stroke {
                    animation: targetPulseAnim 1.5s ease-in-out infinite;
                  }
                `}</style>
              </defs>

              {/* 1. Underlying Sankey Taper Ribbons Between Consecutive Columns */}
              {funnelStagesMeta.map((stage, idx) => {
                if (idx >= 3) return null;
                const nextStage = funnelStagesMeta[idx + 1];
                const isChecked = !!activeSessions[stage.id];
                const isNextChecked = !!activeSessions[nextStage.id];

                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const nextData = funnelResult.stages.find((s) => s.sessionId === nextStage.id);

                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const nextCount = nextData ? nextData.intersectionSize : (isNextChecked ? nextStage.count : 0);

                const colWidth = 72;
                const gap = 42;
                const x1 = 16 + idx * (colWidth + gap) + colWidth;
                const x2 = x1 + gap;

                const maxH = 62;
                const barH1 = isChecked
                  ? isPortDropped ? maxH : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y1 = 78 - barH1;

                const barH2 = isNextChecked
                  ? isPortDropped ? maxH : Math.max((Math.log(nextCount + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y2 = 78 - barH2;

                const ribbonActive = isChecked && isNextChecked;
                const cpOffset = gap * 0.5;

                const pathD = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2} L ${x2} 78 L ${x1} 78 Z`;
                const spineD = `M ${x1} ${(y1 + 78)/2} C ${x1 + cpOffset} ${(y1 + 78)/2}, ${x2 - cpOffset} ${(y2 + 78)/2}, ${x2} ${(y2 + 78)/2}`;

                return (
                  <g key={`ribbon-${stage.id}`}>
                    {/* Taper Flow Band */}
                    <path
                      d={pathD}
                      fill={ribbonActive ? "url(#sankeyTaperGrad)" : "none"}
                      opacity={ribbonActive ? 0.35 : 0.06}
                      style={{ transition: "all 0.3s ease" }}
                    />
                    {/* Flowing Animated Pulse Spine */}
                    {ribbonActive && (
                      <path
                        d={spineD}
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="sankey-pulse-spine"
                        opacity={0.75}
                      />
                    )}
                    {/* Intersection Symbol Pill */}
                    <g transform={`translate(${x1 + gap / 2}, 48)`}>
                      <rect
                        x="-10"
                        y="-9"
                        width="20"
                        height="18"
                        rx="5"
                        fill={ribbonActive ? "#FFFFFF" : "#F8FAFC"}
                        stroke={ribbonActive ? "#818CF8" : "#CBD5E1"}
                        strokeWidth="1.2"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.08))" }}
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={ribbonActive ? "#4338CA" : "#94A3B8"}
                        fontSize="10"
                        fontWeight="800"
                      >
                        ∩
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* 2. Visual Column Bars & Floating Badges */}
              {funnelStagesMeta.map((stage, idx) => {
                const isChecked = !!activeSessions[stage.id];
                const stageData = funnelResult.stages.find((s) => s.sessionId === stage.id);
                const count = stageData ? stageData.intersectionSize : (isChecked ? stage.count : 0);
                const isTarget = isChecked && count === 1 && !isPortDropped;

                const colWidth = 72;
                const gap = 42;
                const x = 16 + idx * (colWidth + gap);

                // Proportional bar height
                const maxH = 62;
                const barH = isChecked
                  ? isPortDropped
                    ? maxH
                    : Math.max((Math.log(count + 1) / Math.log(341)) * maxH, 10)
                  : 4;
                const y = 78 - barH;

                return (
                  <g key={stage.id}>
                    {/* Ambient Aura for Isolated Target */}
                    {isTarget && (
                      <rect
                        x={x - 2}
                        y={14}
                        width={colWidth + 4}
                        height={maxH + 4}
                        rx="7"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="target-pulse-stroke"
                      />
                    )}

                    {/* Background Hatched Capacity Bar */}
                    <rect
                      x={x}
                      y={16}
                      width={colWidth}
                      height={maxH}
                      rx="5"
                      fill="url(#funnelHatchCompact)"
                      stroke={isTarget ? "#059669" : "#CBD5E1"}
                      strokeWidth={isTarget ? "1.5" : "1"}
                    />

                    {/* Foreground Active Intersection Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={colWidth}
                      height={barH}
                      rx="5"
                      fill={isTarget ? "#059669" : "url(#solidFunnelGrad)"}
                      opacity={isChecked ? 1 : 0.25}
                      style={{ transition: "all 0.25s ease" }}
                    />

                    {/* Floating Count Badge */}
                    <g transform={`translate(${x + colWidth / 2}, ${y - 6})`}>
                      <rect
                        x="-24"
                        y="-13"
                        width="48"
                        height="16"
                        rx="4"
                        fill={isTarget ? "#059669" : "#4F46E5"}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                        style={{ filter: "drop-shadow(0 2px 4px rgba(15,23,42,0.16))" }}
                      />
                      <text
                        x="0"
                        y="-1.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="800"
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {isChecked ? (isPortDropped ? "340" : isTarget ? "1 ★" : count) : "OFF"}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            '''

text = text[:svg_search_start] + new_svg_block + text[svg_search_end:]

# 3. Replace lines 813-888 with PrecisionVernierGauge
vernier_old_start = text.find('{/* Exact Z3 SMT Number Line Caliper Slider matching Image 4 */}')
vernier_old_end = text.find('{/* SMT-LIB2 Script Code Box */}')
assert vernier_old_start != -1 and vernier_old_end != -1, "vernier block bounds not found"

new_vernier_block = '''{/* Precision Vernier Gauge Caliper Slider (Master v7.5) */}
            <PrecisionVernierGauge
              min={-5.0}
              max={5.0}
              value={clockOffset}
              feasibleRange={[-1.2, 0.8]}
              unit="s"
              title="Z3 SMT Clock-Offset Feasible Interval: [-1.2s, +0.8s]"
              statusLabel={isZ3Sat ? "Z3 SOLVER: SAT ✓" : "Z3 SOLVER: UNSAT ✗"}
              isSat={isZ3Sat}
              onChange={(val) => setClockOffset(val)}
            />

            '''

text = text[:vernier_old_start] + new_vernier_block + text[vernier_old_end:]

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("AttributionScreen.tsx updated successfully!")


import re

path = r'e:\Tarka_v3\tarka\frontend\src\components\tarka\attribution\SignalSieveCanvas.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Pattern to find the stepper section
target = '''      {/* =========================================================================
          4-STEP STEPPER (HORIZONTAL WITH TRAPEZOID CONNECTORS)
          ========================================================================= */}'''

replacement = '''      {/* =========================================================================
          4-STEP STEPPER (HATCHED CAPACITY FUNNEL + INTERSECTION ∩ CONNECTORS - IMAGE 1)
          ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          borderBottom: "1px solid #E2E8F0",
          padding: "5px 10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxSizing: "border-box",
        }}
      >
        {stepsMeta.map((s, idx) => {
          const isPassed = currentStep >= s.stepNum;
          const isTargetStep = s.stepNum === 4;
          const barPct = s.stepNum === 1 ? 100 : s.stepNum === 2 ? 46 : s.stepNum === 3 ? 22 : isPortDropped ? 100 : 10;

          return (
            <React.Fragment key={s.id}>
              <div
                onClick={() => setCurrentStep(s.stepNum)}
                style={{
                  flex: 1,
                  background: isPassed ? (isTargetStep && !isPortDropped ? "#ECFDF5" : "#F8FAFC") : "#FFFFFF",
                  border: isPassed
                    ? isTargetStep && !isPortDropped
                      ? "1.5px solid #10B981"
                      : "1px solid #C7D2FE"
                    : "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "4px 7px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, color: isPassed ? "#4F46E5" : "#64748B" }}>
                    Step {s.stepNum}: {s.bank}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "7.5px",
                      color: "#94A3B8",
                    }}
                  >
                    {useUtc ? s.timeUtc : s.timeIst}
                  </span>
                </div>

                {/* Hatched Capacity Box with Proportional Gradient Fill - Matching Image 1 */}
                <div
                  style={{
                    position: "relative",
                    height: "22px",
                    marginTop: "3px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                  }}
                >
                  <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
                    <defs>
                      <pattern id={`hatch-${s.id}`} width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1" opacity="0.28" />
                      </pattern>
                      <linearGradient id={`barGrad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isTargetStep && !isPortDropped ? "#10B981" : "#4F46E5"} />
                        <stop offset="100%" stopColor={isTargetStep && !isPortDropped ? "#059669" : "#059669"} />
                      </linearGradient>
                    </defs>
                    {/* Background Hatched Capacity Bar (340 Handsets) */}
                    <rect width="100%" height="100%" fill={`url(#hatch-${s.id})`} />
                    {/* Active Foreground Bar */}
                    <rect
                      y={`${100 - barPct}%`}
                      width="100%"
                      height={`${barPct}%`}
                      fill={`url(#barGrad-${s.id})`}
                      opacity={isPassed ? 1 : 0.3}
                      style={{ transition: "all 0.25s ease" }}
                    />
                  </svg>

                  {/* Floating Count Badge on Top of Bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "4px",
                      background: isTargetStep && !isPortDropped ? "#059669" : "#4F46E5",
                      color: "#FFFFFF",
                      fontSize: "8px",
                      fontWeight: 800,
                      padding: "0.5px 5px",
                      borderRadius: "3px",
                      fontFamily: "var(--font-mono)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                  >
                    {isPortDropped && isTargetStep ? "340" : s.survivors} {isTargetStep && !isPortDropped ? "★" : ""}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                  <span style={{ fontSize: "7.5px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85px" }}>
                    {s.port}
                  </span>
                  <span style={{ fontSize: "7.5px", fontWeight: 700, color: isTargetStep && !isPortDropped ? "#059669" : "#475569" }}>
                    {isTargetStep && !isPortDropped ? "1 TARGET" : `${s.survivors} SURVIVORS`}
                  </span>
                </div>
              </div>

              {/* Set Intersection Connector ∩ between stages */}
              {idx < 3 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Set Intersection (∩)"
                >
                  <div
                    style={{
                      width: "17px",
                      height: "17px",
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      color: "#4338CA",
                    }}
                  >
                    ∩
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>'''

# Find the end of the stepper (which ends right before BOTTOM ROW)
end_target = '''      {/* =========================================================================
          BOTTOM ROW: APPEARANCE HISTOGRAM & BAYESIAN ODDS METER'''

start_idx = c.find(target)
end_idx = c.find(end_target)

if start_idx != -1 and end_idx != -1:
    c = c[:start_idx] + replacement + '\n\n' + c[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("SUCCESSFULLY REPLACED STEPPER WITH HATCHED BARS AND ∩ CONNECTORS")
else:
    print(f"FAILED TO LOCATE INDICES: start={start_idx}, end={end_idx}")

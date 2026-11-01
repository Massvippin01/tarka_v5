path = "src/pages/v5/AttributionScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update capsule bank display name
old_capsule = '<span>{stage.bank}</span>'
new_capsule = '''<span>{stage.bank.includes("SBI") ? "SBI (Mule L1)" : stage.bank.includes("HDFC") ? "HDFC (Mule L2A)" : stage.bank.includes("Axis") ? "Axis (Mule L2B)" : "Paytm (Target Sink)"}</span>'''
assert old_capsule in text, "old_capsule not found"
text = text.replace(old_capsule, new_capsule, 1)

# 2. Update sankey gradient & opacity
old_grad = '''                <linearGradient id="sankeyTaperGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.28" />
                </linearGradient>'''

new_grad = '''                <linearGradient id="sankeyTaperGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#34D399" stopOpacity="0.45" />
                </linearGradient>'''
assert old_grad in text, "old_grad not found"
text = text.replace(old_grad, new_grad, 1)

old_ribbon_path = '''                    {/* Taper Flow Band */}
                    <path
                      d={pathD}
                      fill={ribbonActive ? "url(#sankeyTaperGrad)" : "none"}
                      opacity={ribbonActive ? 0.35 : 0.06}
                      style={{ transition: "all 0.3s ease" }}
                    />'''

new_ribbon_path = '''                    {/* Taper Flow Band */}
                    <path
                      d={pathD}
                      fill={ribbonActive ? "url(#sankeyTaperGrad)" : "none"}
                      opacity={ribbonActive ? 0.85 : 0.06}
                      style={{ transition: "all 0.3s ease" }}
                    />'''
assert old_ribbon_path in text, "old_ribbon_path not found"
text = text.replace(old_ribbon_path, new_ribbon_path, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("AttributionScreen.tsx Sankey ribbons refined!")


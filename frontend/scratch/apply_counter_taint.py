path = "src/pages/v5/TaintEngineScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

old_victim = '<div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}>₹5,00,000</div>'
new_victim = '<div style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C", fontFamily: "var(--font-mono)" }}><AnimatedCounter value={500000} prefix="₹" duration={280} /></div>'

old_frozen = '''                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                        ₹{(500000 - engineState.minCut.residualLeakageAmount).toLocaleString("en-IN")}
                      </div>'''

new_frozen = '''                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono)" }}>
                        <AnimatedCounter value={500000 - engineState.minCut.residualLeakageAmount} prefix="₹" duration={280} />
                      </div>'''

assert old_victim in text, "old_victim not found"
text = text.replace(old_victim, new_victim, 1)

assert old_frozen in text, "old_frozen not found"
text = text.replace(old_frozen, new_frozen, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("AnimatedCounter applied to TaintEngineScreen.tsx!")


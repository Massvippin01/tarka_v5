with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# remove unused imports
text = text.replace("  FileText,\r\n", "").replace("  ChevronRight,\r\n", "")

# include ruleRecoverableAmount in the JSX
target = '''                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                      padding: "6px",
                      borderRadius: "6px",
                      border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#64748B" }}>Commingled fraction.</div>
                  </div>
                </div>
              </div>'''

replacement = '''                  <div
                    onClick={() => setSelectedRule("PRO_RATA")}
                    style={{
                      background: selectedRule === "PRO_RATA" ? "#FFFBEB" : "#F8FAFC",
                      padding: "6px",
                      borderRadius: "6px",
                      border: selectedRule === "PRO_RATA" ? "2px solid #D97706" : "1px solid #E2E8F0",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "8.5px", fontWeight: 800, color: "#B45309" }}>PRO-RATA</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#B45309", fontFamily: "var(--font-mono)", margin: "1px 0" }}>
                      ₹{(engineState.summary.proRataRecoverable / 100000).toFixed(2)}L
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#64748B" }}>Commingled fraction.</div>
                  </div>
                </div>

                <div style={{ fontSize: "9.5px", color: "#64748B", background: "#F1F5F9", padding: "4px 7px", borderRadius: "5px", marginTop: "4px" }}>
                  <strong>Selected Accounting Rule:</strong> {selectedRule} · Recoverable: <strong>₹{ruleRecoverableAmount.toLocaleString("en-IN")}</strong>
                </div>
              </div>'''

text = text.replace(target, replacement)

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("TaintEngineScreen.tsx cleaned successfully!")


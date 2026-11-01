path = r"e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add import
import_stmt = 'import { SignalSieveCanvas } from "../../components/tarka/attribution/SignalSieveCanvas";\n'
c = import_stmt + c

# Replace the SectionCard children in the left hero column
target_start = c.find('title="CGNAT Candidate Intersection Funnel (340 → 41 → 6 → 1)"')
if target_start != -1:
    section_card_open = c.rfind('<SectionCard', 0, target_start)
    section_card_close = c.find('</SectionCard>', target_start) + len('</SectionCard>')
    
    new_card = '''<SectionCard
            title="CGNAT Candidate Intersection Funnel (340 → 41 → 6 → 1)"
            subtitle="Sequential intersection of translated port allocations isolates 1 unique target handset."
            icon={Target}
            iconColor="#4F46E5"
            badgeText="DoT CLAUSE 39.20"
            badgeVariant="indigo"
            provenanceTooltip="Sequential intersection algorithm S1 ∩ S2 ∩ S3 ∩ S4 provably isolates IMEI 867492061234564."
            actionSlot={
              <button
                type="button"
                onClick={handleCopyDotDirective}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#0F172A",
                }}
              >
                {isDirectiveCopied ? <Check size={11} /> : <Copy size={11} />}
                {isDirectiveCopied ? "Copied" : "Copy DoT 39.20 Requisition"}
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#FAFCFF",
                  position: "relative",
                }}
              >
                <SignalSieveCanvas
                  isPortDropped={isPortDropped}
                  onTogglePortDropped={() => toggleMutation("dropCgnatSourcePort")}
                />
              </div>

              {/* Footer Unambiguous Attribution Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: isPortDropped ? "#FFFBEB" : "#ECFDF5",
                  border: `1px solid ${isPortDropped ? "#FDE68A" : "#A7F3D0"}`,
                  fontSize: "10.5px",
                  color: isPortDropped ? "#92400E" : "#065F46",
                  marginTop: "6px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={13} color={isPortDropped ? "#D97706" : "#059669"} />
                  <span style={{ fontWeight: 700 }}>
                    {isPortDropped
                      ? "PORT OMISSION DETECTED: Ambiguity expanded to 340 handsets across port block 44000-44511."
                      : "UNAMBIGUOUS ATTRIBUTION: S₁ ∩ S₂ ∩ S₃ ∩ S₄ = { Target IMEI 867492061234564 }"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 800,
                    color: isPortDropped ? "#D97706" : "#059669",
                  }}
                >
                  P = 1.40 × 10⁻⁷
                </span>
              </div>
            </div>
          </SectionCard>'''
    
    c = c[:section_card_open] + new_card + c[section_card_close:]
    print("Replaced Attribution left card successfully!")
else:
    print("Target not found in AttributionScreen.tsx!")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)


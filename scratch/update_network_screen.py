import re

path = r"e:\Tarka_v3\tarka\frontend\src\pages\v5\FraudNetworkScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_stmt = 'import { EvidenceNetworkGraph, type EdgeFilterType, type GraphLayoutMode } from "../../components/tarka/network/EvidenceNetworkGraph";\n'
content = import_stmt + content

# Replace edgeFilter and layoutMode state types
content = content.replace('type EdgeType = "all" | "tether" | "ja4" | "caf" | "c2";\ntype LayoutMode = "layered" | "radial";\n', '')
content = content.replace('const [edgeFilter, setEdgeFilter] = useState<EdgeType>("all");', 'const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>("all");')
content = content.replace('const [layoutMode, setLayoutMode] = useState<LayoutMode>("layered");', 'const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("layered");')

# Replace the hero SectionCard body
old_section_start = content.find('title="Connected Multi-Layer Actor Topology Graph"')
if old_section_start != -1:
    section_card_open = content.rfind('<SectionCard', 0, old_section_start)
    section_card_close = content.find('</SectionCard>', old_section_start) + len('</SectionCard>')
    
    new_section_card = '''<SectionCard
            title="Fraud-Network & Actor Relationship Topology Graph"
            subtitle="Discovers hidden physical links tying 4 disparate mule accounts to 1 kingpin infrastructure cluster."
            icon={Network}
            iconColor="#4F46E5"
            badgeText={isHotspotActive ? "HOTSPOT COLLISION (TTL=63)" : "DIRECT INGRESS (TTL=64)"}
            badgeVariant={isHotspotActive ? "rose" : "emerald"}
            provenanceTooltip="Multi-modal graph correlating Airtel CGNAT IPDR, NPCI Switch XML, and Mewat CAF files."
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
                <EvidenceNetworkGraph
                  isHotspotActive={isHotspotActive}
                  onToggleHotspot={() => toggleMutation("triggerHotspotCollision")}
                  edgeFilter={edgeFilter}
                  onEdgeFilterChange={setEdgeFilter}
                  layoutMode={layoutMode}
                  onLayoutModeChange={setLayoutMode}
                />
              </div>

              {/* Bottom Status Ticker */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  fontSize: "10.5px",
                  color: "#312E81",
                  marginTop: "6px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={13} color="#4F46E5" />
                  <span style={{ fontWeight: 700 }}>
                    Syndicate Discovery SAT: All 4 account sessions share JA4 client hash <code>t13d1516h2_8daaf6</code> and co-locate at BSSID <code>74:DA:38:A2:11:BC</code>.
                  </span>
                </div>
                <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#4F46E5" }}>
                  P &lt; 1.4 × 10⁻⁷
                </span>
              </div>
            </div>
          </SectionCard>'''
    
    content = content[:section_card_open] + new_section_card + content[section_card_close:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated FraudNetworkScreen.tsx successfully!")

p = r"e:\Tarka_v3\tarka\frontend\src\components\tarka\network\EvidenceNetworkGraph.tsx"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

# Replace the HTML NODES LAYER with SVG node rendering
html_layer_start = c.find('{/* HTML NODES LAYER (POSITIONED EXACTLY OVER SVG PORTS) */}')
dialog_start = c.find('{/* EVIDENCE SHEET DIALOG (MODAL / SLIDE-OVER) */}')

if html_layer_start != -1 and dialog_start != -1:
    # We will close the SVG after rendering SVG nodes, and remove the external HTML nodes div
    svg_close_pos = c.find('</svg>')
    
    # We want SVG nodes before </svg>
    svg_nodes_code = '''
            {/* ============================================================
                SVG NODES LAYER (LOCKED TO EXACT 0 0 760 360 COORDINATE SYSTEM)
                ============================================================ */}
            {nodes.map((node) => {
              const isKingpin = node.category === "kingpin";
              const isHub = node.category === "hub";
              const isAccount = node.category === "account";
              const posX = layoutMode === "layered" ? node.x : node.radialX - node.w / 2;
              const posY = layoutMode === "layered" ? node.y : node.radialY - node.h / 2;
              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedNodeId === node.id;
              const opacity = getNodeOpacity(node.id);

              if (isHub) {
                // 42PX CIRCULAR HUB NODE
                return (
                  <g
                    key={node.id}
                    transform={`translate(${posX}, ${posY})`}
                    onClick={() =>
                      setEvidenceSheetItem({
                        id: node.id,
                        title: node.label,
                        type: node.tier,
                        tier: node.tier,
                        sha256: "9a18d402fe33b190c4d281a4b901a88c42b0124a",
                        statutoryBasis: "Section 63(4) BSA / Section 94 BNSS",
                        description: node.sublabel,
                      })
                    }
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="20"
                      fill="#FFFFFF"
                      stroke={node.color}
                      strokeWidth={isHovered ? "2.5" : "2"}
                    />
                    <text x="21" y="26" textAnchor="middle" fontSize="14">
                      {node.id === "node-hub-tether" ? "📶" : node.id === "node-hub-ja4" ? "⚡" : "🏢"}
                    </text>
                    {/* Strength Badge */}
                    <rect x="24" y="24" width="22" height="14" rx="7" fill={node.color} />
                    <text x="35" y="34" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" fontFamily="var(--font-mono)">
                      {node.strength}
                    </text>
                    <text x="21" y="52" textAnchor="middle" fill="#0F172A" fontSize="8.5" fontWeight="700">
                      {node.label}
                    </text>
                  </g>
                );
              }

              if (isKingpin) {
                // HERO KINGPIN CARD
                return (
                  <g
                    key={node.id}
                    transform={`translate(${posX}, ${posY})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                  >
                    <rect
                      width={node.w}
                      height={node.h}
                      rx="8"
                      fill="#FFFFFF"
                      stroke={isSelected ? "#E11D48" : isHovered ? "#BE123C" : isHotspotActive ? "#BE123C" : "#E11D48"}
                      strokeWidth={isSelected || isHovered ? "2" : "1.5"}
                    />
                    <rect x="8" y="9" width="38" height="40" rx="6" fill="#FFE4E6" />
                    <text x="27" y="34" textAnchor="middle" fontSize="18">📱</text>
                    <text x="54" y="26" fill="#0F172A" fontSize="11" fontWeight="800">
                      {node.label}
                    </text>
                    <rect x="178" y="14" width="50" height="16" rx="3" fill="#FFE4E6" />
                    <text x="203" y="25" textAnchor="middle" fill="#BE123C" fontSize="7.5" fontWeight="800">KINGPIN</text>
                    <text x="54" y="44" fill={isHotspotActive ? "#BE123C" : "#64748B"} fontSize="9" fontWeight="600">
                      {node.sublabel}
                    </text>
                  </g>
                );
              }

              // ACCOUNT & PERIPHERAL CARDS (170x54)
              return (
                <g
                  key={node.id}
                  transform={`translate(${posX}, ${posY})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: "pointer", opacity, transition: "opacity 0.2s ease" }}
                >
                  <rect
                    width={node.w}
                    height={node.h}
                    rx="6"
                    fill="#FFFFFF"
                    stroke={isSelected ? node.color : isHovered ? node.color : "#CBD5E1"}
                    strokeWidth={isSelected ? "2" : "1"}
                  />
                  <rect x="6" y="8" width="34" height="38" rx="5" fill={`${node.color}15`} />
                  <text x="23" y="32" textAnchor="middle" fontSize="16">
                    {node.category === "account" ? "🛡️" : node.id === "node-tower" ? "📡" : "🤖"}
                  </text>
                  <text x="46" y="24" fill="#0F172A" fontSize="10" fontWeight="700">
                    {node.label}
                  </text>
                  <text x="46" y="40" fill="#64748B" fontSize="8.5">
                    {node.sublabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
'''
    c = c[:html_layer_start] + svg_nodes_code + c[dialog_start:]
    # remove the extra </svg></div>)} if duplicated
    c = c.replace('          </svg>\n        </div>\n      )}\n          </svg>\n        </div>\n      )}', '          </svg>\n        </div>\n      )}')
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)
    print("Replaced with SVG nodes successfully!")
else:
    print("Not found! html_layer_start:", html_layer_start, "dialog_start:", dialog_start)

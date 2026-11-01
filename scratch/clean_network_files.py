# Clean up EvidenceNetworkGraph.tsx
p_graph = r"e:\Tarka_v3\tarka\frontend\src\components\tarka\network\EvidenceNetworkGraph.tsx"
with open(p_graph, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('  Check,\n  Copy,\n  ExternalLink,\n  ChevronRight,\n  Maximize2,\n  RotateCcw,\n  Table as TableIcon,\n  Play,\n  Pause,\n  Info,\n  Zap,', '  Table as TableIcon,\n  Play,\n  Pause,\n  Zap,')
c = c.replace('  const [zoomLevel, setZoomLevel] = useState(1.0);\n', '')
c = c.replace('const isAccount = node.category === "account";\n', '')
with open(p_graph, "w", encoding="utf-8") as f:
    f.write(c)

# Clean up FraudNetworkScreen.tsx
p_screen = r"e:\Tarka_v3\tarka\frontend\src\pages\v5\FraudNetworkScreen.tsx"
with open(p_screen, "r", encoding="utf-8") as f:
    c = f.read()

# Remove unused imports
c = c.replace('  Zap,\n', '')
c = c.replace('  Layers,\n', '')
c = c.replace('  CircleDot,\n', '')
c = c.replace('  const { selectedNodeId, setSelectedNodeId } = useFocusStore();\n', '')

# Remove old layeredNodes, radialNodes, activeNodes, edges
start_nodes = c.find('// Node Positions Definition for Layered Layout')
end_nodes = c.find('return (', start_nodes)
if start_nodes != -1 and end_nodes != -1:
    c = c[:start_nodes] + c[end_nodes:]

with open(p_screen, "w", encoding="utf-8") as f:
    f.write(c)

print("Cleaned up both files successfully!")


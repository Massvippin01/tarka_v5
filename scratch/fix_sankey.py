p = r"e:\Tarka_v3\tarka\frontend\src\components\tarka\taint\MoneyFlowSankeyGraph.tsx"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

# Replace unused imports
c = c.replace('''import {
  Lock,
  Scissors,
  Check,
  Copy,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Shield,
  Clock,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { toast } from "sonner";''', '''import {
  Scissors,
  Sparkles,
  Table as TableIcon,
  Clock,
} from "lucide-react";''')

# Replace unused types
c = c.replace('type SankeyNodeExtra = SankeyNode<CustomNodeData, CustomLinkData>;\ntype SankeyLinkExtra = SankeyLink<CustomNodeData, CustomLinkData>;\n', '')

# Replace unused props / state
c = c.replace('  onFreezeBudgetKChange,\n', '')
c = c.replace('  selectedRule,\n', '')
c = c.replace('  const [isReplaying, setIsReplaying] = useState(false);\n  const [decayCursorSec, setDecayCursorSec] = useState<number>(9000); // T+2.5h = 9000s\n', '')

# Replace focus store
c = c.replace('const { selectedEntityId, setSelectedEntityId } = useFocusStore();', 'const { selectedNodeId, setSelectedNodeId } = useFocusStore();')
c = c.replace('selectedEntityId', 'selectedNodeId')
c = c.replace('setSelectedEntityId', 'setSelectedNodeId')

# Fix d3Sankey typing to <any, any>
c = c.replace('const sankeyGenerator = d3Sankey<CustomNodeData, CustomLinkData>()', 'const sankeyGenerator = d3Sankey<any, any>()')

with open(p, "w", encoding="utf-8") as f:
    f.write(c)

print("Updated MoneyFlowSankeyGraph.tsx successfully!")

# Clean SignalSieveCanvas.tsx
p_sieve = r"e:\Tarka_v3\tarka\frontend\src\components\tarka\attribution\SignalSieveCanvas.tsx"
with open(p_sieve, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('''import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Radio,
  Target,
  Check,
  RotateCcw,
  Table as TableIcon,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";''', '''import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Radio,
  Table as TableIcon,
} from "lucide-react";''')

c = c.replace('  const [activeLogins, setActiveLogins] = useState<boolean[]>([true, true, true, true]);\n', '')
c = c.replace('const { selectedNodeId, setSelectedNodeId } = useFocusStore();', 'const { setSelectedNodeId } = useFocusStore();')
c = c.replace('const { survivorCount, stepSurvivors } = useMemo(() => {', 'const { survivorCount } = useMemo(() => {')
c = c.replace('return {\n      survivorCount: counts[currentStep] || 1,\n      stepSurvivors: counts,\n    };', 'return {\n      survivorCount: counts[currentStep] || 1,\n    };')
c = c.replace('{stepsMeta.map((s, idx) => {', '{stepsMeta.map((s) => {')

with open(p_sieve, "w", encoding="utf-8") as f:
    f.write(c)

# Clean AttributionScreen.tsx
p_attr = r"e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx"
with open(p_attr, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('  RotateCcw,\n', '')

# Remove toggleSession and resetAllSessions if unused
c = c.replace('''  // Toggle session inclusion
  const toggleSession = (sessionId: string) => {
    setActiveSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // Reset all
  const resetAllSessions = () => {
    setActiveSessions({
      "SESS-01": true,
      "SESS-02": true,
      "SESS-03": true,
      "SESS-04": true,
    });
  };''', '')

# Remove stagesMeta
start_stages = c.find('// Stage configurations\n  const stagesMeta = [')
if start_stages != -1:
    end_stages = c.find('];\n\n  return (', start_stages) + len('];\n')
    c = c[:start_stages] + c[end_stages:]

with open(p_attr, "w", encoding="utf-8") as f:
    f.write(c)

print("Cleaned both files successfully!")

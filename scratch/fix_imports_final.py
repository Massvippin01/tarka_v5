path_attrib = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx'
with open(path_attrib, 'r', encoding='utf-8') as f:
    ac = f.read()

ac = ac.replace('  ScaleBar,\n', '')
with open(path_attrib, 'w', encoding='utf-8') as f:
    f.write(ac)
print('ATTRIBUTION ScaleBar REMOVED')

path_taint = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx'
with open(path_taint, 'r', encoding='utf-8') as f:
    tc = f.read()

# Add Store to lucide-react
tc = tc.replace('  Building,\n', '  Building,\n  Store,\n')

# Remove AnimatedCounter
tc = tc.replace('import { AnimatedCounter } from "../../components/ui/forensic-infographics";\n', '')

# Import SemiCircleGauge
tc = tc.replace(
    'import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";',
    'import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";\nimport { SemiCircleGauge } from "../../components/tarka/BentoPrimitives";'
)

# Remove unused netRecoverable
tc = tc.replace('  const netRecoverable = 380000; // Truthful derived recovery potential\n', '')

with open(path_taint, 'w', encoding='utf-8') as f:
    f.write(tc)
print('TAINT IMPORTS FIXED')

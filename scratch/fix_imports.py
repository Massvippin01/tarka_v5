import sys

dock_path = r'e:\Tarka_v3\tarka\frontend\src\components\tarka\intake\InspectorDock.tsx'
with open(dock_path, 'r', encoding='utf-8') as f:
    c = f.read()

target = 'import { PrecisionVernierGauge, StripeSegmentedBar } from "../../ui/forensic-infographics";'
replacement = 'import { StripeSegmentedBar } from "../../ui/forensic-infographics";\nimport { ScaleBar } from "../kit";'
if target in c:
    c = c.replace(target, replacement, 1)
    with open(dock_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('InspectorDock.tsx replaced')
else:
    print('target not found in InspectorDock')

intake_path = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\IntakeScreen.tsx'
with open(intake_path, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace('import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";\n', '')
c2 = c2.replace('import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";\r\n', '')
c2 = c2.replace('const { activeDockTab, setActiveDockTab, density } = useTarkaUiStore();', 'const { setActiveDockTab, density } = useTarkaUiStore();')
with open(intake_path, 'w', encoding='utf-8') as f:
    f.write(c2)
print('IntakeScreen.tsx replaced')

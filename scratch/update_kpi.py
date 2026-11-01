p = r'e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'microVisual="ring"\n          progressPct={100}\n          provenanceTooltip="Intersection of 4 sequential',
    'microVisual="spark"\n          sparklineData={[340, 41, 6, 1]}\n          provenanceTooltip="Intersection of 4 sequential'
)

c = c.replace(
    'microVisual="ring"\n          progressPct={100}\n          provenanceTooltip="Heuristic display bands',
    'microVisual="gauge"\n          progressPct={99.9}\n          provenanceTooltip="Heuristic display bands'
)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated KPI tiles in AttributionScreen.tsx')

path_dock = "src/components/tarka/intake/InspectorDock.tsx"
with open(path_dock, "r", encoding="utf-8") as f:
    text_dock = f.read()

old_dock = """  // D3 scale for SVG drift ruler
  const rulerWidth = 390;
  const driftScale = useMemo(() => {
    return scaleLinear().domain([-180, 180]).range([18, rulerWidth - 18]).clamp(true);
  }, [rulerWidth]);

  const needleX = driftScale(isForgedRrn ? 180 : driftSec);"""

if old_dock in text_dock:
    text_dock = text_dock.replace(old_dock, "", 1)
    with open(path_dock, "w", encoding="utf-8") as f:
        f.write(text_dock)
    print("Fixed InspectorDock.tsx")

path_bento = "src/components/tarka/BentoPrimitives.tsx"
with open(path_bento, "r", encoding="utf-8") as f:
    text_bento = f.read()

old_bento = '  color = "#059669",'
new_bento = '  color: _color = "#059669",'
if old_bento in text_bento:
    text_bento = text_bento.replace(old_bento, new_bento, 1)
    with open(path_bento, "w", encoding="utf-8") as f:
        f.write(text_bento)
    print("Fixed BentoPrimitives.tsx")


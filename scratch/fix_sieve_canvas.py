p = r"e:\Tarka_v3\tarka\frontend\src\components\tarka\attribution\SignalSieveCanvas.tsx"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

# Update renderCanvas to guarantee valid dimensions and use ResizeObserver
old_render = '''  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);'''

new_render = '''  // Render Canvas with Robust Dimension Fallbacks
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 20 ? rect.width : (canvas.parentElement?.clientWidth || 740);
    const height = rect.height > 20 ? rect.height : (canvas.parentElement?.clientHeight || 280);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);'''

c = c.replace(old_render, new_render)

# Add ResizeObserver in useEffect
old_use_effect = '''  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);'''

new_use_effect = '''  useEffect(() => {
    renderCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      renderCanvas();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderCanvas]);'''

c = c.replace(old_use_effect, new_use_effect)

# Update dot rendering sizes for high visual clarity
c = c.replace('ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);', 'ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);')
c = c.replace('ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);', 'ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);')
c = c.replace('ctx.fillStyle = "#E2E8F0";', 'ctx.fillStyle = "#CBD5E1";')

with open(p, "w", encoding="utf-8") as f:
    f.write(c)

print("Updated SignalSieveCanvas.tsx with ResizeObserver and dimension fallbacks!")

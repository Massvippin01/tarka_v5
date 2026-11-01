path = r'e:\Tarka_v3\tarka\frontend\src\components\shell\TarkaGlobalShell.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace header grid
old_part = '''            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",'''

new_part = '''            display: "grid",
            gridTemplateColumns: "minmax(0, max-content) minmax(280px, 1fr) max-content",
            alignItems: "center",
            gap: "12px",'''

if old_part in c:
    c = c.replace(old_part, new_part, 1)
    # Also adjust center clock
    c = c.replace(
        '            {/* Center: Operational Clock Stepper */}\n          <div\n            style={{\n              display: "flex",\n              alignItems: "center",\n              gap: "2px",',
        '            {/* Center: Operational Clock Stepper */}\n          <div\n            style={{\n              display: "flex",\n              alignItems: "center",\n              justifyContent: "center",\n              minWidth: "280px",\n              justifySelf: "center",\n              gap: "2px",'
    )
    # And right controls
    c = c.replace(
        '          {/* Right Header Controls: [Density Slider] · [⚡ Mutator] · [🎙️ Voice AI] · [⬇ Export §63 PDF] */}\n          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>',
        '          {/* Right Header Controls: [Density Slider] · [⚡ Mutator] · [🎙️ Voice AI] · [⬇ Export §63 PDF] */}\n          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, justifySelf: "end" }}>'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('HEADER GRID REPLACED')
else:
    print('HEADER GRID NOT FOUND')

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

unused = ['  Lock,\n', '  ExternalLink,\n', '  Layers,\n', '  ChevronRight,\n', '  Info,\n']
for u in unused:
    text = text.replace(u, '')

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("Cleaned unused imports from AttributionScreen.tsx!")


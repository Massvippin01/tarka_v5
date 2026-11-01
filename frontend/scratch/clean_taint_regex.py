import re

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r'^\s*FileText,\r?\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*ChevronRight,\r?\n', '', text, flags=re.MULTILINE)

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("Regex cleaned TaintEngineScreen.tsx!")


import re

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r'^\s*const\s*\{\s*mutations\s*\}\s*=\s*useTarkaGlobal\(\);\r?\n', '', text, flags=re.MULTILINE)
text = re.sub(r'import\s*\{\s*useTarkaGlobal\s*\}\s*from\s*"../../context/TarkaGlobalContext";\r?\n', '', text)

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("Removed unused useTarkaGlobal from CourtProofScreen.tsx!")


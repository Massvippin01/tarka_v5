import re

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# remove unused imports
text = re.sub(r'^\s*CheckCircle2,\r?\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*AlertOctagon,\r?\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*Fingerprint,\r?\n', '', text, flags=re.MULTILINE)

# remove isSignatureTampered
text = re.sub(
    r'const isSignatureTampered = !!mutations\.courtSignatureInvalid;\r?\n\s*const paperAnchor = useMemo\(\(\) => \{\r?\n\s*return getCanonicalPaperAnchor\(isSignatureTampered\);\r?\n\s*\}, \[isSignatureTampered\]\);',
    'const paperAnchor = useMemo(() => {\n    return getCanonicalPaperAnchor("CASE-2026-001");\n  }, []);',
    text
)

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("Regex cleaned CourtProofScreen.tsx!")


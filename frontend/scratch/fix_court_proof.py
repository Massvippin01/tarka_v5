with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix unused imports
text = text.replace("  CheckCircle2,\r\n", "").replace("  AlertOctagon,\r\n", "").replace("  Fingerprint,\r\n", "")

# Fix paperAnchor call
text = text.replace("const isSignatureTampered = !!mutations.courtSignatureInvalid;\r\n  const paperAnchor = useMemo(() => {\r\n    return getCanonicalPaperAnchor(isSignatureTampered);\r\n  }, [isSignatureTampered]);",
'''  const paperAnchor = useMemo(() => {
    return getCanonicalPaperAnchor("CASE-2026-001");
  }, []);''')

# Fix bip39Words24 -> bip39Mnemonic
text = text.replace("paperAnchor.bip39Words24", "paperAnchor.bip39Mnemonic")

with open(r"e:\Tarka_v3\tarka\frontend\src\pages\v5\CourtProofScreen.tsx", "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("CourtProofScreen.tsx fixed successfully!")


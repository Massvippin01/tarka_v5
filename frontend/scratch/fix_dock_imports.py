path = "src/components/tarka/intake/InspectorDock.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'import React, { useState, useEffect, useRef, useMemo } from "react";',
    'import React, { useState, useEffect, useRef } from "react";'
)
text = text.replace('import { scaleLinear } from "d3-scale";\n', '')

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated InspectorDock.tsx imports")


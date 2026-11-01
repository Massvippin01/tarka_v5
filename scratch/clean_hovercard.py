p = r'e:\Tarka_v3\tarka\frontend\src\components\tarka\network\EvidenceNetworkGraph.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('import * as HoverCard from "@radix-ui/react-hover-card";\n', '')
c = c.replace('const isAccount = node.category === "account";\n', '')
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('Cleaned HoverCard in EvidenceNetworkGraph')


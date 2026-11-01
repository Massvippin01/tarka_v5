path = r"e:\Tarka_v3\tarka\frontend\src\pages\v5\TaintEngineScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add import
import_stmt = 'import { MoneyFlowSankeyGraph } from "../../components/tarka/taint/MoneyFlowSankeyGraph";\n'
c = import_stmt + c

# Find the sankey section to replace
target_start = c.find('{flowViewType === "sankey" ? (')
target_end = c.find(') : (\n                    /* =============================================================\n                       TIME-EXPANDED DAG VIEW', target_start)

if target_start != -1 and target_end != -1:
    new_sankey = '''{flowViewType === "sankey" ? (
                    <MoneyFlowSankeyGraph
                      freezeBudgetK={freezeBudgetK}
                      onFreezeBudgetKChange={setFreezeBudgetK}
                      isInjectClean={isInjectClean}
                      onToggleInjectClean={() => toggleMutation("injectMerchantCleanDeposit")}
                      selectedRule={selectedRule}
                    />'''
    c = c[:target_start] + new_sankey + c[target_end:]
    print("Replaced Sankey section successfully!")
else:
    print("Target not found! target_start:", target_start, "target_end:", target_end)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)


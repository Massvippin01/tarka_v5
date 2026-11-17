import { describe, it, expect } from "vitest";
import { CaseSyncBridge } from "../services/caseSyncBridge";
import { getCanonicalCase } from "../fixtures/cases";

describe("Cross-Screen Consistency Invariants (Prompt 1)", () => {
  const caseIds = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];
  const bridge = CaseSyncBridge.getInstance();

  caseIds.forEach((caseId) => {
    describe(`Case ${caseId}`, () => {
      it("preserves total victim debits == first-hop edges == booked loss", async () => {
        const fixture = getCanonicalCase(caseId);
        const inv = await bridge.getCaseBundle(caseId);

        // 1. Total victim debits in transactions list
        const victimDebits = fixture.transactions
          .filter((t) => t.category === "VICTIM_DRAIN")
          .reduce((sum, t) => sum + t.amount, 0);

        expect(victimDebits).toBe(fixture.financials.bookedLossInr);
        expect(inv.bookedLossInr).toBe(fixture.financials.bookedLossInr);

        // 2. Sum of first-hop edges originating from the victim
        const victimNode = inv.nodes.find((n) => n.entityType === "VICTIM") || inv.nodes[0];
        const firstHopEdges = inv.edges.filter((e) => e.sourceNodeId === victimNode.id);
        const sumFirstHop = firstHopEdges.reduce((sum, e) => sum + e.amount, 0);

        expect(sumFirstHop).toBe(fixture.financials.bookedLossInr);
      });

      it("preserves Sankey / Taint source total == booked loss", async () => {
        const fixture = getCanonicalCase(caseId);
        const inv = await bridge.getCaseBundle(caseId);
        const taintData = bridge.deriveCaseTaintData(caseId, inv);

        expect(taintData.summary.initialVictimLoss).toBe(fixture.financials.bookedLossInr);

        const victimTaintNode = taintData.nodes.find((n) => n.classification === "VICTIM");
        expect(victimTaintNode?.taintLibr).toBe(fixture.financials.bookedLossInr);
      });

      it("preserves double-entry conservation for every mule account (moneyIn == moneyOut + balance)", () => {
        const fixture = getCanonicalCase(caseId);
        const muleAccounts = fixture.accounts.filter(
          (acc) => acc.holderType === "LAYER_1_MULE" || acc.holderType === "LAYER_2_CONDUIT"
        );

        expect(muleAccounts.length).toBeGreaterThan(0);

        muleAccounts.forEach((acc) => {
          const moneyIn = fixture.transactions
            .filter((t) => t.toAccount === acc.accountNumber || t.toName === acc.holderName)
            .reduce((sum, t) => sum + t.amount, 0);

          const moneyOut = fixture.transactions
            .filter((t) => t.fromAccount === acc.accountNumber || t.fromName === acc.holderName)
            .reduce((sum, t) => sum + t.amount, 0);

          expect(moneyIn).toBe(moneyOut + acc.frozenBalance);
        });
      });

      it("preserves total recovery conservation: recoverable + cashout == booked loss", () => {
        const fixture = getCanonicalCase(caseId);
        const { bookedLossInr, recoverableLibrInr, unrecoverableCashoutInr } = fixture.financials;

        expect(recoverableLibrInr + unrecoverableCashoutInr).toBe(bookedLossInr);
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import { CaseSyncBridge } from "../../../../services/caseSyncBridge";
import { validateRunningBalance } from "../../../../utils/intakeFalsifier";
import { CANONICAL_CASES, buildCaseBundleFromFixture, getCanonicalCase } from "../../../../fixtures/cases";

describe("Screen 01 Ledger Conservation Proof (Prompt 2)", () => {
  const bridge = CaseSyncBridge.getInstance();

  Object.values(CANONICAL_CASES).forEach((c) => {
    it(`computes exact balance conservation with zero residual for untampered ${c.caseId}`, () => {
      const inv = buildCaseBundleFromFixture(c);
      const rows = bridge.deriveCaseLedgerRows(
        c.caseId,
        inv,
        "ASC",
        false
      );

      expect(rows.length).toBeGreaterThanOrEqual(4);

      // 1. Sort by sequenceNo
      const sortedRows = [...rows].sort((a, b) => a.sequenceNo - b.sequenceNo);

      // 2. Compute dynamic conservation box terms
      const openingBal = sortedRows[0].balance;
      const creditRows = sortedRows.filter((r) => (r.credit ?? 0) > 0);
      const debitRows = sortedRows.filter((r) => (r.debit ?? 0) > 0);
      const totalCredits = creditRows.reduce((sum, r) => sum + (r.credit ?? 0), 0);
      const totalDebits = debitRows.reduce((sum, r) => sum + (r.debit ?? 0), 0);
      const expectedClosing = openingBal + totalCredits - totalDebits;
      const actualClosing = sortedRows[sortedRows.length - 1].balance;
      const residual = Math.round((actualClosing - expectedClosing) * 100) / 100;

      // Invariant: residual must be EXACTLY 0.00
      expect(residual).toBe(0);

      // 3. Check every sequential transition Bal[k] = Bal[k-1] + Cr[k] - Dr[k]
      for (let i = 1; i < sortedRows.length; i++) {
        const prev = sortedRows[i - 1];
        const curr = sortedRows[i];
        const expected = Math.round((prev.balance + curr.credit - curr.debit) * 100) / 100;
        const actual = Math.round(curr.balance * 100) / 100;
        expect(actual).toBe(expected);
      }

      // 4. Validate through intake falsifier solver
      const validation = validateRunningBalance(rows, "ASC");
      expect(validation.isValid).toBe(true);
      expect(validation.discrepancyDelta).toBe(0);
    });
  });

  it("flags sequence #14 and reports exact -₹2,00,000 deficit when tampered (Press T)", () => {
    const c = getCanonicalCase("CASE-2026-001");
    const inv = buildCaseBundleFromFixture(c);
    const rows = bridge.deriveCaseLedgerRows(
      "CASE-2026-001",
      inv,
      "ASC",
      true // isTampered = true
    );

    const sortedRows = [...rows].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const openingBal = sortedRows[0].balance;
    const totalCredits = sortedRows.reduce((sum, r) => sum + (r.credit ?? 0), 0);
    const totalDebits = sortedRows.reduce((sum, r) => sum + (r.debit ?? 0), 0);
    const expectedClosing = openingBal + totalCredits - totalDebits;
    const actualClosing = sortedRows[sortedRows.length - 1].balance;
    const residual = Math.round((actualClosing - expectedClosing) * 100) / 100;

    // Must show exact deficit of -200,000.00
    expect(residual).toBe(-200000);

    // Sequence #14 must be the first failing row
    let firstFailingSeq: number | null = null;
    for (let i = 1; i < sortedRows.length; i++) {
      const prev = sortedRows[i - 1];
      const curr = sortedRows[i];
      const expectedCurrBal = Math.round((prev.balance + (curr.credit ?? 0) - (curr.debit ?? 0)) * 100) / 100;
      if (Math.abs(curr.balance - expectedCurrBal) > 0.01) {
        if (firstFailingSeq === null) {
          firstFailingSeq = curr.sequenceNo;
        }
      }
    }

    expect(firstFailingSeq).toBe(14);
  });
});

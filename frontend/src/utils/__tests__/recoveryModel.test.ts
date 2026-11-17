import { describe, it, expect } from "vitest";
import { recoveryModel } from "../recoveryModel";
import { resolveCase, selectFinancialSummary } from "../../selectors/caseSelectors";

describe("recoveryModel Selector", () => {
  it("takes every figure from the case's own selectors", () => {
    const c = resolveCase("CASE-2026-001")!;
    const fin = selectFinancialSummary(c);
    const res = recoveryModel(false, 6, "CASE-2026-001");
    expect(res.grossVictimLoss).toBe(fin.bookedLossInr);
    expect(res.netRecoverableSum).toBe(fin.recoverableInr);
    expect(res.atmCashedOut).toBe(fin.unrecoverableCashoutInr);
    expect(res.librRecoverable).toBe(c.financials.recoverableLibrInr);
    expect(res.openEscapeExits).toBe(0);
  });

  it("clean deposit what-if can only lower pro-rata, never LIBR", () => {
    const base = recoveryModel(false, 6, "CASE-2026-001");
    const res = recoveryModel(true, 6, "CASE-2026-001");
    expect(res.librRecoverable).toBe(base.librRecoverable);
    expect(res.proRataRecoverable).toBeLessThanOrEqual(base.proRataRecoverable);
  });

  it("small freeze budget leaves exits open", () => {
    const res = recoveryModel(false, 0, "CASE-2026-001");
    expect(res.openEscapeExits).toBe(res.totalEscapeRoutes);
  });

  it("unknown or missing case shows zeros, never invented figures", () => {
    for (const res of [recoveryModel(false, 3), recoveryModel(false, 3, "NO-SUCH-CASE")]) {
      expect(res.grossVictimLoss).toBe(0);
      expect(res.netRecoverableSum).toBe(0);
      expect(res.totalEscapeRoutes).toBe(0);
    }
  });
});

import { describe, it, expect } from "vitest";
import { recoveryModel } from "../recoveryModel";

describe("recoveryModel Selector", () => {
  it("computes accurate baseline recovery numbers at K=3", () => {
    const res = recoveryModel(false, 3);
    expect(res.grossVictimLoss).toBe(500000);
    expect(res.atmCashedOut).toBe(120000);
    expect(res.muleRetainedHold).toBe(200000);
    expect(res.merchantSpecificLien).toBe(180000);
    expect(res.netRecoverableSum).toBe(380000);
    expect(res.recoveryPotentialPct).toBe(76.0);
    expect(res.openEscapeExits).toBe(0);
    expect(res.containmentPct).toBe(100);
    expect(res.rulesEqual).toBe(true);
    expect(res.librRecoverable).toBe(380000);
  });

  it("handles clean commercial deposit injection and rules divergence", () => {
    const res = recoveryModel(true, 3);
    expect(res.cleanDepositInjected).toBe(250000);
    expect(res.rulesEqual).toBe(false);
    expect(res.librRecoverable).toBe(380000);
    expect(res.fifoRecoverable).toBe(200000);
    expect(res.proRataRecoverable).toBe(274000);
  });

  it("handles insufficient freeze budget (K=1)", () => {
    const res = recoveryModel(false, 1);
    expect(res.openEscapeExits).toBe(2);
    expect(res.containmentPct).toBeLessThan(100);
  });
});

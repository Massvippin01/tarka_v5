import { describe, it, expect } from "vitest";
import { deriveGateVerdict, type InvariantEvaluationInput } from "./deriveGateVerdict";

describe("deriveGateVerdict", () => {
  it("returns UNLOCKED when all 5 invariants hold", () => {
    const input: InvariantEvaluationInput = {
      i1_ledgerConservation: true,
      i2_rrnClockSync: true,
      i3_cbsSwitchMatch: true,
      i4_pdfRevisionIntegrity: true,
      i5_cgnatMerklePrivacy: true,
    };
    const res = deriveGateVerdict(input);
    expect(res.verdict).toBe("UNLOCKED");
    expect(res.isHalted).toBe(false);
    expect(res.blockingViolations).toHaveLength(0);
    expect(res.flaggingViolations).toHaveLength(0);
    expect(res.downstreamEngines.engine02_cgnat).toBe("UNLOCKED");
    expect(res.downstreamEngines.engine03_taint).toBe("UNLOCKED");
    expect(res.downstreamEngines.engine04_courtProof).toBe("UNLOCKED");
  });

  it("returns HALTED when blocking invariant I1 (ledger) fails", () => {
    const input: InvariantEvaluationInput = {
      i1_ledgerConservation: false, // Altered Row #14
      i2_rrnClockSync: true,
      i3_cbsSwitchMatch: true,
      i4_pdfRevisionIntegrity: true,
      i5_cgnatMerklePrivacy: true,
    };
    const res = deriveGateVerdict(input);
    expect(res.verdict).toBe("HALTED");
    expect(res.isHalted).toBe(true);
    expect(res.blockingViolations).toContain("I1");
    expect(res.downstreamEngines.engine02_cgnat).toBe("LOCKED");
    expect(res.downstreamEngines.engine03_taint).toBe("LOCKED");
    expect(res.downstreamEngines.engine04_courtProof).toBe("LOCKED");
  });

  it("returns UNLOCKED_WITH_QUARANTINE when only flagging invariants (I2, I4) fail", () => {
    const input: InvariantEvaluationInput = {
      i1_ledgerConservation: true,
      i2_rrnClockSync: false, // Forged RRN skew on receipt
      i3_cbsSwitchMatch: true,
      i4_pdfRevisionIntegrity: false, // 2 %%EOF Canva append
      i5_cgnatMerklePrivacy: true,
    };
    const res = deriveGateVerdict(input);
    expect(res.verdict).toBe("UNLOCKED_WITH_QUARANTINE");
    expect(res.isHalted).toBe(false);
    expect(res.blockingViolations).toHaveLength(0);
    expect(res.flaggingViolations).toEqual(["I2", "I4"]);
    expect(res.downstreamEngines.engine02_cgnat).toBe("UNLOCKED");
    expect(res.downstreamEngines.engine04_courtProof).toBe("CAVEAT");
  });

  it("halts immediately if both a blocking and flagging invariant fail", () => {
    const input: InvariantEvaluationInput = {
      i1_ledgerConservation: false, // Blocking fail
      i2_rrnClockSync: false, // Flagging fail
      i3_cbsSwitchMatch: true,
      i4_pdfRevisionIntegrity: false, // Flagging fail
      i5_cgnatMerklePrivacy: true,
    };
    const res = deriveGateVerdict(input);
    expect(res.verdict).toBe("HALTED");
    expect(res.isHalted).toBe(true);
    expect(res.blockingViolations).toContain("I1");
    expect(res.flaggingViolations).toContain("I2");
    expect(res.flaggingViolations).toContain("I4");
  });
});

import { describe, it, expect } from "vitest";
import { CaseSyncBridge } from "../../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";

describe("Entity Resolution Screen & Logic (Prompt 5)", () => {
  const inv = reconstruct5FileInvestigation();
  const bridge = CaseSyncBridge.getInstance();
  const { entities, tokens } = bridge.deriveCaseCanonicalEntities("CASE-2026-001", inv);

  it("produces consistent counts between entities, tokens, and nodes", () => {
    // Entities count must match nodes count
    expect(entities.length).toBe(inv.nodes.length);
    expect(entities.length).toBe(7);

    // Tokens must be greater than zero and properly indexed
    expect(tokens.length).toBeGreaterThanOrEqual(entities.length);
    tokens.forEach((t) => {
      expect(t.id).toBeDefined();
      expect(t.targetEntityId).toBeDefined();
      expect(entities.some((e) => e.id === t.targetEntityId)).toBe(true);
    });
  });

  it("correctly identifies Apex Electronics as ENT-06 with hard-veto protection", () => {
    const apex = entities.find((e) => e.name.toLowerCase().includes("apex"));
    expect(apex).toBeDefined();
    expect(apex?.id).toBe("ENT-06");
    expect(apex?.isHardVeto).toBe(true);
    expect(apex?.roleColor).toBe("emerald");
    expect(apex?.hardVetoReason).toContain("Active GSTIN");
  });

  it("resolves vikramshah@okaxis and vikram.pay@okaxis as aliases with explicit reason", () => {
    const vikram = entities.find((e) => e.id === "ENT-02");
    expect(vikram).toBeDefined();
    expect(vikram?.name.toLowerCase()).toContain("vikram");

    const vikramTokens = tokens.filter((t) => t.targetEntityId === "ENT-02");
    const vpaTokens = vikramTokens.filter((t) => t.value.includes("@okaxis"));

    expect(vpaTokens).toHaveLength(2);
    expect(vpaTokens.some((t) => t.value === "vikramshah@okaxis")).toBe(true);
    expect(vpaTokens.some((t) => t.value === "vikram.pay@okaxis")).toBe(true);

    vpaTokens.forEach((t) => {
      expect(t.aliasReason).toBe("same PSP handle stem + same beneficiary account");
    });
  });

  it("derives risk scores from subScore features instead of prose literals", () => {
    entities.forEach((entity) => {
      const expectedScore = Math.round(
        entity.subScores.velocity * 0.35 +
        entity.subScores.deviceOverlap * 0.30 +
        entity.subScores.structuring * 0.20 +
        entity.subScores.kycDiscrepancy * 0.15
      );
      expect(entity.fraudScore).toBe(expectedScore);
    });

    // Victim should be 0
    const victim = entities.find((e) => e.id === "ENT-01");
    expect(victim?.fraudScore).toBe(0);

    // Merchant should be low (< 10)
    const merchant = entities.find((e) => e.isHardVeto);
    expect(merchant?.fraudScore).toBeLessThanOrEqual(10);

    // Primary mule should be high (> 90)
    const mule = entities.find((e) => e.id === "ENT-02");
    expect(mule?.fraudScore).toBeGreaterThanOrEqual(90);
  });
});

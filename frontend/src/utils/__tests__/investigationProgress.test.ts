import { describe, it, expect } from "vitest";
import { deriveInvestigationProgress } from "../investigationProgress";
import { CANONICAL_CASES, buildCaseBundleFromFixture } from "../../fixtures/cases";

describe("Investigation Progress Engine", () => {
  it("derives completed steps accurately for canonical case CASE-2026-001", () => {
    const bundle = buildCaseBundleFromFixture(CANONICAL_CASES["CASE-2026-001"]);
    const progress = deriveInvestigationProgress(bundle, {
      caseId: "CASE-2026-001",
      firNumber: "FIR #149/2026",
      policeStation: "Noida Cyber Crime PS",
      ncrpAckNo: "1930-ACK-1",
      title: "Extortion",
      typology: "DIGITAL_ARREST",
      complainantName: "Sunil Kumar",
      leadInvestigator: "Insp Sharma",
      claimedLossInr: 500000,
      bookedLossInr: 500000,
      recoverableInr: 345000,
      commercialShieldedInr: 155000,
      goldenHourRemainingMins: 42,
      priority: "CRITICAL_GOLDEN_HOUR",
      currentStage: "intake",
      gatesPassed: 5,
      gatesHalted: false,
      syndicateLinks: [],
      artifacts: [
        {
          id: "ART-01",
          filename: "sbi.csv",
          vectorType: "CBS_LEDGER",
          tier: "TIER_1_CERTIFIED",
          byteSize: 1024,
          sha256: "abc",
          bip39Words: [],
          ingestedAtIst: "",
          custodianNode: "SBI",
          gateStatus: "PASS",
          gateDetail: "",
        },
      ],
    });

    expect(progress.steps.find((s) => s.id === "evidence")?.isComplete).toBe(true);
    expect(progress.steps.find((s) => s.id === "people")?.isComplete).toBe(true);
    expect(progress.steps.find((s) => s.id === "money_trail")?.isComplete).toBe(true);
    expect(progress.steps.find((s) => s.id === "network")?.isComplete).toBe(true);
    expect(progress.percentComplete).toBeGreaterThanOrEqual(60);
  });

  it("handles completely empty case with 0% progress and actionable next steps", () => {
    const progress = deriveInvestigationProgress(null, null);
    expect(progress.percentComplete).toBe(0);
    expect(progress.completedStepsCount).toBe(0);
    expect(progress.steps[0].isComplete).toBe(false);
    expect(progress.steps[0].requiredEvidenceText).toContain("Finacle");
  });
});


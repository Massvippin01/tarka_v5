import { describe, it, expect } from "vitest";
import { CANONICAL_CASES } from "../../../fixtures/cases";
import { hasPermission, DEFAULT_PROFILE, DEFAULT_STATION } from "../../../store/useSettingsStore";
import { formatInr } from "../../../utils/formatters";

describe("TARKA F-8 Robustness & Diagnostics Invariants", () => {
  it("verifies all 4 canonical benchmark cases are registered and complete", () => {
    const requiredCases = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];
    requiredCases.forEach((cid) => {
      const c = CANONICAL_CASES[cid];
      expect(c).toBeDefined();
      expect(c.caseId).toBe(cid);
      expect(c.firNumber).toBeTruthy();
      expect(c.complainant.name).toBeTruthy();
      expect(c.financials.bookedLossInr).toBeGreaterThan(0);
      expect(formatInr(c.financials.bookedLossInr)).toContain("₹");
    });
  });

  it("verifies RBAC permission boundaries for demo personas", () => {
    // 1. Investigator
    expect(hasPermission("INVESTIGATOR", "actOnFreeze")).toBe(true);
    expect(hasPermission("INVESTIGATOR", "archive")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "reassign")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "editWeights")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "resetDemo")).toBe(false);

    // 2. Supervisor
    expect(hasPermission("SUPERVISOR", "actOnFreeze")).toBe(true);
    expect(hasPermission("SUPERVISOR", "archive")).toBe(true);
    expect(hasPermission("SUPERVISOR", "reassign")).toBe(true);
    expect(hasPermission("SUPERVISOR", "editWeights")).toBe(false);
    expect(hasPermission("SUPERVISOR", "resetDemo")).toBe(false);

    // 3. Admin
    expect(hasPermission("ADMIN", "actOnFreeze")).toBe(true);
    expect(hasPermission("ADMIN", "archive")).toBe(true);
    expect(hasPermission("ADMIN", "reassign")).toBe(true);
    expect(hasPermission("ADMIN", "editWeights")).toBe(true);
    expect(hasPermission("ADMIN", "resetDemo")).toBe(true);
  });

  it("verifies default officer and station configurations", () => {
    expect(DEFAULT_PROFILE.role).toBe("INVESTIGATOR");
    expect(DEFAULT_PROFILE.badgeNo).toBeTruthy();
    expect(DEFAULT_STATION.stationName).toContain("Cyber");
    expect(DEFAULT_STATION.letterheadTitle).toBeTruthy();
  });
});

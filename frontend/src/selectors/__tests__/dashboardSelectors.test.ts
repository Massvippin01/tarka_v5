import { describe, it, expect } from "vitest";
import {
  selectDashboardFinancials,
  selectActNowQueue,
  selectIndiaMuleFlows,
  selectTypologyDistribution,
  selectTopBanksByMules,
} from "../dashboardSelectors";
import { selectCaseActionFinancials } from "../actionSelectors";
import { INITIAL_CASE_WORKSPACES } from "../../context/TarkaGlobalContext";

describe("Dashboard Selectors Invariants (Prompt F-6)", () => {
  const seedCases = INITIAL_CASE_WORKSPACES;

  it("asserts dashboard totals == exact sum of per-case selector values", () => {
    const dashboardMetrics = selectDashboardFinancials(seedCases);

    // Sum from per-case pure selectors
    const sumReportedLoss = seedCases.reduce(
      (acc: number, c: any) => acc + selectCaseActionFinancials(c.caseId).bookedLossInr,
      0
    );
    const sumRecoverable = seedCases.reduce(
      (acc: number, c: any) => acc + selectCaseActionFinancials(c.caseId).recoverableLibrInr,
      0
    );

    expect(dashboardMetrics.totalReportedLossInr).toBe(sumReportedLoss);
    expect(dashboardMetrics.totalRecoverableInr).toBe(sumRecoverable);
    expect(dashboardMetrics.totalCases).toBe(4);
    expect(dashboardMetrics.goldenHourActiveCount).toBe(3); // CASE-001 (118m), CASE-002 (38m), CASE-004 (85m)
    expect(dashboardMetrics.totalReportedLossInr).toBe(sumReportedLoss);
    expect(dashboardMetrics.totalRecoverableInr).toBe(sumRecoverable);
    expect(dashboardMetrics.totalReportedLossInr).toBe(2270000); // 5.0L + 3.4L + 12.5L + 1.8L
    expect(dashboardMetrics.totalRecoverableInr).toBe(1620000); // 3.8L + 2.1L + 9.2L + 1.1L
  });

  it("ranks Act Now queue items by Golden Hour SLA and urgent action priority", () => {
    const queue = selectActNowQueue(seedCases);

    expect(queue.length).toBe(4);
    // Highest urgency should be shortest remaining Golden Hour (CASE-002 has 38m left, CASE-004 has 85m, CASE-001 has 118m)
    expect(queue[0].caseId).toBe("CASE-2026-002");
    expect(queue[0].slaMinsRemaining).toBe(38);
    expect(queue[1].caseId).toBe("CASE-2026-004");
    expect(queue[1].slaMinsRemaining).toBe(85);
    expect(queue[2].caseId).toBe("CASE-2026-001");
    expect(queue[2].slaMinsRemaining).toBe(118);

    // Click target routes must point to action screens
    expect(queue[0].targetRoute).toBe("report");
  });

  it("builds geographic flow arcs for Indian cyber-fraud syndicate origins", () => {
    const flows = selectIndiaMuleFlows(seedCases);

    expect(flows.length).toBe(4);
    expect(flows[0].originCity).toContain("Noida");
    expect(flows[0].targetCity).toContain("Mewat");
    expect(flows[0].amountInr).toBe(500000);
  });

  it("computes typology distribution and top banks by mule accounts", () => {
    const typologies = selectTypologyDistribution(seedCases);
    expect(typologies.length).toBeGreaterThan(0);

    const banks = selectTopBanksByMules(seedCases);
    expect(banks.length).toBeGreaterThan(0);
    expect(banks.some((b) => b.bankName === "Axis Bank")).toBe(true);
    expect(banks.some((b) => b.bankName === "HDFC Bank")).toBe(true);
  });
});

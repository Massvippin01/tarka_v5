import { describe, it, expect } from "vitest";
import { CANONICAL_CASES } from "../../fixtures/cases";
import {
  selectFinancialSummary,
  selectPortfolioTotals,
  selectAccountFlows,
  selectMoneyFlow,
  selectDoctrineComparison,
  selectEntityResolution,
  selectDeviceFacts,
  selectFreezeActions,
  selectLedgerFacts,
  selectSyndicate,
  selectCaseCard,
  selectNoticeContext,
  resolveCase,
} from "../caseSelectors";
import { selectDashboardFinancials } from "../dashboardSelectors";
import { INITIAL_CASE_WORKSPACES } from "../../context/TarkaGlobalContext";
import { formatInr, formatInrCompact, formatGoldenHour } from "../../lib/formatInr";

const IDS = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];
const FORBIDDEN = ["Vikram Shah", "Rohit Verma", "Sameer Khan", "Sunil Kumar", "Apex Electronics", "vikramshah"];

describe("caseSelectors", () => {
  it.each(IDS)("%s: recoverable + unrecoverable cash-out + unaccounted reconcile to booked loss", (id) => {
    const c = resolveCase(id)!;
    const f = selectFinancialSummary(c);
    expect(f.recoverableInr + f.unrecoverableCashoutInr + f.unaccountedInr).toBe(f.bookedLossInr);
    expect(f.unaccountedInr).toBe(0);
    expect(f.isReconciled).toBe(true);
    // recoverable is made of frozen mule balances plus the merchant lien
    expect(f.frozenMuleInr + f.shieldedCommercialInr).toBe(f.recoverableInr);
  });

  it.each(IDS)("%s: money flow is conserved and doctrine numbers come from the data", (id) => {
    const c = resolveCase(id)!;
    const flow = selectMoneyFlow(c);
    const victimOut = flow.links.filter((l) => l.source === c.accounts.find((a) => a.holderType === "VICTIM")!.nodeId).reduce((s, l) => s + l.value, 0);
    expect(victimOut).toBe(c.financials.bookedLossInr);
    const d = selectDoctrineComparison(c);
    expect(d.libr).toBe(c.financials.recoverableLibrInr);
    expect(d.proRata).toBeLessThanOrEqual(d.libr);
    expect(d.fifo).toBeLessThanOrEqual(d.libr);
    expect(selectDoctrineComparison(c, true).libr).toBe(d.libr);
  });

  it.each(IDS)("%s: per-account held balance equals frozen balance for mule holders", (id) => {
    const c = resolveCase(id)!;
    selectAccountFlows(c)
      .filter((a) => a.role === "CONDUIT" || a.role === "UNRESOLVED")
      .forEach((a) => expect(a.heldInr).toBe(a.frozenInr));
  });

  it.each(["CASE-2026-002", "CASE-2026-003", "CASE-2026-004"])("%s: no output leaks Case 001 names", (id) => {
    const c = resolveCase(id)!;
    const blob = JSON.stringify([
      selectFinancialSummary(c),
      selectAccountFlows(c),
      selectMoneyFlow(c),
      selectDoctrineComparison(c, true),
      selectEntityResolution(c),
      selectDeviceFacts(c),
      selectFreezeActions(c),
      selectLedgerFacts(c),
      selectSyndicate(c),
      selectCaseCard(c),
      selectNoticeContext(c),
    ]);
    for (const s of FORBIDDEN) expect(blob).not.toContain(s);
  });

  it("dashboard total equals the sum of the cases (and Command Center selector)", () => {
    const cases = IDS.map((id) => CANONICAL_CASES[id]);
    const totals = selectPortfolioTotals(cases);
    const sumLoss = cases.reduce((s, c) => s + c.financials.bookedLossInr, 0);
    expect(totals.bookedLossInr).toBe(sumLoss);
    expect(totals.bookedLossInr).toBe(2270000);
    expect(totals.recoverableInr).toBe(cases.reduce((s, c) => s + c.financials.recoverableLibrInr, 0));
    const dash = selectDashboardFinancials(INITIAL_CASE_WORKSPACES);
    expect(dash.totalReportedLossInr).toBe(totals.bookedLossInr);
    expect(dash.totalRecoverableInr).toBe(totals.recoverableInr);
  });

  it("expired golden hour is flagged and unknown cases do not fall back", () => {
    expect(selectFinancialSummary(resolveCase("CASE-2026-003")!).goldenHourState).toBe("EXPIRED");
    expect(formatGoldenHour(0)).toBe("Expired");
    expect(resolveCase("CASE-9999")).toBeNull();
  });

  it("formats Indian money", () => {
    expect(formatInr(1250000)).toBe("₹12,50,000");
    expect(formatInrCompact(1250000)).toBe("₹12.5 L");
    expect(formatInrCompact(12000000)).toBe("₹1.2 Cr");
  });
});

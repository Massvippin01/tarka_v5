import { getCanonicalCase } from "../fixtures/cases";
import type { CaseActionRecord, CaseActionsSummary } from "../types/actions";

export interface UnifiedCaseFinancials {
  bookedLossInr: number;
  claimedLossInr: number;
  recoverableLibrInr: number;
  shieldedCommercialInr: number;
  unrecoverableCashoutInr: number;
  frozenAmountInr: number;
  pendingFreezeInr: number;
  recoveryPercentage: number;
  isFullyFrozen: boolean;
  goldenHourRemainingMins: number;
  frozenAccountIds: Set<string>;
}

/**
 * Pure selector computing the unified single source of truth for frozen capital,
 * recovery percentages, and golden-hour containment across TARKA.
 *
 * Reconciles Header Ring, Money Trail (Taint), Fraud Network, Dashboard KPIs,
 * Cases Table, and Investigation Report from the exact same mathematical source.
 */
export function selectCaseActionFinancials(
  caseId: string,
  actions?: CaseActionRecord[] | null,
  backendSummary?: CaseActionsSummary | null
): UnifiedCaseFinancials {
  const canonical = getCanonicalCase(caseId);
  const bookedLossInr = canonical.financials.bookedLossInr;
  const claimedLossInr = canonical.financials.claimedLossInr;
  const recoverableLibrInr = canonical.financials.recoverableLibrInr;
  const shieldedCommercialInr = canonical.financials.shieldedCommercialInr;
  const unrecoverableCashoutInr = canonical.financials.unrecoverableCashoutInr;

  const frozenAccountIds = new Set<string>();
  let computedFrozen = 0;

  if (actions && actions.length > 0) {
    for (const a of actions) {
      if (a.status === "FROZEN" || a.status === "PARTIAL") {
        frozenAccountIds.add(a.accountId);
        frozenAccountIds.add(a.id);
        computedFrozen += a.frozenAmount || 0;
      }
    }
  } else if (backendSummary && backendSummary.totalFrozen > 0) {
    computedFrozen = backendSummary.totalFrozen;
  }

  const frozenAmountInr = computedFrozen;
  const pendingFreezeInr = Math.max(0, recoverableLibrInr - frozenAmountInr);
  const isFullyFrozen = Boolean(backendSummary?.isFullyFrozen || (frozenAmountInr >= recoverableLibrInr && recoverableLibrInr > 0));

  const rawPct = bookedLossInr > 0 ? (frozenAmountInr / bookedLossInr) * 100 : 0;
  const recoveryPercentage = Math.min(100, parseFloat(rawPct.toFixed(1)));

  let goldenHourRemainingMins = canonical.financials.goldenHourRemainingMins;
  if (isFullyFrozen) {
    goldenHourRemainingMins = 0;
  } else if (backendSummary && typeof backendSummary.goldenHourRemainingMins === "number") {
    goldenHourRemainingMins = backendSummary.goldenHourRemainingMins;
  }

  return {
    bookedLossInr,
    claimedLossInr,
    recoverableLibrInr,
    shieldedCommercialInr,
    unrecoverableCashoutInr,
    frozenAmountInr,
    pendingFreezeInr,
    recoveryPercentage,
    isFullyFrozen,
    goldenHourRemainingMins,
    frozenAccountIds,
  };
}

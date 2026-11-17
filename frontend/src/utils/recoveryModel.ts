import { resolveCase, selectFinancialSummary, selectDoctrineComparison, selectFreezeActions } from "../selectors/caseSelectors";

export interface RecoveryModelResult {
  grossVictimLoss: number; 
  atmCashedOut: number;
  muleRetainedHold: number;
  merchantSpecificLien: number;
  cleanDepositInjected: number;
  netRecoverableSum: number;
  recoveryPotentialPct: number;
  openEscapeExits: number;
  totalEscapeRoutes: number;
  containmentPct: number;
  librRecoverable: number;
  fifoRecoverable: number;
  proRataRecoverable: number;
  rulesEqual: boolean;
}

/**
 * Pure selector computing the single source of truth for financial recovery across TARKA v5.0.
 * Reconciles KPIs, Sankey, Recovery Waterfall, and Recovery Model Panel.
 */
export function recoveryModel(
  isInjectClean: boolean = false,
  freezeBudgetK: number = 3,
  caseId?: string
): RecoveryModelResult {
  // Demo fixtures and uploaded-case bundles alike; an unknown case shows zeros, never another case's figures.
  const canonical = resolveCase(caseId);
  if (!canonical) {
    return {
      grossVictimLoss: 0, atmCashedOut: 0, muleRetainedHold: 0, merchantSpecificLien: 0, cleanDepositInjected: 0,
      netRecoverableSum: 0, recoveryPotentialPct: 0, openEscapeExits: 0, totalEscapeRoutes: 0, containmentPct: 0,
      librRecoverable: 0, fifoRecoverable: 0, proRataRecoverable: 0, rulesEqual: true,
    };
  }
  // Case-driven: every number comes from the shared selectors (one source of truth).
  const fin = selectFinancialSummary(canonical);
  const doctrine = selectDoctrineComparison(canonical, isInjectClean);
  const requiredK = Math.max(1, selectFreezeActions(canonical).filter((a) => a.kind !== "CASHOUT_REQUISITION" && a.amountInr > 0).length);
  const openExits = Math.max(0, requiredK - freezeBudgetK);
  return {
    grossVictimLoss: fin.bookedLossInr,
    atmCashedOut: fin.unrecoverableCashoutInr,
    muleRetainedHold: fin.frozenMuleInr,
    merchantSpecificLien: fin.shieldedCommercialInr,
    cleanDepositInjected: doctrine.cleanDepositInjectedInr,
    netRecoverableSum: fin.recoverableInr,
    recoveryPotentialPct: parseFloat(((fin.recoverableInr / Math.max(1, fin.bookedLossInr)) * 100).toFixed(1)),
    openEscapeExits: openExits,
    totalEscapeRoutes: requiredK,
    containmentPct: openExits === 0 ? 100 : Math.round((Math.min(freezeBudgetK, requiredK) / requiredK) * 100),
    librRecoverable: doctrine.libr,
    fifoRecoverable: doctrine.fifo,
    proRataRecoverable: doctrine.proRata,
    rulesEqual: doctrine.rulesEqual,
  };
}


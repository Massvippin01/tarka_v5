export interface RecoveryModelResult {
  grossVictimLoss: number; // 500000
  atmCashedOut: number; // 120000 (irrecoverable cashout at ATM DL-049)
  muleRetainedHold: number; // 200000 (Rohit 1.20L + Sameer 80k under Sec 107)
  merchantSpecificLien: number; // 180000 (Apex Electronics under Sec 106)
  cleanDepositInjected: number; // 250000 if isInjectClean, else 0
  netRecoverableSum: number; // 380000 (76.0% of stolen capital)
  recoveryPotentialPct: number; // 76.0
  openEscapeExits: number; // 0 if freezeBudgetK >= 3, else (3 - freezeBudgetK)
  totalEscapeRoutes: number; // 4
  containmentPct: number; // 100 if freezeBudgetK >= 3, else 50..75
  librRecoverable: number; // 380000
  fifoRecoverable: number; // 200000
  proRataRecoverable: number; // 274000 if clean deposit commingled, else 380000
  rulesEqual: boolean; // true if clean deposit is not injected
}

/**
 * Pure selector computing the single source of truth for financial recovery across TARKA v5.0.
 * Reconciles KPIs, Sankey, Recovery Waterfall, and Recovery Model Panel.
 */
export function recoveryModel(
  isInjectClean: boolean = false,
  freezeBudgetK: number = 3
): RecoveryModelResult {
  const grossVictimLoss = 500000;
  const atmCashedOut = 120000;
  const muleRetainedHold = 200000;
  const merchantSpecificLien = 180000;
  const cleanDepositInjected = isInjectClean ? 250000 : 0;
  const netRecoverableSum = muleRetainedHold + merchantSpecificLien; // 380,000
  const recoveryPotentialPct = (netRecoverableSum / grossVictimLoss) * 100; // 76.0%

  // Dinic Min-Cut containment
  const isContained = freezeBudgetK >= 3;
  const openEscapeExits = isContained ? 0 : Math.max(0, 3 - freezeBudgetK);
  const containmentPct = isContained ? 100 : Math.round((freezeBudgetK / 3) * 100);

  // Accounting doctrine derivations:
  // LIBR: Lowest Intermediate Balance Rule strictly protects clean capital.
  // FIFO: First-in, first-out assumes early withdrawals depleted tainted pool.
  // Pro-rata: proportional commingling when ₹2.5L clean commercial funds exist.
  const librRecoverable = netRecoverableSum; // 380000
  const fifoRecoverable = 200000; // 200000 held in mules, merchant considered depleted
  const proRataRecoverable = isInjectClean ? 274000 : 380000;
  const rulesEqual = !isInjectClean;

  return {
    grossVictimLoss,
    atmCashedOut,
    muleRetainedHold,
    merchantSpecificLien,
    cleanDepositInjected,
    netRecoverableSum,
    recoveryPotentialPct,
    openEscapeExits,
    totalEscapeRoutes: 4,
    containmentPct,
    librRecoverable,
    fifoRecoverable,
    proRataRecoverable,
    rulesEqual,
  };
}

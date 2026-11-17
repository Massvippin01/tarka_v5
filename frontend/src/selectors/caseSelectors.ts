/**
 * Case selectors: the single place where per-case numbers and lists are derived from a
 * canonical case bundle (fixtures/cases/CASE-2026-00X.json). Screens must render only from
 * these outputs; they never hard-code a person, account, amount or case-specific sentence.
 *
 * All functions are pure and take a CanonicalCaseFixture.
 */
import { findCase, type CanonicalCaseFixture, type CanonicalCaseAccount, type CanonicalCaseTransaction } from "../fixtures/cases";
import type { CanonicalEntity, RawToken } from "../services/caseSyncBridge";
import { formatInr, formatInrCompact, pctOf } from "../lib/formatInr";

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/** Strict lookup: returns null for unknown case ids (never falls back to another case). */
export function resolveCase(caseId: string | null | undefined): CanonicalCaseFixture | null {
  if (!caseId) return null;
  return findCase(caseId) ?? null;
}

export const TYPOLOGY_LABELS: Record<CanonicalCaseFixture["typology"], string> = {
  DIGITAL_ARREST: "Digital arrest impersonation",
  APK_SIM_SWAP: "Malicious APK and SIM swap",
  CORPORATE_BEC: "Corporate payment fraud",
  TASK_FRAUD: "Task and crypto fraud",
  UNCLASSIFIED: "Not yet classified",
};

const SUB_THRESHOLD_INR = 50000;

/* ------------------------------------------------------------------ */
/* Financial summary                                                   */
/* ------------------------------------------------------------------ */

export interface CaseFinancialSummary {
  caseId: string;
  bookedLossInr: number;
  claimedLossInr: number;
  /** Funds identified as recoverable (frozen mule balances + shielded merchant lien). */
  recoverableInr: number;
  frozenMuleInr: number;
  shieldedCommercialInr: number;
  unrecoverableCashoutInr: number;
  /** booked - recoverable - cash-out. Must be 0 for a fully reconciled case. */
  unaccountedInr: number;
  isReconciled: boolean;
  recoveryPct: number;
  cashoutPct: number;
  claimGapInr: number;
  claimMatchesLedger: boolean;
  goldenHourRemainingMins: number;
  goldenHourState: "ACTIVE" | "EXPIRED";
}

export function selectFinancialSummary(c: CanonicalCaseFixture): CaseFinancialSummary {
  const f = c.financials;
  const unaccounted = f.bookedLossInr - f.recoverableLibrInr - f.unrecoverableCashoutInr;
  return {
    caseId: c.caseId,
    bookedLossInr: f.bookedLossInr,
    claimedLossInr: f.claimedLossInr,
    recoverableInr: f.recoverableLibrInr,
    frozenMuleInr: f.frozenMuleBalanceInr,
    shieldedCommercialInr: f.shieldedCommercialInr,
    unrecoverableCashoutInr: f.unrecoverableCashoutInr,
    unaccountedInr: unaccounted,
    isReconciled: unaccounted === 0,
    recoveryPct: pctOf(f.recoverableLibrInr, f.bookedLossInr),
    cashoutPct: pctOf(f.unrecoverableCashoutInr, f.bookedLossInr),
    claimGapInr: Math.abs(f.bookedLossInr - f.claimedLossInr),
    claimMatchesLedger: f.bookedLossInr === f.claimedLossInr,
    goldenHourRemainingMins: f.goldenHourRemainingMins,
    goldenHourState: f.goldenHourRemainingMins > 0 ? "ACTIVE" : "EXPIRED",
  };
}

export interface PortfolioTotals {
  totalCases: number;
  bookedLossInr: number;
  recoverableInr: number;
  frozenMuleInr: number;
  unrecoverableCashoutInr: number;
  shieldedCommercialInr: number;
  goldenHourActiveCount: number;
  recoveryPct: number;
}

/** Sum of the per-case summaries. Dashboard / Command Center / Cases must all equal this. */
export function selectPortfolioTotals(cases: CanonicalCaseFixture[]): PortfolioTotals {
  const sums = cases.map(selectFinancialSummary);
  const sum = (pick: (s: CaseFinancialSummary) => number) => sums.reduce((a, s) => a + pick(s), 0);
  const booked = sum((s) => s.bookedLossInr);
  const recoverable = sum((s) => s.recoverableInr);
  return {
    totalCases: cases.length,
    bookedLossInr: booked,
    recoverableInr: recoverable,
    frozenMuleInr: sum((s) => s.frozenMuleInr),
    unrecoverableCashoutInr: sum((s) => s.unrecoverableCashoutInr),
    shieldedCommercialInr: sum((s) => s.shieldedCommercialInr),
    goldenHourActiveCount: sums.filter((s) => s.goldenHourState === "ACTIVE").length,
    recoveryPct: pctOf(recoverable, booked),
  };
}

/* ------------------------------------------------------------------ */
/* Accounts: roster with per-account inflow / outflow                  */
/* ------------------------------------------------------------------ */

export type AccountRole = "VICTIM" | "MULE" | "CONDUIT" | "SINK" | "MERCHANT" | "UNRESOLVED";

export interface AccountFlow {
  nodeId: string;
  holderName: string;
  holderType: CanonicalCaseAccount["holderType"];
  role: AccountRole;
  roleLabel: string;
  bank: string;
  accountMasked: string;
  accountNumber: string;
  ifsc: string;
  panMasked: string;
  evidenceStatus: CanonicalCaseAccount["evidenceStatus"];
  introducerId?: string;
  tenureMonths?: number;
  deviceImei?: string;
  bssidHotspot?: string;
  gstin?: string;
  frozenInr: number;
  inflowInr: number;
  outflowInr: number;
  /** inflow - outflow (never negative). */
  heldInr: number;
  txIn: number;
  txOut: number;
  fanIn: number;
  fanOut: number;
  subThresholdOutCount: number;
  firstInboundUtc: string | null;
  firstInboundIst: string | null;
  /** Seconds between first inbound credit and first outbound debit (null if no outflow). */
  dwellSeconds: number | null;
  vpas: string[];
}

const ROLE_BY_TYPE: Record<CanonicalCaseAccount["holderType"], AccountRole> = {
  VICTIM: "VICTIM",
  LAYER_1_MULE: "MULE",
  LAYER_2_CONDUIT: "CONDUIT",
  LAYER_3_SINK: "SINK",
  BONA_FIDE_MERCHANT: "MERCHANT",
  UNRESOLVED_SUBSCRIBER: "UNRESOLVED",
};

const ROLE_LABEL: Record<AccountRole, string> = {
  VICTIM: "Victim",
  MULE: "Layer-1 mule",
  CONDUIT: "Layer-2 conduit",
  SINK: "Cash-out point",
  MERCHANT: "Merchant (shielded)",
  UNRESOLVED: "Unresolved holder",
};

/** Transactions that are part of the fraud money trail (salary credits are context only). */
function trailTxns(c: CanonicalCaseFixture): CanonicalCaseTransaction[] {
  return c.transactions.filter((t) => t.category !== "SALARY_CREDIT");
}

function matchesAccount(acc: CanonicalCaseAccount, ref: string, name: string): boolean {
  return acc.accountNumber === ref || acc.holderName === name;
}

export function selectAccountFlows(c: CanonicalCaseFixture): AccountFlow[] {
  const txns = trailTxns(c).slice().sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  return c.accounts.map((acc) => {
    const ins = txns.filter((t) => matchesAccount(acc, t.toAccount, t.toName));
    const outs = txns.filter((t) => matchesAccount(acc, t.fromAccount, t.fromName));
    const inflow = ins.reduce((s, t) => s + t.amount, 0);
    const outflow = outs.reduce((s, t) => s + t.amount, 0);
    const role = ROLE_BY_TYPE[acc.holderType];
    const firstIn = ins[0];
    const firstOut = outs[0];
    let dwell: number | null = null;
    if (firstIn && firstOut) {
      dwell = Math.max(0, (Date.parse(firstOut.timestampUtc) - Date.parse(firstIn.timestampUtc)) / 1000);
    }
    const vpas = new Set<string>();
    for (const t of c.transactions) {
      if (matchesAccount(acc, t.fromAccount, t.fromName) && t.fromVpa) vpas.add(t.fromVpa);
      if (matchesAccount(acc, t.toAccount, t.toName) && t.toVpa) vpas.add(t.toVpa);
    }
    return {
      nodeId: acc.nodeId,
      holderName: acc.holderName,
      holderType: acc.holderType,
      role,
      roleLabel: ROLE_LABEL[role],
      bank: acc.bank,
      accountMasked: acc.accountMasked,
      accountNumber: acc.accountNumber,
      ifsc: acc.ifsc,
      panMasked: acc.panMasked,
      evidenceStatus: acc.evidenceStatus,
      introducerId: acc.introducerId,
      tenureMonths: acc.tenureMonths,
      deviceImei: acc.deviceImei,
      bssidHotspot: acc.bssidHotspot,
      gstin: acc.gstin,
      frozenInr: acc.frozenBalance,
      inflowInr: inflow,
      outflowInr: outflow,
      heldInr: Math.max(0, inflow - outflow),
      txIn: ins.length,
      txOut: outs.length,
      fanIn: new Set(ins.map((t) => t.fromName)).size,
      fanOut: new Set(outs.map((t) => t.toName)).size,
      subThresholdOutCount: outs.filter((t) => t.amount < SUB_THRESHOLD_INR).length,
      firstInboundUtc: firstIn?.timestampUtc ?? null,
      firstInboundIst: firstIn?.timestampIst ?? null,
      dwellSeconds: dwell,
      vpas: [...vpas],
    };
  });
}

export interface AccountGroups {
  victim: AccountFlow | null;
  mules: AccountFlow[];
  conduits: AccountFlow[];
  sinks: AccountFlow[];
  merchants: AccountFlow[];
  unresolved: AccountFlow[];
  /** Mules + conduits + unresolved holders: every account suspected of receiving stolen funds. */
  suspects: AccountFlow[];
}

export function selectAccountGroups(c: CanonicalCaseFixture): AccountGroups {
  const flows = selectAccountFlows(c);
  const by = (r: AccountRole) => flows.filter((a) => a.role === r);
  return {
    victim: by("VICTIM")[0] ?? null,
    mules: by("MULE"),
    conduits: by("CONDUIT"),
    sinks: by("SINK"),
    merchants: by("MERCHANT"),
    unresolved: by("UNRESOLVED"),
    suspects: flows.filter((a) => a.role === "MULE" || a.role === "CONDUIT" || a.role === "UNRESOLVED"),
  };
}

/* ------------------------------------------------------------------ */
/* Money flow (Sankey)                                                 */
/* ------------------------------------------------------------------ */

export type FlowNodeCategory = "victim" | "mule" | "merchant" | "cashout" | "hold";
export type FlowLinkTreatment = "outflow" | "frozen" | "lien" | "cashout";

export interface FlowNode {
  id: string;
  name: string;
  subname: string;
  category: FlowNodeCategory;
  balance: number;
  statute: string;
  accountNodeId: string;
}

export interface FlowLink {
  source: string;
  target: string;
  value: number;
  treatment: FlowLinkTreatment;
  label: string;
  pct: number;
}

export interface MoneyFlow {
  nodes: FlowNode[];
  links: FlowLink[];
  totalInr: number;
}

export function selectMoneyFlow(c: CanonicalCaseFixture): MoneyFlow {
  const flows = selectAccountFlows(c);
  const total = c.financials.bookedLossInr;
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  const resolveId = (ref: string, name: string): string | null => {
    const hit = flows.find((a) => a.accountNumber === ref || a.holderName === name);
    return hit ? hit.nodeId : null;
  };

  // Aggregate trail transactions by (from,to).
  const agg = new Map<string, { from: string; to: string; value: number; category: CanonicalCaseTransaction["category"] }>();
  for (const t of trailTxns(c)) {
    const from = resolveId(t.fromAccount, t.fromName);
    const to = resolveId(t.toAccount, t.toName);
    if (!from || !to) continue;
    const key = `${from}>${to}`;
    const prev = agg.get(key);
    if (prev) prev.value += t.amount;
    else agg.set(key, { from, to, value: t.amount, category: t.category });
  }

  const touched = new Set<string>();
  agg.forEach((e) => {
    touched.add(e.from);
    touched.add(e.to);
  });

  const nodeCategory = (a: AccountFlow): FlowNodeCategory => {
    if (a.role === "VICTIM") return "victim";
    if (a.role === "MERCHANT") return "merchant";
    if (a.role === "SINK") return "cashout";
    const terminal = a.txOut === 0;
    if (terminal) return "hold";
    return "mule";
  };

  const statuteFor = (a: AccountFlow, cat: FlowNodeCategory): string => {
    if (cat === "victim") return "Victim origin";
    if (cat === "merchant") return "§106 specific lien";
    if (cat === "cashout") return "Cash out (irreversible)";
    if (cat === "hold") return a.frozenInr > 0 ? "§107 hold" : "Balance held";
    return a.role === "MULE" ? "§107 first-hop mule" : "§107 conduit";
  };

  flows.forEach((a) => {
    if (!touched.has(a.nodeId)) return;
    const cat = nodeCategory(a);
    nodes.push({
      id: a.nodeId,
      name: a.holderName,
      subname: `${a.bank} ${a.accountMasked}`,
      category: cat,
      balance: a.role === "VICTIM" ? a.outflowInr : cat === "mule" ? a.inflowInr : a.heldInr || a.inflowInr,
      statute: statuteFor(a, cat),
      accountNodeId: a.nodeId,
    });
  });

  agg.forEach((e) => {
    const treatment: FlowLinkTreatment =
      e.category === "COMMERCIAL_ESCROW" ? "lien" : e.category === "ATM_CASHOUT" ? "cashout" : e.category === "LAYERING" ? "frozen" : "outflow";
    links.push({
      source: e.from,
      target: e.to,
      value: e.value,
      treatment,
      label: `${formatInrCompact(e.value)} (${pctOf(e.value, total)}%)`,
      pct: pctOf(e.value, total),
    });
  });

  // Residual balances left in accounts that also forwarded money get an explicit "held" sink.
  flows.forEach((a) => {
    if (!touched.has(a.nodeId)) return;
    const isForwarder = a.role === "MULE" || a.role === "CONDUIT";
    if (isForwarder && a.txOut > 0 && a.heldInr > 0) {
      const holdId = `${a.nodeId}::held`;
      nodes.push({
        id: holdId,
        name: `${a.holderName} (balance held)`,
        subname: `${a.bank} ${a.accountMasked}`,
        category: "hold",
        balance: a.heldInr,
        statute: a.frozenInr > 0 ? "§107 hold" : "Balance held",
        accountNodeId: a.nodeId,
      });
      links.push({
        source: a.nodeId,
        target: holdId,
        value: a.heldInr,
        treatment: "frozen",
        label: `${formatInrCompact(a.heldInr)} held`,
        pct: pctOf(a.heldInr, total),
      });
    }
  });

  return { nodes, links, totalInr: total };
}

/* ------------------------------------------------------------------ */
/* Doctrine comparison                                                 */
/* ------------------------------------------------------------------ */

export interface DoctrineRow {
  key: "LIBR" | "FIFO" | "PRO_RATA";
  label: string;
  recoverableInr: number;
  pctOfLoss: number;
  note: string;
}

export interface DoctrineComparison {
  rows: DoctrineRow[];
  libr: number;
  fifo: number;
  proRata: number;
  cleanDepositInjectedInr: number;
  rulesEqual: boolean;
  assumptions: string[];
}

/**
 * LIBR / FIFO / pro-rata computed once from the case data.
 *  - LIBR: frozen mule balances plus the specific lien on the shielded merchant balance
 *          (== financials.recoverableLibrInr).
 *  - FIFO: merchant receipts are treated as the earliest debits, so only frozen mule balances count.
 *  - Pro-rata: the merchant lien is diluted by the share of clean funds commingled in that account.
 *          Default clean commingled funds = 0; the "inject clean deposit" scenario adds a clean deposit
 *          equal to the tainted merchant receipt.
 */
export function selectDoctrineComparison(c: CanonicalCaseFixture, injectClean = false): DoctrineComparison {
  const f = c.financials;
  const booked = f.bookedLossInr;
  const libr = f.recoverableLibrInr;
  const merchantLien = f.shieldedCommercialInr;
  const frozenMule = f.frozenMuleBalanceInr;
  const clean = injectClean ? merchantLien : 0;
  const fifo = frozenMule;
  const proRata = Math.round(frozenMule + (merchantLien > 0 ? merchantLien * (merchantLien / (merchantLien + clean)) : 0));
  const mk = (key: DoctrineRow["key"], label: string, v: number, note: string): DoctrineRow => ({
    key,
    label,
    recoverableInr: v,
    pctOfLoss: pctOf(v, booked),
    note,
  });
  return {
    rows: [
      mk("LIBR", "LIBR (lowest intermediate balance)", libr, merchantLien > 0
        ? `Attaches mule balances and a specific lien on ${formatInrCompact(merchantLien)} at the merchant, without touching clean money.`
        : "Attaches the frozen mule balances; no merchant account is involved in this case."),
      mk("FIFO", "FIFO (first in, first out)", fifo, merchantLien > 0
        ? "Treats merchant receipts as the earliest debits, so the lien at the merchant is lost."
        : "Same as LIBR here: there is no merchant balance to write off."),
      mk("PRO_RATA", "Pro-rata pooling", proRata, clean > 0
        ? "Dilutes recovery across the clean deposit commingled in the merchant account."
        : "Same as LIBR until clean funds commingle with the stolen money."),
    ],
    libr,
    fifo,
    proRata,
    cleanDepositInjectedInr: clean,
    rulesEqual: libr === fifo && libr === proRata,
    assumptions: [
      "LIBR figure comes straight from the case ledger.",
      "FIFO assumes merchant receipts are the earliest debits.",
      "Pro-rata assumes clean funds commingled only when the clean-deposit scenario is switched on.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Entities, identifiers, candidate merges                             */
/* ------------------------------------------------------------------ */

export interface CandidateMerge {
  id: string;
  sourceLabel: string;
  sourceValue: string;
  sourceBadge: string;
  targetEntityId: string;
  targetName: string;
  matchScore: number;
  matchEvidence: string[];
  decision: "PROPOSED" | "ACCEPTED" | "REJECTED" | "SPLIT";
}

export interface EntityResolution {
  entities: CanonicalEntity[];
  tokens: RawToken[];
  candidateLinks: CandidateMerge[];
  vetoedCount: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

function hasTrack(c: CanonicalCaseFixture, re: RegExp): boolean {
  return c.timelineEvents.some((e) => re.test(e.track));
}

export function selectEntityResolution(c: CanonicalCaseFixture): EntityResolution {
  const flows = selectAccountFlows(c);
  const entityIdOf = new Map(flows.map((a, i) => [a.nodeId, `ENT-${String(i + 1).padStart(2, "0")}`]));
  const imeiGroups = new Map<string, AccountFlow[]>();
  flows.forEach((a) => {
    if (a.deviceImei) imeiGroups.set(a.deviceImei, [...(imeiGroups.get(a.deviceImei) ?? []), a]);
  });
  const introGroups = new Map<string, AccountFlow[]>();
  flows.forEach((a) => {
    if (a.introducerId && !/^(NONE|DIRECT|COMMERCIAL|CASH)/.test(a.introducerId)) {
      introGroups.set(a.introducerId, [...(introGroups.get(a.introducerId) ?? []), a]);
    }
  });

  const entities: CanonicalEntity[] = [];
  const tokens: RawToken[] = [];
  let tokenSeq = 1;
  const pushToken = (t: Omit<RawToken, "id">) => tokens.push({ id: `T-${String(tokenSeq++).padStart(2, "0")}`, ...t });
  const whatsappVector = hasTrack(c, /WHATSAPP|TELEGRAM/);

  flows.forEach((a) => {
    const entId = entityIdOf.get(a.nodeId)!;
    const sharedDevice = a.deviceImei ? (imeiGroups.get(a.deviceImei)?.length ?? 1) - 1 : 0;
    const passThrough = a.inflowInr > 0 ? Math.min(1, a.outflowInr / a.inflowInr) : 0;
    const subShare = a.txOut > 0 ? a.subThresholdOutCount / a.txOut : 0;

    let velocity = 0;
    if (a.dwellSeconds !== null) velocity = a.dwellSeconds <= 300 ? 95 : a.dwellSeconds <= 1800 ? 80 : a.dwellSeconds <= 7200 ? 60 : 35;
    else if (a.inflowInr > 0 && a.role !== "MERCHANT") velocity = 40;
    const deviceOverlap = a.deviceImei ? (sharedDevice > 0 ? 100 : 45) : 0;
    const structuring = clamp(100 * subShare + 25 * Math.max(0, a.fanOut - 1));
    const tenure = a.tenureMonths;
    // Unknown account age (e.g. uploaded statements carry no KYC data) scores 0, never "brand-new account".
    const kycDiscrepancy = tenure == null || a.role === "VICTIM" || a.role === "MERCHANT" || a.role === "SINK" ? 0 : tenure < 3 ? 90 : tenure < 12 ? 60 : 15;

    let subScores = { velocity, deviceOverlap, structuring, kycDiscrepancy };
    let roleBadge = "SUSPECTED CONDUIT";
    let roleColor: CanonicalEntity["roleColor"] = "amber";
    let riskBand = "ELEVATED_MONITORING";
    let isHardVeto = false;
    let hardVetoReason: string | undefined;
    let summary = "";

    const fromNames = [...new Set(c.transactions.filter((t) => t.toName === a.holderName).map((t) => t.fromName))];
    const toNames = [...new Set(c.transactions.filter((t) => t.fromName === a.holderName).map((t) => t.toName))];

    if (a.role === "VICTIM") {
      roleBadge = "VICTIM ORIGIN";
      roleColor = "indigo";
      riskBand = "VICTIM_ACCOUNT";
      subScores = { velocity: 0, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 };
      summary = `Complainant under ${c.firNumber}. ${formatInr(a.outflowInr)} left this account in ${a.txOut} transfer${a.txOut === 1 ? "" : "s"}.`;
    } else if (a.role === "MERCHANT") {
      roleBadge = "HARD VETO SHIELD";
      roleColor = "emerald";
      riskBand = "LOW_RISK_LEGITIMATE";
      isHardVeto = true;
      hardVetoReason = `Active commercial account${a.gstin ? ` (GSTIN ${a.gstin})` : ""}, ${tenure} months old. Only the ${formatInr(a.inflowInr)} traced receipt is liened; the rest of its turnover stays untouched.`;
      subScores = { velocity: 5, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 };
      summary = `Innocent commercial merchant that received ${formatInr(a.inflowInr)} from ${fromNames.join(", ") || "a mule"}. A specific lien shields lawful turnover.`;
    } else if (a.role === "MULE") {
      roleBadge = "FIRST-HOP MULE";
      roleColor = "rose";
      riskBand = "CRITICAL_MULE_LEAD";
      summary = `First recipient of the stolen funds (${formatInr(a.inflowInr)}). ${
        a.dwellSeconds !== null ? `Forwarded onward ${a.dwellSeconds} seconds after the first credit` : "Funds still sit in the account"
      }${toNames.length ? `, to ${toNames.join(", ")}` : ""}.`;
    } else if (a.role === "CONDUIT") {
      roleBadge = "SPLIT CONDUIT";
      roleColor = "amber";
      riskBand = "HIGH_SUSPICION_MULE";
      summary = `Received ${formatInr(a.inflowInr)} from ${fromNames.join(", ") || "an upstream mule"}${
        toNames.length ? ` and moved ${formatInr(a.outflowInr)} on to ${toNames.join(", ")}` : `; ${formatInr(a.heldInr)} still held`
      }.`;
    } else if (a.role === "SINK") {
      roleBadge = "CASH-OUT POINT";
      roleColor = "rose";
      riskBand = "CASH_OUT";
      subScores = { velocity: 0, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 };
      summary = `Cash withdrawn here: ${formatInr(a.inflowInr)} (irreversible). Request CCTV and the terminal journal.`;
    } else {
      roleBadge = "UNRESOLVED HOLDER";
      roleColor = "amber";
      riskBand = "INSUFFICIENT_EVIDENCE";
      summary = `Received ${formatInr(a.inflowInr)} from ${fromNames.join(", ") || "a mule"} but evidence is insufficient to attribute intent; the balance is held pending KYC.`;
    }

    const fraudScore =
      a.role === "VICTIM" || a.role === "MERCHANT" || a.role === "SINK"
        ? a.role === "MERCHANT"
          ? 5
          : a.role === "SINK"
            ? 60
            : 0
        : clamp(subScores.velocity * 0.35 + subScores.deviceOverlap * 0.3 + subScores.structuring * 0.2 + subScores.kycDiscrepancy * 0.15);

    const contributions: NonNullable<CanonicalEntity["featureContributions"]> = [];
    if (a.role === "MULE" || a.role === "CONDUIT" || a.role === "UNRESOLVED") {
      if (a.inflowInr > 0)
        contributions.push({
          feature: `Pass-through ratio ${Math.round(passThrough * 100)}%`,
          points: passThrough > 0.5 ? 25 : 5,
          direction: "INCREASES_RISK",
          evidence: `${formatInr(a.outflowInr)} out of ${formatInr(a.inflowInr)} received was forwarded.`,
        });
      if (a.dwellSeconds !== null)
        contributions.push({
          feature: `Dwell time ${a.dwellSeconds}s`,
          points: a.dwellSeconds <= 1800 ? 25 : 10,
          direction: "INCREASES_RISK",
          evidence: `First debit followed the first credit after ${a.dwellSeconds} seconds.`,
        });
      if (a.fanOut > 1)
        contributions.push({
          feature: `Fan-out to ${a.fanOut} accounts`,
          points: 20,
          direction: "INCREASES_RISK",
          evidence: `Disbursed to ${toNames.join(", ")}.`,
        });
      if (sharedDevice > 0)
        contributions.push({
          feature: "Shared handset",
          points: 20,
          direction: "INCREASES_RISK",
          evidence: `IMEI ${a.deviceImei} also used by ${imeiGroups
            .get(a.deviceImei!)!
            .filter((x) => x.nodeId !== a.nodeId)
            .map((x) => x.holderName)
            .join(", ")}.`,
        });
      if (tenure != null && tenure > 0 && tenure < 3)
        contributions.push({
          feature: `New account (${tenure} months)`,
          points: 15,
          direction: "INCREASES_RISK",
          evidence: `Opened ${tenure} months before the fraud${a.introducerId ? `, introducer ${a.introducerId}` : ""}.`,
        });
    } else if (a.role === "MERCHANT") {
      contributions.push({
        feature: "Verified commercial account",
        points: -50,
        direction: "MITIGATES_RISK",
        evidence: `${tenure} months of history${a.gstin ? `, GSTIN ${a.gstin}` : ""}.`,
      });
    } else if (a.role === "VICTIM") {
      contributions.push({
        feature: "Complainant account",
        points: 0,
        direction: "MITIGATES_RISK",
        evidence: `Account holder of the defrauded remitter account under ${c.firNumber}.`,
      });
    }

    entities.push({
      id: entId,
      name: a.holderName,
      role: a.roleLabel,
      roleBadge,
      roleColor,
      tokens: [
        `${a.bank} ${a.accountMasked}`,
        ...(a.panMasked && a.panMasked !== "NONE" ? [`PAN ${a.panMasked}`] : []),
        ...a.vpas.map((v) => `VPA ${v}`),
        ...(a.deviceImei ? [`IMEI ${a.deviceImei}`] : []),
        ...(a.bssidHotspot ? [`BSSID ${a.bssidHotspot}`] : []),
        ...(a.gstin ? [`GSTIN ${a.gstin}`] : []),
        ...(a.introducerId && introGroups.has(a.introducerId) ? [`Introducer ${a.introducerId}`] : []),
      ],
      fraudScore,
      investigativeLeadStrength: fraudScore,
      riskBand,
      featureContributions: contributions,
      metrics: {
        passThroughRatio: passThrough,
        medianDwellTimeSeconds: a.dwellSeconds ?? 0,
        fanInDegree: a.fanIn,
        fanOutDegree: a.fanOut,
        structuringTransactionCount: a.subThresholdOutCount,
      },
      isHardVeto,
      hardVetoReason,
      summary,
      subScores,
    });

    // ----- raw mentions (one per bound identifier, each tied to the evidence source it came from)
    const badge = a.role === "VICTIM" ? "#4338CA" : a.role === "MERCHANT" ? "#059669" : a.role === "CONDUIT" || a.role === "UNRESOLVED" ? "#B45309" : "#BE123C";
    pushToken({
      source: a.role === "MERCHANT" ? "Merchant POS ledger (T1)" : `${a.bank} CBS (T1)`,
      sourceType: a.role === "MERCHANT" ? "pos" : "cbs",
      label: a.role === "VICTIM" ? "Victim account" : a.role === "SINK" ? "Cash-out terminal" : "Account",
      value: `${a.bank} ${a.accountMasked}`,
      targetEntityId: entId,
      badgeColor: badge,
    });
    a.vpas.forEach((v) =>
      pushToken({ source: "NPCI switch log (T1)", sourceType: "cbs", label: "UPI handle", value: v, targetEntityId: entId, badgeColor: badge })
    );
    if (a.deviceImei)
      pushToken({
        source: "Telecom CGNAT IPDR (T1)",
        sourceType: "cdr",
        label: "Handset IMEI",
        value: a.deviceImei,
        targetEntityId: entId,
        badgeColor: badge,
        aliasReason: sharedDevice > 0 ? `Same handset as ${imeiGroups.get(a.deviceImei)!.filter((x) => x.nodeId !== a.nodeId).map((x) => x.holderName).join(", ")}` : undefined,
      });
    if (a.bssidHotspot)
      pushToken({ source: "Telecom CGNAT IPDR (T1)", sourceType: "cdr", label: "Wi-Fi BSSID", value: a.bssidHotspot, targetEntityId: entId, badgeColor: badge });
    if (a.gstin) pushToken({ source: "GSTN return (T1)", sourceType: "pos", label: "GSTIN", value: a.gstin, targetEntityId: entId, badgeColor: badge });
    if (a.role === "VICTIM" && c.complainant.phone)
      pushToken({
        source: "NCRP 1930 intake (T3)",
        sourceType: whatsappVector ? "whatsapp" : "cbs",
        label: "Complainant mobile",
        value: c.complainant.phone,
        targetEntityId: entId,
        badgeColor: badge,
      });
  });

  // ----- candidate merges (derived, never invented)
  const candidateLinks: CandidateMerge[] = [];
  let linkSeq = 1;
  flows
    .filter((a) => a.role === "MERCHANT")
    .forEach((m) => {
      candidateLinks.push({
        id: `LINK-${String(linkSeq++).padStart(2, "0")}`,
        sourceLabel: `${m.holderName} (commercial record)`,
        sourceValue: `${m.gstin ? `GSTIN ${m.gstin} · ` : ""}${m.bank} ${m.accountMasked}`,
        sourceBadge: "Commercial registry",
        targetEntityId: entityIdOf.get(m.nodeId)!,
        targetName: m.holderName,
        matchScore: 42,
        matchEvidence: [
          `VETOED: commercial account active for ${m.tenureMonths ?? 0} months before the fraud`,
          `VETOED: only the traced ${formatInr(m.inflowInr)} receipt is liened; other turnover is protected`,
        ],
        decision: "REJECTED",
      });
    });
  imeiGroups.forEach((group, imei) => {
    if (group.length < 2) return;
    const [lead, ...rest] = group;
    rest.forEach((other) => {
      const sameBssid = lead.bssidHotspot && lead.bssidHotspot === other.bssidHotspot;
      const sameIntro = lead.introducerId && lead.introducerId === other.introducerId;
      const evidence = [`Same handset IMEI ${imei}`];
      if (sameBssid) evidence.push(`Same Wi-Fi BSSID ${other.bssidHotspot}`);
      if (sameIntro) evidence.push(`Same account introducer ${other.introducerId}`);
      candidateLinks.push({
        id: `LINK-${String(linkSeq++).padStart(2, "0")}`,
        sourceLabel: `${other.holderName} (${other.bank})`,
        sourceValue: `IMEI ${imei}`,
        sourceBadge: "Telecom IPDR",
        targetEntityId: entityIdOf.get(lead.nodeId)!,
        targetName: lead.holderName,
        matchScore: clamp(70 + (sameBssid ? 15 : 0) + (sameIntro ? 10 : 0)),
        matchEvidence: evidence,
        decision: "PROPOSED",
      });
    });
  });

  return { entities, tokens, candidateLinks, vetoedCount: candidateLinks.filter((l) => l.decision === "REJECTED").length };
}

/** Plain-language fraud vector facts for the People screen. */
export interface CaseVectors {
  typologyLabel: string;
  vectors: string[];
}

export function selectCaseVectors(c: CanonicalCaseFixture): CaseVectors {
  const vectors = c.timelineEvents.filter((e) => e.severity === "ALERT").map((e) => e.title);
  return { typologyLabel: TYPOLOGY_LABELS[c.typology] ?? c.typology, vectors };
}

/* ------------------------------------------------------------------ */
/* Device / SIM facts                                                  */
/* ------------------------------------------------------------------ */

export interface DeviceFact {
  imei: string;
  tac: string;
  luhnValid: boolean;
  accountNames: string[];
  txCount: number;
  firstSeenIst: string;
  lastSeenIst: string;
}

export interface SessionFact {
  txId: string;
  timestampIst: string;
  accountName: string;
  imei?: string;
  ip?: string;
  port?: number;
  ja4?: string;
  bssid?: string;
  rail: string;
}

export interface DeviceFacts {
  devices: DeviceFact[];
  sessions: SessionFact[];
  publicIps: { ip: string; ports: number[]; sessionCount: number }[];
  ja4s: string[];
  bssids: string[];
  /** Timeline events that relate to SIM / telecom activity (empty when the case has none). */
  simEvents: { timestampIst: string; title: string; detail: string }[];
  /** Minutes between the earliest SIM/telecom event and the first fraudulent debit (null if unknown). */
  simSwapLeadMins: number | null;
  firstDebitIst: string | null;
  hasDeviceEvidence: boolean;
}

export function luhnValid(digits: string): boolean {
  if (!/^\d{15}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(digits[14 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function selectDeviceFacts(c: CanonicalCaseFixture): DeviceFacts {
  const txns = c.transactions.filter((t) => t.deviceImei || t.clientIp || t.ja4Tls || t.bssidMac).sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  const imeis = new Map<string, DeviceFact>();
  txns.forEach((t) => {
    if (!t.deviceImei) return;
    const prev = imeis.get(t.deviceImei);
    const names = new Set(prev?.accountNames ?? []);
    names.add(t.fromName);
    if (prev) {
      prev.txCount += 1;
      prev.lastSeenIst = t.timestampIst;
      prev.accountNames = [...names];
    } else {
      imeis.set(t.deviceImei, {
        imei: t.deviceImei,
        tac: t.deviceImei.slice(0, 8),
        luhnValid: luhnValid(t.deviceImei),
        accountNames: [...names],
        txCount: 1,
        firstSeenIst: t.timestampIst,
        lastSeenIst: t.timestampIst,
      });
    }
  });
  // devices are also bound to the mule accounts directly
  c.accounts.forEach((a) => {
    if (a.deviceImei && !imeis.has(a.deviceImei))
      imeis.set(a.deviceImei, { imei: a.deviceImei, tac: a.deviceImei.slice(0, 8), luhnValid: luhnValid(a.deviceImei), accountNames: [a.holderName], txCount: 0, firstSeenIst: "", lastSeenIst: "" });
    else if (a.deviceImei) {
      const d = imeis.get(a.deviceImei)!;
      if (!d.accountNames.includes(a.holderName)) d.accountNames.push(a.holderName);
    }
  });

  const ipMap = new Map<string, { ports: Set<number>; n: number }>();
  txns.forEach((t) => {
    if (!t.clientIp) return;
    const e = ipMap.get(t.clientIp) ?? { ports: new Set<number>(), n: 0 };
    if (t.clientPort) e.ports.add(t.clientPort);
    e.n += 1;
    ipMap.set(t.clientIp, e);
  });

  const simRe = /sim.?swap|imsi|hlr|telco|cgnat/i;
  const simEvents = c.timelineEvents
    .filter((e) => simRe.test(e.track) || simRe.test(e.title))
    .map((e) => ({ timestampIst: e.timestampIst, title: e.title, detail: e.detail, utc: e.timestampUtc }));
  const firstDebit = c.transactions.filter((t) => t.category === "VICTIM_DRAIN").sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))[0];
  let lead: number | null = null;
  const preDebit = simEvents.filter((e) => firstDebit && e.utc < firstDebit.timestampUtc);
  if (firstDebit && preDebit.length) lead = Math.round((Date.parse(firstDebit.timestampUtc) - Date.parse(preDebit[0].utc)) / 60000);

  const sessions: SessionFact[] = txns.map((t) => ({
    txId: t.id,
    timestampIst: t.timestampIst,
    accountName: t.fromName,
    imei: t.deviceImei,
    ip: t.clientIp,
    port: t.clientPort,
    ja4: t.ja4Tls,
    bssid: t.bssidMac,
    rail: t.paymentRail,
  }));

  const devices = [...imeis.values()];
  return {
    devices,
    sessions,
    publicIps: [...ipMap.entries()].map(([ip, v]) => ({ ip, ports: [...v.ports].sort((a, b) => a - b), sessionCount: v.n })),
    ja4s: [...new Set(txns.map((t) => t.ja4Tls).filter((x): x is string => !!x))],
    bssids: [...new Set([...txns.map((t) => t.bssidMac), ...c.accounts.map((a) => a.bssidHotspot)].filter((x): x is string => !!x))],
    simEvents: simEvents.map(({ utc: _utc, ...rest }) => rest),
    simSwapLeadMins: lead,
    firstDebitIst: firstDebit?.timestampIst ?? null,
    hasDeviceEvidence: devices.length > 0 || sessions.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Freeze actions & notices                                            */
/* ------------------------------------------------------------------ */

export interface FreezeAction {
  nodeId: string;
  holderName: string;
  bank: string;
  accountMasked: string;
  ifsc: string;
  kind: "MULE_HOLD" | "MERCHANT_LIEN" | "CASHOUT_REQUISITION";
  measure: string;
  /** Amount received from the stolen funds. */
  receivedInr: number;
  /** Amount to freeze or lien. */
  amountInr: number;
}

export function selectFreezeActions(c: CanonicalCaseFixture): FreezeAction[] {
  const out: FreezeAction[] = [];
  for (const a of selectAccountFlows(c)) {
    if (a.role === "MERCHANT" && a.frozenInr > 0) {
      out.push({ nodeId: a.nodeId, holderName: a.holderName, bank: a.bank, accountMasked: a.accountMasked, ifsc: a.ifsc, kind: "MERCHANT_LIEN", measure: "§106(1) BNSS specific lien (LIBR)", receivedInr: a.inflowInr, amountInr: a.frozenInr });
    } else if ((a.role === "MULE" || a.role === "CONDUIT" || a.role === "UNRESOLVED") && (a.frozenInr > 0 || a.inflowInr > 0)) {
      out.push({ nodeId: a.nodeId, holderName: a.holderName, bank: a.bank, accountMasked: a.accountMasked, ifsc: a.ifsc, kind: "MULE_HOLD", measure: "§107 BNSS attachment", receivedInr: a.inflowInr, amountInr: a.frozenInr });
    } else if (a.role === "SINK") {
      out.push({ nodeId: a.nodeId, holderName: a.holderName, bank: a.bank, accountMasked: a.accountMasked, ifsc: a.ifsc, kind: "CASHOUT_REQUISITION", measure: "CCTV and terminal journal requisition", receivedInr: a.inflowInr, amountInr: a.inflowInr });
    }
  }
  return out;
}

export interface LedgerFacts {
  firstDrainRrn: string | null;
  firstDrainIst: string | null;
  firstDrainUtc: string | null;
  julianDay: number | null;
  stan: string | null;
  victimBank: string;
  acquirerBank: string | null;
  acquirerVpa: string | null;
  acquirerName: string | null;
  drainTxCount: number;
  receiptLabel: string;
  receiptNote: string;
}

function dayOfYear(utc: string): number {
  const d = new Date(utc);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
}

export function selectLedgerFacts(c: CanonicalCaseFixture): LedgerFacts {
  const drains = c.transactions.filter((t) => t.category === "VICTIM_DRAIN").sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  const first = drains[0];
  const acquirer = first ? c.accounts.find((a) => a.accountNumber === first.toAccount || a.holderName === first.toName) : undefined;
  const digits = first ? first.rrn.replace(/\D/g, "") : "";
  return {
    firstDrainRrn: first?.rrn ?? null,
    firstDrainIst: first?.timestampIst ?? null,
    firstDrainUtc: first?.timestampUtc ?? null,
    julianDay: first ? dayOfYear(first.timestampUtc) : null,
    stan: digits ? digits.slice(-6) : null,
    victimBank: c.complainant.bank,
    acquirerBank: acquirer?.bank ?? null,
    acquirerVpa: first?.toVpa ?? null,
    acquirerName: first?.toName ?? null,
    drainTxCount: drains.length,
    receiptLabel: c.receiptClaim.label,
    receiptNote: c.receiptClaim.discrepancyNote,
  };
}

/* ------------------------------------------------------------------ */
/* Syndicate (cross-case) links                                        */
/* ------------------------------------------------------------------ */

export interface SyndicateSummary {
  linkedCaseIds: string[];
  anchors: { linkedCaseId: string; type: string; value: string }[];
  /** This case plus every distinct linked case that exists in the portfolio. */
  combinedExposureInr: number;
  combinedCases: { caseId: string; policeStation: string; bookedLossInr: number }[];
}

export function selectSyndicate(c: CanonicalCaseFixture): SyndicateSummary {
  const linkedIds = [...new Set(c.syndicateLinks.map((l) => l.linkedCaseId))];
  const combined = [c, ...linkedIds.map((id) => resolveCase(id)).filter((x): x is CanonicalCaseFixture => !!x)].map((x) => ({
    caseId: x.caseId,
    policeStation: x.policeStation,
    bookedLossInr: x.financials.bookedLossInr,
  }));
  return {
    linkedCaseIds: linkedIds,
    anchors: c.syndicateLinks.map((l) => ({ linkedCaseId: l.linkedCaseId, type: l.sharedAnchorType, value: l.sharedAnchorValue })),
    combinedExposureInr: combined.reduce((s, x) => s + x.bookedLossInr, 0),
    combinedCases: combined,
  };
}

/* ------------------------------------------------------------------ */
/* Home / case card                                                    */
/* ------------------------------------------------------------------ */

export interface CaseCardSummary {
  caseId: string;
  title: string;
  victimName: string;
  typologyLabel: string;
  bookedLossInr: number;
  recoverableInr: number;
  goldenHourMins: number;
  goldenHourState: "ACTIVE" | "EXPIRED";
  evidenceCount: number;
  accountCount: number;
  lastEventIst: string | null;
  stage: string;
}

const STAGE_LABEL: Record<CanonicalCaseFixture["currentStage"], string> = {
  intake: "Stage 1 of 4 · Evidence intake",
  attribution: "Stage 2 of 4 · Attribution",
  network: "Stage 3 of 4 · Network clustering",
  "court-proof": "Stage 4 of 4 · Court proof",
};

export function selectCaseCard(c: CanonicalCaseFixture): CaseCardSummary {
  const fin = selectFinancialSummary(c);
  const last = c.timelineEvents.slice().sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc))[0];
  return {
    caseId: c.caseId,
    title: c.title,
    victimName: c.complainant.name,
    typologyLabel: TYPOLOGY_LABELS[c.typology] ?? c.typology,
    bookedLossInr: fin.bookedLossInr,
    recoverableInr: fin.recoverableInr,
    goldenHourMins: fin.goldenHourRemainingMins,
    goldenHourState: fin.goldenHourState,
    evidenceCount: c.transactions.length,
    accountCount: c.accounts.length,
    lastEventIst: last?.timestampIst ?? null,
    stage: STAGE_LABEL[c.currentStage],
  };
}

export interface RecentActivityItem {
  caseId: string;
  title: string;
  detail: string;
  timestampIst: string;
  severity: string;
}

/** Latest timeline events across the given cases (newest first). */
export function selectRecentActivity(cases: CanonicalCaseFixture[], limit = 5): RecentActivityItem[] {
  return cases
    .flatMap((c) => c.timelineEvents.map((e) => ({ c, e })))
    .sort((a, b) => b.e.timestampUtc.localeCompare(a.e.timestampUtc))
    .slice(0, limit)
    .map(({ c, e }) => ({ caseId: c.caseId, title: e.title, detail: e.detail, timestampIst: e.timestampIst, severity: e.severity }));
}

/** Human summary used by notice templates. */
export function selectNoticeContext(c: CanonicalCaseFixture) {
  const groups = selectAccountGroups(c);
  const ledger = selectLedgerFacts(c);
  const devices = selectDeviceFacts(c);
  return {
    fir: c.firNumber,
    station: c.policeStation,
    complainant: c.complainant,
    freezeActions: selectFreezeActions(c),
    primaryDevice: devices.devices[0] ?? null,
    bssid: devices.bssids[0] ?? null,
    publicIp: devices.publicIps[0] ?? null,
    ledger,
    leadMule: groups.mules[0] ?? groups.conduits[0] ?? null,
    syndicate: selectSyndicate(c),
  };
}

/* ------------------------------------------------------------------ */
/* Source rows behind each money figure (click-to-trace)               */
/* ------------------------------------------------------------------ */

/** One transaction row behind a figure. `amountInr` is signed: debits out of a held account are negative. */
export interface MoneyRow {
  id: string;
  caseId: string;
  dateIst: string;
  from: string;
  to: string;
  amountInr: number;
  reference: string;
  sourceFile: string;
  /** Row in `sourceFile`; for case-record rows this is the record's sequence number. */
  sourceRow: number | null;
}

/** A figure as shown on screen plus the rows that make it up. `totalInr` is the figure itself, never re-derived from rows. */
export interface MoneyFigure {
  label: string;
  totalInr: number;
  rows: MoneyRow[];
}

export type MoneyFigureKey = "loss" | "recoverable" | "frozen" | "cashout" | "shielded";

const FIGURE_LABEL: Record<MoneyFigureKey, string> = {
  loss: "Money taken from the victim",
  recoverable: "Money that can be recovered",
  frozen: "Money held in suspect accounts",
  cashout: "Money already withdrawn as cash",
  shielded: "Money in an innocent merchant's account",
};

export function toMoneyRow(c: CanonicalCaseFixture, t: CanonicalCaseTransaction, sign: 1 | -1 = 1): MoneyRow {
  return {
    id: `${c.caseId}:${t.id}${sign < 0 ? ":out" : ""}`,
    caseId: c.caseId,
    dateIst: t.timestampIst,
    from: t.fromName,
    to: t.toName,
    amountInr: sign * t.amount,
    reference: t.rrn ? `${t.paymentRail} ${t.rrn}` : t.particulars,
    sourceFile: t.sourceFile ?? "Case record",
    sourceRow: t.sourceRow ?? t.sequenceNo,
  };
}

/** Credits in (+) and debits out (−) of the given accounts: they add up to what each still holds. */
function heldRows(c: CanonicalCaseFixture, accs: CanonicalCaseAccount[]): MoneyRow[] {
  const rows: MoneyRow[] = [];
  for (const t of byTime(trailTxns(c))) {
    const into = accs.some((a) => matchesAccount(a, t.toAccount, t.toName));
    const outOf = accs.some((a) => matchesAccount(a, t.fromAccount, t.fromName));
    if (into && outOf) continue; // moved between two of these accounts: nets to zero, would only add noise
    if (into) rows.push(toMoneyRow(c, t, 1));
    if (outOf) rows.push(toMoneyRow(c, t, -1));
  }
  return rows;
}

const byTime = (txns: CanonicalCaseTransaction[]) => txns.slice().sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));

/** The rows behind one case-level figure. Totals come from selectFinancialSummary so screens and sheet show the same number. */
export function selectMoneyFigure(c: CanonicalCaseFixture, key: MoneyFigureKey): MoneyFigure {
  const fin = selectFinancialSummary(c);
  const frozenAccs = c.accounts.filter((a) => a.frozenBalance > 0 && a.holderType !== "BONA_FIDE_MERCHANT");
  const merchants = c.accounts.filter((a) => a.holderType === "BONA_FIDE_MERCHANT");
  const ofCategory = (cat: CanonicalCaseTransaction["category"]) => byTime(c.transactions).filter((t) => t.category === cat).map((t) => toMoneyRow(c, t));
  const rows: Record<MoneyFigureKey, () => MoneyRow[]> = {
    loss: () => ofCategory("VICTIM_DRAIN"),
    cashout: () => ofCategory("ATM_CASHOUT"),
    frozen: () => heldRows(c, frozenAccs),
    shielded: () => heldRows(c, merchants),
    recoverable: () => heldRows(c, [...frozenAccs, ...merchants]),
  };
  const total: Record<MoneyFigureKey, number> = {
    loss: fin.bookedLossInr,
    recoverable: fin.recoverableInr,
    frozen: fin.frozenMuleInr,
    cashout: fin.unrecoverableCashoutInr,
    shielded: fin.shieldedCommercialInr,
  };
  return { label: FIGURE_LABEL[key], totalInr: total[key], rows: rows[key]() };
}

/** Money into, out of, or still held by one account. */
export function selectAccountMoneyFigure(c: CanonicalCaseFixture, nodeId: string, kind: "inflow" | "outflow" | "held"): MoneyFigure | null {
  const acc = c.accounts.find((a) => a.nodeId === nodeId);
  const flow = selectAccountFlows(c).find((a) => a.nodeId === nodeId);
  if (!acc || !flow) return null;
  const all = heldRows(c, [acc]);
  const rows = kind === "inflow" ? all.filter((r) => r.amountInr > 0) : kind === "outflow" ? all.filter((r) => r.amountInr < 0).map((r) => ({ ...r, amountInr: -r.amountInr })) : all;
  const totalInr = kind === "inflow" ? flow.inflowInr : kind === "outflow" ? flow.outflowInr : flow.inflowInr - flow.outflowInr;
  const label = `${kind === "inflow" ? "Money into" : kind === "outflow" ? "Money out of" : "Money still in"} ${acc.holderName}`;
  return { label, totalInr, rows };
}

/** Same figure summed over several cases; each row keeps its case id. `totalInr` is the sum of per-case totals. */
export function selectPortfolioMoneyFigure(cases: CanonicalCaseFixture[], key: MoneyFigureKey, label?: string): MoneyFigure {
  const figs = cases.map((c) => selectMoneyFigure(c, key));
  return {
    label: label ?? `${FIGURE_LABEL[key]} (all cases)`,
    totalInr: figs.reduce((s, f) => s + f.totalInr, 0),
    rows: figs.flatMap((f) => f.rows),
  };
}

export const sumMoneyRows = (rows: MoneyRow[]): number => rows.reduce((s, r) => s + r.amountInr, 0);

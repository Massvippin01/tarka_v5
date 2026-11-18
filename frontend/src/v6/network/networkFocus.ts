/**
 * Pure selectors for the Fraud Network page: zoom focus (URL), network status, totals, cross-case
 * badges, the source rows behind each figure, and demo-fixture cases shown as a network. No I/O.
 */
import { selectAccountFlows, selectFinancialSummary, toMoneyRow, type MoneyFigure } from '../../selectors/caseSelectors';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import type { CrossCaseHit, FraudNetwork, MemberRole, NetworkMember } from '../triage/triage';

/* ---------- zoom focus ---------- */

export type Zoom = 'project' | 'network' | 'account';
export interface Focus {
  net: string | null;
  acct: string | null;
}

export const parseFocus = (search: string): Focus => {
  const p = new URLSearchParams(search);
  return { net: p.get('net'), acct: p.get('acct') };
};

/** Same URL with the focus replaced; other params (view, case, …) kept. */
export function focusSearch(search: string, f: Focus): string {
  const p = new URLSearchParams(search);
  for (const [k, v] of [['net', f.net], ['acct', f.acct]] as const) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Resolve the URL focus against the loaded networks; unknown ids fall back one level. */
export function resolveFocus(networks: FraudNetwork[], f: Focus): { zoom: Zoom; network?: FraudNetwork; member?: NetworkMember } {
  // A single network has nothing to choose between: open it. An account alone (e.g. a link from another case) opens its network.
  const network =
    networks.find((n) => n.network_id === f.net) ??
    (f.acct && !f.net ? networks.find((n) => n.members.some((m) => m.id === f.acct)) : undefined) ??
    (networks.length === 1 ? networks[0] : undefined);
  if (!network) return { zoom: 'project' };
  const member = f.acct ? network.members.find((m) => m.id === f.acct) : undefined;
  return member ? { zoom: 'account', network, member } : { zoom: 'network', network };
}

/* ---------- status ---------- */

export type NetworkStatus = 'NEW' | 'UNDER_REVIEW' | 'CASE_OPENED' | 'FREEZES_SENT' | 'CLOSED';
export type NetworkDecisionKind = 'INVESTIGATE' | 'MAKE_CASE' | 'MERGE_FIR' | 'DISMISS';

export interface NetworkTriage {
  network_id: string;
  status: NetworkStatus;
  decision: NetworkDecisionKind | null;
  reason: string | null;
  target_case_id: string | null;
  updated_by: string | null;
  updated_at: number | null;
}

export const STATUS_META: Record<NetworkStatus, { label: string; token: string; hint: string }> = {
  NEW: { label: 'New', token: '--fg-3', hint: 'Found by TARKA; nobody has looked at it yet.' },
  UNDER_REVIEW: { label: 'Under review', token: '--urgent', hint: 'An investigator is checking whether this is a real gang.' },
  CASE_OPENED: { label: 'Case opened', token: '--flow', hint: 'Turned into its own case or merged into an existing FIR.' },
  FREEZES_SENT: { label: 'Freezes sent', token: '--accent', hint: 'Debit-freeze notices (BNSS §106/§107) have gone to the banks.' },
  CLOSED: { label: 'Closed', token: '--line-2', hint: 'Dismissed or finished; see the reason.' },
};
export const STATUS_ORDER = Object.keys(STATUS_META) as NetworkStatus[];

export const statusOf = (n: FraudNetwork & { triage?: NetworkTriage }): NetworkStatus => n.triage?.status ?? 'NEW';

/* ---------- totals (from the server's per-network split; screens never re-derive them) ---------- */

export interface NetworkMoney {
  amount_inr: number;
  cashed_out_inr?: number;
  recoverable_inr?: number;
  unaccounted_inr?: number;
}

export interface NetworkTotals {
  networks: number;
  accounts: number;
  mules: number;
  victims: number;
  paidIn: number;
  cashedOut: number;
  recoverable: number;
  unaccounted: number;
}

export function networkTotals(networks: (FraudNetwork & NetworkMoney)[]): NetworkTotals {
  const t: NetworkTotals = { networks: 0, accounts: 0, mules: 0, victims: 0, paidIn: 0, cashedOut: 0, recoverable: 0, unaccounted: 0 };
  for (const n of networks) {
    t.networks++;
    t.accounts += n.member_count || 0;
    t.mules += n.mule_count || 0;
    t.victims += n.victim_count || 0;
    t.paidIn += n.amount_inr || 0;
    t.cashedOut += n.cashed_out_inr || 0;
    t.recoverable += n.recoverable_inr || 0;
    t.unaccounted += n.unaccounted_inr || 0;
  }
  return t;
}

/* ---------- hubs and cross-case badges ---------- */

/** ATMs, crypto desks, merchants: everyone's money passes through them, so they say little about the gang. */
export const isHub = (m: Pick<NetworkMember, 'role'>) => m.role === 'CASH_OUT' || m.role === 'UNKNOWN';

/** Other FIRs/cases each member's identifiers appear in (the server already hides cases the user can't see). */
export function crossCaseByMember(members: NetworkMember[], hits: CrossCaseHit[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!hits.length) return out;
  for (const m of members) {
    const label = m.label.toLowerCase();
    const cases = new Set<string>();
    for (const h of hits) if (label.includes(h.identifier.toLowerCase())) h.case_ids.forEach((c) => cases.add(c));
    if (cases.size) out.set(m.id, [...cases].sort());
  }
  return out;
}

export const crossCaseText = (n: number) => `Also in ${n} other FIR${n === 1 ? '' : 's'}`;

/* ---------- source rows behind each figure ---------- */

export type NetworkFigureKey = 'paidIn' | 'cashedOut' | 'recoverable';
export type MemberFigureKey = 'in' | 'out' | 'held';

const label = (m: NetworkMember) => m.label;

/** Rows behind a network figure; the total is the server's number, so a gap shows up in the sheet's "adds up to" check. */
export function networkFigure(c: CanonicalCaseFixture, n: FraudNetwork & NetworkMoney, key: NetworkFigureKey): MoneyFigure {
  const victims = new Set(n.members.filter((m) => m.role === 'VICTIM').map(label));
  const cashOut = new Set(n.members.filter((m) => m.role === 'CASH_OUT').map(label));
  const mules = new Set(n.members.filter((m) => m.role === 'MULE').map(label));
  const inNet = new Set(n.members.map(label));
  const txns = c.transactions.filter((t) => t.category !== 'SALARY_CREDIT').sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  if (key === 'paidIn')
    return {
      label: `Paid by victims into ${n.network_id}`,
      totalInr: n.amount_inr || 0,
      rows: txns.filter((t) => victims.has(t.fromName) && inNet.has(t.toName) && !victims.has(t.toName)).map((t) => toMoneyRow(c, t)),
    };
  if (key === 'cashedOut')
    return {
      label: `Cashed out of ${n.network_id}`,
      totalInr: n.cashed_out_inr || 0,
      rows: txns.filter((t) => cashOut.has(t.toName) && !cashOut.has(t.fromName)).map((t) => toMoneyRow(c, t)),
    };
  // still in the mules: their credits in (+) and debits out (−), skipping mule-to-mule moves that net to zero
  const rows = txns.flatMap((t) => {
    const into = mules.has(t.toName);
    const outOf = mules.has(t.fromName);
    if (into && outOf) return [];
    return into ? [toMoneyRow(c, t, 1)] : outOf ? [toMoneyRow(c, t, -1)] : [];
  });
  return { label: `Still in ${n.network_id}'s mule accounts`, totalInr: n.recoverable_inr || 0, rows };
}

export function memberFigure(c: CanonicalCaseFixture, m: NetworkMember & { held_inr?: number }, key: MemberFigureKey): MoneyFigure {
  const txns = c.transactions.filter((t) => t.category !== 'SALARY_CREDIT').sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  const ins = txns.filter((t) => t.toName === m.label && t.fromName !== m.label);
  const outs = txns.filter((t) => t.fromName === m.label && t.toName !== m.label);
  const sum = (ts: typeof txns) => ts.reduce((s, t) => s + t.amount, 0);
  if (key === 'in') return { label: `Money into ${m.label}`, totalInr: sum(ins), rows: ins.map((t) => toMoneyRow(c, t)) };
  if (key === 'out') return { label: `Money out of ${m.label}`, totalInr: sum(outs), rows: outs.map((t) => toMoneyRow(c, t)) };
  return {
    label: `Still in ${m.label}`,
    // server figure when present (it sees every row, the bundle only rows touching mules)
    totalInr: m.held_inr ?? Math.max(0, sum(ins) - sum(outs)),
    rows: [...ins.map((t) => toMoneyRow(c, t, 1)), ...outs.map((t) => toMoneyRow(c, t, -1))].sort((a, b) => a.dateIst.localeCompare(b.dateIst)),
  };
}

/* ---------- demo fixtures (no uploads) shown as one network ---------- */

const FIXTURE_ROLE: Record<string, { role: MemberRole; hop: number }> = {
  VICTIM: { role: 'VICTIM', hop: 0 },
  MULE: { role: 'MULE', hop: 1 },
  CONDUIT: { role: 'MULE', hop: 2 },
  UNRESOLVED: { role: 'MULE', hop: 2 },
  SINK: { role: 'CASH_OUT', hop: 3 },
  MERCHANT: { role: 'UNKNOWN', hop: 3 },
};

/**
 * A case record with no uploaded statements (the demo fixtures) as one network, using the case's own
 * roles and money summary so the figures equal the Money screen's. Returns [] when it names no suspect.
 * Mule heat is the case record's classification (1 = named as a mule/conduit), not a computed score.
 */
export function fixtureNetworks(c: CanonicalCaseFixture): (FraudNetwork & NetworkMoney)[] {
  const flows = selectAccountFlows(c);
  if (!flows.some((a) => ['MULE', 'CONDUIT', 'UNRESOLVED'].includes(a.role))) return [];
  const fin = selectFinancialSummary(c);
  const members = flows.map((a) => {
    const r = FIXTURE_ROLE[a.role] ?? { role: 'UNKNOWN' as MemberRole, hop: 3 };
    return {
      id: a.nodeId,
      label: a.holderName,
      kind: 'account',
      role: r.role,
      mule_score: r.role === 'MULE' ? (a.role === 'UNRESOLVED' ? 0.5 : 1) : 0,
      hop: r.hop,
      why: `From the case record: ${a.roleLabel.toLowerCase()} at ${a.bank} (${a.accountMasked}).`,
      held_inr: a.heldInr,
    };
  });
  const byName = new Map(flows.map((a) => [a.holderName, a.nodeId]));
  const sums = new Map<string, number>();
  for (const t of c.transactions) {
    if (t.category === 'SALARY_CREDIT') continue;
    const a = byName.get(t.fromName);
    const b = byName.get(t.toName);
    if (a && b && a !== b) sums.set(`${a}\u0000${b}`, (sums.get(`${a}\u0000${b}`) ?? 0) + t.amount);
  }
  return [
    {
      network_id: c.caseId,
      member_count: members.length,
      mule_count: members.filter((m) => m.role === 'MULE').length,
      victim_count: members.filter((m) => m.role === 'VICTIM').length,
      amount_inr: fin.bookedLossInr,
      cashed_out_inr: fin.unrecoverableCashoutInr,
      recoverable_inr: fin.recoverableInr,
      unaccounted_inr: fin.unaccountedInr,
      members,
      links: [...sums].map(([k, v]) => [...(k.split('\u0000') as [string, string]), v]),
    },
  ];
}

/* ---------- links to other cases ---------- */

/** Plain name for an identifier kind; the technical term goes in the tooltip. */
export const ID_KIND: Record<string, { label: string; tip?: string }> = {
  vpa: { label: 'UPI ID' },
  phone: { label: 'phone number' },
  account: { label: 'bank account' },
  ifsc: { label: 'bank branch', tip: 'IFSC code' },
  bssid: { label: 'Wi-Fi router', tip: 'BSSID: hardware address of the Wi-Fi access point' },
  ja4: { label: 'app / browser fingerprint', tip: 'JA4: TLS client fingerprint seen in bank sessions' },
};
export const idKindLabel = (k: string) => ID_KIND[k]?.label ?? k;

export interface CaseLink {
  caseId: string;
  items: { identifier: string; kind: string; member?: NetworkMember }[];
}

/**
 * Other cases sharing identifiers with these members, biggest overlap first. Server hits only count when they belong
 * to a member in scope; case-record links (`network-wide`) describe the whole network and always count.
 */
export function crossCaseLinks(members: NetworkMember[], hits: (CrossCaseHit & { networkWide?: boolean })[]): CaseLink[] {
  const by = new Map<string, CaseLink>();
  for (const h of hits) {
    const id = h.identifier.toLowerCase();
    const member = members.find((m) => m.label.toLowerCase().includes(id));
    if (!member && !h.networkWide) continue;
    for (const c of h.case_ids) {
      const link = by.get(c) ?? by.set(c, { caseId: c, items: [] }).get(c)!;
      if (!link.items.some((x) => x.identifier === h.identifier)) link.items.push({ identifier: h.identifier, kind: h.kind, member });
    }
  }
  return [...by.values()].sort((a, b) => b.items.length - a.items.length || a.caseId.localeCompare(b.caseId));
}

const ANCHOR_KIND: Record<string, string> = { WIFI_BSSID: 'bssid', JA4_TLS: 'ja4' };

/** A demo case record's own links to other cases (shared Wi-Fi / app fingerprint), as network-wide hits. */
export function fixtureCaseHits(c: CanonicalCaseFixture): (CrossCaseHit & { networkWide: true })[] {
  return (c.syndicateLinks ?? []).map((l) => ({
    identifier: l.sharedAnchorValue,
    kind: ANCHOR_KIND[l.sharedAnchorType] ?? l.sharedAnchorType.toLowerCase(),
    case_ids: [l.linkedCaseId],
    networkWide: true as const,
  }));
}

/** "shares 6 UPI IDs and 1 phone number with" */
export function linkSentence(l: CaseLink): string {
  const counts = new Map<string, number>();
  for (const i of l.items) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => `${n.toLocaleString('en-IN')} ${idKindLabel(k)}${n === 1 ? '' : 's'}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? '';
}

/** Pure helpers for Inbox (Act now inbox) and ⌘K identifier search. No I/O here. */
import { formatInr } from '../../lib/formatInr';
import type { FraudNetwork, NetworksResponse } from '../triage/triage';
import { intakeLabel } from '../intake/intake';
import type { MoneyFigure } from '../../selectors/caseSelectors';

export interface DeskJob {
  job_id: string;
  filename: string;
  stage: string;
  is_cancelled?: boolean;
}

/** Everything the desk knows about one case the user can access. `networks` is undefined until loaded. */
export interface DeskCase {
  caseId: string;
  lifecycle?: string | null;
  jobs?: DeskJob[];
  networks?: NetworksResponse;
}

export type DeskUrgency = 'high' | 'medium' | 'low';
export type DeskKind = 'intake' | 'action' | 'unsplit' | 'cross' | 'identity' | 'mapping' | 'duplicate';

export interface DeskItem {
  id: string;
  kind: DeskKind;
  caseId: string;
  title: string;
  detail: string;
  /** v6 view the item opens, with the case set. */
  view: string;
  amount: number;
  /** How soon it needs you: drives the order of the list. */
  urgency: DeskUrgency;
  /** Rows behind `amount`, when the item has one. */
  figure?: MoneyFigure;
}

const URGENCY_RANK: Record<DeskUrgency, number> = { high: 0, medium: 1, low: 2 };
/** Big money still sitting in an unsplit gang, or a case waiting for its notices, can't wait; duplicates can. */
const BIG_INR = 10_00_000;
export function urgencyOf(kind: DeskKind, amount: number): DeskUrgency {
  if (kind === 'action') return 'high';
  if (kind === 'unsplit') return amount >= BIG_INR ? 'high' : 'medium';
  return kind === 'duplicate' ? 'low' : 'medium';
}

const ORDER: DeskKind[] = ['intake', 'action', 'unsplit', 'cross', 'identity', 'mapping', 'duplicate'];
const n = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-IN')} ${count === 1 ? one : many}`;
const names = (xs: string[], max = 3) => xs.slice(0, max).join(', ') + (xs.length > max ? ` and ${xs.length - max} more` : '');

export function buildDeskItems(cases: DeskCase[]): DeskItem[] {
  const items: Omit<DeskItem, 'urgency'>[] = [];
  const crossPairs = new Set<string>(); // "C1|C2" shown once, not again from C2's side
  for (const c of cases) {
    const id = c.caseId;
    if (c.lifecycle === 'ACTION_PENDING') {
      items.push({ id: `${id}:action`, kind: 'action', caseId: id, view: 'actions', amount: 0,
        title: `${id} is waiting for action`, detail: 'Marked "Action pending" — send the freeze or data requests.' });
    }
    const live = (c.jobs ?? []).filter((j) => !j.is_cancelled);
    const mapping = live.filter((j) => j.stage === 'NEEDS_MAPPING');
    if (mapping.length) {
      items.push({ id: `${id}:mapping`, kind: 'mapping', caseId: id, view: 'upload', amount: 0,
        title: `${n(mapping.length, 'file')} in ${id} ${mapping.length === 1 ? 'needs its' : 'need their'} columns matched`,
        detail: names(mapping.map((j) => j.filename)) });
    }
    const dups = live.filter((j) => j.stage === 'DUPLICATE');
    if (dups.length) {
      items.push({ id: `${id}:duplicate`, kind: 'duplicate', caseId: id, view: 'upload', amount: 0,
        title: `${n(dups.length, 'file')} in ${id} ${dups.length === 1 ? 'was' : 'were'} already uploaded`,
        detail: `Check and remove: ${names(dups.map((j) => j.filename))}` });
    }
    const net = c.networks;
    if (!net) continue;
    const label = intakeLabel(net.networks);
    if (label) {
      items.push({ id: `${id}:intake`, kind: 'intake', caseId: id, view: 'triage', amount: 0, title: label,
        detail: `Bulk upload in ${id} — confirm, edit or dismiss each proposed case.` });
    }
    const hitIds = new Set(net.cross_case_hits.map((h) => h.identifier));
    for (const nw of net.networks) {
      if (nw.proposal) continue; // holding-case gangs are covered by the intake item
      const mules = nw.members.filter((m) => m.role === 'MULE');
      // shortcut: the API has no "split" flag; a network counts as split once every mule already shows up in another case.
      if (!nw.mule_count || (mules.length && mules.every((m) => hitIds.has(m.id)))) continue;
      items.push({ id: `${id}:net:${nw.network_id}`, kind: 'unsplit', caseId: id, view: 'triage', amount: nw.amount_inr || 0,
        figure: networkVictimFigure(id, nw),
        title: `${n(nw.mule_count, 'suspected mule')} in ${id}, ${formatInr(nw.amount_inr || 0, { compact: true })} — not yet its own case`,
        detail: `Network ${nw.network_id}: ${n(nw.member_count, 'account')}, ${n(nw.victim_count, 'victim')}` });
    }
    const others = [...new Set(net.cross_case_hits.flatMap((h) => h.case_ids))].filter((x) => x !== id);
    const pair = [id, ...others].sort().join('|');
    if (others.length && !crossPairs.has(pair)) {
      crossPairs.add(pair);
      items.push({ id: `${id}:cross`, kind: 'cross', caseId: id, view: 'triage', amount: 0,
        title: `${n(net.cross_case_hits.length, 'identifier')} in ${id} also ${net.cross_case_hits.length === 1 ? 'appears' : 'appear'} in ${names(others)}`,
        detail: names(net.cross_case_hits.map((h) => h.identifier)) });
    }
    if (net.review_queue.length) {
      items.push({ id: `${id}:identity`, kind: 'identity', caseId: id, view: 'triage', amount: 0,
        title: `${n(net.review_queue.length, 'possible same-person match', 'possible same-person matches')} in ${id} to confirm`,
        detail: net.review_queue.slice(0, 2).map((r) => `${r.a} ↔ ${r.b}`).join(' · ') });
    }
  }
  return items
    .map((i) => ({ ...i, urgency: urgencyOf(i.kind, i.amount) }))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || b.amount - a.amount || a.caseId.localeCompare(b.caseId));
}

/** Victim → member payments behind a network's amount. The server only lists links between the members it shows, so a large network can show a gap. */
export function networkVictimFigure(caseId: string, nw: FraudNetwork): MoneyFigure {
  const byId = new Map(nw.members.map((m) => [m.id, m]));
  const rows = (nw.links ?? [])
    .filter(([a]) => byId.get(a)?.role === 'VICTIM')
    .map(([a, b, amt], i) => ({
      id: `${caseId}:${nw.network_id}:${i}`,
      caseId,
      dateIst: '',
      from: byId.get(a)?.label || a,
      to: byId.get(b)?.label || b,
      amountInr: amt,
      reference: 'Statement rows combined',
      sourceFile: 'Uploaded statements',
      sourceRow: null,
    }));
  return { label: `Paid in by victims to network ${nw.network_id}`, totalInr: nw.amount_inr || 0, rows };
}

export interface IdentifierHit {
  identifier: string;
  kind: string;
  role: string;
  caseId: string;
  networkId: string;
}

/** Lowercase and drop spaces, dashes and a leading +91 / 0 so "+91 98765-43210" finds "9876543210". */
export function normalizeIdentifier(s: string): string {
  const t = s.toLowerCase().replace(/[\s-]/g, '');
  return /^(\+?91|0)\d{10}$/.test(t) ? t.slice(-10) : t;
}

export function buildIdentifierIndex(cases: DeskCase[]): IdentifierHit[] {
  const seen = new Set<string>();
  const out: IdentifierHit[] = [];
  for (const c of cases) {
    for (const nw of c.networks?.networks ?? []) {
      for (const m of nw.members) {
        const key = `${c.caseId}|${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ identifier: m.id, kind: m.kind, role: m.role, caseId: c.caseId, networkId: nw.network_id });
      }
    }
  }
  return out;
}

/** Exact > starts-with > contains; then mules first, then shorter identifier, then case id. Needs 3+ characters. */
export function searchIdentifiers(index: IdentifierHit[], query: string, limit = 8): IdentifierHit[] {
  const q = normalizeIdentifier(query);
  if (q.length < 3) return [];
  const scored: { h: IdentifierHit; s: number }[] = [];
  for (const h of index) {
    const id = normalizeIdentifier(h.identifier);
    const s = id === q ? 3 : id.startsWith(q) ? 2 : id.includes(q) ? 1 : 0;
    if (s) scored.push({ h, s });
  }
  return scored
    .sort((a, b) =>
      b.s - a.s ||
      Number(b.h.role === 'MULE') - Number(a.h.role === 'MULE') ||
      a.h.identifier.length - b.h.identifier.length ||
      a.h.caseId.localeCompare(b.h.caseId))
    .slice(0, limit)
    .map((x) => x.h);
}

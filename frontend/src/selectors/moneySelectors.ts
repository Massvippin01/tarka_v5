/**
 * Money Trail selectors: what the Money Trail page shows at each zoom level (project / network / account),
 * derived only from the case's networks (GET /cases/{id}/networks, or the demo case as one network).
 * Money totals are the server's per-network split (networkTotals); nothing here invents a figure. Pure, no I/O.
 */
import type { CanonicalCaseFixture } from '../fixtures/cases';
import type { NetworkMember } from '../v6/triage/triage';
import { networkTotals, resolveFocus, type Focus, type Zoom } from '../v6/network/networkFocus';
import type { Net } from '../v6/network/NetworkPanels';
import { selectDoctrineComparison } from './caseSelectors';

/* ---------- scope: the members and money the current zoom covers ---------- */

export interface ScopedMember extends NetworkMember {
  net: string;
  /** Unique across networks: `${net}\u0000${id}`. */
  key: string;
}

export interface MoneyScope {
  level: Zoom;
  network?: Net;
  member?: ScopedMember;
  members: ScopedMember[];
  /** payer key → payee key → ₹ */
  links: [string, string, number][];
  /** Project / network: victim loss. Account: money received. */
  lossInr: number;
  /** Still in mule accounts (freezable). */
  recoverableInr: number;
  /** Project / network: cashed out. Account: moved on to other accounts. */
  cashedOutInr: number;
  unaccountedInr: number;
}

const keyOf = (net: string, id: string) => `${net}\u0000${id}`;

function scoped(nets: Net[]): Pick<MoneyScope, 'members' | 'links'> {
  const members: ScopedMember[] = [];
  const links: [string, string, number][] = [];
  for (const n of nets) {
    for (const m of n.members) members.push({ ...m, net: n.network_id, key: keyOf(n.network_id, m.id) });
    for (const [a, b, v] of n.links ?? []) links.push([keyOf(n.network_id, a), keyOf(n.network_id, b), v]);
  }
  return { members, links };
}

export function selectMoneyScope(nets: Net[], focus: Focus): MoneyScope {
  const { zoom, network, member } = resolveFocus(nets, focus);
  if (zoom === 'project') {
    const t = networkTotals(nets);
    return { level: 'project', ...scoped(nets), lossInr: t.paidIn, recoverableInr: t.recoverable, cashedOutInr: t.cashedOut, unaccountedInr: t.unaccounted };
  }
  const n = network as Net;
  const all = scoped([n]);
  if (zoom === 'network') {
    const t = networkTotals([n]);
    return { level: 'network', network: n, ...all, lossInr: t.paidIn, recoverableInr: t.recoverable, cashedOutInr: t.cashedOut, unaccountedInr: t.unaccounted };
  }
  const me = all.members.find((m) => m.id === member!.id)!;
  const links = all.links.filter(([a, b]) => a === me.key || b === me.key);
  const near = new Set(links.flatMap(([a, b]) => [a, b]));
  near.add(me.key);
  const sumLinks = (dir: 0 | 1) => links.filter((l) => l[dir] === me.key).reduce((s, l) => s + l[2], 0);
  const received = me.in_inr ?? sumLinks(1);
  const held = me.held_inr ?? 0;
  const moved = me.out_inr ?? sumLinks(0);
  return {
    level: 'account',
    network: n,
    member: me,
    members: all.members.filter((m) => near.has(m.key)),
    links,
    lossInr: received,
    recoverableInr: held,
    cashedOutInr: moved,
    unaccountedInr: Math.max(0, received - held - moved),
  };
}

/** ₹ the hero cannot place: 0 when the split adds up (it always should at project / network level). */
export const reconcileGap = (s: MoneyScope) => s.lossInr - s.recoverableInr - s.cashedOutInr - s.unaccountedInr;

/* ---------- layers ---------- */

export type LayerId = 'victims' | 'L1' | 'L2' | 'L3' | 'exit';
export const LAYERS: { id: LayerId; label: string; short: string; depth: number }[] = [
  { id: 'victims', label: 'Victims', short: 'Victims', depth: 0 },
  { id: 'L1', label: 'First-layer mules', short: '1st layer', depth: 1 },
  { id: 'L2', label: 'Second-layer mules', short: '2nd layer', depth: 2 },
  { id: 'L3', label: 'Deeper mules (3+ hops)', short: '3+ hops', depth: 3 },
  { id: 'exit', label: 'Cash-out, ATMs & shops', short: 'Cash-out', depth: 4 },
  // keep LAYERS[depth] lookups valid: index === depth
];
const DEPTH = Object.fromEntries(LAYERS.map((l) => [l.id, l.depth])) as Record<LayerId, number>;
export const LAYER_LABEL = Object.fromEntries(LAYERS.map((l) => [l.id, l.label])) as Record<LayerId, string>;

export function layerOf(m: Pick<NetworkMember, 'role' | 'hop'>): LayerId {
  if (m.role === 'VICTIM') return 'victims';
  if (m.role !== 'MULE') return 'exit';
  const hop = m.hop ?? 1;
  return hop <= 1 ? 'L1' : hop === 2 ? 'L2' : 'L3';
}

/* ---------- flow diagram (never more than ~maxNodes boxes) ---------- */

export const ACCOUNT_LEVEL_MAX = 24; // up to this many accounts, draw every account

export interface FlowBox {
  id: string;
  name: string;
  depth: number;
  kind: 'layer' | 'more' | 'account' | 'held';
  layer?: LayerId;
  count?: number;
  member?: ScopedMember;
}
export interface FlowGraph {
  boxes: FlowBox[];
  links: { source: string; target: string; value: number }[];
  grouped: boolean;
  /** Payments not drawn because they go sideways or backwards between layers (a flow diagram can't loop). */
  hiddenLinks: number;
}

export const HELD_ID = 'held';

/** Accounts whose balance a freeze can hold: mules, plus a merchant holding traced money (a lien, demo cases). */
export const isFreezable = (m: NetworkMember) =>
  (m.held_inr ?? 0) > 0 && m.role !== 'VICTIM' && m.role !== 'CASH_OUT' && m.verdict !== 'NOT_MULE';

export function selectFlowGraph(s: MoneyScope, expanded: ReadonlySet<LayerId> = new Set(), maxNodes = 30): FlowGraph {
  const grouped = s.members.length > ACCOUNT_LEVEL_MAX;
  const boxes = new Map<string, FlowBox>();
  const boxOf = new Map<string, string>();
  const byLayer = new Map<LayerId, ScopedMember[]>();
  for (const m of s.members) {
    const l = layerOf(m);
    byLayer.set(l, [...(byLayer.get(l) ?? []), m]);
  }
  const groupCount = byLayer.size;
  // accounts shown per opened layer, so the whole picture stays within maxNodes
  const perLayer = Math.max(3, Math.floor((maxNodes - groupCount - 1) / Math.max(1, expanded.size)) - 1);
  for (const { id: l } of LAYERS) {
    const ms = byLayer.get(l);
    if (!ms) continue;
    if (!grouped || expanded.has(l)) {
      const ranked = grouped ? [...ms].sort((a, b) => (b.held_inr ?? 0) + (b.in_inr ?? 0) - (a.held_inr ?? 0) - (a.in_inr ?? 0)) : ms;
      const shown = grouped ? ranked.slice(0, perLayer) : ranked;
      for (const m of shown) {
        boxes.set(m.key, { id: m.key, name: m.label, depth: DEPTH[l], kind: 'account', layer: l, member: m });
        boxOf.set(m.key, m.key);
      }
      const rest = ranked.length - shown.length;
      if (rest > 0) {
        const id = `more:${l}`;
        boxes.set(id, { id, name: `+${rest.toLocaleString('en-IN')} more`, depth: DEPTH[l], kind: 'more', layer: l, count: rest });
        for (const m of ranked.slice(shown.length)) boxOf.set(m.key, id);
      }
    } else {
      const id = `layer:${l}`;
      boxes.set(id, { id, name: LAYERS[DEPTH[l]].short, depth: DEPTH[l], kind: 'layer', layer: l, count: ms.length });
      for (const m of ms) boxOf.set(m.key, id);
    }
  }
  const sums = new Map<string, number>();
  const add = (a: string, b: string, v: number) => sums.set(`${a}\u0001${b}`, (sums.get(`${a}\u0001${b}`) ?? 0) + v);
  let hiddenLinks = 0;
  for (const [a, b, v] of s.links) {
    const x = boxOf.get(a);
    const y = boxOf.get(b);
    if (!x || !y || v <= 0) continue;
    if (boxes.get(y)!.depth <= boxes.get(x)!.depth) {
      if (x !== y) hiddenLinks++;
      continue;
    }
    add(x, y, v);
  }
  if (!sums.size && s.members.length) {
    // Older servers send no payer → payee links: draw the split as one chain through the groups.
    const firstMule = [...boxes.values()].find((b) => b.layer && b.layer !== 'victims' && b.layer !== 'exit');
    const victims = [...boxes.values()].find((b) => b.layer === 'victims');
    const exit = [...boxes.values()].find((b) => b.layer === 'exit');
    if (firstMule && victims) add(victims.id, firstMule.id, s.lossInr);
    if (firstMule && exit) add(firstMule.id, exit.id, s.cashedOutInr);
  }
  for (const m of s.members) {
    if (isFreezable(m)) add(boxOf.get(m.key)!, HELD_ID, m.held_inr!);
  }
  if ([...sums.keys()].some((k) => k.endsWith(`\u0001${HELD_ID}`)))
    boxes.set(HELD_ID, { id: HELD_ID, name: 'Can still be frozen', depth: 4, kind: 'held' });
  const links = [...sums].map(([k, value]) => {
    const [source, target] = k.split('\u0001');
    return { source, target, value };
  });
  const linked = new Set(links.flatMap((l) => [l.source, l.target]));
  return { boxes: [...boxes.values()].filter((b) => linked.has(b.id)), links, grouped, hiddenLinks };
}

/* ---------- replay: money arriving layer by layer over time ---------- */

export interface ReplayEvent {
  ts: number;
  layer: LayerId;
  amount: number;
}
export interface Replay {
  start: number;
  end: number;
  events: ReplayEvent[];
  /** First money reaching a cash-out point (epoch s), if any. */
  firstExit: number | null;
}

/** Each account counts once, at its first activity, with what it received (victims: what they paid). */
export function selectReplay(s: MoneyScope): Replay | null {
  const events: ReplayEvent[] = [];
  // Victims count only what they paid into mules (= booked loss), others only money from network members —
  // not a victim's ordinary shop payments. Older servers send no links: fall back to the account's own in/out.
  const byKey = new Map(s.members.map((m) => [m.key, m]));
  const fromLinks = new Map<string, number>();
  for (const [a, b, v] of s.links) {
    const payer = byKey.get(a);
    const payee = byKey.get(b);
    if (!payer || !payee) continue;
    if (payer.role === 'VICTIM' && payee.role !== 'MULE') continue; // a victim's ordinary payment
    if (payer.role === 'VICTIM') fromLinks.set(a, (fromLinks.get(a) ?? 0) + v);
    fromLinks.set(b, (fromLinks.get(b) ?? 0) + v);
  }
  const useLinks = s.links.length > 0;
  for (const m of s.members) {
    if (m.first_ts == null) continue;
    const layer = layerOf(m);
    const amount = useLinks ? fromLinks.get(m.key) ?? 0 : layer === 'victims' ? m.out_inr ?? 0 : m.in_inr ?? 0;
    if (amount > 0) events.push({ ts: m.first_ts, layer, amount });
  }
  if (!events.length) return null;
  events.sort((a, b) => a.ts - b.ts);
  const exits = events.filter((e) => e.layer === 'exit');
  return { start: events[0].ts, end: events[events.length - 1].ts, events, firstExit: exits[0]?.ts ?? null };
}

export function replayAt(r: Replay, t: number): Record<LayerId, { amount: number; accounts: number }> {
  const out = Object.fromEntries(LAYERS.map((l) => [l.id, { amount: 0, accounts: 0 }])) as Record<LayerId, { amount: number; accounts: number }>;
  for (const e of r.events) {
    if (e.ts > t) break;
    out[e.layer].amount += e.amount;
    out[e.layer].accounts++;
  }
  return out;
}

/** Demo case records have no per-account timing: fill first/last activity and in/out from its transactions. */
export function withTimes(c: CanonicalCaseFixture, nets: Net[]): Net[] {
  if (nets.every((n) => n.members.every((m) => m.first_ts != null || m.in_inr != null))) return nets;
  const txns = c.transactions.filter((t) => t.category !== 'SALARY_CREDIT');
  return nets.map((n) => ({
    ...n,
    members: n.members.map((m) => {
      if (m.first_ts != null || m.in_inr != null) return m;
      const mine = txns.filter((t) => t.toName === m.label || t.fromName === m.label);
      if (!mine.length) return m;
      const ts = mine.map((t) => Date.parse(t.timestampUtc) / 1000).filter(Number.isFinite);
      const sum = (f: (t: (typeof mine)[number]) => boolean) => mine.filter(f).reduce((a, t) => a + t.amount, 0);
      return {
        ...m,
        first_ts: ts.length ? Math.min(...ts) : null,
        last_ts: ts.length ? Math.max(...ts) : null,
        in_inr: sum((t) => t.toName === m.label && t.fromName !== m.label),
        out_inr: sum((t) => t.fromName === m.label && t.toName !== m.label),
      };
    }),
  }));
}

/* ---------- "Freeze these first" ---------- */

export interface FreezeItem {
  member: ScopedMember;
  heldInr: number;
  /** 0–1: 1 = moved money at the very end of the records (likely to move again soon). */
  urgency: number;
  score: number;
  reason: string;
}

export function selectFreezeQueue(s: MoneyScope): FreezeItem[] {
  const mules = s.members.filter(isFreezable);
  const latest = Math.max(...s.members.map((m) => m.last_ts ?? -Infinity));
  return mules
    .map((m) => {
      const held = m.held_inr ?? 0;
      let urgency = 1;
      let reason = 'No timing in the statements';
      if (m.last_ts != null && Number.isFinite(latest)) {
        const h = Math.max(0, (latest - m.last_ts) / 3600);
        urgency = 1 / (1 + h / 24);
        // "ago" = before the newest row in the statements, not before today
        reason = h < 1 ? 'Active at the end of the records' : h < 48 ? `Moved ${Math.round(h)} h before the last record` : `Idle for ${Math.round(h / 24)} days`;
      }
      if (m.role !== 'MULE') reason = 'Shop or merchant: hold only the traced amount';
      return { member: m, heldInr: held, urgency, score: held * urgency, reason };
    })
    .sort((a, b) => b.score - a.score || b.heldInr - a.heldInr);
}

/* ---------- which tracing rule to use ---------- */

export interface DoctrineOption {
  key: 'LIBR' | 'FIFO' | 'PRO_RATA';
  title: string;
  term: string;
  recoverableInr: number;
  explain: string;
  recommended: boolean;
}

const TERMS = {
  LIBR: { title: 'Follow the lowest balance', term: 'LIBR — Lowest Intermediate Balance Rule: stolen money is presumed to stay in the account until the balance drops below it.' },
  FIFO: { title: 'First in, first out', term: 'FIFO (Clayton’s Case): the first money paid in is treated as the first money paid out.' },
  PRO_RATA: { title: 'Share every withdrawal', term: 'Pro-rata: each withdrawal is split between stolen and clean money in proportion to their balances.' },
} as const;

/**
 * The three rules banks and courts use to say how much of an account's balance is the victims' money.
 * Demo case records carry their own comparison (merchant lien etc.); for uploaded statements no clean
 * money has been identified in the mule accounts, so all three equal the money still held.
 */
export function selectDoctrine(c: CanonicalCaseFixture, s: MoneyScope): DoctrineOption[] {
  const f = c.financials;
  const fromCase = s.level !== 'account' && (f.frozenMuleBalanceInr > 0 || f.shieldedCommercialInr > 0);
  if (fromCase) {
    const d = selectDoctrineComparison(c);
    return d.rows.map((r) => ({ key: r.key, ...TERMS[r.key], recoverableInr: r.recoverableInr, explain: r.note, recommended: r.key === 'LIBR' }));
  }
  const same = 'No clean money has been found mixed into these accounts, so this rule gives the same amount.';
  return (['LIBR', 'FIFO', 'PRO_RATA'] as const).map((key) => ({
    key,
    ...TERMS[key],
    recoverableInr: s.recoverableInr,
    explain: key === 'LIBR' ? 'Claims only money that can be traced as stolen, so banks and courts are least likely to dispute it.' : same,
    recommended: key === 'LIBR',
  }));
}

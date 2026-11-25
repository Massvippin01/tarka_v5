/** Pure logic for the WebGL network explorer: bubble grouping, layout, mule-heat colours, victim → cash-out path. No I/O. */
type Graph<T = any> = any;
const Graph = class {
  constructor(_opts?: any) {}
  addNode(_id: string, _attrs: any) {}
  addEdge(_from: string, _to: string, _attrs?: any) {}
  forEachNode(_fn: any) {}
  forEachEdge(_fn: any) {}
} as any;
import type { FraudNetwork, NetworkMember } from '../triage/triage';

export interface Palette {
  cool: string; // score 0
  hot: string; // score 1
  victim: string;
  bubble: string;
  edge: string;
  /** ATMs / merchants / crypto desks: drawn quiet so the mules carry the heat. Defaults to `bubble`. */
  hub?: string;
}

export interface NodeAttrs {
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  /** 'bubble' = a whole collapsed network; 'member' = one account; 'group' = the rest of a crowded layer */
  kind: 'bubble' | 'member' | 'group';
  networkId: string;
  memberId?: string;
  /** hop column, for 'group' nodes */
  layer?: number;
  hub?: boolean;
}

export interface BuildOptions {
  /** Bubble colour per network (e.g. by status); default = hottest member's heat. */
  bubbleColor?: (n: FraudNetwork) => string;
  /** Show at most this many accounts per layer; the rest become one "+N more" node. 0 = no limit. */
  layerCap?: number;
  /** layerKey(network, layer) keys whose layer is shown in full. */
  expandedLayers?: ReadonlySet<string>;
}

export const bubbleKey = (netId: string) => `net:${netId}`;
// Hubs (e.g. a shared ATM) can sit in several networks, so member nodes are scoped by network.
export const memberKey = (netId: string, memberId: string) => `${netId}|${memberId}`;
export const groupKey = (netId: string, layer: number) => `grp:${netId}|${layer}`;
export const layerKey = (netId: string, layer: number) => `${netId}|${layer}`;
const isHubRole = (r: NetworkMember['role']) => r === 'CASH_OUT' || r === 'UNKNOWN';

const hex = (c: string) => {
  const h = c.trim().replace('#', '');
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
};

/** Linear mix of two hex colours, t in [0, 1]. */
export function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const [ca, cb] = [hex(a), hex(b)];
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

export function memberColor(m: Pick<NetworkMember, 'role' | 'mule_score'>, p: Palette): string {
  if (m.role === 'VICTIM') return p.victim;
  if (isHubRole(m.role)) return p.hub ?? p.bubble;
  return mix(p.cool, p.hot, m.mule_score ?? 0);
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SLOT = 1; // distance unit between network centres
export const OPENED_RADIUS = 0.42; // half-extent of an opened network inside its slot
const R = OPENED_RADIUS;

/** Sunflower spiral: slot i of n, biggest networks (API order) in the middle. */
export const slotCentre = (i: number) => ({ x: SLOT * Math.sqrt(i) * Math.cos(i * GOLDEN), y: SLOT * Math.sqrt(i) * Math.sin(i * GOLDEN) });

export const layerOf = (n: FraudNetwork) => {
  const maxHop = n.members.reduce((h, m) => Math.max(h, m.hop ?? 0), 0);
  return (m: NetworkMember) => m.hop ?? maxHop + 1;
};

/** Per layer: the accounts drawn one by one, and those folded into a "+N more" node. */
export function layerGroups(n: FraudNetwork, cap = 0, expanded: ReadonlySet<string> = new Set()) {
  const layer = layerOf(n);
  const cols = new Map<number, NetworkMember[]>();
  for (const m of n.members) {
    const c = layer(m);
    (cols.get(c) ?? cols.set(c, []).get(c)!).push(m);
  }
  const out = new Map<number, { shown: NetworkMember[]; hidden: NetworkMember[] }>();
  for (const [c, ms] of [...cols].sort((a, b) => a[0] - b[0])) {
    if (!cap || ms.length <= cap + 1 || expanded.has(layerKey(n.network_id, c))) {
      out.set(c, { shown: ms, hidden: [] });
      continue;
    }
    // keep the most mule-like (then the biggest balance) in view
    const ranked = [...ms].sort((a, b) => (b.mule_score ?? 0) - (a.mule_score ?? 0) || (b.held_inr ?? 0) - (a.held_inr ?? 0) || a.label.localeCompare(b.label));
    out.set(c, { shown: ranked.slice(0, cap), hidden: ranked.slice(cap) });
  }
  return out;
}

/** Money flows left → right: one column per hop from the victim, unknown hop last. A layer's group node sits at its end. */
export function memberPositions(n: FraudNetwork, cap = 0, expanded?: ReadonlySet<string>): Map<string, { x: number; y: number }> {
  const groups = layerGroups(n, cap, expanded);
  const nCols = Math.max(...groups.keys()) + 1;
  const out = new Map<string, { x: number; y: number }>();
  for (const [c, { shown, hidden }] of groups) {
    const x = nCols === 1 ? 0 : -R + (2 * R * c) / (nCols - 1);
    const slots = shown.map((m) => m.id);
    if (hidden.length) slots.push(groupKey(n.network_id, c));
    slots.forEach((id, i) => out.set(id, { x, y: slots.length === 1 ? 0 : -R + (2 * R * i) / (slots.length - 1) }));
  }
  return out;
}

const maxScore = (n: FraudNetwork) => n.members.reduce((s, m) => Math.max(s, m.mule_score ?? 0), 0);

/** Collapsed networks become one bubble (area ∝ ₹); opened ones become their accounts plus money links. */
export function buildExplorerGraph(networks: FraudNetwork[], opened: ReadonlySet<string>, p: Palette, o: BuildOptions = {}): Graph<NodeAttrs> {
  const g = new Graph({ type: 'directed', multi: false });
  const maxAmt = networks.reduce((a, n) => Math.max(a, n.amount_inr || 0), 0);
  networks.forEach((n, i) => {
    const c = slotCentre(i);
    if (!opened.has(n.network_id)) {
      // fallback to account count when no money is known
      const share = maxAmt > 0 ? Math.sqrt((n.amount_inr || 0) / maxAmt) : Math.min(1, Math.sqrt(n.member_count) / 10);
      g.addNode(bubbleKey(n.network_id), {
        ...c,
        size: 6 + 16 * share,
        color: o.bubbleColor ? o.bubbleColor(n) : mix(p.cool, p.hot, maxScore(n)),
        label: n.network_id,
        kind: 'bubble',
        networkId: n.network_id,
      });
      return;
    }
    const cap = o.layerCap ?? 0;
    const groups = layerGroups(n, cap, o.expandedLayers);
    const pos = memberPositions(n, cap, o.expandedLayers);
    const nodeOf = new Map<string, string>(); // member id → its node, or its layer's group node
    for (const [layer, { shown, hidden }] of groups) {
      for (const m of shown) {
        const at = pos.get(m.id)!;
        const key = memberKey(n.network_id, m.id);
        const hub = isHubRole(m.role);
        g.addNode(key, {
          x: c.x + at.x,
          y: c.y + at.y,
          size: m.role === 'VICTIM' ? 6 : hub ? 4 : 4 + 6 * (m.mule_score ?? 0),
          color: memberColor(m, p),
          // hub labels (long ATM narrations) are cut; the side panel shows the full text
          label: hub && m.label.length > 22 ? `${m.label.slice(0, 21)}…` : m.label,
          kind: 'member',
          networkId: n.network_id,
          memberId: m.id,
          hub,
        });
        nodeOf.set(m.id, key);
      }
      if (hidden.length) {
        const key = groupKey(n.network_id, layer);
        const at = pos.get(key)!;
        const victims = hidden.every((m) => m.role === 'VICTIM');
        g.addNode(key, {
          x: c.x + at.x,
          y: c.y + at.y,
          size: 6 + Math.min(10, Math.sqrt(hidden.length)),
          color: victims ? p.victim : mix(p.cool, p.hot, hidden.reduce((s, m) => Math.max(s, m.mule_score ?? 0), 0)),
          label: `+${hidden.length.toLocaleString('en-IN')} more ${victims ? 'victims' : 'accounts'}`,
          kind: 'group',
          networkId: n.network_id,
          layer,
        });
        for (const m of hidden) nodeOf.set(m.id, key);
      }
    }
    for (const [a, b, amt] of n.links ?? []) {
      const [ka, kb] = [nodeOf.get(a), nodeOf.get(b)];
      if (!ka || !kb || ka === kb) continue;
      const ek = `${ka}>${kb}`;
      if (g.hasEdge(ek)) g.updateEdgeAttribute(ek, 'amount' as never, ((x: number) => x + amt) as never);
      else g.addDirectedEdgeWithKey(ek, ka, kb, { size: 1, color: p.edge, amount: amt } as never);
    }
  });
  return g;
}

export type PathResult = { ok: true; path: string[] } | { ok: false; reason: string };

/**
 * Shortest money path (fewest hops) from any victim to the member furthest from the victims
 * (highest `hop`; ties → higher mule score). Returns member ids, victim first.
 */
export function victimToCashOutPath(n: FraudNetwork): PathResult {
  const victims = n.members.filter((m) => m.role === 'VICTIM').map((m) => m.id);
  if (!victims.length) return { ok: false, reason: 'No victim account in this network.' };
  if (!n.links?.length) return { ok: false, reason: 'The server sent no money links for this network.' };
  const out = new Map<string, string[]>();
  for (const [a, b] of n.links) (out.get(a) ?? out.set(a, []).get(a)!).push(b);

  const parent = new Map<string, string | null>(victims.map((v) => [v, null]));
  const dist = new Map<string, number>(victims.map((v) => [v, 0]));
  const queue = [...victims];
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    for (const v of out.get(u) ?? []) {
      if (dist.has(v)) continue;
      dist.set(v, dist.get(u)! + 1);
      parent.set(v, u);
      queue.push(v);
    }
  }
  const target = n.members
    .filter((m) => m.role !== 'VICTIM' && dist.has(m.id))
    .sort((a, b) => (b.hop ?? dist.get(b.id)!) - (a.hop ?? dist.get(a.id)!) || dist.get(b.id)! - dist.get(a.id)! || (b.mule_score ?? 0) - (a.mule_score ?? 0))[0];
  if (!target) return { ok: false, reason: 'No money leaves the victim accounts within this network.' };
  const path: string[] = [];
  for (let x: string | null = target.id; x !== null; x = parent.get(x) ?? null) path.push(x);
  return { ok: true, path: path.reverse() };
}

/** Deterministic synthetic case for the 50k-node stress test (`?stress=50000`). */
export function syntheticNetworks(totalMembers: number, perNetwork = 50, seed = 7): FraudNetwork[] {
  let s = seed >>> 0;
  const rnd = () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 2 ** 32);
  const nets: FraudNetwork[] = [];
  for (let k = 0, made = 0; made < totalMembers; k++) {
    const size = Math.min(perNetwork, totalMembers - made);
    const members: NetworkMember[] = [];
    const links: [string, string, number][] = [];
    for (let i = 0; i < size; i++) {
      const hop = i < 2 ? 0 : i === size - 1 ? 5 : 1 + Math.floor(rnd() * 4);
      const role = hop === 0 ? 'VICTIM' : i === size - 1 ? 'CASH_OUT' : 'MULE';
      members.push({ id: `s${k}_${i}`, label: `acct ${k}-${i}`, kind: 'account', role, mule_score: role === 'MULE' ? Math.round(rnd() * 100) / 100 : 0, hop, why: 'synthetic' });
    }
    for (const m of members) {
      if (!m.hop) continue;
      const from = members.filter((x) => x.hop === m.hop! - 1 || (m.hop === 5 && x.hop! >= 1 && x.hop! < 5));
      const src = from.length ? from[Math.floor(rnd() * from.length)] : members[0];
      links.push([src.id, m.id, 10000]);
    }
    nets.push({ network_id: `SYN-${k}`, member_count: size, mule_count: members.filter((m) => m.role === 'MULE').length, victim_count: 2, amount_inr: 0, members, links });
    made += size;
  }
  return nets;
}

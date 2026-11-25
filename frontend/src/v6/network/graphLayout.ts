/**
 * Pure geometry for the SVG network views: layered gang layout, project bubble rows, and a greedy label-collision
 * pass so labels never cover a node or each other. Screen-space pixels throughout. No I/O, no DOM.
 */
import type { FraudNetwork, NetworkMember } from '../triage/triage';
import { layerGroups } from './networkGraph';

export interface Circle {
  x: number;
  y: number;
  r: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const LABEL_FONT = 11.5;
export const LABEL_H = 18;
const PAD_X = 6;

/** Rough width of a label in px (Inter at 11.5px averages ~0.56 em per character). */
export const textWidth = (s: string, px = LABEL_FONT) => Math.ceil(s.length * px * 0.56) + 2 * PAD_X;
export const truncate = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const boxesHit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const boxHitsCircle = (b: Box, c: Circle) => {
  const nx = Math.max(b.x, Math.min(c.x, b.x + b.w));
  const ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
  return (nx - c.x) ** 2 + (ny - c.y) ** 2 < c.r * c.r;
};

export interface LabelRequest {
  id: string;
  text: string;
  /** node centre and radius the label belongs to */
  x: number;
  y: number;
  r: number;
  /** higher wins space first; below `minPriority` the label is hidden (shown on hover / focus) */
  priority: number;
  prefer: 'right' | 'left';
}

export interface PlacedLabel extends Box {
  id: string;
  text: string;
  visible: boolean;
  /** set when the label had to move away from its node: draw a line from the node to the label */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
}

/**
 * Greedy placement: highest priority first, try beside the node (preferred side, then the other side), then above /
 * below, then nudged up or down with a leader line. A spot is taken only if it hits no placed label, no node and
 * stays inside `bounds`; otherwise the label is hidden.
 */
export function placeLabels(reqs: LabelRequest[], nodes: (Circle & { id: string })[], opts: { bounds?: Box; minPriority?: number } = {}): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const taken: Box[] = [];
  const order = [...reqs].sort((a, b) => b.priority - a.priority || a.y - b.y || a.x - b.x);
  const inBounds = (b: Box) => !opts.bounds || (b.x >= opts.bounds.x && b.y >= opts.bounds.y && b.x + b.w <= opts.bounds.x + opts.bounds.w && b.y + b.h <= opts.bounds.y + opts.bounds.h);
  for (const q of order) {
    const w = textWidth(q.text);
    const h = LABEL_H;
    const gap = q.r + 4;
    const right = { x: q.x + gap, y: q.y - h / 2 };
    const left = { x: q.x - gap - w, y: q.y - h / 2 };
    const side = q.prefer === 'right' ? [right, left] : [left, right];
    const near: { x: number; y: number }[] = [...side, { x: q.x - w / 2, y: q.y - gap - h }, { x: q.x - w / 2, y: q.y + gap }];
    const far: { x: number; y: number }[] = [];
    for (const dy of [1, -1, 2, -2]) far.push({ x: side[0].x + (q.prefer === 'right' ? 10 : -10), y: q.y - h / 2 + dy * (h + 3) });
    let spot: Box | null = null;
    let leader = false;
    if (q.priority >= (opts.minPriority ?? -Infinity)) {
      for (const [i, c] of [...near, ...far].entries()) {
        const b = { x: c.x, y: c.y, w, h };
        if (!inBounds(b) || taken.some((t) => boxesHit(t, b)) || nodes.some((n) => boxHitsCircle(b, n))) continue;
        spot = b;
        leader = i >= near.length;
        break;
      }
    }
    const b = spot ?? { ...right, w, h };
    if (spot) taken.push(spot);
    placed.push({
      id: q.id,
      text: q.text,
      ...b,
      visible: !!spot,
      leader: spot && leader ? { x1: q.x, y1: q.y, x2: q.prefer === 'right' ? b.x : b.x + b.w, y2: b.y + h / 2 } : null,
    });
  }
  return placed;
}

/* ---------------- layered gang layout ---------------- */

export interface LayoutNode {
  key: string; // member id, or `grp:<layer>` for a folded group
  kind: 'member' | 'group';
  member?: NetworkMember;
  layer: number;
  hidden?: number; // group size
  x: number;
  y: number;
}
export interface LayoutEdge {
  from: string;
  to: string;
  amount: number;
}

/** Victims → layer 1 → layer 2 → … → cash-out, columns evenly spaced in a unit box [0,1]²; crowded layers fold. */
export function layeredLayout(n: FraudNetwork, cap = 30, expanded: ReadonlySet<string> = new Set()) {
  const groups = layerGroups(n, cap, expanded);
  const layers = [...groups.keys()].sort((a, b) => a - b);
  const nodes: LayoutNode[] = [];
  const nodeOf = new Map<string, string>();
  layers.forEach((layer, ci) => {
    const { shown, hidden } = groups.get(layer)!;
    const x = layers.length === 1 ? 0.5 : ci / (layers.length - 1);
    // victims and hubs by money / label; mules by heat so the hottest sit together at the top
    const sorted = [...shown].sort((a, b) => (b.mule_score ?? 0) - (a.mule_score ?? 0) || (b.held_inr ?? 0) - (a.held_inr ?? 0) || a.label.localeCompare(b.label));
    const slots = sorted.length + (hidden.length ? 1 : 0);
    sorted.forEach((m, i) => {
      nodes.push({ key: m.id, kind: 'member', member: m, layer, x, y: slots === 1 ? 0.5 : i / (slots - 1) });
      nodeOf.set(m.id, m.id);
    });
    if (hidden.length) {
      const key = `grp:${layer}`;
      nodes.push({ key, kind: 'group', layer, hidden: hidden.length, x, y: slots === 1 ? 0.5 : 1 });
      for (const m of hidden) nodeOf.set(m.id, key);
    }
  });
  const sums = new Map<string, number>();
  for (const [a, b, amt] of n.links ?? []) {
    const [ka, kb] = [nodeOf.get(a), nodeOf.get(b)];
    if (!ka || !kb || ka === kb) continue;
    sums.set(`${ka}\u0000${kb}`, (sums.get(`${ka}\u0000${kb}`) ?? 0) + amt);
  }
  const edges: LayoutEdge[] = [...sums].map(([k, amount]) => {
    const [from, to] = k.split('\u0000');
    return { from, to, amount };
  });
  return { nodes, edges, layers, nodeOf };
}

/* ---------------- project bubbles ---------------- */

export interface BubbleSlot {
  id: string;
  x: number;
  y: number;
  r: number;
  /** width reserved under the bubble for its label */
  cell: number;
}

/**
 * Bubbles in centred rows, biggest money first, area ∝ ₹. Each bubble owns a cell with label room underneath,
 * so bubbles and labels never overlap by construction.
 */
export function bubbleRows(items: { id: string; amount: number }[], width: number, opts: { minR?: number; maxR?: number; gap?: number; labelH?: number } = {}) {
  const { minR = 14, maxR = 46, gap = 22, labelH = 36 } = opts;
  const max = items.reduce((m, i) => Math.max(m, i.amount || 0), 0);
  const sized = [...items]
    .sort((a, b) => (b.amount || 0) - (a.amount || 0) || a.id.localeCompare(b.id))
    .map((i) => ({ id: i.id, r: max > 0 ? minR + (maxR - minR) * Math.sqrt((i.amount || 0) / max) : minR }));
  const cellW = (r: number) => Math.max(2 * r, 96) + gap;
  const rows: { id: string; r: number }[][] = [];
  let row: { id: string; r: number }[] = [];
  let used = 0;
  for (const s of sized) {
    if (row.length && used + cellW(s.r) > width) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(s);
    used += cellW(s.r);
  }
  if (row.length) rows.push(row);
  const out: BubbleSlot[] = [];
  let y = gap;
  for (const r of rows) {
    const rowR = Math.max(...r.map((s) => s.r));
    const total = r.reduce((t, s) => t + cellW(s.r), 0);
    let x = (width - total) / 2;
    for (const s of r) {
      const cell = cellW(s.r);
      out.push({ id: s.id, x: x + cell / 2, y: y + rowR, r: s.r, cell: cell - gap });
      x += cell;
    }
    y += 2 * rowR + labelH + gap;
  }
  return { slots: out, height: y };
}

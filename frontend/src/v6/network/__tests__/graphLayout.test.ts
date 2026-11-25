import { describe, expect, it } from 'vitest';
import type { FraudNetwork, NetworkMember } from '../../triage/triage';
import { bubbleRows, layeredLayout, placeLabels, textWidth, truncate, type LabelRequest } from '../graphLayout';

const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('placeLabels', () => {
  it('puts a lone label beside its node on the preferred side', () => {
    const [l] = placeLabels([{ id: 'a', text: 'mule.one@ybl', x: 100, y: 100, r: 8, priority: 1, prefer: 'right' }], [{ id: 'a', x: 100, y: 100, r: 8 }]);
    expect(l.visible).toBe(true);
    expect(l.x).toBeGreaterThan(108);
    expect(l.y + l.h / 2).toBe(100);
    const [r] = placeLabels([{ id: 'a', text: 'x', x: 100, y: 100, r: 8, priority: 1, prefer: 'left' }], []);
    expect(r.x + r.w).toBeLessThan(92);
  });

  it('never overlaps another label or any node, and hides what does not fit', () => {
    // a dense column: 40 nodes 12 px apart, so not every label can fit
    const nodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, x: 200, y: 20 + i * 12, r: 5 }));
    const reqs: LabelRequest[] = nodes.map((n, i) => ({ id: n.id, text: `victim${i}@okaxis`, x: n.x, y: n.y, r: n.r, priority: i % 7 === 0 ? 3 : 1, prefer: 'right' }));
    // a second column right next to it acts as an obstacle
    const blockers = Array.from({ length: 40 }, (_, i) => ({ id: `b${i}`, x: 330, y: 20 + i * 12, r: 6 }));
    const placed = placeLabels(reqs, [...nodes, ...blockers], { bounds: { x: 0, y: 0, w: 600, h: 520 } });
    const shown = placed.filter((p) => p.visible);
    expect(shown.length).toBeGreaterThan(5);
    expect(shown.length).toBeLessThan(40);
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) expect(overlap(shown[i], shown[j])).toBe(false);
    for (const p of shown)
      for (const n of [...nodes, ...blockers]) {
        const nx = Math.max(p.x, Math.min(n.x, p.x + p.w));
        const ny = Math.max(p.y, Math.min(n.y, p.y + p.h));
        expect((nx - n.x) ** 2 + (ny - n.y) ** 2).toBeGreaterThanOrEqual(n.r * n.r);
      }
    // high-priority labels win space first
    for (const p of placed.filter((x) => Number(x.id.slice(1)) % 7 === 0)) expect(p.visible).toBe(true);
  });

  it('hides labels below the zoom threshold and draws a leader when a label is nudged away', () => {
    const reqs: LabelRequest[] = [
      { id: 'hub', text: 'ATM CASH WITHDRAWAL', x: 100, y: 100, r: 8, priority: 3, prefer: 'right' },
      { id: 'low', text: 'victim1', x: 100, y: 300, r: 6, priority: 1, prefer: 'right' },
    ];
    const placed = placeLabels(reqs, [], { minPriority: 2 });
    expect(placed.find((p) => p.id === 'hub')!.visible).toBe(true);
    expect(placed.find((p) => p.id === 'low')!.visible).toBe(false);
    // block both sides, above and below → the label moves down a row with a leader line
    const block = [
      { id: 'x1', x: 140, y: 100, r: 30 },
      { id: 'x2', x: 40, y: 100, r: 40 },
      { id: 'x3', x: 100, y: 80, r: 10 },
      { id: 'x4', x: 100, y: 120, r: 10 },
    ];
    const [moved] = placeLabels([{ id: 'm', text: 'mule', x: 100, y: 100, r: 6, priority: 1, prefer: 'right' }], block);
    expect(moved.visible).toBe(true);
    expect(moved.leader).not.toBeNull();
  });

  it('measures and truncates long UPI IDs', () => {
    expect(truncate('a-very-long-upi-handle-name@okhdfcbank', 22)).toHaveLength(22);
    expect(truncate('short@ybl')).toBe('short@ybl');
    expect(textWidth('abcdefghij')).toBeGreaterThan(textWidth('abc'));
  });
});

describe('layeredLayout', () => {
  const m = (id: string, role: NetworkMember['role'], hop: number, s = 0): NetworkMember => ({ id, label: id, kind: 'vpa', role, mule_score: s, hop, why: '' });
  const victims = Array.from({ length: 100 }, (_, i) => m(`v${i}`, 'VICTIM', 0));
  const n: FraudNetwork = {
    network_id: 'N',
    member_count: 103,
    mule_count: 2,
    victim_count: 100,
    amount_inr: 0,
    members: [...victims, m('l1', 'MULE', 1, 0.9), m('l2', 'MULE', 2, 0.7), m('atm', 'CASH_OUT', 3)],
    links: [...victims.map((v) => [v.id, 'l1', 1000] as [string, string, number]), ['l1', 'l2', 90000], ['l2', 'atm', 80000]],
  };
  it('puts layers left → right, evenly, and folds a crowded layer into one group', () => {
    const { nodes, edges } = layeredLayout(n, 30);
    const x = (k: string) => nodes.find((d) => d.key === k)!.x;
    expect([x('v0'), x('l1'), x('l2'), x('atm')]).toEqual([0, 1 / 3, 2 / 3, 1]);
    const grp = nodes.find((d) => d.kind === 'group')!;
    expect(grp.hidden).toBe(70);
    expect(nodes.filter((d) => d.layer === 0)).toHaveLength(31);
    expect(edges.find((e) => e.from === grp.key && e.to === 'l1')!.amount).toBe(70_000);
  });
});

describe('bubbleRows', () => {
  it('keeps every bubble and its label cell apart and biggest money first', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `N${i}`, amount: (i + 1) * 1e5 }));
    const { slots, height } = bubbleRows(items, 700);
    expect(slots[0].id).toBe('N49');
    expect(slots[0].r).toBeGreaterThan(slots[49].r);
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++) {
        const [a, b] = [slots[i], slots[j]];
        const cell = (s: typeof a) => ({ x: s.x - s.cell / 2, y: s.y - s.r, w: s.cell, h: 2 * s.r + 36 });
        expect(overlap(cell(a), cell(b))).toBe(false);
      }
    expect(height).toBeGreaterThan(0);
  });
});

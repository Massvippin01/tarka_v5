import { describe, expect, it } from 'vitest';
import type { FraudNetwork, NetworkMember } from '../../triage/triage';
import { bubbleKey, buildExplorerGraph, memberKey, mix, syntheticNetworks, victimToCashOutPath, type Palette } from '../networkGraph';

const P: Palette = { cool: '#000000', hot: '#ffffff', victim: '#00ff00', bubble: '#888888', edge: '#cccccc' };
const m = (id: string, role: NetworkMember['role'], hop: number | null, mule_score = 0): NetworkMember => ({ id, label: id, kind: 'vpa', role, mule_score, hop, why: '' });

const gang: FraudNetwork = {
  network_id: 'NET-A',
  member_count: 6,
  mule_count: 3,
  victim_count: 2,
  amount_inr: 700000,
  members: [m('v1', 'VICTIM', 0), m('v2', 'VICTIM', 0), m('m1', 'MULE', 1, 0.9), m('m2', 'MULE', 2, 0.8), m('m3', 'MULE', 1, 0.4), m('atm', 'CASH_OUT', 3)],
  links: [
    ['v1', 'm1', 500000],
    ['v2', 'm3', 200000],
    ['m3', 'm1', 190000],
    ['m1', 'm2', 650000],
    ['m2', 'atm', 600000],
  ],
};

describe('mix', () => {
  it('interpolates and clamps', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000', '#fff', 2)).toBe('#ffffff');
  });
});

describe('victimToCashOutPath', () => {
  it('finds the fewest-hop path from a victim to the furthest member', () => {
    expect(victimToCashOutPath(gang)).toEqual({ ok: true, path: ['v1', 'm1', 'm2', 'atm'] });
  });
  it('follows money direction only', () => {
    const reversed = { ...gang, links: gang.links!.map(([a, b, x]) => [b, a, x] as [string, string, number]) };
    expect(victimToCashOutPath(reversed).ok).toBe(false);
  });
  it('explains why there is no path', () => {
    expect(victimToCashOutPath({ ...gang, links: undefined })).toEqual({ ok: false, reason: 'The server sent no money links for this network.' });
    expect(victimToCashOutPath({ ...gang, members: gang.members.filter((x) => x.role !== 'VICTIM') }).ok).toBe(false);
  });
});

describe('buildExplorerGraph', () => {
  const other: FraudNetwork = { ...gang, network_id: 'NET-B' };
  it('collapses each network into one bubble until opened', () => {
    const g = buildExplorerGraph([gang, other], new Set(), P);
    expect(g.order).toBe(2);
    expect(g.getNodeAttribute(bubbleKey('NET-A'), 'color')).toBe('#e6e6e6'); // heat from hottest member (0.9)
  });
  it('opens a network into accounts and money links, coloured by mule heat', () => {
    const g = buildExplorerGraph([gang, other], new Set(['NET-A']), P);
    expect(g.order).toBe(6 + 1);
    expect(g.size).toBe(5);
    expect(g.getNodeAttribute(memberKey('NET-A', 'v1'), 'color')).toBe('#00ff00');
    expect(g.getNodeAttribute(memberKey('NET-A', 'atm'), 'color')).toBe('#888888'); // hubs are muted
    // money flows left → right by hop
    const x = (id: string) => g.getNodeAttribute(memberKey('NET-A', id), 'x');
    expect(x('v1')).toBeLessThan(x('m1'));
    expect(x('m1')).toBeLessThan(x('m2'));
    expect(x('m2')).toBeLessThan(x('atm'));
  });
  it('builds a 50k-account graph quickly', () => {
    const nets = syntheticNetworks(50_000);
    const t0 = performance.now();
    const g = buildExplorerGraph(nets, new Set(nets.map((n) => n.network_id)), P);
    const ms = performance.now() - t0;
    expect(g.order).toBe(50_000);
    expect(g.size).toBeGreaterThan(45_000);
    expect(ms).toBeLessThan(3000);
    for (const n of nets.slice(0, 20)) expect(victimToCashOutPath(n).ok).toBe(true);
  });
});

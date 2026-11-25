import { describe, expect, it } from 'vitest';
import { headlineText, rankMembers, triageTotals, type FraudNetwork, type NetworkMember } from '../triage';

const m = (id: string, mule_score: number, hop: number | null): NetworkMember => ({ id, label: id, kind: 'upi', role: 'MULE', mule_score, hop, why: '' });
const net = (mules: number, victims: number, amount: number): FraudNetwork => ({
  network_id: `n${amount}`,
  member_count: mules + victims,
  mule_count: mules,
  victim_count: victims,
  amount_inr: amount,
  members: [],
});

describe('triage', () => {
  it('sums the headline across networks', () => {
    const t = triageTotals([net(3, 1, 1_000_000), net(2, 1, 250_000)]);
    expect(t).toEqual({ networks: 2, mules: 5, victims: 2, amount: 1_250_000 });
    expect(headlineText(t)).toBe('2 networks — 5 mules, 2 victims, ₹12.5 L');
  });

  it('uses singular words and handles no networks', () => {
    expect(headlineText(triageTotals([net(1, 1, 5000)]))).toBe('1 network — 1 mule, 1 victim, ₹5,000');
    expect(headlineText(triageTotals([]))).toBe('0 networks — 0 mules, 0 victims, ₹0');
  });

  it('ranks by mule score, then nearer hop', () => {
    const r = rankMembers([m('a', 0.2, 1), m('b', 0.9, 3), m('c', 0.9, 1), m('d', 0.9, null)]);
    expect(r.map((x) => x.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

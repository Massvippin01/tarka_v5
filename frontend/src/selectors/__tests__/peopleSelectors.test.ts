import { describe, expect, it } from 'vitest';
import { CANONICAL_CASES } from '../../fixtures/cases';
import type { NetworksResponse } from '../../v6/triage/triage';
import {
  extractIdentifiers,
  filterPeople,
  peopleFromFixture,
  peopleFromNetworks,
  reviewFromFixture,
  reviewFromNetworks,
  roleCounts,
  scoreBand,
  sortPeople,
  sortReview,
} from '../peopleSelectors';

const member = (id: string, role: 'MULE' | 'VICTIM' | 'CASH_OUT' | 'UNKNOWN', score = 0, extra = {}) => ({
  id, label: id, kind: 'vpa', role, mule_score: score, hop: null, why: 'w', ...extra,
});

const RES: NetworksResponse = {
  networks: [
    { network_id: 'NET-A', member_count: 3, mule_count: 1, victim_count: 1, amount_inr: 100,
      members: [member('m1@ybl', 'MULE', 1, { held_inr: 40, in_inr: 100, out_inr: 60 }), member('v1@oksbi', 'VICTIM'), member('atm cash withdrawal', 'CASH_OUT')] },
    { network_id: 'NET-B', member_count: 2, mule_count: 1, victim_count: 0, amount_inr: 50,
      members: [member('9876543210@paytm', 'MULE', 0.85), member('atm cash withdrawal', 'CASH_OUT'),
        member('cleared@ybl', 'UNKNOWN', 1, { verdict: 'NOT_MULE', held_inr: 0 })] },
  ],
  review_queue: [
    { a: 'x@ybl', b: 'REFUND x@ybl', confidence: 0.8, why: 'both contain the same vpa x@ybl', key: 'refund x@ybl|x@ybl', verdict: 'MERGE' },
    { a: 'p 9876543210', b: '9876543210@paytm', confidence: 0.9, why: 'both contain the same phone 9876543210' },
  ],
  cross_case_hits: [{ identifier: '9876543210@paytm', kind: 'vpa', case_ids: ['C201'] }],
};

describe('peopleSelectors', () => {
  it('reads UPI, phone, account and IFSC out of a label', () => {
    expect(extractIdentifiers('9876543210@paytm')).toEqual({ upi: '9876543210@paytm', phone: '9876543210', account: null, ifsc: null });
    expect(extractIdentifiers('A/C 001234567890 SBIN0001234')).toEqual({ upi: null, phone: null, account: '001234567890', ifsc: 'SBIN0001234' });
  });

  it('one row per party, networks merged, backend score and verdict kept, FIR hits attached', () => {
    const rows = peopleFromNetworks(RES);
    expect(rows).toHaveLength(5);
    const atm = rows.find((r) => r.key === 'atm cash withdrawal')!;
    expect(atm.networks).toEqual(['NET-A', 'NET-B']);
    const m1 = rows.find((r) => r.key === 'm1@ybl')!;
    expect([m1.muleScore, m1.heldInr, m1.inInr, m1.outInr]).toEqual([1, 40, 100, 60]);
    expect(rows.find((r) => r.key === 'cleared@ybl')).toMatchObject({ role: 'UNKNOWN', verdict: 'NOT_MULE', heldInr: 0 });
    expect(rows.find((r) => r.key === '9876543210@paytm')!.otherCases).toEqual(['C201']);
    expect(roleCounts(rows)).toEqual({ ALL: 5, MULE: 2, VICTIM: 1, CASH_OUT: 1, UNKNOWN: 1 });
  });

  it('filters by role, network focus and any identifier; mules sort first by score', () => {
    const rows = peopleFromNetworks(RES);
    expect(filterPeople(rows, { role: 'MULE', query: '', networkId: null }).map((r) => r.key)).toEqual(['m1@ybl', '9876543210@paytm']);
    expect(filterPeople(rows, { role: 'ALL', query: '', networkId: 'NET-A' })).toHaveLength(3);
    expect(filterPeople(rows, { role: 'ALL', query: '98765', networkId: null }).map((r) => r.key)).toEqual(['9876543210@paytm']);
    expect(sortPeople(rows).map((r) => r.key).slice(0, 2)).toEqual(['m1@ybl', '9876543210@paytm']);
  });

  it('review queue: plain words, undecided first, keys stable', () => {
    const pairs = sortReview(reviewFromNetworks(RES));
    expect(pairs[0]).toMatchObject({ verdict: null, why: 'they share the same phone 9876543210', key: '9876543210@paytm|p 9876543210' });
    expect(pairs[1]).toMatchObject({ verdict: 'MERGE', why: 'they share the same UPI ID x@ybl' });
  });

  it('demo fixture still works: rows from the account flows, no invented score', () => {
    const c = CANONICAL_CASES['CASE-2026-001'];
    const rows = peopleFromFixture(c);
    expect(rows.length).toBe(c.accounts.length);
    expect(rows.every((r) => r.muleScore === null)).toBe(true);
    expect(rows.some((r) => r.role === 'VICTIM') && rows.some((r) => r.role === 'MULE')).toBe(true);
    expect(reviewFromFixture(c).every((p) => !p.savable && p.why.startsWith('they '))).toBe(true);
  });

  it('score band', () => {
    expect(scoreBand(null)).toEqual({ text: '—', band: 'none' });
    expect(scoreBand(1)).toEqual({ text: '100%', band: 'high' });
    expect(scoreBand(0.5).band).toBe('mid');
  });
});

import { describe, expect, it } from 'vitest';
import { filterByStatus, networkRows, sortRows, triageLayout, TABLE_THRESHOLD } from '../layout';
import type { FraudNetwork } from '../triage';

const net = (id: string, o: { amount_inr?: number; recoverable_inr?: number; status?: string; last?: number; held?: number } = {}): FraudNetwork =>
  ({
    network_id: id,
    member_count: 2,
    mule_count: 1,
    victim_count: 1,
    amount_inr: o.amount_inr ?? 1000,
    recoverable_inr: o.recoverable_inr,
    members: [{ id: `${id}-m`, label: `${id}@upi`, kind: 'upi', role: 'MULE', mule_score: 1, hop: 1, why: '', held_inr: o.held ?? 0, last_ts: o.last ?? 1_000_000 }],
    triage: o.status ? { status: o.status } : undefined,
  }) as unknown as FraudNetwork;

describe('triageLayout', () => {
  it('picks the layout from the network count', () => {
    expect(triageLayout(0)).toBe('empty');
    expect(triageLayout(1)).toBe('single');
    expect(triageLayout(2)).toBe('cards');
    expect(triageLayout(TABLE_THRESHOLD)).toBe('cards');
    expect(triageLayout(TABLE_THRESHOLD + 1)).toBe('table');
    expect(triageLayout(55)).toBe('table');
  });
});

describe('networkRows', () => {
  it('ranks by freezable rupees times urgency', () => {
    const rows = networkRows([
      net('closed-big', { recoverable_inr: 9_000_000, status: 'CLOSED' }),
      net('new-mid', { recoverable_inr: 2_000_000 }),
      net('old-mid', { recoverable_inr: 2_000_000, last: 1_000_000 - 30 * 86400 }),
      net('new-small', { recoverable_inr: 100 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['new-mid', 'old-mid', 'closed-big', 'new-small']);
  });

  it('falls back to what mule members hold, and counts other FIRs', () => {
    const [r] = networkRows([net('a', { held: 4200 })], [{ identifier: 'a@upi', kind: 'upi', case_ids: ['C1', 'C2'] }]);
    expect(r.freezable).toBe(4200);
    expect(r.otherFirs).toBe(2);
    expect(r.status).toBe('NEW');
  });
});

describe('sort and filter', () => {
  const rows = networkRows([
    net('n10', { amount_inr: 5, recoverable_inr: 1 }),
    net('n2', { amount_inr: 50, recoverable_inr: 2 }),
    net('n3', { amount_inr: 9, status: 'CLOSED', recoverable_inr: 3 }),
  ]);
  it('sorts numerically and by natural id', () => {
    expect(sortRows(rows, 'moved', 'desc').map((r) => r.id)).toEqual(['n2', 'n3', 'n10']);
    expect(sortRows(rows, 'id', 'asc').map((r) => r.id)).toEqual(['n2', 'n3', 'n10']);
    expect(sortRows(rows, 'status', 'desc')[0].status).toBe('CLOSED');
  });
  it('filters by status', () => {
    expect(filterByStatus(rows, 'CLOSED').map((r) => r.id)).toEqual(['n3']);
    expect(filterByStatus(rows, null)).toHaveLength(3);
  });
});

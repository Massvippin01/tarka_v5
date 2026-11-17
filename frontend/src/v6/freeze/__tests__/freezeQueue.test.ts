import { describe, expect, it } from 'vitest';
import type { FreezeAction } from '../../../selectors/caseSelectors';
import { buildBankNotice, groupByBank, rankFreezeQueue, type FreezeNotice } from '../freezeQueue';

const fa = (nodeId: string, bank: string, ifsc: string, amountInr: number, kind: FreezeAction['kind'] = 'MULE_HOLD'): FreezeAction => ({
  nodeId, holderName: `Holder ${nodeId}`, bank, accountMasked: `…${nodeId}`, ifsc, kind, measure: '', receivedInr: amountInr, amountInr,
});
const notice = (id: string, accountIds: string[], status: FreezeNotice['status'], sentAt = '2026-01-01T00:00:00Z'): FreezeNotice => ({
  id, bank: 'x', ifscPrefix: 'x', sections: ['107'], accountIds, referenceNo: id, status, sentAt, acknowledgedAt: null, frozenAt: null, refusedAt: null,
});

const freezes = [
  fa('A', 'Axis Bank', 'UTIB0000412', 50_000),
  fa('B', 'SBI', 'SBIN0001928', 3_00_000),
  fa('C', 'Axis Bank', 'UTIB0009999', 1_20_000, 'MERCHANT_LIEN'),
  fa('D', 'HDFC', 'HDFC0000001', 0), // nothing left to hold
  fa('E', 'ATM', 'ATM00000001', 90_000, 'CASHOUT_REQUISITION'),
];

describe('rankFreezeQueue', () => {
  it('drops cash-outs and empty balances, ranks by amount still recoverable', () => {
    const q = rankFreezeQueue(freezes, [], 30);
    expect(q.map((r) => r.nodeId)).toEqual(['B', 'C', 'A']);
    expect(q.find((r) => r.nodeId === 'C')!.section).toBe('106');
    expect(q.find((r) => r.nodeId === 'B')!.section).toBe('107');
  });

  it('inside the golden hour, unsent and refused accounts outrank ones already with a bank; frozen go last with 0 left', () => {
    const q = rankFreezeQueue(freezes, [notice('N1', ['B'], 'FROZEN'), notice('N2', ['C'], 'REFUSED')], 30);
    expect(q.map((r) => r.nodeId)).toEqual(['A', 'C', 'B']);
    expect(q[2].recoverableInr).toBe(0);
  });

  it('after the golden hour, amount alone decides', () => {
    const q = rankFreezeQueue(freezes, [notice('N1', ['B'], 'SENT')], 0);
    expect(q.map((r) => r.nodeId)).toEqual(['B', 'C', 'A']);
  });

  it('uses the most recent notice for an account', () => {
    const q = rankFreezeQueue(freezes, [notice('new', ['A'], 'SENT', '2026-01-02T00:00:00Z'), notice('old', ['A'], 'REFUSED', '2026-01-01T00:00:00Z')], 30);
    expect(q.find((r) => r.nodeId === 'A')!.notice!.id).toBe('new');
  });
});

describe('groupByBank', () => {
  it('makes one group per IFSC bank code with summed amounts and both sections', () => {
    const g = groupByBank(rankFreezeQueue(freezes, [], 30));
    expect(g.map((x) => x.key)).toEqual(['SBIN', 'UTIB']);
    const axis = g[1];
    expect(axis.rows.map((r) => r.nodeId).sort()).toEqual(['A', 'C']);
    expect(axis.totalInr).toBe(1_70_000);
    expect(axis.sections).toEqual(['106', '107']);
  });

  it('notice text names every account and the bank total in Indian format', () => {
    const [, axis] = groupByBank(rankFreezeQueue(freezes, [], 30));
    const text = buildBankNotice(
      { caseId: 'CASE-X', firNumber: 'FIR 1/2026', policeStation: 'PS', officer: 'IO', complainantName: 'V', complainantAccount: '…1' },
      axis, 'REF', new Date('2026-01-01T00:00:00Z'),
    );
    expect(text).toContain('Holder A');
    expect(text).toContain('Holder C');
    expect(text).toContain('₹1,70,000');
    expect(text).toContain('Section 106(1) and Section 107');
  });
});

import { describe, expect, it } from 'vitest';
import { buildDeskItems, buildIdentifierIndex, networkVictimFigure, normalizeIdentifier, searchIdentifiers, type DeskCase } from '../desk';
import { sumMoneyRows } from '../../../selectors/caseSelectors';
import type { FraudNetwork, NetworksResponse } from '../../triage/triage';

const member = (id: string, role: 'VICTIM' | 'MULE' | 'CASH_OUT' | 'UNKNOWN', kind = 'vpa') => ({ id, label: id, kind, role, mule_score: role === 'MULE' ? 0.9 : 0, hop: 1, why: '' });
const net = (id: string, members: ReturnType<typeof member>[], amount = 50000): FraudNetwork => ({
  network_id: id, member_count: members.length, amount_inr: amount, members,
  mule_count: members.filter((m) => m.role === 'MULE').length,
  victim_count: members.filter((m) => m.role === 'VICTIM').length,
});
const resp = (p: Partial<NetworksResponse>): NetworksResponse => ({ networks: [], review_queue: [], cross_case_hits: [], ...p });

describe('buildDeskItems', () => {
  it('returns nothing for quiet cases', () => {
    expect(buildDeskItems([{ caseId: 'C1', lifecycle: 'INVESTIGATING', jobs: [], networks: resp({}) }])).toEqual([]);
  });

  it('builds every kind, ordered action → unsplit → cross → identity → mapping → duplicate', () => {
    const cases: DeskCase[] = [
      { caseId: 'C1', jobs: [
        { job_id: '1', filename: 'a.csv', stage: 'NEEDS_MAPPING' },
        { job_id: '2', filename: 'b.csv', stage: 'DUPLICATE' },
        { job_id: '3', filename: 'c.csv', stage: 'NEEDS_MAPPING', is_cancelled: true },
      ] },
      { caseId: 'C2', lifecycle: 'ACTION_PENDING', networks: resp({
        networks: [net('N1', [member('m@ybl', 'MULE'), member('v@ok', 'VICTIM')], 80000)],
        review_queue: [{ a: 'R Kumar', b: 'Ramesh', confidence: 0.8, why: '' }],
        cross_case_hits: [{ identifier: 'x@ybl', kind: 'vpa', case_ids: ['C9'] }],
      }) },
    ];
    const items = buildDeskItems(cases);
    expect(items.map((i) => i.kind)).toEqual(['action', 'unsplit', 'cross', 'identity', 'mapping', 'duplicate']);
    expect(items.find((i) => i.kind === 'mapping')!.title).toBe('1 file in C1 needs its columns matched'); // cancelled job ignored
    expect(items.find((i) => i.kind === 'unsplit')).toMatchObject({ caseId: 'C2', view: 'triage', amount: 80000 });
    expect(items.find((i) => i.kind === 'cross')!.title).toContain('C9');
    expect(items.find((i) => i.kind === 'action')!.view).toBe('actions');
  });

  it('treats a network as already split when all its mules appear in another case', () => {
    const items = buildDeskItems([{ caseId: 'C2', networks: resp({
      networks: [net('N1', [member('m@ybl', 'MULE')]), net('N2', [member('v@ok', 'VICTIM')])],
      cross_case_hits: [{ identifier: 'm@ybl', kind: 'vpa', case_ids: ['C201'] }],
    }) }]);
    expect(items.filter((i) => i.kind === 'unsplit')).toEqual([]);
  });

  it('shows a cross-case link once, not from both sides', () => {
    const hit = (cid: string) => ({ identifier: 'm@ybl', kind: 'vpa', case_ids: [cid] });
    const items = buildDeskItems([
      { caseId: 'A', networks: resp({ cross_case_hits: [hit('B')] }) },
      { caseId: 'B', networks: resp({ cross_case_hits: [hit('A')] }) },
    ]);
    expect(items.filter((i) => i.kind === 'cross').map((i) => i.caseId)).toEqual(['A']);
  });

  it('puts bigger unsplit networks first', () => {
    const items = buildDeskItems([{ caseId: 'C', networks: resp({
      networks: [net('small', [member('a', 'MULE')], 1000), net('big', [member('b', 'MULE')], 900000)],
    }) }]);
    expect(items.map((i) => i.id)).toEqual(['C:net:big', 'C:net:small']);
  });
});

describe('identifier search', () => {
  const index = buildIdentifierIndex([
    { caseId: 'C1', networks: resp({ networks: [net('N1', [member('9876543210', 'VICTIM', 'phone'), member('mule1@ybl', 'MULE'), member('mule10@ybl', 'UNKNOWN')])] }) },
    { caseId: 'C2', networks: resp({ networks: [net('N2', [member('mule1@ybl', 'MULE'), member('xmule1@ybl', 'MULE')]), net('N3', [member('mule1@ybl', 'MULE')])] }) },
  ]);

  it('dedupes per case', () => {
    expect(index.filter((h) => h.identifier === 'mule1@ybl').map((h) => h.caseId)).toEqual(['C1', 'C2']);
  });

  it('ranks exact > prefix > contains', () => {
    expect(searchIdentifiers(index, 'mule1@ybl').map((h) => `${h.identifier}/${h.caseId}`)).toEqual([
      'mule1@ybl/C1', 'mule1@ybl/C2', 'xmule1@ybl/C2',
    ]);
    expect(searchIdentifiers(index, 'mule1').map((h) => h.identifier)).toEqual(['mule1@ybl', 'mule1@ybl', 'mule10@ybl', 'xmule1@ybl']);
  });

  it('matches phones written with +91, spaces or dashes', () => {
    expect(normalizeIdentifier('+91 98765-43210')).toBe('9876543210');
    expect(searchIdentifiers(index, '+91 98765 43210')[0].identifier).toBe('9876543210');
  });

  it('needs at least 3 characters', () => {
    expect(searchIdentifiers(index, 'mu')).toEqual([]);
  });
});

describe('networkVictimFigure', () => {
  it('rows are the victim → member links and add up to the network amount', () => {
    const nwk = {
      network_id: 'N1', member_count: 3, mule_count: 1, victim_count: 1, amount_inr: 70000,
      members: [
        { id: 'v', label: 'Victim A', kind: 'account', role: 'VICTIM', mule_score: 0, hop: 0, why: '' },
        { id: 'm', label: 'Mule B', kind: 'vpa', role: 'MULE', mule_score: 0.9, hop: 1, why: '' },
        { id: 'c', label: 'ATM', kind: 'account', role: 'CASH_OUT', mule_score: 0.5, hop: 2, why: '' },
      ],
      links: [['v', 'm', 70000], ['m', 'c', 50000]],
    } as const;
    const f = networkVictimFigure('C1', nwk as never);
    expect(f.rows.map((r) => [r.from, r.to])).toEqual([['Victim A', 'Mule B']]);
    expect(sumMoneyRows(f.rows)).toBe(f.totalInr);
  });
});

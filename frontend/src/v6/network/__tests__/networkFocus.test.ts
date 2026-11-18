import { describe, expect, it } from 'vitest';
import { CANONICAL_CASES } from '../../../fixtures/cases';
import { selectFinancialSummary } from '../../../selectors/caseSelectors';
import type { FraudNetwork, NetworkMember } from '../../triage/triage';
import { buildExplorerGraph, groupKey, layerGroups, layerKey, memberKey, type Palette } from '../networkGraph';
import {
  crossCaseByMember,
  crossCaseLinks,
  fixtureCaseHits,
  linkSentence,
  fixtureNetworks,
  focusSearch,
  memberFigure,
  networkFigure,
  networkTotals,
  parseFocus,
  resolveFocus,
} from '../networkFocus';

const m = (id: string, role: NetworkMember['role'], hop: number | null, mule_score = 0, held_inr = 0): NetworkMember => ({ id, label: id, kind: 'vpa', role, mule_score, hop, why: '', held_inr });
const net = (id: string, members: NetworkMember[], extra: Partial<FraudNetwork> = {}): FraudNetwork => ({
  network_id: id,
  member_count: members.length,
  mule_count: members.filter((x) => x.role === 'MULE').length,
  victim_count: members.filter((x) => x.role === 'VICTIM').length,
  amount_inr: 0,
  members,
  ...extra,
});
const A = net('NET-A', [m('v1', 'VICTIM', 0), m('m1', 'MULE', 1, 0.9), m('atm', 'CASH_OUT', 2)], { amount_inr: 500, cashed_out_inr: 300, recoverable_inr: 200 });
const B = net('NET-B', [m('v2', 'VICTIM', 0), m('m2', 'MULE', 1, 0.7)], { amount_inr: 100, cashed_out_inr: 0, recoverable_inr: 60, unaccounted_inr: 40 });

describe('focus in the URL', () => {
  it('parses and writes net/acct while keeping other params', () => {
    expect(parseFocus('?view=network&net=NET-A&acct=m1')).toEqual({ net: 'NET-A', acct: 'm1' });
    expect(parseFocus('?acct=m1')).toEqual({ net: null, acct: 'm1' }); // e.g. a link from another case
    expect(focusSearch('?view=network&case=C1', { net: 'NET-A', acct: 'm1' })).toBe('?view=network&case=C1&net=NET-A&acct=m1');
    expect(focusSearch('?view=network&net=NET-A&acct=m1', { net: null, acct: null })).toBe('?view=network');
  });
  it('resolves the zoom level and falls back on unknown ids', () => {
    expect(resolveFocus([A, B], { net: null, acct: null }).zoom).toBe('project');
    expect(resolveFocus([A, B], { net: 'NET-GONE', acct: null }).zoom).toBe('project'); // stale id after a case switch
    expect(resolveFocus([A, B], { net: 'NET-A', acct: 'nope' })).toMatchObject({ zoom: 'network', network: A });
    expect(resolveFocus([A, B], { net: 'NET-A', acct: 'm1' })).toMatchObject({ zoom: 'account', member: A.members[1] });
    expect(resolveFocus([B], { net: null, acct: null })).toMatchObject({ zoom: 'network', network: B }); // one gang → open it
    expect(resolveFocus([A, B], { net: null, acct: 'm2' })).toMatchObject({ zoom: 'account', network: B, member: B.members[1] }); // account alone finds its network
    expect(resolveFocus([A, B], { net: null, acct: 'nobody' }).zoom).toBe('project');
  });
});

describe('networkTotals', () => {
  it('sums the server split and reconciles', () => {
    const t = networkTotals([A, B]);
    expect(t).toMatchObject({ networks: 2, accounts: 5, mules: 2, victims: 2, paidIn: 600, cashedOut: 300, recoverable: 260, unaccounted: 40 });
    expect(t.cashedOut + t.recoverable + t.unaccounted).toBe(t.paidIn);
  });
});

describe('crossCaseByMember', () => {
  it('matches identifiers inside member labels, case-insensitively, deduped', () => {
    const hits = [
      { identifier: 'M1', kind: 'vpa', case_ids: ['C2', 'C3'] },
      { identifier: 'm1', kind: 'vpa', case_ids: ['C3', 'C4'] },
    ];
    const map = crossCaseByMember(A.members, hits);
    expect(map.get('m1')).toEqual(['C2', 'C3', 'C4']);
    expect(map.has('v1')).toBe(false);
  });
});

describe('layer sub-groups', () => {
  const P: Palette = { cool: '#000000', hot: '#ffffff', victim: '#00ff00', bubble: '#888888', edge: '#cccccc' };
  const victims = Array.from({ length: 100 }, (_, i) => m(`v${i}`, 'VICTIM', 0));
  const big = net('NET-BIG', [...victims, m('mx', 'MULE', 1, 1)], { links: victims.map((v) => [v.id, 'mx', 1000] as [string, string, number]) });
  it('folds a crowded layer into one "+N more" node and keeps money links', () => {
    expect(layerGroups(big, 40).get(0)!.hidden).toHaveLength(60);
    const g = buildExplorerGraph([big], new Set(['NET-BIG']), P, { layerCap: 40 });
    expect(g.order).toBe(40 + 1 + 1);
    expect(g.getNodeAttribute(groupKey('NET-BIG', 0), 'label')).toBe('+60 more victims');
    const grpEdge = `${groupKey('NET-BIG', 0)}>${memberKey('NET-BIG', 'mx')}`;
    expect(g.getEdgeAttribute(grpEdge, 'amount' as never)).toBe(60_000); // 60 hidden victims × ₹1,000
  });
  it('shows the whole layer once expanded, and never folds just one account', () => {
    const g = buildExplorerGraph([big], new Set(['NET-BIG']), P, { layerCap: 40, expandedLayers: new Set([layerKey('NET-BIG', 0)]) });
    expect(g.order).toBe(101);
    expect(layerGroups(big, 99).get(0)!.hidden).toHaveLength(0);
  });
  it('sizes bubbles by ₹ and colours them by the given status colour', () => {
    const g = buildExplorerGraph([A, B], new Set(), P, { bubbleColor: (n) => (n.network_id === 'NET-A' ? '#123456' : '#654321') });
    expect(g.getNodeAttribute('net:NET-A', 'size')).toBeGreaterThan(g.getNodeAttribute('net:NET-B', 'size'));
    expect(g.getNodeAttribute('net:NET-A', 'color')).toBe('#123456');
  });
});

describe('demo fixtures as a network', () => {
  const c = CANONICAL_CASES['CASE-2026-001'];
  const [n] = fixtureNetworks(c);
  it('uses the case record roles and the Money screen figures', () => {
    const fin = selectFinancialSummary(c);
    expect(n.amount_inr).toBe(fin.bookedLossInr);
    expect(n.recoverable_inr).toBe(fin.recoverableInr);
    expect(n.cashed_out_inr).toBe(fin.unrecoverableCashoutInr);
    expect(n.member_count).toBe(c.accounts.length);
    expect(n.members.filter((x) => x.role === 'VICTIM')).toHaveLength(1);
    expect(n.links!.length).toBeGreaterThan(0);
  });
  it('every figure opens real source rows', () => {
    const paid = networkFigure(c, n, 'paidIn');
    expect(paid.rows.length).toBeGreaterThan(0);
    expect(paid.rows.reduce((s, r) => s + r.amountInr, 0)).toBe(paid.totalInr);
    const mule = n.members.find((x) => x.role === 'MULE')!;
    const into = memberFigure(c, mule, 'in');
    expect(into.rows.every((r) => r.to === mule.label)).toBe(true);
    expect(into.totalInr).toBe(into.rows.reduce((s, r) => s + r.amountInr, 0));
  });
  it('returns nothing for a case record with no suspects', () => {
    expect(fixtureNetworks({ ...c, accounts: c.accounts.filter((a) => a.holderType === 'VICTIM') })).toEqual([]);
  });
});

describe('links to other cases', () => {
  const hits = [
    { identifier: 'm1', kind: 'vpa', case_ids: ['C-2', 'C-3'] },
    { identifier: 'atm', kind: 'account', case_ids: ['C-2'] },
    { identifier: 'outsider@ybl', kind: 'vpa', case_ids: ['C-9'] }, // not in scope → ignored
  ];
  it('groups shared identifiers by case, biggest overlap first, scoped to the members', () => {
    const links = crossCaseLinks(A.members, hits);
    expect(links.map((l) => [l.caseId, l.items.length])).toEqual([['C-2', 2], ['C-3', 1]]);
    expect(links[0].items[0].member?.id).toBe('m1');
    expect(linkSentence(links[0])).toBe('1 UPI ID and 1 bank account');
    expect(crossCaseLinks([A.members[0]], hits)).toEqual([]); // the victim alone shares nothing
  });
  it("uses a demo case record's own links as network-wide", () => {
    const c = CANONICAL_CASES['CASE-2026-001'];
    const h = fixtureCaseHits(c);
    expect(h.length).toBe(c.syndicateLinks.length);
    const links = crossCaseLinks([], h);
    expect(links[0].caseId).toBe(c.syndicateLinks[0].linkedCaseId);
    expect(linkSentence(links[0])).toMatch(/Wi-Fi router/);
  });
});

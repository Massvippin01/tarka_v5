import { describe, expect, it } from 'vitest';
import type { FreezeAction } from '../../../selectors/caseSelectors';
import { rankFreezeQueue, groupByBank, selectNoticeFrozen, type FreezeNotice } from '../freezeQueue';
import { actionProgress, bankKeyOf, courtChecklist, isCourtReady, noticeOverdue, rankActionQueue, resolveActionScope, type ActionNetwork } from '../actionPlan';
import { buildReport, hashChain, renderReportHtml } from '../../report/reportModel';
import { t, UNTRANSLATED_MARK } from '../../report/reportI18n';

const fa = (id: string, amount: number, ifsc = '', bank = ''): FreezeAction => ({
  nodeId: id, holderName: id, bank, accountMasked: id, ifsc, kind: 'MULE_HOLD', measure: '', receivedInr: amount, amountInr: amount,
});
const member = (id: string, last: number) => ({ id, label: id, kind: 'vpa', role: 'MULE' as const, mule_score: 1, hop: 1, why: '', last_ts: last });
const net = (id: string, members: ReturnType<typeof member>[], status?: 'NEW' | 'CASE_OPENED'): ActionNetwork => ({
  network_id: id, member_count: members.length, mule_count: members.length, victim_count: 1, amount_inr: 1000,
  cashed_out_inr: 600, recoverable_inr: 400, unaccounted_inr: 0, members,
  triage: status ? { network_id: id, status, decision: null, reason: null, target_case_id: null, updated_by: null, updated_at: null } : undefined,
});
const notice = (id: string, ids: string[], status: FreezeNotice['status'], sentAt: string, extra: Partial<FreezeNotice> = {}): FreezeNotice => ({
  id, bank: 'b', ifscPrefix: 'x', sections: ['107'], accountIds: ids, referenceNo: id, status, sentAt, acknowledgedAt: null, frozenAt: null, refusedAt: null, ...extra,
});

const DAY = 86400;
const nets = [net('N1', [member('a@ybl', 10 * DAY), member('b@ybl', 9 * DAY)], 'CASE_OPENED'), net('N2', [member('c@oksbi', 10 * DAY)])];
const freezes = [fa('a@ybl', 100), fa('b@ybl', 300), fa('c@oksbi', 50), fa('d', 70, 'HDFC0001234', 'HDFC Bank')];
const NOW = Date.parse('2026-11-17T12:00:00Z');

describe('action plan selectors', () => {
  it('resolves the URL focus to project / network / account and falls back on unknown ids', () => {
    expect(resolveActionScope(nets, { networkId: null, account: null }).level).toBe('project');
    const n = resolveActionScope(nets, { networkId: 'N1', account: null });
    expect(n.level).toBe('network');
    expect(n.keys?.has('b@ybl')).toBe(true);
    const a = resolveActionScope(nets, { networkId: null, account: 'C@OKSBI' });
    expect([a.level, a.network?.network_id]).toEqual(['account', 'N2']);
    expect(resolveActionScope(nets, { networkId: 'GONE', account: null }).level).toBe('project');
  });

  it('groups by IFSC when present, else by UPI handle with "bank not known"', () => {
    expect(bankKeyOf({ ifsc: 'HDFC0001234', bank: 'HDFC Bank', holderName: 'x', accountMasked: '' })).toEqual({ key: 'HDFC', label: 'HDFC Bank', known: true });
    expect(bankKeyOf({ ifsc: '', bank: '', holderName: 'mule1@YBL', accountMasked: '' })).toMatchObject({ key: '@ybl', known: false });
    expect(bankKeyOf({ ifsc: '', bank: '', holderName: 'Ravi', accountMasked: '' }).label).toBe('Bank not known');
    const groups = groupByBank(rankFreezeQueue(freezes, [], 0));
    expect(groups.map((g) => g.key).sort()).toEqual(['@oksbi', '@ybl', 'HDFC']);
    expect(groups.find((g) => g.key === '@ybl')!.totalInr).toBe(400);
  });

  it('ranks by recoverable ₹ × urgency: stale and already-sent accounts drop', () => {
    const scope = resolveActionScope(nets, { networkId: 'N1', account: null });
    const sentA = notice('FN1', ['b@ybl'], 'SENT', new Date(NOW - 10 * 60_000).toISOString());
    const ranked = rankActionQueue(rankFreezeQueue(freezes, [sentA], 0), scope, NOW);
    // b holds more, but it's already sent (0.5) and a day stale (×0.5) → 75; a: 100 × 1 × 1
    expect(ranked.map((r) => r.nodeId)).toEqual(['a@ybl', 'b@ybl']);
    expect(ranked[1].score).toBeCloseTo(75);
    expect(ranked[0].why).toMatch(/No notice sent/);
  });

  it('flags overdue banks and splits a bank-reported frozen amount pro rata', () => {
    const old = new Date(NOW - 3 * 3600_000).toISOString();
    expect(noticeOverdue(notice('x', [], 'SENT', old), NOW)).toBe('ack');
    expect(noticeOverdue(notice('x', [], 'SENT', new Date(NOW).toISOString()), NOW)).toBeNull();
    const frozen = notice('F', ['a@ybl', 'b@ybl'], 'FROZEN', old, { frozenInr: 200 });
    expect(Object.fromEntries(selectNoticeFrozen(freezes, [frozen]))).toEqual({ 'a@ybl': 50, 'b@ybl': 150 });
    const scope = resolveActionScope(nets, { networkId: null, account: null });
    const p = actionProgress(rankActionQueue(rankFreezeQueue(freezes, [frozen], 0), scope, NOW), scope);
    expect(p).toMatchObject({ requestedInr: 400, frozenInr: 200, notSentInr: 120, networksDecided: 1, networksTotal: 2 });
  });

  it('lists what is missing before court and is ready only when all is done', () => {
    const scope = resolveActionScope(nets, { networkId: 'N1', account: null });
    const sent = [notice('A', ['a@ybl'], 'SENT', new Date(NOW - 3 * 3600_000).toISOString()), notice('B', ['b@ybl'], 'SENT', new Date(NOW).toISOString())];
    const rows = rankActionQueue(rankFreezeQueue(freezes, sent, 0), scope, NOW);
    const money = { paidIn: 1000, recoverable: 400, cashedOut: 600, unaccounted: 0 };
    const items = courtChecklist(rows, sent, scope, { files: 2, fingerprinted: 2 }, money, String, NOW);
    expect(items.find((i) => i.id === 'acks')!.text).toBe('2 bank acknowledgements pending (1 overdue)');
    expect(isCourtReady(items)).toBe(false);
    const done = sent.map((n) => ({ ...n, status: 'FROZEN' as const }));
    const ok = courtChecklist(rankActionQueue(rankFreezeQueue(freezes, done, 0), scope, NOW), done, scope, { files: 2, fingerprinted: 2 }, money, String, NOW);
    expect(isCourtReady(ok)).toBe(true);
    expect(courtChecklist(rows, [], scope, { files: 1, fingerprinted: 1 }, { ...money, recoverable: 300 }, String, NOW).find((i) => i.id === 'money')!.ok).toBe(false);
  });
});

describe('court report', () => {
  const scope = resolveActionScope(nets, { networkId: null, account: null });
  const queue = rankActionQueue(rankFreezeQueue(freezes, [], 0), scope, NOW);
  const input = {
    caseId: 'C1', firNumber: 'FIR 1', policeStation: 'PS', officer: 'IO <x>', complainant: 'V', scope: 'case' as const, scopeName: 'C1',
    figures: [{ id: 'F1', label: 'paidIn' as const, figure: { label: 'p', totalInr: 1000, rows: [] } }],
    queue, checklist: [], evidence: [{ name: 'a.csv', sha256: 'ab' }], generatedAt: new Date(NOW), fmt: (n: number) => `₹${n}`,
  };

  it('hash chain changes from the edited section onwards', async () => {
    const a = await hashChain(buildReport(input, 'en'));
    const b = await hashChain(buildReport({ ...input, evidence: [{ name: 'a.csv', sha256: 'cd' }] }, 'en'));
    const idx = a.findIndex((l) => l.id === 'evidence');
    expect(a.slice(0, idx).map((l) => l.hash)).toEqual(b.slice(0, idx).map((l) => l.hash));
    expect(a[idx].hash).not.toBe(b[idx].hash);
    expect(a.at(-1)!.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('Hindi uses the table and marks untranslated legal wording instead of inventing it', () => {
    const hi = buildReport(input, 'hi');
    expect(hi[0].title).toBe('जाँच रिपोर्ट');
    expect(hi.find((s) => s.id === 'notices')!.rows[0][2]).toContain(UNTRANSLATED_MARK);
    expect(t('sec107', 'hi')).toBe(`${t('sec107', 'en')} ${UNTRANSLATED_MARK}`);
  });

  it('escapes case data in the printable HTML', () => {
    const html = renderReportHtml(buildReport(input, 'en'), [], 'en', 'IO <x>');
    expect(html).toContain('IO &lt;x&gt;');
    expect(html).not.toContain('IO <x>');
  });
});

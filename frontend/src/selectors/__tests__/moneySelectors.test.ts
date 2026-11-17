import { describe, it, expect } from 'vitest';
import type { Net } from '../../v6/network/NetworkPanels';
import type { NetworkMember } from '../../v6/triage/triage';
import { resolveCase, selectFinancialSummary } from '../caseSelectors';
import { bundleToCaseFixture } from '../bundleAdapter';
import { fixtureNetworks } from '../../v6/network/networkFocus';
import {
  reconcileGap,
  replayAt,
  selectDoctrine,
  selectFlowGraph,
  selectFreezeQueue,
  selectMoneyScope,
  selectReplay,
  withTimes,
} from '../moneySelectors';

const H = 3600;
const mem = (id: string, role: NetworkMember['role'], hop: number, extra: Partial<NetworkMember> = {}): NetworkMember => ({
  id, label: id, kind: 'account', role, mule_score: role === 'MULE' ? 0.9 : 0, hop, why: '', ...extra,
});

/** One gang: `v` victims → `m1` first-layer mules → `m2` second-layer mules → ATM. */
function gang(id: string, v: number, m1: number, m2: number): Net {
  const members: NetworkMember[] = [];
  const links: [string, string, number][] = [];
  for (let i = 0; i < v; i++) members.push(mem(`${id}v${i}`, 'VICTIM', 0, { out_inr: 1000, first_ts: i * H }));
  for (let i = 0; i < m1; i++) members.push(mem(`${id}a${i}`, 'MULE', 1, { in_inr: 1000, held_inr: 100 * (i + 1), first_ts: 2 * H, last_ts: 10 * H - i * H }));
  for (let i = 0; i < m2; i++) members.push(mem(`${id}b${i}`, 'MULE', 2, { in_inr: 500, held_inr: 0, first_ts: 3 * H, last_ts: 4 * H }));
  members.push(mem(`${id}atm`, 'CASH_OUT', 3, { in_inr: 5000, first_ts: 5 * H }));
  for (let i = 0; i < v; i++) links.push([`${id}v${i}`, `${id}a${i % m1}`, 1000]);
  for (let i = 0; i < m2; i++) links.push([`${id}a${i % m1}`, `${id}b${i}`, 500]);
  for (let i = 0; i < m2; i++) links.push([`${id}b${i}`, `${id}atm`, 500]);
  links.push([`${id}b0`, `${id}a0`, 10]); // backwards: must not be drawn
  const recoverable = members.reduce((s, m) => s + (m.held_inr ?? 0), 0);
  const loss = v * 1000;
  return {
    network_id: id, member_count: members.length, mule_count: m1 + m2, victim_count: v,
    amount_inr: loss, recoverable_inr: recoverable, cashed_out_inr: loss - recoverable - 50, unaccounted_inr: 50,
    members, links,
  };
}

describe('moneySelectors', () => {
  const nets = [gang('A', 6, 3, 2), gang('B', 4, 2, 1)];

  it('scopes the hero to the zoom level and it always reconciles', () => {
    const p = selectMoneyScope(nets, { net: null, acct: null });
    expect(p.level).toBe('project');
    expect(p.lossInr).toBe(10000);
    expect(reconcileGap(p)).toBe(0);
    const n = selectMoneyScope(nets, { net: 'B', acct: null });
    expect(n.level).toBe('network');
    expect(n.lossInr).toBe(4000);
    expect(reconcileGap(n)).toBe(0);
    const a = selectMoneyScope(nets, { net: 'A', acct: 'Aa1' });
    expect(a.level).toBe('account');
    expect(a.recoverableInr).toBe(200);
    expect(a.members.map((m) => m.id).sort()).toEqual(['Aa1', 'Ab1', 'Av1', 'Av4'].sort());
  });

  it('draws every account for small gangs, never loops back', () => {
    const g = selectFlowGraph(selectMoneyScope(nets, { net: 'A', acct: null }));
    expect(g.grouped).toBe(false);
    expect(g.boxes.find((b) => b.id === 'held')).toBeTruthy();
    const depth = new Map(g.boxes.map((b) => [b.id, b.depth]));
    for (const l of g.links) expect(depth.get(l.target)!).toBeGreaterThan(depth.get(l.source)!);
    expect(g.hiddenLinks).toBe(1);
  });

  it('groups big networks by layer and stays under 30 boxes even with every layer opened', () => {
    const big = [gang('X', 300, 2000, 400)];
    const s = selectMoneyScope(big, { net: 'X', acct: null });
    const closed = selectFlowGraph(s);
    expect(closed.grouped).toBe(true);
    expect(closed.boxes.map((b) => b.kind)).not.toContain('account');
    const open = selectFlowGraph(s, new Set(['victims', 'L1', 'L2', 'exit'] as const));
    expect(open.boxes.length).toBeLessThanOrEqual(31);
    expect(open.boxes.some((b) => b.kind === 'more' && b.count! > 1000)).toBe(true);
    // money into "still in mule accounts" equals the network's recoverable figure
    const held = open.links.filter((l) => l.target === 'held').reduce((a, l) => a + l.value, 0);
    expect(held).toBe(s.recoverableInr);
  });

  it('replays money arriving layer by layer', () => {
    const r = selectReplay(selectMoneyScope(nets, { net: 'A', acct: null }))!;
    expect(r.start).toBe(0);
    expect(r.firstExit).toBe(5 * H);
    const early = replayAt(r, 2 * H);
    expect(early.victims.accounts).toBe(3);
    expect(early.L1.amount).toBe(6010); // 6 × ₹1,000 from victims + ₹10 sent back up by a 2nd-layer mule
    expect(early.exit.amount).toBe(0);
    expect(replayAt(r, r.end).exit.amount).toBe(1000); // only money from network members, not the ATM's whole in_inr
    expect(replayAt(r, r.end).victims.amount).toBe(6000); // = network loss
  });

  it('replay victim total equals booked loss for an uploaded case (shop payments left out)', () => {
    const f = bundleToCaseFixture(
      {
        caseId: 'C-REPLAY', dataSource: 'UPLOADED', bookedLossInr: 50000, cashedOutInr: 49000, recoverableLibrInr: 1000, unaccountedInr: 0,
        nodes: [{ id: 'N1', label: 'victim1@okaxis' }, { id: 'N2', label: 'mule1@ybl' }, { id: 'N3', label: 'cashout9@ibl' }],
        edges: [
          { id: 'E1', source: 'N1', target: 'N2', amountInr: 50000, txnCount: 2, firstSeenEpoch: 1790000000 },
          { id: 'E2', source: 'N2', target: 'N3', amountInr: 49000, txnCount: 1, firstSeenEpoch: 1790001000 },
        ],
      },
      null,
    );
    const net: Net = {
      network_id: 'NET-1', member_count: 4, mule_count: 1, victim_count: 1,
      amount_inr: 50000, cashed_out_inr: 49000, recoverable_inr: 1000, unaccounted_inr: 0,
      members: [
        // victim also paid ₹10,000 to an ordinary shop: in out_inr, but not part of the loss
        mem('victim1@okaxis', 'VICTIM', 0, { out_inr: 60000, first_ts: 1790000000 }),
        mem('mule1@ybl', 'MULE', 1, { in_inr: 50000, held_inr: 1000, first_ts: 1790000100 }),
        mem('cashout9@ibl', 'CASH_OUT', 2, { in_inr: 49000, first_ts: 1790001000 }),
        mem('shop@hdfc', 'UNKNOWN', 1, { in_inr: 10000, first_ts: 1790000200 }),
      ],
      links: [['victim1@okaxis', 'mule1@ybl', 50000], ['victim1@okaxis', 'shop@hdfc', 10000], ['mule1@ybl', 'cashout9@ibl', 49000]],
    };
    const r = selectReplay(selectMoneyScope([net], { net: null, acct: null }))!;
    const end = replayAt(r, r.end);
    expect(end.victims.amount).toBe(selectFinancialSummary(f).bookedLossInr);
    expect(end.exit.amount).toBe(49000);
  });

  it('ranks freezes by money held × how recently it moved', () => {
    const q = selectFreezeQueue(selectMoneyScope(nets, { net: 'A', acct: null }));
    expect(q.map((i) => i.member.id)).toEqual(['Aa2', 'Aa1', 'Aa0']); // all moved recently; most money first
    expect(q[0].urgency).toBeLessThan(1);
    expect(q.every((i) => i.heldInr > 0)).toBe(true);
  });

  it('doctrine: uploaded data → all rules equal the held money, LIBR recommended', () => {
    const c = resolveCase('CASE-2026-001')!;
    const s = selectMoneyScope(nets, { net: 'A', acct: null });
    const d = selectDoctrine({ ...c, financials: { ...c.financials, frozenMuleBalanceInr: 0, shieldedCommercialInr: 0 } }, s);
    expect(d.map((o) => o.recoverableInr)).toEqual([600, 600, 600]);
    expect(d.filter((o) => o.recommended).map((o) => o.key)).toEqual(['LIBR']);
  });

  it('demo case: hero equals the case record, with timing filled from its transactions', () => {
    const c = resolveCase('CASE-2026-001')!;
    const demo = withTimes(c, fixtureNetworks(c));
    const s = selectMoneyScope(demo, { net: null, acct: null });
    expect(s.lossInr).toBe(c.financials.bookedLossInr);
    expect(s.recoverableInr).toBe(c.financials.recoverableLibrInr);
    expect(selectReplay(s)).not.toBeNull();
    expect(selectDoctrine(c, s)[0].recoverableInr).toBe(c.financials.recoverableLibrInr);
    // freeze list and the diagram's "can still be frozen" box both add up to the hero figure (mules + merchant lien)
    expect(selectFreezeQueue(s).reduce((a, i) => a + i.heldInr, 0)).toBe(s.recoverableInr);
    const held = selectFlowGraph(s).links.filter((l) => l.target === 'held').reduce((a, l) => a + l.value, 0);
    expect(held).toBe(s.recoverableInr);
  });
});

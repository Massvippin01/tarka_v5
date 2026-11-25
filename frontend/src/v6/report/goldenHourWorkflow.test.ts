import { describe, expect, it } from 'vitest';
import { buildReport } from './reportModel';
import { rankFreezeQueue } from '../freeze/freezeQueue';
import { rankActionQueue, resolveActionScope, actionProgress } from '../freeze/actionPlan';

describe('Golden-hour workflow helpers', () => {
  it('builds English and Hindi reports for project scope with money paths and controller evidence', () => {
    const baseInput = {
      caseId: 'CASE-DEMO-1M',
      firNumber: 'NCRP-2026-990001',
      policeStation: 'Cyber Crime PS',
      officer: 'Insp. Vikram Rathore',
      complainant: 'Raghavendra Rao',
      scope: 'project' as const,
      scopeName: 'Operation Jamtara · 50-Gang Demo',
      figures: [
        {
          id: 'F1',
          label: 'paidIn' as const,
          figure: { label: 'Paid in', totalInr: 500000, rows: [] },
        },
      ],
      queue: [],
      checklist: [{ id: 'evidence' as const, ok: true, text: '2 files fingerprinted', hint: '' }],
      evidence: [{ name: 'demo_bank_statements.csv', sha256: 'a'.repeat(64) }],
      moneyPaths: [
        {
          victim: 'victim0_0@oksbi',
          path: ['victim0_0@oksbi', 'mule0_a0@okaxis', 'mule0_b0@ybl'],
          amountInr: 180000,
          outcome: 'Still held in account',
          heldInr: 120000,
        },
      ],
      controllers: [
        {
          networkId: 'NET-001',
          controllerId: 'CTRL-001',
          sharedIdentifiers: 'IMEI:358911090000001',
          accounts: ['mule0_a0@okaxis', 'mule0_b0@ybl'],
          reason: '14 mule accounts operated from 2 phones',
        },
      ],
      projectCases: [
        {
          caseId: 'CASE-DEMO-1M',
          title: 'Active case',
          stage: 'INVESTIGATING',
          assignee: 'Insp. Vikram Rathore',
          bookedInr: 500000,
          recoverableInr: 250000,
        },
      ],
      generatedAt: new Date('2026-09-10T10:00:00Z'),
      fmt: (n: number) => `₹${n.toLocaleString('en-IN')}`,
    };

    const en = buildReport(baseInput, 'en');
    expect(en.some((s) => s.id === 'project-cases')).toBe(true);
    expect(en.some((s) => s.id === 'money-paths')).toBe(true);
    expect(en.some((s) => s.id === 'controllers')).toBe(true);
    expect(en[0].rows.find((r) => r[0] === 'Covers')?.[1]).toContain('Whole project');

    const hi = buildReport(baseInput, 'hi');
    expect(hi.find((s) => s.id === 'money-paths')?.title).toContain('धन मार्ग');
    expect(hi.find((s) => s.id === 'controllers')?.title).toContain('नियंत्रण समूह');
    expect(hi.find((s) => s.id === 'project-cases')?.title).toContain('प्रोजेक्ट के मामले');
  });

  it('tracks RELEASED freeze notice status cleanly with zero residual freeze value', () => {
    const queue = rankFreezeQueue(
      [
        {
          nodeId: 'mule0_a0@okaxis',
          holderName: 'mule0_a0@okaxis',
          accountMasked: 'mule0_a0@okaxis',
          bank: 'Axis Bank',
          ifsc: 'UTIB0000101',
          kind: 'MULE_HOLD',
          measure: 'Debit freeze',
          receivedInr: 95000,
          amountInr: 95000,
        },
      ],
      [
        {
          id: 'FN-REL1',
          bank: 'Axis Bank',
          ifscPrefix: 'UTIB',
          sections: ['107'],
          accountIds: ['mule0_a0@okaxis'],
          referenceNo: 'CASE/BNSS-107/UTIB/20260910',
          status: 'RELEASED',
          sentAt: '2026-09-10T09:10:00Z',
          acknowledgedAt: '2026-09-10T09:20:00Z',
          frozenAt: '2026-09-10T09:40:00Z',
          releasedAt: '2026-09-12T11:00:00Z',
          refusedAt: null,
          frozenInr: 95000,
          note: 'Magistrate order',
        },
      ],
      120,
    );
    expect(queue[0].status).toBe('RELEASED');
    expect(queue[0].recoverableInr).toBe(0);

    const scope = resolveActionScope([], { networkId: null, account: null });
    const ranked = rankActionQueue(queue, scope, Date.now());
    expect(ranked[0].freezeValueInr).toBe(0);
    expect(ranked[0].why).toContain('Released');
    const prog = actionProgress(ranked, scope);
    expect(prog.requestedInr).toBe(95000);
  });
});

import { describe, expect, it } from 'vitest';
import { CANONICAL_CASES, type CanonicalCaseFixture } from '../../fixtures/cases';
import { buildLoom, formatSpan, laneForTrack, MAX_TXN_DOTS } from '../timelineSelectors';
import { pct, summarizeRuns, type ScaleRun } from '../benchmarkSelectors';

describe('buildLoom', () => {
  it('uses only the active case and measures the key gaps', () => {
    for (const c of Object.values(CANONICAL_CASES)) {
      const v = buildLoom(c);
      expect(v.events.length).toBe(c.timelineEvents.length);
      expect(v.events.every((e) => e.source.includes(c.timelineEvents.find((t) => t.eventId === e.id)!.eventId))).toBe(true);
      expect(v.gaps.find((g) => g.id === 'loss-to-complaint')?.ms ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it('falls back to transactions for uploaded cases, capped, salary excluded', () => {
    const base = CANONICAL_CASES['CASE-2026-001'];
    const t0 = base.transactions[0];
    const txns = Array.from({ length: MAX_TXN_DOTS + 5 }, (_, i) => ({
      ...t0,
      id: `T${i}`,
      category: i === 0 ? ('SALARY_CREDIT' as const) : ('VICTIM_DRAIN' as const),
      timestampUtc: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    const uploaded: CanonicalCaseFixture = { ...base, timelineEvents: [], transactions: txns };
    const v = buildLoom(uploaded);
    expect(v.events).toHaveLength(MAX_TXN_DOTS);
    expect(v.hiddenTxns).toBe(4);
    expect(v.events.some((e) => e.id === 'T0')).toBe(false);
    expect(v.lanes.map((l) => l.id)).toEqual(['money']);
    expect(v.gaps).toEqual([]); // no contact / complaint / cash-out → no invented gaps
  });

  it('empty case gives an empty view', () => {
    const v = buildLoom({ ...CANONICAL_CASES['CASE-2026-001'], timelineEvents: [], transactions: [] });
    expect(v.events).toEqual([]);
    expect(v.lanes).toEqual([]);
  });

  it('maps tracks to plain lanes', () => {
    expect(laneForTrack('NCRP_1930', 'COMPLAINT')).toBe('complaint');
    expect(laneForTrack('ATM_TOWER', 'CASHOUT')).toBe('money');
    expect(laneForTrack('WHATSAPP_APK', 'ALERT')).toBe('contact');
    expect(laneForTrack('STATUTORY_ACTION', 'RECOVERY')).toBe('police');
  });

  it('formats spans', () => {
    expect(formatSpan(45 * 60000)).toBe('45 min');
    expect(formatSpan(190 * 60000)).toBe('3 h 10 min');
    expect(formatSpan(52 * 3600000)).toBe('2 days 4 h');
  });
});

describe('summarizeRuns', () => {
  const run = (rows: number, ran_at: string, p = 1, r = 1): ScaleRun => ({
    rows, gangs: 10, file_mb: 1, ingest_s: 1, ingest_rows_per_s: 50_000, analyze_s: 1, analyze_peak_mb: 5,
    mules_true: 10, mules_flagged: 10, true_positives: 10, precision: p, recall: r, gangs_in_own_network: '10/10',
    synthetic: true, ran_at, tool: 'validate_mule_scoring.py',
  });

  it('is empty with no runs', () => {
    expect(summarizeRuns([])).toEqual({ latest: null, largest: null, allPerfect: false });
  });

  it('picks latest and largest separately', () => {
    const s = summarizeRuns([run(200_000, '2026-11-01'), run(50_000, '2026-11-18', 0.9)]);
    expect(s.latest?.rows).toBe(50_000);
    expect(s.largest?.rows).toBe(200_000);
    expect(s.allPerfect).toBe(false);
    expect(pct(0.983)).toBe('98.3%');
  });
});

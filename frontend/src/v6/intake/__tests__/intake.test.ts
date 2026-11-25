import { describe, expect, it } from 'vitest';
import type { FraudNetwork } from '../../triage/triage';
import {
  DEFAULT_READ_BPS,
  NETWORK_BPS,
  buildCreateRequest,
  fileStep,
  intakeCounts,
  intakeHeadline,
  liveReadBps,
  overallProgress,
  processingLeft,
  pruneSelection,
  toggleAll,
  toggleId,
  type ProgressItem,
} from '../intake';

const net = (id: string, action?: 'NEW_CASE' | 'ATTACH' | 'MINOR', status: NonNullable<FraudNetwork['triage']>['status'] = 'NEW'): FraudNetwork => ({
  network_id: id,
  member_count: 3,
  mule_count: 2,
  victim_count: 1,
  amount_inr: 100000,
  members: [],
  triage: { network_id: id, status, decision: null, reason: null, target_case_id: null, updated_by: null, updated_at: null },
  proposal: action ? { action, suggested_title: `Gang ${id}`, attach_case_id: action === 'ATTACH' ? 'CASE-2026-002' : undefined } : undefined,
});

describe('intake headline', () => {
  it('counts only open proposals by action', () => {
    const nets = [net('a', 'NEW_CASE'), net('b', 'NEW_CASE'), net('c', 'ATTACH'), net('d', 'MINOR'), net('e', 'NEW_CASE', 'CASE_OPENED'), net('f', 'MINOR', 'CLOSED'), net('g')];
    const c = intakeCounts(5, nets);
    expect(c).toEqual({ files: 5, gangs: 4, newCases: 2, attach: 1, minor: 1, handled: 2 });
    expect(intakeHeadline(c)).toBe('5 files · 4 gangs found · 2 new cases · 1 matches an existing case · 1 minor');
  });
  it('leaves out zero parts and pluralises', () => {
    expect(intakeHeadline({ files: 1, gangs: 0, newCases: 0, attach: 0, minor: 0 })).toBe('1 file · 0 gangs found');
    expect(intakeHeadline({ files: 2, gangs: 0, newCases: 0, attach: 0, minor: 0, handled: 56 })).toBe('2 files · all 56 gangs filed');
    expect(intakeHeadline({ files: 5, gangs: 12, newCases: 7, attach: 3, minor: 2 })).toBe('5 files · 12 gangs found · 7 new cases · 3 match existing cases · 2 minor');
  });
});

describe('selection', () => {
  it('toggles one id and all ids', () => {
    let s = toggleId(new Set(), 'a');
    expect([...s]).toEqual(['a']);
    s = toggleId(s, 'a');
    expect(s.size).toBe(0);
    expect([...toggleAll(new Set(['a']), ['a', 'b'])].sort()).toEqual(['a', 'b']);
    expect(toggleAll(new Set(['a', 'b']), ['a', 'b']).size).toBe(0);
    expect(toggleAll(new Set(), []).size).toBe(0);
  });
  it('prunes ids that are no longer rows', () => {
    expect([...pruneSelection(new Set(['a', 'x']), ['a', 'b'])]).toEqual(['a']);
  });
});

describe('create-cases payload', () => {
  const nets = [net('a', 'NEW_CASE'), net('b', 'ATTACH'), net('c', 'MINOR', 'CASE_OPENED'), net('d')];
  it('sends only open proposals, deduped', () => {
    expect(buildCreateRequest(['a', 'b', 'a', 'c', 'd', 'zz'], {}, nets)).toEqual({ network_ids: ['a', 'b'] });
  });
  it('sends only real title edits, trimmed', () => {
    expect(buildCreateRequest(['a', 'b'], { a: '  Jamtara call centre ', b: 'Gang b' }, nets)).toEqual({
      network_ids: ['a', 'b'],
      titles: { a: 'Jamtara call centre' },
    });
    expect(buildCreateRequest(['a'], { a: '   ' }, nets)).toEqual({ network_ids: ['a'] });
  });
});

describe('overall progress', () => {
  const MB = 1_000_000;
  const reading = (size: number, eta: number, bytesDone: number, elapsed: number, rows: number): ProgressItem => ({
    state: 'processing', size, bytesSent: size, speedBps: 0,
    status: { processing: { step: 'READING_ROWS', rows, eta_seconds: eta, bytes_done: bytesDone, elapsed_seconds: elapsed, pct: 50 } },
  });

  it('sums bytes and rows and says when all are done', () => {
    const p = overallProgress([
      { state: 'uploading', size: 1000, bytesSent: 400, speedBps: 100 },
      { state: 'ready', size: 500, bytesSent: 500, speedBps: 0, status: { analytics_summary: { rows_accepted: 1200 } } },
    ]);
    expect(p).toMatchObject({ files: 2, finished: 1, ready: 1, bytes: 1500, sent: 900, rows: 1200, allDone: false });
    expect(overallProgress([{ state: 'ready', size: 1, bytesSent: 1, speedBps: 0 }, { state: 'rejected', size: 1, bytesSent: 0, speedBps: 0 }]).allDone).toBe(true);
    expect(overallProgress([]).allDone).toBe(false);
    expect(overallProgress([{ state: 'ready', size: 10, bytesSent: 10, speedBps: 0 }]).etaSeconds).toBeNull();
  });

  it('ETA = upload left + reading left of the file being read + unstarted files scaled by the live read speed + finding gangs', () => {
    const items: ProgressItem[] = [
      reading(74 * MB, 4, 37 * MB, 4, 500_000), // live speed 9.25 MB/s, 4 s of reading left
      { state: 'processing', size: 37 * MB, bytesSent: 37 * MB, speedBps: 0, status: { processing: { step: 'WAITING' } } },
      { state: 'uploading', size: 30 * MB, bytesSent: 10 * MB, speedBps: 10 * MB },
      { state: 'ready', size: 5 * MB, bytesSent: 5 * MB, speedBps: 0, status: { processing: { step: 'DONE', rows: 70_000 } } },
    ];
    expect(liveReadBps(items)).toBe(9.25 * MB);
    const upload = (20 * MB) / (10 * MB); // 2 s
    const read = 4 + (37 * MB) / (9.25 * MB) + (30 * MB) / (9.25 * MB);
    const nets = (74 + 37 + 30) * MB / NETWORK_BPS;
    const p = overallProgress(items);
    expect(p.etaSeconds).toBeCloseTo(upload + read + nets, 6);
    expect(p.rows).toBe(570_000);
    expect(p.ready).toBe(1);
  });

  it('is unknown while bytes remain but nothing is uploading, and uses the default speed before any file is read', () => {
    expect(overallProgress([{ state: 'paused', size: 10, bytesSent: 5, speedBps: 0 }]).etaSeconds).toBeNull();
    const waiting: ProgressItem = { state: 'verifying', size: 18 * MB, bytesSent: 18 * MB, speedBps: 0 };
    expect(liveReadBps([waiting])).toBe(DEFAULT_READ_BPS);
    expect(processingLeft(waiting, DEFAULT_READ_BPS)).toBeCloseTo(18 * MB / DEFAULT_READ_BPS + 18 * MB / NETWORK_BPS, 6);
  });

  it('maps server steps to the step chips', () => {
    const at = (step: 'WAITING' | 'READING_ROWS' | 'FINDING_NETWORKS' | 'DONE') =>
      fileStep({ state: 'processing', size: 1, bytesSent: 1, speedBps: 0, status: { processing: { step } } });
    expect([at('WAITING'), at('READING_ROWS'), at('FINDING_NETWORKS'), at('DONE')]).toEqual(['waiting', 'read', 'networks', 'ready']);
    expect(fileStep({ state: 'uploading', size: 1, bytesSent: 0, speedBps: 0 })).toBe('upload');
    expect(fileStep({ state: 'verifying', size: 1, bytesSent: 1, speedBps: 0 })).toBe('check');
    expect(fileStep({ state: 'attention', size: 1, bytesSent: 1, speedBps: 0 })).toBe('attention');
  });
});

describe('intake label (Projects / Inbox)', () => {
  it('shows the open count until every proposal is handled', async () => {
    const { intakeLabel } = await import('../intake');
    expect(intakeLabel([net('a', 'NEW_CASE'), net('b', 'ATTACH'), net('c', 'MINOR', 'CLOSED')])).toBe('Intake — review 2 proposed cases');
    expect(intakeLabel([net('a', 'NEW_CASE', 'CASE_OPENED'), net('g')])).toBeNull();
  });
});

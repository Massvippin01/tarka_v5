import { describe, expect, it } from 'vitest';
import { doneSummary, elapsedSeconds, failureText, panelView, resetRequestBody } from '../resetDemoModel';

describe('resetDemoModel', () => {
  it('maps size to request body', () => {
    expect(resetRequestBody('quick')).toEqual({ rows: 200_000, small: true });
    expect(resetRequestBody('full')).toEqual({ rows: 1_000_000, small: false });
  });
  it('picks the panel view from status', () => {
    expect(panelView(null)).toBe('confirm');
    expect(panelView({ state: 'idle' })).toBe('confirm');
    expect(panelView({ state: 'running' })).toBe('progress');
    expect(panelView({ state: 'done' })).toBe('done');
    expect(panelView({ state: 'failed' })).toBe('failed');
  });
  it('says where the old data is on failure', () => {
    expect(failureText({ state: 'failed', error: 'boom', backup_path: 'D:/_backup_1' })).toContain('safe at D:/_backup_1');
    expect(failureText({ state: 'failed', error: 'boom' })).toContain('not changed');
  });
  it('computes elapsed and summary', () => {
    expect(elapsedSeconds({ state: 'running', started_at: 100 }, 142_000)).toBe(42);
    expect(elapsedSeconds({ state: 'done', started_at: 100, finished_at: 160 }, 999_000)).toBe(60);
    expect(doneSummary({ state: 'done', summary: { rows: 200000, networks: 3, seconds: 41.5 } })).toContain('3 networks');
  });
});

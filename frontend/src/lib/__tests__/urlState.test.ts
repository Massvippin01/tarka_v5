import { describe, it, expect } from 'vitest';
import { parseUrlState, serializeUrlState } from '../urlState';

describe('urlState', () => {
  it('parses view and case', () => {
    expect(parseUrlState('?view=money&case=CASE-2026-003')).toEqual({ view: 'money', caseId: 'CASE-2026-003' });
  });
  it('returns nulls when absent (no default injected)', () => {
    expect(parseUrlState('')).toEqual({ view: null, caseId: null });
  });
  it('accepts legacy screen param', () => {
    expect(parseUrlState('?screen=people').view).toBe('people');
  });
  it('serializes, preserving unrelated params and dropping legacy screen', () => {
    const qs = serializeUrlState('?legacy=0&screen=x&view=home', { view: 'money', caseId: 'CASE-2026-003' });
    const p = new URLSearchParams(qs);
    expect(p.get('view')).toBe('money');
    expect(p.get('case')).toBe('CASE-2026-003');
    expect(p.get('legacy')).toBe('0');
    expect(p.has('screen')).toBe(false);
  });
  it('round-trips and can clear the case', () => {
    const qs = serializeUrlState('?view=money&case=CASE-2026-003', { caseId: null });
    expect(parseUrlState(qs)).toEqual({ view: 'money', caseId: null });
    expect(serializeUrlState('', {})).toBe('');
  });
});

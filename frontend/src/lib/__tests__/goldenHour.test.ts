import { describe, expect, it } from 'vitest';
import { formatGoldenHour, selectGoldenHour } from '../goldenHour';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';

describe('golden hour (topbar clock and rail card share one function)', () => {
  it('formats active and expired windows', () => {
    expect(formatGoldenHour(172).text).toBe('2h 52m');
    expect(formatGoldenHour(45).text).toBe('45m');
    expect(formatGoldenHour(120).text).toBe('2h 0m');
    expect(formatGoldenHour(0)).toEqual({ mins: 0, expired: true, text: 'Expired' });
    expect(formatGoldenHour(-5).expired).toBe(true);
  });

  it('agrees with the case financials for every demo case', () => {
    for (const id of ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004']) {
      expect(selectGoldenHour(id)).toEqual(formatGoldenHour(selectCaseActionFinancials(id).goldenHourRemainingMins));
    }
  });

  it("unknown case is expired, never another case's clock", () => {
    expect(selectGoldenHour('CASE-NOPE').expired).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { reconLine } from '../v6/evidence/OcrDialog';

const row = { line: 1234, payer: 'a@x', payee: 'mule0_a0@okaxis', amount: 49999, ts: 1789012980, ref: '1' };

describe('reconLine', () => {
  it('says which statement row matched, in plain words', () => {
    const r = reconLine({ reconciliation_status: 'MATCH_CONFIRMED', matched_row: row });
    expect(r.text).toMatch(/^Matches statement row #1234: ₹49,999 to mule0_a0@okaxis at \d\d:\d\d\.$/);
    expect(r.tone).toBe('safe');
  });
  it('flags a different amount for review, never says fake', () => {
    const r = reconLine({ reconciliation_status: 'DISCREPANCY_DETECTED', matched_row: row });
    expect(r.text).toContain('needs examiner review');
    expect(r.text.toLowerCase()).not.toContain('fake');
  });
  it('handles no match and no statement', () => {
    expect(reconLine({ reconciliation_status: 'UNMATCHED_IN_STATEMENT' }).text).toMatch(/^No matching statement row/);
    expect(reconLine(undefined).tone).toBe('muted');
  });
});

import { describe, expect, it } from 'vitest';
import { CANONICAL_CASES } from '../../fixtures/cases';
import {
  EMPTY_FILTERS,
  custodyToCsv,
  indianDigits,
  filterFixtureLedger,
  integritySummary,
  inventoryFromJobs,
  istDayToEpoch,
  jobStatus,
  ledgerParams,
  rejectReasonLabel,
  type IngestionJobRow,
} from '../evidenceSelectors';
import { focusLevel, parseFocus, serializeFocus } from '../../lib/focusUrl';

const job = (over: Partial<IngestionJobRow>): IngestionJobRow => ({
  job_id: 'JOB-1',
  case_id: 'C1',
  filename: 'stmt.csv',
  total_size_bytes: 100,
  stage: 'EVIDENCE_AVAILABLE',
  sha256: 'ab'.repeat(32),
  is_cancelled: false,
  error_message: null,
  analytics_summary: { parser: 'bank_upi', rows_read: 10, rows_accepted: 8, rows_rejected: 2 },
  intake_officer: 'SI Meena',
  started_at: 1000,
  ...over,
});

describe('evidence inventory', () => {
  it('maps job stages to plain statuses', () => {
    expect(jobStatus(job({}))).toBe('READY');
    expect(jobStatus(job({ stage: 'NEEDS_MAPPING' }))).toBe('NEEDS_MAPPING');
    expect(jobStatus(job({ stage: 'DUPLICATE' }))).toBe('DUPLICATE');
    expect(jobStatus(job({ stage: 'REJECTED' }))).toBe('REJECTED');
    expect(jobStatus(job({ stage: 'CONTENT_INDEXED' }))).toBe('PROCESSING');
    expect(jobStatus(job({ stage: 'CONTENT_INDEXED', error_message: 'boom' }))).toBe('FAILED');
  });

  it('drops cancelled uploads, sorts newest first, keeps row counts and uploader', () => {
    const files = inventoryFromJobs([
      job({ job_id: 'A', started_at: 1 }),
      job({ job_id: 'B', started_at: 3 }),
      job({ job_id: 'C', is_cancelled: true }),
    ]);
    expect(files.map((f) => f.id)).toEqual(['B', 'A']);
    expect(files[0]).toMatchObject({ rowsAccepted: 8, rowsRejected: 2, uploader: 'SI Meena', kind: 'Bank / UPI statement' });
  });

  it('says in plain words whether the evidence can be trusted', () => {
    const ok = integritySummary(inventoryFromJobs([job({ analytics_summary: { parser: 'bank_upi', rows_accepted: 5, rows_rejected: 0 } })]));
    expect(ok).toMatchObject({ tone: 'safe', headline: 'The file is verified, every row was read' });
    const mixed = integritySummary(
      inventoryFromJobs([job({ job_id: 'A' }), job({ job_id: 'B' }), job({ job_id: 'C', stage: 'NEEDS_MAPPING', sha256: null, analytics_summary: {} })]),
    );
    expect(mixed.headline).toBe('2 of 3 files verified, 4 rows could not be read');
    expect(mixed).toMatchObject({ rowsAccepted: 16, rowsRejected: 4, tone: 'warn' });
    expect(mixed.attention.map((f) => f.id)).toEqual(['C']);
    expect(integritySummary([]).tone).toBe('empty');
  });

  it('translates parser reasons', () => {
    expect(rejectReasonLabel('Failed to parse datetime')).toBe('Date could not be read');
    expect(rejectReasonLabel('Missing or empty transaction date field')).toBe('Date is missing');
    expect(rejectReasonLabel('Something else')).toBe('Something else');
  });
});

describe('ledger filters', () => {
  it('builds server params from filters and focus, skipping blanks and bad numbers', () => {
    const p = ledgerParams(
      { ...EMPTY_FILTERS, party: ' mule ', minAmount: '₹1,00,000', maxAmount: 'abc', fromDate: '2026-09-22', rail: 'UPI' },
      { networkId: 'NET-1', account: null },
    );
    expect(p).toEqual({ network_id: 'NET-1', party: 'mule', min_amount: 100000, rail: 'UPI', from_ts: istDayToEpoch('2026-09-22') });
    expect(istDayToEpoch('2026-09-22')).toBe(Date.parse('2026-09-21T18:30:00Z') / 1000);
    expect(istDayToEpoch('22/09/2026')).toBeNull();
  });

  it('filters demo transactions the same way, scoped to an account', () => {
    const c = CANONICAL_CASES['CASE-2026-001'];
    const all = filterFixtureLedger(c, EMPTY_FILTERS, { networkId: null, account: null }, null);
    expect(all.total).toBe(c.transactions.length);
    expect(all.totalInr).toBe(c.transactions.reduce((s, t) => s + t.amount, 0));
    const who = c.transactions[0].toName;
    const scoped = filterFixtureLedger(c, EMPTY_FILTERS, { networkId: null, account: who.toUpperCase() }, null);
    expect(scoped.total).toBeGreaterThan(0);
    expect(scoped.rows.every((r) => r.payer === who || r.payee === who)).toBe(true);
    const big = filterFixtureLedger(c, { ...EMPTY_FILTERS, minAmount: '100000' }, { networkId: null, account: null }, null);
    expect(big.rows.every((r) => r.amount >= 100000)).toBe(true);
  });
});

describe('focus URL', () => {
  it('round-trips zoom level and keeps other params', () => {
    const s = serializeFocus('?view=evidence&case=C114', { networkId: 'NET-A', account: 'mule@ybl' });
    expect(s).toBe('?view=evidence&case=C114&net=NET-A&acct=mule%40ybl');
    expect(parseFocus(s)).toEqual({ networkId: 'NET-A', account: 'mule@ybl' });
    expect(focusLevel(parseFocus(s))).toBe('account');
    expect(focusLevel(parseFocus('?net=NET-A'))).toBe('network');
    expect(serializeFocus(s, { networkId: null, account: null })).toBe('?view=evidence&case=C114');
  });
});

describe('custody export', () => {
  it('writes IST times and quotes commas', () => {
    const csv = custodyToCsv('C1', [
      { job_id: 'J', ts: 0, actor: 'SI Meena', action: 'Ready', detail: '8 rows accepted, 2 rejected', filename: 'a.csv', reconstructed: false },
    ]);
    expect(indianDigits('1,000,000 rows accepted, 3,412 rejected (70,600,000 bytes)')).toBe(
      '10,00,000 rows accepted, 3,412 rejected (7,06,00,000 bytes)',
    );
    expect(csv.split('\n')[1]).toBe('C1,1970-01-01 05:30:00 IST,SI Meena,Ready,a.csv,"8 rows accepted, 2 rejected",Custody log');
  });
});

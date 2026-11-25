/**
 * Evidence & Ledger selectors: uploaded files → inventory, integrity summary, ledger filters, custody export.
 * Pure functions only. Money totals still come from caseSelectors; this module only counts files and rows.
 */
import type { CanonicalCaseFixture, CanonicalCaseTransaction } from '../fixtures/cases';
import type { Focus } from '../lib/focusUrl';

/** GET /api/v1/ingestion/jobs row (fields this page reads). */
export interface IngestionJobRow {
  job_id: string;
  case_id: string;
  filename: string;
  total_size_bytes: number;
  stage: string;
  sha256: string | null;
  is_cancelled: boolean;
  error_message: string | null;
  analytics_summary: Record<string, unknown>;
  intake_officer?: string;
  started_at?: number;
}

export type EvidenceStatus = 'READY' | 'NEEDS_MAPPING' | 'DUPLICATE' | 'REJECTED' | 'PROCESSING' | 'FAILED';

export const STATUS_LABEL: Record<EvidenceStatus, string> = {
  READY: 'Ready',
  NEEDS_MAPPING: 'Needs mapping',
  DUPLICATE: 'Duplicate',
  REJECTED: 'Rejected',
  PROCESSING: 'Processing',
  FAILED: 'Failed',
};

export const STATUS_HELP: Record<EvidenceStatus, string> = {
  READY: 'Fingerprinted, sealed read-only and every row accounted for.',
  NEEDS_MAPPING: 'TARKA could not tell which column is the date or the amount. Map the columns in Upload Center.',
  DUPLICATE: 'The exact same file (same SHA-256 fingerprint) was already uploaded. It is not counted twice.',
  REJECTED: 'The file failed the format or safety check and was not read.',
  PROCESSING: 'Still being uploaded or read.',
  FAILED: 'Reading stopped with an error. Resume it in Upload Center.',
};

export interface EvidenceFile {
  id: string;
  /** Backend job id; null for demo exhibits (no rows to page through). */
  jobId: string | null;
  filename: string;
  kind: string;
  sizeBytes: number;
  rowsRead: number | null;
  rowsAccepted: number | null;
  rowsRejected: number | null;
  sha256: string | null;
  uploader: string;
  uploadedAt: number | null;
  status: EvidenceStatus;
  note: string;
  /** Image or PDF that went through OCR. */
  canOcr?: boolean;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function jobStatus(j: IngestionJobRow): EvidenceStatus {
  if (j.stage === 'EVIDENCE_AVAILABLE') return 'READY';
  if (j.stage === 'NEEDS_MAPPING') return 'NEEDS_MAPPING';
  if (j.stage === 'DUPLICATE') return 'DUPLICATE';
  if (j.stage === 'REJECTED') return 'REJECTED';
  return j.error_message ? 'FAILED' : 'PROCESSING';
}

function fileKind(filename: string, summary: Record<string, unknown>): string {
  if (summary.parser === 'bank_upi') return 'Bank / UPI statement';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return { csv: 'Spreadsheet (CSV)', pdf: 'PDF document', xlsx: 'Excel workbook', zip: 'Archive', txt: 'Text file', json: 'Data file' }[ext]
    ?? (ext ? `.${ext} file` : 'File');
}

/** Uploaded files of the case, newest first; cancelled uploads are left out. */
export function inventoryFromJobs(jobs: IngestionJobRow[]): EvidenceFile[] {
  return jobs
    .filter((j) => !j.is_cancelled)
    .map((j) => {
      const s = j.analytics_summary ?? {};
      const status = jobStatus(j);
      const dup = s.duplicate_of as { filename?: string; case_id?: string } | undefined;
      return {
        id: j.job_id,
        jobId: j.job_id,
        filename: j.filename,
        kind: fileKind(j.filename, s),
        sizeBytes: j.total_size_bytes,
        rowsRead: num(s.rows_read),
        rowsAccepted: num(s.rows_accepted),
        rowsRejected: num(s.rows_rejected),
        sha256: j.sha256,
        uploader: j.intake_officer || String(s.intake_officer ?? '') || '—',
        uploadedAt: j.started_at ?? null,
        status,
        canOcr: status === 'READY' && /\.(png|jpe?g|webp|bmp|gif|tiff?|pdf)$/i.test(j.filename),
        note:
          status === 'DUPLICATE' && dup ? `Same file as ${dup.filename} in ${dup.case_id}`
          : status === 'REJECTED' || status === 'FAILED' ? j.error_message ?? ''
          : status === 'READY' && !s.parser ? 'Kept as evidence; no reader for this file type yet'
          : '',
      };
    })
    .sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0));
}

/** Demo cases: the fixture's exhibit list (no backend rows). */
export function inventoryFromFixture(manifest: { fileName: string; fileId: string; byteSize: number; sha256: string; custodian: string; status: string }[], c: CanonicalCaseFixture): EvidenceFile[] {
  const rows = c.transactions.length;
  return manifest.map((f, i) => ({
    id: f.fileId,
    jobId: null,
    filename: f.fileName,
    kind: fileKind(f.fileName, {}),
    sizeBytes: f.byteSize,
    rowsRead: i === 0 ? rows : null,
    rowsAccepted: i === 0 ? rows : null,
    rowsRejected: i === 0 ? 0 : null,
    sha256: f.sha256,
    uploader: f.custodian,
    uploadedAt: null,
    status: f.status === 'PASS' ? 'READY' : 'REJECTED',
    note: f.status === 'PASS' ? '' : 'Held back: the file changed after the bank issued it',
  }));
}

export interface IntegritySummary {
  files: number;
  verified: number;
  rowsAccepted: number;
  rowsRejected: number;
  attention: EvidenceFile[];
  /** Plain-English verdict, e.g. "All 5 files verified · 3,412 rows rejected". */
  headline: string;
  tone: 'safe' | 'warn' | 'empty';
}

const n = (x: number) => x.toLocaleString('en-IN');
const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;

export function integritySummary(files: EvidenceFile[]): IntegritySummary {
  const verified = files.filter((f) => f.status === 'READY' && f.sha256).length;
  const rowsAccepted = files.reduce((s, f) => s + (f.rowsAccepted ?? 0), 0);
  const rowsRejected = files.reduce((s, f) => s + (f.rowsRejected ?? 0), 0);
  const attention = files.filter((f) => f.status !== 'READY');
  if (!files.length) {
    return { files: 0, verified, rowsAccepted, rowsRejected, attention, headline: 'No evidence uploaded yet', tone: 'empty' };
  }
  const filesPart =
    verified === files.length ? (files.length === 1 ? 'The file is verified' : `All ${n(files.length)} files verified`)
    : `${n(verified)} of ${plural(files.length, 'file')} verified`;
  const rowsPart = rowsRejected ? `${plural(rowsRejected, 'row')} could not be read` : 'every row was read';
  return {
    files: files.length,
    verified,
    rowsAccepted,
    rowsRejected,
    attention,
    headline: `${filesPart}, ${rowsPart}`,
    tone: attention.length || rowsRejected ? 'warn' : 'safe',
  };
}

/** Raw parser reasons → investigator wording. Unknown reasons pass through unchanged. */
export function rejectReasonLabel(reason: string): string {
  if (reason.startsWith('Missing or empty transaction date')) return 'Date is missing';
  if (reason.startsWith('Failed to parse datetime')) return 'Date could not be read';
  return reason;
}

// ── Ledger ────────────────────────────────────────────────────────────────

export const RAILS = ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Cash', 'Other'] as const;
export type Rail = (typeof RAILS)[number];

export interface LedgerFilters {
  party: string;
  ref: string;
  rail: Rail | '';
  minAmount: string;
  maxAmount: string;
  /** yyyy-mm-dd, read as IST calendar days */
  fromDate: string;
  toDate: string;
  jobId: string;
}

export const EMPTY_FILTERS: LedgerFilters = { party: '', ref: '', rail: '', minAmount: '', maxAmount: '', fromDate: '', toDate: '', jobId: '' };

export interface LedgerRow {
  key: string;
  ts: number | null;
  payer: string;
  payee: string;
  amount: number;
  ref: string;
  rail: string;
  filename: string;
  line: number | null;
}

export interface LedgerPage {
  total: number;
  totalInr: number;
  rows: LedgerRow[];
}

const IST_OFFSET = 5.5 * 3600;
/** "2026-09-22" → epoch seconds at 00:00 IST (or 23:59:59 IST when endOfDay). */
export function istDayToEpoch(day: string, endOfDay = false): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`) / 1000 - IST_OFFSET;
  return Number.isFinite(t) ? t + (endOfDay ? 86399 : 0) : null;
}

const amountOrNull = (s: string): number | null => {
  const v = Number(s.replace(/[₹,\s]/g, ''));
  return s.trim() && Number.isFinite(v) && v >= 0 ? v : null;
};

/** Query params for GET /api/v1/ingestion/cases/{id}/txns. Empty filters are left out. */
export function ledgerParams(f: LedgerFilters, focus: Focus): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (focus.networkId) p.network_id = focus.networkId;
  if (focus.account) p.account = focus.account;
  if (f.party.trim()) p.party = f.party.trim();
  if (f.ref.trim()) p.ref = f.ref.trim();
  if (f.rail) p.rail = f.rail;
  if (f.jobId) p.job_id = f.jobId;
  const min = amountOrNull(f.minAmount);
  const max = amountOrNull(f.maxAmount);
  if (min !== null) p.min_amount = min;
  if (max !== null) p.max_amount = max;
  const from = istDayToEpoch(f.fromDate);
  const to = istDayToEpoch(f.toDate, true);
  if (from !== null) p.from_ts = from;
  if (to !== null) p.to_ts = to;
  return p;
}

const fixtureRail = (r: CanonicalCaseTransaction['paymentRail']): Rail =>
  r === 'UPI' || r === 'UPI_POS' ? 'UPI' : r === 'ATM_CASH' ? 'Cash' : r;

const partyKey = (s: string) => s.trim().toLowerCase();

/** Demo cases: the same filters and focus applied in memory to the fixture's transactions. */
export function filterFixtureLedger(c: CanonicalCaseFixture, f: LedgerFilters, focus: Focus, memberKeys: Set<string> | null): LedgerPage {
  const p = ledgerParams(f, focus);
  const party = String(p.party ?? '').toLowerCase();
  const ref = String(p.ref ?? '').toLowerCase();
  const rows = c.transactions
    .map((t): LedgerRow => ({
      key: t.id,
      ts: t.timestampUtc ? Date.parse(t.timestampUtc) / 1000 : null,
      payer: t.fromName || t.fromAccount,
      payee: t.toName || t.toAccount,
      amount: t.amount,
      ref: t.rrn,
      rail: fixtureRail(t.paymentRail),
      filename: t.sourceFile ?? 'Case statement',
      line: t.sourceRow ?? null,
    }))
    .filter((r) => {
      const ends = [partyKey(r.payer), partyKey(r.payee)];
      if (focus.account && !ends.includes(partyKey(focus.account))) return false;
      if (!focus.account && memberKeys && !ends.some((k) => memberKeys.has(k))) return false;
      if (party && !`${r.payer} ${r.payee}`.toLowerCase().includes(party)) return false;
      if (ref && !r.ref.toLowerCase().includes(ref)) return false;
      if (p.rail && r.rail !== p.rail) return false;
      if (p.min_amount !== undefined && r.amount < Number(p.min_amount)) return false;
      if (p.max_amount !== undefined && r.amount > Number(p.max_amount)) return false;
      if (p.from_ts !== undefined && (r.ts ?? 0) < Number(p.from_ts)) return false;
      if (p.to_ts !== undefined && (r.ts ?? 0) > Number(p.to_ts)) return false;
      return true;
    })
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  return { total: rows.length, totalInr: rows.reduce((s, r) => s + r.amount, 0), rows };
}

export function activeFilterCount(f: LedgerFilters): number {
  return (Object.keys(f) as (keyof LedgerFilters)[]).filter((k) => f[k] !== '').length;
}

// ── Chain of custody ──────────────────────────────────────────────────────

export interface CustodyEvent {
  job_id: string;
  ts: number;
  actor: string;
  action: string;
  detail: string;
  filename: string;
  reconstructed: boolean;
}

/** "1,000,000 rows" (server text) → "10,00,000 rows". */
export const indianDigits = (text: string): string =>
  text.replace(/(?<![\d,])\d{1,3}(?:,\d{3})+(?![\d,])/g, (m) => Number(m.replace(/,/g, '')).toLocaleString('en-IN'));

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV for the court file: IST time, who, what, file, details. */
export function custodyToCsv(caseId: string, events: CustodyEvent[]): string {
  const ist = (ts: number) => new Date((ts + IST_OFFSET) * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' IST';
  const lines = [['Case', 'Time', 'Who', 'What happened', 'File', 'Details', 'Source'].join(',')];
  for (const e of events) {
    lines.push(
      [caseId, ist(e.ts), e.actor, e.action, e.filename, indianDigits(e.detail), e.reconstructed ? 'Rebuilt from upload record' : 'Custody log']
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}

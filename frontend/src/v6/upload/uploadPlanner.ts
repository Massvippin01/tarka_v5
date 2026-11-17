/**
 * Pure helpers for the Upload Center: chunk planning, client-side sniffing,
 * resume decisions and server-stage → card-state mapping. No I/O here.
 */

export const CHUNK_BYTES = 8 * 1024 * 1024;
export const MAX_PARALLEL = 3;
export const SNIFF_BYTES = 64 * 1024;

export interface ChunkRange {
  offset: number;
  end: number; // exclusive
}

/** Chunks still to send for a file of `size` bytes, starting at `from`. */
export function planChunks(size: number, from = 0, chunk = CHUNK_BYTES): ChunkRange[] {
  const out: ChunkRange[] = [];
  for (let offset = Math.max(0, from); offset < size; offset += chunk) {
    out.push({ offset, end: Math.min(size, offset + chunk) });
  }
  return out;
}

/** Identity of a dropped file across page reloads. */
export function fileKey(f: { name: string; size: number; lastModified: number }, caseId: string): string {
  return `${caseId}|${f.name}|${f.size}|${f.lastModified}`;
}

export type CardState =
  | 'queued'
  | 'uploading'
  | 'paused'
  | 'verifying'
  | 'processing'
  | 'ready'
  | 'attention'
  | 'rejected';

export const TERMINAL_STAGES = new Set(['EVIDENCE_AVAILABLE', 'NEEDS_MAPPING', 'DUPLICATE', 'REJECTED']);

const VERIFY_STAGES = new Set(['UPLOAD_COMPLETED', 'FILE_VALIDATED', 'HASH_CALCULATED', 'EVIDENCE_ADMITTED']);

export interface JobStatus {
  job_id: string;
  case_id?: string;
  filename?: string;
  stage: string;
  bytes_uploaded: number;
  total_size_bytes: number;
  is_cancelled?: boolean;
  error_message?: string | null;
  sha256?: string | null;
  analytics_summary?: Record<string, any>;
}

/** Map a server job status onto the card state shown to the investigator. */
export function stateFromStatus(s: JobStatus): CardState {
  if (s.stage === 'REJECTED') return 'rejected';
  if (s.stage === 'NEEDS_MAPPING' || s.stage === 'DUPLICATE' || s.error_message) return 'attention';
  if (s.stage === 'EVIDENCE_AVAILABLE') return 'ready';
  if (s.stage === 'FILE_RECEIVED') return 'uploading';
  if (VERIFY_STAGES.has(s.stage)) return 'verifying';
  return 'processing';
}

export type ResumeDecision =
  | { kind: 'continue'; offset: number } // keep sending bytes from `offset`
  | { kind: 'wait' } // all bytes are in; server is verifying/processing
  | { kind: 'finished' } // terminal stage: just show the result
  | { kind: 'restart' }; // job unusable (gone, cancelled, size changed): create a new one

/** What to do when a file we already have a job for is dropped again. */
export function decideResume(status: JobStatus | null, fileSize: number): ResumeDecision {
  if (!status || status.is_cancelled || status.total_size_bytes !== fileSize) return { kind: 'restart' };
  if (TERMINAL_STAGES.has(status.stage)) return { kind: 'finished' };
  if (status.stage === 'FILE_RECEIVED' && status.bytes_uploaded < fileSize) {
    return { kind: 'continue', offset: status.bytes_uploaded };
  }
  return { kind: 'wait' };
}

// ── Sniffing ──────────────────────────────────────────────────────────

export interface SniffResult {
  kind: string; // plain-English type label
  isTabular: boolean;
  headers?: string[];
  estimatedRows?: number;
  rowsExact?: boolean;
}

const MAGIC: Array<[number[], string]> = [
  [[0x25, 0x50, 0x44, 0x46], 'PDF document'],
  [[0x50, 0x4b, 0x03, 0x04], 'ZIP archive / Office file'],
  [[0x89, 0x50, 0x4e, 0x47], 'PNG image'],
  [[0xff, 0xd8, 0xff], 'JPEG image'],
  [[0x47, 0x49, 0x46, 0x38], 'GIF image'],
  [[0x52, 0x61, 0x72, 0x21], 'RAR archive'],
  [[0x37, 0x7a, 0xbc, 0xaf], '7-Zip archive'],
  [[0x53, 0x51, 0x4c, 0x69], 'SQLite database'],
];

/** Split one CSV line, honouring double-quoted fields. */
export function splitCsvLine(line: string, sep = ','): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Inspect the first bytes of a file. `head` is at most SNIFF_BYTES; `size` is the full file size.
 * Row estimate = average line length in the sample extrapolated to the file size.
 */
export function sniff(head: Uint8Array, size: number, name: string): SniffResult {
  for (const [sig, kind] of MAGIC) {
    if (sig.every((b, i) => head[i] === b)) return { kind, isTabular: false };
  }
  if (head.subarray(0, 4096).includes(0)) return { kind: 'Binary file', isTabular: false };

  const text = new TextDecoder('utf-8').decode(head).replace(/^﻿/, '');
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const complete = head.length >= size; // whole file is in the sample
  // Drop a trailing partial line unless we have the whole file.
  const body = complete ? text : text.slice(0, text.lastIndexOf('\n') + 1);
  const lines = body.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { kind: ext === 'csv' ? 'CSV table (empty)' : 'Text file', isTabular: false };

  const first = lines[0];
  const sep = [',', '\t', ';', '|'].reduce((best, s) => (first.split(s).length > first.split(best).length ? s : best), ',');
  const headers = splitCsvLine(first, sep);
  if (headers.length < 2) return { kind: ext === 'json' ? 'JSON file' : 'Text file', isTabular: false };

  const dataLines = lines.length - 1;
  let estimatedRows = dataLines;
  if (!complete && dataLines > 0) {
    const headerBytes = new TextEncoder().encode(first).length + 1;
    const dataBytes = new TextEncoder().encode(body).length - headerBytes;
    estimatedRows = Math.round(((size - headerBytes) / dataBytes) * dataLines);
  }
  const kind = sep === '\t' ? 'TSV table' : sep === ',' ? 'CSV table' : 'Delimited table';
  return { kind, isTabular: true, headers, estimatedRows, rowsExact: complete };
}

// ── Display helpers ───────────────────────────────────────────────────

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('en-IN', { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ${Math.round(seconds % 60)} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

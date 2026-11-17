import { describe, it, expect } from 'vitest';
import { planChunks, decideResume, stateFromStatus, sniff, splitCsvLine, CHUNK_BYTES, fileKey } from '../uploadPlanner';

const MB = 1024 * 1024;
const enc = (s: string) => new TextEncoder().encode(s);

describe('planChunks', () => {
  it('splits into 8 MB chunks with a short tail', () => {
    const plan = planChunks(20 * MB);
    expect(plan.map((c) => c.end - c.offset)).toEqual([8 * MB, 8 * MB, 4 * MB]);
    expect(plan[0].offset).toBe(0);
    expect(plan[2].end).toBe(20 * MB);
  });

  it('chunks are contiguous and cover every byte exactly once', () => {
    const size = 3 * CHUNK_BYTES + 17;
    const plan = planChunks(size);
    plan.forEach((c, i) => i > 0 && expect(c.offset).toBe(plan[i - 1].end));
    expect(plan.reduce((s, c) => s + (c.end - c.offset), 0)).toBe(size);
  });

  it('resumes from a mid-chunk offset', () => {
    const plan = planChunks(20 * MB, 5 * MB);
    expect(plan[0]).toEqual({ offset: 5 * MB, end: 13 * MB });
    expect(plan.at(-1)!.end).toBe(20 * MB);
  });

  it('empty file or fully uploaded file needs no chunks', () => {
    expect(planChunks(0)).toEqual([]);
    expect(planChunks(10, 10)).toEqual([]);
  });
});

describe('decideResume', () => {
  const base = { job_id: 'j', total_size_bytes: 100, bytes_uploaded: 40, stage: 'FILE_RECEIVED' };

  it('continues from the server byte count', () => {
    expect(decideResume(base, 100)).toEqual({ kind: 'continue', offset: 40 });
  });
  it('restarts when the job is gone, cancelled or the file size changed', () => {
    expect(decideResume(null, 100).kind).toBe('restart');
    expect(decideResume({ ...base, is_cancelled: true }, 100).kind).toBe('restart');
    expect(decideResume(base, 101).kind).toBe('restart');
  });
  it('waits when all bytes are in but processing is not done', () => {
    expect(decideResume({ ...base, bytes_uploaded: 100, stage: 'CONTENT_INDEXED' }, 100).kind).toBe('wait');
  });
  it('is finished on terminal stages', () => {
    for (const stage of ['EVIDENCE_AVAILABLE', 'NEEDS_MAPPING', 'REJECTED']) {
      expect(decideResume({ ...base, bytes_uploaded: 100, stage }, 100).kind).toBe('finished');
    }
  });
});

describe('stateFromStatus', () => {
  const s = (stage: string, error_message: string | null = null) =>
    stateFromStatus({ job_id: 'j', stage, bytes_uploaded: 0, total_size_bytes: 0, error_message });
  it('maps server stages to card states', () => {
    expect(s('FILE_RECEIVED')).toBe('uploading');
    expect(s('HASH_CALCULATED')).toBe('verifying');
    expect(s('CONTENT_INDEXED')).toBe('processing');
    expect(s('EVIDENCE_AVAILABLE')).toBe('ready');
    expect(s('NEEDS_MAPPING')).toBe('attention');
    expect(s('DUPLICATE')).toBe('attention');
    expect(s('REJECTED')).toBe('rejected');
    expect(s('CONTENT_EXTRACTED', 'Pipeline execution failure')).toBe('attention');
  });
});

describe('sniff', () => {
  it('reads CSV headers and counts rows exactly when the whole file fits', () => {
    const csv = 'Date,"Narration, details",Amount\n01/01/2026,UPI/abc,100\n02/01/2026,"NEFT, x",200\n';
    const r = sniff(enc(csv), csv.length, 'stmt.csv');
    expect(r.kind).toBe('CSV table');
    expect(r.headers).toEqual(['Date', 'Narration, details', 'Amount']);
    expect(r.estimatedRows).toBe(2);
    expect(r.rowsExact).toBe(true);
  });

  it('extrapolates the row count from a 64 KB sample of a large file', () => {
    const row = '01/01/2026,UPI/123456789/payment,1500.00\n'; // 41 bytes
    const header = 'Date,Narration,Amount\n';
    const full = header + row.repeat(10_000);
    const head = enc(full).subarray(0, 64 * 1024);
    const r = sniff(head, full.length, 'big.csv');
    expect(r.rowsExact).toBe(false);
    expect(Math.abs(r.estimatedRows! - 10_000)).toBeLessThan(50);
  });

  it('detects binaries by magic bytes', () => {
    expect(sniff(enc('%PDF-1.7 ...'), 100, 'x.pdf').kind).toBe('PDF document');
    expect(sniff(new Uint8Array([0x50, 0x4b, 3, 4, 0]), 5, 'a.zip').isTabular).toBe(false);
  });

  it('splits quoted CSV fields', () => {
    expect(splitCsvLine('a,"b ""c""",d')).toEqual(['a', 'b "c"', 'd']);
  });
});

describe('fileKey', () => {
  it('is scoped to the case', () => {
    const f = { name: 'a.csv', size: 1, lastModified: 2 };
    expect(fileKey(f, 'CASE-1')).not.toBe(fileKey(f, 'CASE-2'));
  });
});

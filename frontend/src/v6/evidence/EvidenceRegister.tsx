import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, Download, X, History } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Button, Skeleton } from '../ui';
import { custodyToCsv, indianDigits, rejectReasonLabel, type CustodyEvent, type EvidenceFile } from '../../selectors/evidenceSelectors';
import { StatusPill } from './IntegrityPanel';
import { useRejectedRows } from './useEvidenceData';

const n = (x: number | null) => (x === null ? '—' : x.toLocaleString('en-IN'));

export function fmtIst(ts: number | null, withSeconds = false): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

function bytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

const HashCell: React.FC<{ sha: string | null }> = ({ sha }) => {
  const [copied, setCopied] = useState(false);
  if (!sha) return <span className="text-[var(--fg-3)]">Not taken yet</span>;
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(sha);
        setCopied(true);
        toast.success('Fingerprint copied');
        setTimeout(() => setCopied(false), 1500);
      }}
      title={`SHA-256 fingerprint (click to copy):\n${sha}\nAny change to the file, even one character, gives a different fingerprint.`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded px-1 -mx-1 v6-mono text-[12px] text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]"
    >
      <span className="truncate">{sha.slice(0, 10)}…{sha.slice(-4)}</span>
      {copied ? <Check className="h-3 w-3 flex-none text-[var(--safe)]" /> : <Copy className="h-3 w-3 flex-none opacity-0 group-hover:opacity-60" />}
    </button>
  );
};

// ── Inventory ──────────────────────────────────────────────────────────────

interface InventoryProps {
  files: EvidenceFile[];
  onShowRejected: (f: EvidenceFile) => void;
  onShowFileRows: (f: EvidenceFile) => void;
  onShowOcr?: (f: EvidenceFile) => void;
  onOpenUpload: () => void;
}

export const EvidenceInventory: React.FC<InventoryProps> = ({ files, onShowRejected, onShowFileRows, onShowOcr, onOpenUpload }) => (
  <div className="overflow-x-auto">
    <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
      <colgroup>
        <col className="w-[30%]" />
        <col className="w-[14%]" />
        <col className="w-[12%]" />
        <col className="w-[10%]" />
        <col className="w-[13%]" />
        <col className="w-[21%]" />
      </colgroup>
      <thead>
        <tr className="text-left text-[12px] text-[var(--fg-3)]">
          {['File', 'Status', 'Rows read', 'Rejected', 'Fingerprint', 'Uploaded by'].map((h) => (
            <th key={h} className="sticky top-0 whitespace-nowrap border-b border-[var(--line)] px-3 pb-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {files.map((f) => (
          <tr key={f.id} className="group align-top transition-colors hover:bg-[var(--glass-1)]">
            <td className="border-b border-[var(--line)] px-3 py-2.5">
              <div className="truncate font-medium text-[var(--fg-1)]" title={f.filename}>{f.filename}</div>
              <div className="truncate text-[12px] text-[var(--fg-3)]" title={f.note || `${f.kind}, ${bytes(f.sizeBytes)}`}>
                {f.note || `${f.kind}, ${bytes(f.sizeBytes)}`}
              </div>
            </td>
            <td className="border-b border-[var(--line)] px-3 py-2.5">
              <StatusPill status={f.status} />
              {f.canOcr && onShowOcr && (
                <button type="button" onClick={() => onShowOcr(f)} title="See the text read from this file, compared with the bank statement" className="mt-1 block text-[12px] font-semibold text-[var(--accent)] hover:underline">
                  OCR view
                </button>
              )}
              {f.status === 'NEEDS_MAPPING' && (
                <button type="button" onClick={onOpenUpload} className="mt-1 block text-[12px] font-semibold text-[var(--accent)] hover:underline">
                  Map columns
                </button>
              )}
            </td>
            <td className="border-b border-[var(--line)] px-3 py-2.5 v6-mono tabular-nums">
              {f.jobId && f.rowsAccepted ? (
                <button type="button" onClick={() => onShowFileRows(f)} title="Show these rows in the ledger below" className="underline decoration-dotted underline-offset-4 decoration-current/30 hover:decoration-current">
                  {n(f.rowsAccepted)}
                </button>
              ) : (
                n(f.rowsAccepted)
              )}
            </td>
            <td className="border-b border-[var(--line)] px-3 py-2.5 v6-mono tabular-nums">
              {f.jobId && f.rowsRejected ? (
                <button
                  type="button"
                  onClick={() => onShowRejected(f)}
                  title="See each rejected row with the reason"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--urgent)] underline decoration-dotted underline-offset-4 decoration-current/40 hover:decoration-current"
                >
                  {n(f.rowsRejected)} <span className="font-sans text-[12px] font-medium">why?</span>
                </button>
              ) : (
                <span className={f.rowsRejected === 0 ? 'text-[var(--fg-3)]' : ''}>{n(f.rowsRejected)}</span>
              )}
            </td>
            <td className="border-b border-[var(--line)] px-3 py-2.5"><HashCell sha={f.sha256} /></td>
            <td className="border-b border-[var(--line)] px-3 py-2.5">
              <div className="truncate text-[var(--fg-1)]" title={f.uploader}>{f.uploader}</div>
              <div className="truncate text-[12px] text-[var(--fg-3)]">{f.uploadedAt ? `${fmtIst(f.uploadedAt)} IST` : 'Demo exhibit'}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Rejected rows ──────────────────────────────────────────────────────────

export const RejectedRowsDialog: React.FC<{ file: EvidenceFile | null; onClose: () => void }> = ({ file, onClose }) => {
  const q = useRejectedRows(file?.jobId ?? null);
  const first = q.data?.pages[0];
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <Dialog.Root open={!!file} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {file && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="v6-glass fixed left-1/2 top-[8vh] z-[81] flex max-h-[84vh] w-[min(920px,92vw)] -translate-x-1/2 flex-col rounded-2xl"
                style={{ background: 'var(--glass-3)' }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
                  <div className="min-w-0">
                    <Dialog.Title className="text-[17px] font-[650] text-[var(--fg-1)]">Rows TARKA could not read</Dialog.Title>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--fg-2)]" title={file.filename}>
                      {file.filename}: {n(first?.total ?? file.rowsRejected)} rejected of {n(file.rowsRead)} rows. They are kept here, not deleted, and are not counted in any total.
                    </p>
                  </div>
                  <Dialog.Close className="rounded-md p-1.5 text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]" aria-label="Close">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                {first && first.by_reason.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-5 pt-4">
                    {first.by_reason.map((r) => (
                      <span key={r.reason} title={r.reason} className="rounded-full bg-[var(--urgent-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--urgent)]">
                        {rejectReasonLabel(r.reason)}: {r.count.toLocaleString('en-IN')}
                      </span>
                    ))}
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                  {q.isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={34} />)}</div>
                  ) : q.isError ? (
                    <div className="rounded-xl border border-[var(--risk)]/30 bg-[var(--risk-bg)] p-4 text-[13px] text-[var(--risk)]">
                      Could not load the rejected rows. <button type="button" className="font-semibold underline" onClick={() => void q.refetch()}>Try again</button>
                    </div>
                  ) : rows.length === 0 ? (
                    <p className="text-[13px] text-[var(--fg-2)]">No rejected rows in this file.</p>
                  ) : (
                    <table className="w-full table-fixed text-[12.5px]">
                      <colgroup><col className="w-[72px]" /><col className="w-[190px]" /><col /></colgroup>
                      <thead>
                        <tr className="text-left text-[12px] text-[var(--fg-3)]">
                          <th className="pb-2 font-medium" title="Line number in the original file (line 1 is the header)">Line</th>
                          <th className="pb-2 font-medium">Why</th>
                          <th className="pb-2 font-medium">What the file says</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.line} className="border-t border-[var(--line)]">
                            <td className="py-2 v6-mono tabular-nums text-[var(--fg-2)]">{r.line.toLocaleString('en-IN')}</td>
                            <td className="py-2 pr-3"><span className="block truncate text-[var(--fg-1)]" title={r.reason}>{rejectReasonLabel(r.reason.split(' \'')[0])}</span></td>
                            <td className="py-2"><span className="block truncate v6-mono text-[var(--fg-2)]" title={r.raw}>{r.raw}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {q.hasNextPage && (
                  <div className="border-t border-[var(--line)] px-5 py-3 text-right">
                    <Button size="sm" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                      {q.isFetchingNextPage ? 'Loading…' : `Show more (${rows.length.toLocaleString('en-IN')} of ${n(first?.total ?? 0)})`}
                    </Button>
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

// ── Chain of custody ───────────────────────────────────────────────────────

const ACTION_TONE: Record<string, string> = {
  Ready: 'var(--safe)',
  Rejected: 'var(--risk)',
  'Processing failed': 'var(--risk)',
  'Marked duplicate': 'var(--fg-3)',
  'Waiting for column mapping': 'var(--urgent)',
  'Upload cancelled': 'var(--fg-3)',
};

interface CustodyProps {
  caseId: string;
  events: CustodyEvent[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const CustodyTimeline: React.FC<CustodyProps> = ({ caseId, events, isLoading, isError, onRetry }) => {
  const exportCsv = () => {
    if (!events?.length) return;
    const url = URL.createObjectURL(new Blob([custodyToCsv(caseId, events)], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${caseId}_chain_of_custody.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chain of custody exported', { description: `${events.length} events saved as CSV` });
  };
  return (
    <section aria-label="Chain of custody" className="v6-glass flex min-h-0 flex-col rounded-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[14px] font-[650] text-[var(--fg-1)]">
            <History className="h-4 w-4 text-[var(--fg-3)]" /> Who handled the files
          </h3>
          <p className="text-[12px] text-[var(--fg-3)]" title="Chain of custody: every action on every file, with who and when. Needed for the Section 63 BSA certificate.">
            Chain of custody, oldest first
          </p>
        </div>
        <Button size="sm" onClick={exportCsv} disabled={!events?.length} title="Download as CSV for the case file">
          <span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Export</span>
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 420 }}>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={40} />)}</div>
        ) : isError ? (
          <p className="text-[13px] text-[var(--risk)]">
            Could not load the custody log. <button type="button" className="font-semibold underline" onClick={onRetry}>Try again</button>
          </p>
        ) : !events?.length ? (
          <p className="text-[13px] text-[var(--fg-2)]">Nothing has happened to any file yet. Uploads will be logged here automatically.</p>
        ) : (
          <ol className="relative ml-1.5 border-l border-[var(--line)]">
            {events.map((e, i) => (
              <li key={`${e.job_id}-${i}`} className="relative pb-3.5 pl-4 last:pb-0">
                <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full ring-2 ring-[var(--surface-1)]" style={{ background: ACTION_TONE[e.action] ?? 'var(--accent)' }} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-[var(--fg-1)]" title={e.action}>{e.action}</span>
                  <span className="flex-none text-[11.5px] tabular-nums text-[var(--fg-3)]" title={`${fmtIst(e.ts, true)} IST`}>{fmtIst(e.ts)}</span>
                </div>
                <div className="truncate text-[12px] text-[var(--fg-2)]" title={`${e.filename}\n${e.detail}`}>
                  {e.actor} <span className="text-[var(--fg-3)]">on</span> {e.filename}
                </div>
                {e.detail && <div className={clsx('truncate text-[12px] text-[var(--fg-3)]', e.detail.startsWith('SHA-256') && 'v6-mono')} title={e.detail}>{indianDigits(e.detail)}</div>}
                {e.reconstructed && (
                  <div className="text-[11px] italic text-[var(--fg-3)]" title="This file was uploaded before the custody log existed; the event is rebuilt from its upload record.">
                    rebuilt from the upload record
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export const InventorySkeleton: React.FC = () => (
  <div className="space-y-2 p-1">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={46} />)}</div>
);

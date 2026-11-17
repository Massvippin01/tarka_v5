import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X, SlidersHorizontal, FileText } from 'lucide-react';
import clsx from 'clsx';
import { Skeleton } from '../ui';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import { formatInr } from '../../lib/formatInr';
import { setFocus, type Focus } from '../../lib/focusUrl';
import {
  EMPTY_FILTERS,
  RAILS,
  activeFilterCount,
  filterFixtureLedger,
  type EvidenceFile,
  type LedgerFilters,
  type LedgerPage,
  type LedgerRow,
} from '../../selectors/evidenceSelectors';
import { useServerLedger } from './useEvidenceData';
import { fmtIst } from './EvidenceRegister';

const ROW_H = 44;
const GRID = 'grid grid-cols-[148px_minmax(0,1fr)_minmax(0,1fr)_128px_64px_150px_minmax(0,0.8fr)] gap-x-3 items-center';

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface LedgerTableProps {
  caseId: string;
  /** Demo cases: rows come from the fixture in memory. Uploaded cases: null → server pages. */
  demo: CanonicalCaseFixture | null;
  focus: Focus;
  filters: LedgerFilters;
  onFilters: (f: LedgerFilters) => void;
  files: EvidenceFile[];
  scopeNote: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ caseId, demo, focus, filters, onFilters, files, scopeNote }) => {
  const debounced = useDebounced(filters);
  const server = useServerLedger(caseId, debounced, focus, !demo);
  const local: LedgerPage | null = useMemo(() => (demo ? filterFixtureLedger(demo, debounced, focus, null) : null), [demo, debounced, focus]);

  const rows: LedgerRow[] = local?.rows ?? server.data?.pages.flatMap((p) => p.rows) ?? [];
  const head = local ?? server.data?.pages[0] ?? null;
  const loading = !demo && server.isLoading;
  const refreshing = !demo && server.isFetching && !server.isFetchingNextPage && !server.isLoading;

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMore = !demo && !!server.hasNextPage;
  const v = useVirtualizer({
    count: rows.length + (hasMore ? 1 : 0),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });
  const items = v.getVirtualItems();
  const lastIndex = items.length ? items[items.length - 1].index : -1;
  useEffect(() => {
    if (hasMore && lastIndex >= rows.length - 1 && !server.isFetchingNextPage) void server.fetchNextPage();
  }, [hasMore, lastIndex, rows.length, server]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [debounced, focus.networkId, focus.account]);

  const set = (patch: Partial<LedgerFilters>) => onFilters({ ...filters, ...patch });
  const nActive = activeFilterCount(filters);
  const fileName = filters.jobId ? files.find((f) => f.jobId === filters.jobId)?.filename : null;
  const input =
    'h-8 rounded-lg border border-[var(--line)] bg-[var(--glass-1)] px-2.5 text-[12.5px] text-[var(--fg-1)] placeholder:text-[var(--fg-3)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]';

  const party = (label: string) => (
    <button
      type="button"
      onClick={() => setFocus({ networkId: focus.networkId, account: label })}
      title={`${label}\nClick to zoom into this account`}
      className="block w-full truncate text-left v6-mono text-[12.5px] text-[var(--fg-1)] hover:text-[var(--accent)] hover:underline"
    >
      {label}
    </button>
  );

  return (
    <section aria-label="Ledger" className="v6-glass flex flex-col rounded-2xl" data-testid="evidence-ledger">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-[650] text-[var(--fg-1)]">Every transaction in the statements</h3>
          <p className="truncate text-[12.5px] text-[var(--fg-2)]" title={scopeNote}>{scopeNote}</p>
        </div>
        <div className="text-right" aria-live="polite">
          {head ? (
            <>
              <div className="text-[18px] font-[650] v6-mono tabular-nums text-[var(--fg-1)]" title={`${head.total.toLocaleString('en-IN')} rows add up to ${formatInr(head.totalInr)}`}>
                {head.total.toLocaleString('en-IN')} <span className="font-sans text-[12.5px] font-medium text-[var(--fg-3)]">rows</span>
              </div>
              <div className="text-[12.5px] text-[var(--fg-2)]" title={formatInr(head.totalInr)}>{formatInr(head.totalInr, { compact: true })} moved in total</div>
            </>
          ) : (
            <Skeleton width={120} height={36} />
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            aria-label="Search by UTR or RRN"
            value={filters.ref}
            onChange={(e) => set({ ref: e.target.value })}
            placeholder="UTR / RRN"
            title="Bank reference number of the payment (UTR for NEFT/RTGS, RRN for UPI/IMPS)"
            className={clsx(input, 'w-[150px] pl-8 v6-mono')}
          />
        </label>
        <input aria-label="Account" value={filters.party} onChange={(e) => set({ party: e.target.value })} placeholder="Account or UPI id" className={clsx(input, 'w-[180px]')} />
        <span className="inline-flex items-center gap-1">
          <input aria-label="Minimum amount in rupees" inputMode="numeric" value={filters.minAmount} onChange={(e) => set({ minAmount: e.target.value })} placeholder="₹ from" className={clsx(input, 'w-[92px]')} />
          <span className="text-[var(--fg-3)]">to</span>
          <input aria-label="Maximum amount in rupees" inputMode="numeric" value={filters.maxAmount} onChange={(e) => set({ maxAmount: e.target.value })} placeholder="₹ to" className={clsx(input, 'w-[92px]')} />
        </span>
        <span className="inline-flex items-center gap-1" title="Dates are Indian Standard Time">
          <input aria-label="From date" type="date" value={filters.fromDate} onChange={(e) => set({ fromDate: e.target.value })} className={clsx(input, 'w-[134px]')} />
          <span className="text-[var(--fg-3)]">to</span>
          <input aria-label="To date" type="date" value={filters.toDate} onChange={(e) => set({ toDate: e.target.value })} className={clsx(input, 'w-[134px]')} />
        </span>
        <select
          aria-label="Payment type"
          value={filters.rail}
          onChange={(e) => set({ rail: e.target.value as LedgerFilters['rail'] })}
          className={clsx(input, 'cursor-pointer')}
          title="Payment type, worked out from the reference and the account format"
        >
          <option value="">All payment types</option>
          {RAILS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {fileName && (
          <span className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg bg-[var(--accent-bg)] px-2 py-1 text-[12px] font-medium text-[var(--accent)]">
            <FileText className="h-3.5 w-3.5 flex-none" />
            <span className="truncate" title={fileName}>{fileName}</span>
            <button type="button" aria-label="Show every file" onClick={() => set({ jobId: '' })} className="rounded p-0.5 hover:bg-[var(--hover)]"><X className="h-3 w-3" /></button>
          </span>
        )}
        {nActive > 0 && (
          <button type="button" onClick={() => onFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Clear {nActive} filter{nActive === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <div className={clsx(GRID, 'border-y border-[var(--line)] bg-[var(--glass-1)] px-4 py-2 text-[12px] font-medium text-[var(--fg-3)]')} role="row">
        <span title="Indian Standard Time">When (IST)</span>
        <span>From</span>
        <span>To</span>
        <span className="text-right">Amount</span>
        <span title="Payment type">Type</span>
        <span title="UTR / RRN: the bank's reference for this payment">Reference</span>
        <span title="File and line the row was read from">Source</span>
      </div>

      <div ref={scrollRef} className={clsx('relative h-[520px] overflow-auto transition-opacity', refreshing && 'opacity-60')} role="rowgroup">
        {loading ? (
          <div className="space-y-1.5 p-4">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} height={32} />)}</div>
        ) : server.isError && !demo ? (
          <div className="m-4 rounded-xl border border-[var(--risk)]/30 bg-[var(--risk-bg)] p-4 text-[13px] text-[var(--risk)]">
            The ledger could not be loaded from the server. <button type="button" className="font-semibold underline" onClick={() => void server.refetch()}>Try again</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <div className="text-[14px] font-semibold text-[var(--fg-1)]">No transactions match</div>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--fg-2)]">
              {nActive ? 'Loosen a filter, or clear them all to see every row in scope.' : focus.account || focus.networkId ? 'Nothing in the statements touches this account or network. Zoom out to the whole case.' : 'Upload a bank or UPI statement and its rows will appear here.'}
            </p>
            {nActive > 0 && (
              <button type="button" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline" onClick={() => onFilters(EMPTY_FILTERS)}>Clear filters</button>
            )}
          </div>
        ) : (
          <div style={{ height: v.getTotalSize(), position: 'relative' }}>
            {items.map((it) => {
              const r = rows[it.index];
              return (
                <div
                  key={it.key}
                  role="row"
                  className={clsx(GRID, 'absolute left-0 right-0 border-b border-[var(--line)]/60 px-4 text-[12.5px] hover:bg-[var(--glass-1)]')}
                  style={{ height: ROW_H, transform: `translateY(${it.start}px)` }}
                >
                  {r ? (
                    <>
                      <span className="truncate tabular-nums text-[var(--fg-2)]" title={`${fmtIst(r.ts, true)} IST`}>{fmtIst(r.ts)}</span>
                      {party(r.payer)}
                      {party(r.payee)}
                      <span className="truncate text-right v6-mono font-semibold tabular-nums text-[var(--fg-1)]" title={formatInr(r.amount, { showPaise: true })}>{formatInr(r.amount)}</span>
                      <span className="truncate text-[var(--fg-2)]">{r.rail}</span>
                      <span className="truncate v6-mono text-[var(--fg-2)]" title={r.ref}>{r.ref || '—'}</span>
                      <span className="truncate text-[12px] text-[var(--fg-3)]" title={`${r.filename}${r.line ? `, line ${r.line}` : ''}`}>
                        {r.filename}{r.line ? `, line ${r.line.toLocaleString('en-IN')}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="col-span-7"><Skeleton height={22} /></span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {head && rows.length > 0 && (
        <footer className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2 text-[12px] text-[var(--fg-3)]">
          <span>Loaded {rows.length.toLocaleString('en-IN')} of {head.total.toLocaleString('en-IN')}, oldest first. More load as you scroll.</span>
          <span>Click an account to zoom into it.</span>
        </footer>
      )}
    </section>
  );
};

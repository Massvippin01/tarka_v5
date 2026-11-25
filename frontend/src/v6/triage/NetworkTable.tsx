import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ArrowUpDown, Files, GitFork } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { setFocus } from '../../lib/focusUrl';
import { formatInr } from '../../lib/formatInr';
import { Button } from '../ui';
import { STATUS_META, STATUS_ORDER, type NetworkStatus } from '../network/networkFocus';
import { filterByStatus, sortRows, type NetworkRow, type SortKey } from './layout';

const PAGE = 100;
const COLS: { key: SortKey; label: string; right?: boolean; tip?: string }[] = [
  { key: 'id', label: 'Network' },
  { key: 'mules', label: 'Mules', right: true },
  { key: 'victims', label: 'Victims', right: true },
  { key: 'moved', label: '₹ moved', right: true, tip: 'Paid in by victims' },
  { key: 'freezable', label: '₹ still freezable', right: true, tip: 'Still sitting in the mule accounts' },
  { key: 'status', label: 'Status' },
  { key: 'otherFirs', label: 'Other FIRs', right: true, tip: 'Other cases where one of its identifiers also appears' },
];
const GRID = 'grid items-center gap-x-3 px-4 [grid-template-columns:28px_minmax(0,1.3fr)_64px_64px_104px_120px_130px_84px]';

export const StatusPill: React.FC<{ status: NetworkStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span
      title={m.hint}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ color: `var(${m.token})`, borderColor: `color-mix(in srgb, var(${m.token}) 45%, transparent)`, background: `color-mix(in srgb, var(${m.token}) 12%, transparent)` }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: `var(${m.token})` }} />
      {m.label}
    </span>
  );
};

export const NetworkTable: React.FC<{ caseId: string; rows: NetworkRow[] }> = ({ caseId, rows }) => {
  const { setActiveView, setActiveCaseId } = useCaseStore();
  const qc = useQueryClient();
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'priority', dir: 'desc' });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const c: Partial<Record<NetworkStatus, number>> = {};
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);
  const shown = useMemo(() => sortRows(filterByStatus(rows, status), sort.key, sort.dir), [rows, status, sort]);
  const visible = shown.slice(0, limit);
  const allPicked = visible.length > 0 && visible.every((r) => picked.has(r.id));

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'id' || key === 'status' ? 'asc' : 'desc' }));
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const open = (id: string) => {
    setFocus({ networkId: id, account: null });
    setActiveView('network');
  };

  const bulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const made: string[] = [];
      let failed = 0;
      for (const id of ids) {
        try {
          const r = await apiClient.post<{ case_id: string }>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks/${encodeURIComponent(id)}/split`, { title: `${caseId} · ${id}` });
          made.push(r.data.case_id);
        } catch {
          failed++;
        }
      }
      return { made, failed };
    },
    onSuccess: ({ made, failed }) => {
      setPicked(new Set());
      void qc.invalidateQueries({ queryKey: ['cases-list'] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      if (made.length) toast.success(`Created ${made.length} linked case${made.length === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`, { action: { label: 'Open first', onClick: () => setActiveCaseId(made[0]) } });
      else toast.error(`Could not split ${failed} network${failed === 1 ? '' : 's'}`);
    },
  });

  return (
    <section className="v6-glass rounded-2xl overflow-hidden" data-testid="network-table">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-3">
        <button type="button" onClick={() => setStatus(null)} aria-pressed={status === null} className={clsx('rounded-full border px-2.5 py-1 text-[12px] font-semibold', status === null ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--fg-2)] hover:text-[var(--fg-1)]')}>
          All <span className="v6-mono tabular-nums">{rows.length}</span>
        </button>
        {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(status === s ? null : s)} title={STATUS_META[s].hint} className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold', status === s ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--fg-1)]' : 'border-[var(--line)] text-[var(--fg-2)] hover:text-[var(--fg-1)]')}>
            <i className="h-2 w-2 rounded-full" style={{ background: `var(${STATUS_META[s].token})` }} />
            {STATUS_META[s].label} <span className="v6-mono tabular-nums text-[var(--fg-3)]">{counts[s]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {picked.size > 0 && <span className="text-[12px] text-[var(--fg-2)]">{picked.size} selected</span>}
          <Button size="sm" variant="primary" disabled={picked.size === 0} isLoading={bulk.isPending} onClick={() => bulk.mutate([...picked])} title="Copy each selected network's rows into its own case, linked to the same project.">
            <GitFork className="mr-1 h-3.5 w-3.5" /> Split into linked cases{picked.size ? ` (${picked.size})` : ''}
          </Button>
        </div>
      </header>

      <div className={clsx(GRID, 'border-b border-[var(--line)] bg-[var(--glass-1)] py-2 text-[12px] font-medium text-[var(--fg-3)]')} role="row">
        <input type="checkbox" aria-label="Select all shown" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(visible.map((r) => r.id)))} />
        {COLS.map((c) => {
          const on = sort.key === c.key;
          const Icon = !on ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
          return (
            <button key={c.key} type="button" title={c.tip} onClick={() => toggleSort(c.key)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={clsx('flex items-center gap-1 hover:text-[var(--fg-1)]', c.right && 'justify-end', on && 'text-[var(--fg-1)]')}>
              {c.label}
              <Icon className={clsx('h-3 w-3', !on && 'opacity-40')} />
            </button>
          );
        })}
      </div>

      <div className="max-h-[calc(100vh-340px)] min-h-[320px] overflow-auto" role="rowgroup">
        {visible.map((r) => (
          <div key={r.id} role="row" data-testid="network-row" className={clsx(GRID, 'group cursor-pointer border-b border-[var(--line)]/60 py-2.5 text-[12.5px] hover:bg-[var(--glass-1)]', picked.has(r.id) && 'bg-[var(--accent-bg)]')} onClick={() => open(r.id)}>
            <input type="checkbox" aria-label={`Select ${r.id}`} checked={picked.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(r.id)} />
            <span className="min-w-0">
              <span className="block truncate v6-mono font-semibold text-[var(--fg-1)] group-hover:text-[var(--accent)]" title={r.id}>{r.id}</span>
              <span className="block text-[11.5px] text-[var(--fg-3)]">{r.net.member_count.toLocaleString('en-IN')} accounts</span>
            </span>
            <span className="text-right tabular-nums">{r.mules.toLocaleString('en-IN')}</span>
            <span className="text-right tabular-nums">{r.victims.toLocaleString('en-IN')}</span>
            <span className="text-right v6-mono tabular-nums" title={formatInr(r.moved)}>{formatInr(r.moved, { compact: true })}</span>
            <span className={clsx('text-right v6-mono font-semibold tabular-nums', r.freezable > 0 ? 'text-[var(--fg-1)]' : 'text-[var(--fg-3)]')} title={formatInr(r.freezable)}>{r.freezable > 0 ? formatInr(r.freezable, { compact: true }) : '—'}</span>
            <span><StatusPill status={r.status} /></span>
            <span className="text-right">
              {r.otherFirs > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-urgent-bg)] px-1.5 py-0.5 text-[11.5px] font-semibold text-[var(--urgent)]"><Files className="h-3 w-3" /> {r.otherFirs}</span>
              ) : <span className="text-[var(--fg-3)]">—</span>}
            </span>
          </div>
        ))}
        {shown.length === 0 && <div className="p-8 text-center text-[13px] text-[var(--fg-3)]">No networks with this status.</div>}
        {shown.length > limit && (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="w-full py-3 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
            Show {Math.min(PAGE, shown.length - limit)} more of {(shown.length - limit).toLocaleString('en-IN')} remaining
          </button>
        )}
      </div>
      <footer className="border-t border-[var(--line)] px-4 py-2 text-[12px] text-[var(--fg-3)]">
        {shown.length.toLocaleString('en-IN')} networks · ranked by ₹ still freezable × urgency · click a row to open it on the network page
      </footer>
    </section>
  );
};

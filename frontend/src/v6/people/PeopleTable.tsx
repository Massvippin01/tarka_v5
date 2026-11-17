import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Search, X, ShieldCheck, ShieldX, Files } from 'lucide-react';
import clsx from 'clsx';
import { formatInr } from '../../lib/formatInr';
import { setFocus, type Focus } from '../../lib/focusUrl';
import {
  ROLE_GROUPS,
  filterPeople,
  plural,
  roleCounts,
  scoreBand,
  sortPeople,
  type PersonRow,
  type RoleGroup,
} from '../../selectors/peopleSelectors';
import { useCaseStore } from '../../store/useCaseStore';
import { Skeleton } from '../ui';

const ROW_H = 52;
const GRID = 'grid gap-x-3 items-center';
/** Phone / bank-account columns only when some row has one (UPI-only statements leave them empty). */
const template = (phone: boolean, acct: boolean) =>
  ['minmax(0,1.35fr)', phone && '112px', acct && 'minmax(0,1fr)', '124px', 'minmax(0,1.6fr)', '104px', '84px', '112px'].filter(Boolean).join(' ');

export const ROLE_TONE: Record<RoleGroup, { fg: string; bg: string }> = {
  MULE: { fg: 'var(--risk)', bg: 'var(--color-risk-bg)' },
  VICTIM: { fg: 'var(--flow)', bg: 'var(--color-flow-bg)' },
  CASH_OUT: { fg: 'var(--urgent)', bg: 'var(--color-urgent-bg)' },
  UNKNOWN: { fg: 'var(--fg-3)', bg: 'var(--glass-2)' },
};
const BAND_COLOR = { high: 'var(--risk)', mid: 'var(--urgent)', low: 'var(--fg-3)', none: 'var(--fg-3)' } as const;

export const ScoreBar: React.FC<{ score: number | null; why: string }> = ({ score, why }) => {
  const b = scoreBand(score);
  return (
    <span className="flex items-center gap-2" title={score === null ? 'No mule score: upload this case’s bank statements to score accounts.' : `Mule score ${b.text}\nWhy: ${why}`}>
      <span className="relative h-1.5 w-14 flex-none overflow-hidden rounded-full bg-[var(--glass-2)]">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(score ?? 0) * 100}%`, background: BAND_COLOR[b.band] }} />
      </span>
      <span className="v6-mono text-[12.5px] font-semibold tabular-nums" style={{ color: BAND_COLOR[b.band] }}>{b.text}</span>
    </span>
  );
};

export const VerdictTag: React.FC<{ verdict: PersonRow['verdict'] }> = ({ verdict }) =>
  verdict ? (
    <span
      className={clsx('inline-flex flex-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold',
        verdict === 'NOT_MULE' ? 'bg-[var(--color-safe-bg)] text-[var(--safe)]' : 'bg-[var(--color-risk-bg)] text-[var(--risk)]')}
      title={verdict === 'NOT_MULE' ? 'An investigator marked this account as not a mule; it no longer counts in mule totals.' : 'An investigator confirmed this account as a mule.'}
    >
      {verdict === 'NOT_MULE' ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
      {verdict === 'NOT_MULE' ? 'Not a mule' : 'Confirmed'}
    </span>
  ) : null;

const dash = <span className="text-[var(--fg-3)]">—</span>;

interface Props {
  rows: PersonRow[];
  focus: Focus;
  loading: boolean;
  /** Short text saying what the list covers (whole case / one network). */
  scopeNote: string;
}

export const PeopleTable: React.FC<Props> = ({ rows, focus, loading, scopeNote }) => {
  const [role, setRole] = useState<RoleGroup | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const { setActiveView } = useCaseStore();
  const scoped = useMemo(() => filterPeople(rows, { role: 'ALL', query: '', networkId: focus.networkId }), [rows, focus.networkId]);
  const counts = useMemo(() => roleCounts(scoped), [scoped]);
  const shown = useMemo(() => sortPeople(filterPeople(scoped, { role, query, networkId: null })), [scoped, role, query]);
  const showPhone = useMemo(() => rows.some((r) => r.ids.phone), [rows]);
  const showAcct = useMemo(() => rows.some((r) => r.ids.account || r.ids.ifsc), [rows]);
  const cols = { gridTemplateColumns: template(showPhone, showAcct) };

  const scrollRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: shown.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_H, overscan: 14 });
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [role, query, focus.networkId]);

  const open = (r: PersonRow) => setFocus({ networkId: focus.networkId, account: r.label });
  const toLedger = (r: PersonRow) => {
    setFocus({ networkId: focus.networkId, account: r.label });
    setActiveView('evidence');
  };

  const tabs: { role: RoleGroup | 'ALL'; label: string; help: string }[] = [
    { role: 'ALL', label: 'Everyone', help: 'Every account linked to the money flow in this scope.' },
    ...ROLE_GROUPS,
  ];

  return (
    <section aria-label="People and accounts" className="v6-glass flex flex-col rounded-2xl" data-testid="people-table">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div role="tablist" aria-label="Role" className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--glass-1)] p-1">
          {tabs.map((t) => {
            const active = role === t.role;
            return (
              <button
                key={t.role}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setRole(t.role)}
                title={t.help}
                className={clsx('relative rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors', active ? 'text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:text-[var(--fg-1)]')}
              >
                {active && <motion.span layoutId="people-role-pill" className="absolute inset-0 rounded-lg bg-[var(--glass-2)] shadow-[var(--glass-shadow)]" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
                <span className="relative flex items-center gap-1.5">
                  {t.role !== 'ALL' && <span className="h-2 w-2 rounded-full" style={{ background: ROLE_TONE[t.role].fg }} />}
                  {t.label}
                  <span className="v6-mono tabular-nums text-[var(--fg-3)]">{counts[t.role].toLocaleString('en-IN')}</span>
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            aria-label="Find by UPI ID, phone or account"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="UPI ID, phone or account"
            className="h-8 w-[240px] rounded-lg border border-[var(--line)] bg-[var(--glass-1)] pl-8 pr-7 text-[12.5px] text-[var(--fg-1)] outline-none placeholder:text-[var(--fg-3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--fg-3)] hover:bg-[var(--hover)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
      </header>

      <div className={clsx(GRID, 'border-b border-[var(--line)] bg-[var(--glass-1)] px-4 py-2 text-[12px] font-medium text-[var(--fg-3)]')} style={cols} role="row">
        <span>Account / UPI ID</span>
        {showPhone && <span>Phone</span>}
        {showAcct && <span title="Bank account number and branch code (IFSC)">Bank account · IFSC</span>}
        <span title="How strongly the money pattern looks like a mule account (0–100%). Computed from the uploaded statements.">Mule score</span>
        <span>Why flagged</span>
        <span title="Fraud networks (connected money flows) this account is part of">Network</span>
        <span title="Other FIRs / cases where the same UPI ID, phone or account appears">Other FIRs</span>
        <span className="text-right" title="Money still in the account: what a freeze can hold. Click to see the payments.">Still in account</span>
      </div>

      <div ref={scrollRef} className="relative h-[560px] overflow-auto" role="rowgroup">
        {loading ? (
          <div className="space-y-1.5 p-4">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} height={40} />)}</div>
        ) : shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <div className="text-[14px] font-semibold text-[var(--fg-1)]">{query ? 'Nobody matches that search' : 'No one in this group'}</div>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--fg-2)]">
              {query ? 'Try part of the UPI ID, the last digits of a phone, or an account number.' : focus.networkId ? 'This network has no one in this role. Pick another role, or zoom out to the whole case.' : 'Pick another role above.'}
            </p>
            {query && <button type="button" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline" onClick={() => setQuery('')}>Clear search</button>}
          </div>
        ) : (
          <div style={{ height: v.getTotalSize(), position: 'relative' }}>
            {v.getVirtualItems().map((it) => {
              const r = shown[it.index];
              const tone = ROLE_TONE[r.role];
              return (
                <div
                  key={r.key}
                  role="row"
                  tabIndex={0}
                  onClick={() => open(r)}
                  onKeyDown={(e) => e.key === 'Enter' && open(r)}
                  className={clsx(GRID, 'group absolute left-0 right-0 cursor-pointer border-b border-[var(--line)]/60 px-4 text-[12.5px] outline-none hover:bg-[var(--glass-1)] focus-visible:bg-[var(--accent-bg)]')}
                  style={{ ...cols, height: ROW_H, transform: `translateY(${it.start}px)` }}
                  title={`Open ${r.label}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-7 w-1 flex-none rounded-full" style={{ background: tone.fg }} />
                    <span className="min-w-0">
                      <span className="block truncate v6-mono font-medium text-[var(--fg-1)] group-hover:text-[var(--accent)]" title={r.label}>{r.ids.upi ?? r.label}</span>
                      <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--fg-3)]">
                        <span style={{ color: tone.fg }}>{ROLE_GROUPS.find((g) => g.role === r.role)!.label.replace(/s$/, '')}</span>
                        <VerdictTag verdict={r.verdict} />
                      </span>
                    </span>
                  </span>
                  {showPhone && <span className="truncate v6-mono text-[var(--fg-2)]">{r.ids.phone ?? dash}</span>}
                  {showAcct && (
                    <span className="truncate v6-mono text-[var(--fg-2)]" title={[r.ids.account, r.ids.ifsc].filter(Boolean).join(' · ')}>
                      {r.ids.account || r.ids.ifsc ? [r.ids.account, r.ids.ifsc].filter(Boolean).join(' · ') : dash}
                    </span>
                  )}
                  {r.role === 'VICTIM' || r.role === 'CASH_OUT' ? (
                    <span title="Not scored: victims and cash-out points are not mule candidates">{dash}</span>
                  ) : (
                    <ScoreBar score={r.muleScore} why={r.why} />
                  )}
                  <span className="truncate text-[var(--fg-2)]" title={r.why}>{r.why}</span>
                  <span className="min-w-0">
                    {r.networks.length === 0 ? dash : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFocus({ networkId: r.networks[0], account: null }); }}
                        className="max-w-full truncate rounded-md bg-[var(--glass-2)] px-1.5 py-0.5 v6-mono text-[11.5px] text-[var(--fg-2)] hover:text-[var(--accent)]"
                        title={`${r.networks.join(', ')}\nClick to zoom into ${r.networks[0]}`}
                      >
                        {r.networks.length === 1 ? r.networks[0] : plural(r.networks.length, 'network')}
                      </button>
                    )}
                  </span>
                  <span title={r.otherCases.length ? `Also appears in: ${r.otherCases.join(', ')}` : 'Not seen in any other case you can open'}>
                    {r.otherCases.length ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-urgent-bg)] px-1.5 py-0.5 text-[11.5px] font-semibold text-[var(--urgent)]">
                        <Files className="h-3 w-3" /> {r.otherCases.length}
                      </span>
                    ) : dash}
                  </span>
                  <span className="text-right">
                    {r.heldInr > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toLedger(r); }}
                        className="v6-mono font-semibold tabular-nums text-[var(--fg-1)] underline decoration-dotted decoration-[var(--fg-3)] underline-offset-4 hover:text-[var(--accent)]"
                        title={`${formatInr(r.heldInr)} still in the account. Click to see its payments in the ledger.`}
                      >
                        {formatInr(r.heldInr, { compact: true })}
                      </button>
                    ) : dash}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2 text-[12px] text-[var(--fg-3)]">
        <span className="truncate" title={scopeNote}>{plural(shown.length, 'account')} shown · {scopeNote}</span>
        <span className="flex-none">Click a row to open its dossier.</span>
      </footer>
    </section>
  );
};

/** Side panel (project / network / account zoom) and the network decision bar of the Fraud Network page. */
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Ban, Check, ChevronLeft, ChevronRight, Copy, FolderPlus, GitMerge, Route, Search, Smartphone, Snowflake, Users } from 'lucide-react';
import clsx from 'clsx';
import apiClient from '../../api/client';
import { formatInr } from '../../lib/formatInr';
import { useCaseStore } from '../../store/useCaseStore';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import type { MoneyFigure } from '../../selectors/caseSelectors';
import { Button, Chip, Skeleton, SourceNumber } from '../ui';
import { ROLE_LABEL, rankMembers, type ControllerGroup, type FraudNetwork, type MemberRole, type NetworkMember, type VictimTrace } from '../triage/triage';
import {
  STATUS_META,
  STATUS_ORDER,
  crossCaseText,
  isHub,
  memberFigure,
  networkFigure,
  statusOf,
  type NetworkDecisionKind,
  type NetworkMoney,
  type NetworkStatus,
  type NetworkTotals,
  type NetworkTriage,
} from './networkFocus';

export type Net = FraudNetwork & NetworkMoney & { triage?: NetworkTriage };

const n0 = (n: number) => n.toLocaleString('en-IN');
const plural = (n: number, one: string, many = `${one}s`) => `${n0(n)} ${n === 1 ? one : many}`;
const errText = (e: unknown) =>
  axios.isAxiosError(e) ? (e.response?.data as { detail?: string })?.detail ?? (e.response ? `Server replied ${e.response.status}` : 'Could not reach the TARKA server') : String(e);

export const StatusPill: React.FC<{ status: NetworkStatus; className?: string }> = ({ status, className }) => {
  const s = STATUS_META[status];
  return (
    <span
      title={s.hint}
      className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap', className)}
      style={{ color: `var(${s.token})`, borderColor: `color-mix(in srgb, var(${s.token}) 35%, transparent)`, background: `color-mix(in srgb, var(${s.token}) 9%, transparent)` }}
      data-testid="network-status"
    >
      <i className="w-1.5 h-1.5 rounded-full" style={{ background: `var(${s.token})` }} />
      {s.label}
    </span>
  );
};

export const CrossCaseBadge: React.FC<{ cases: string[]; compact?: boolean }> = ({ cases, compact }) =>
  cases.length ? (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[var(--color-risk-bg)] text-[var(--risk)] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      title={`The same phone / account / UPI ID appears in: ${cases.join(', ')}`}
      data-testid="cross-case-badge"
    >
      {compact ? `+${cases.length} FIR${cases.length === 1 ? '' : 's'}` : crossCaseText(cases.length)}
    </span>
  ) : null;

/** A labelled money figure; the number opens its source rows when the case data is loaded. */
/** `total` null = the statement rows are still loading (never show a ₹0 that is not real). */
const Money: React.FC<{ label: string; hint: string; figure: MoneyFigure | null; total: number | null; tone?: string }> = ({ label, hint, figure, total, tone }) => (
  <div className="min-w-0">
    <div className="text-[11.5px] text-[var(--fg-3)] truncate" title={hint}>
      {label}
    </div>
    <div className="text-[15px] font-semibold tabular-nums truncate" style={{ color: tone ? `var(${tone})` : 'var(--fg-1)' }}>
      {total === null ? (
        <Skeleton className="h-4 w-16 mt-1" />
      ) : figure ? (
        <SourceNumber figure={figure}>{formatInr(total, { compact: true })}</SourceNumber>
      ) : (
        formatInr(total, { compact: true })
      )}
    </div>
  </div>
);

/* ---------------- project zoom ---------------- */

export const ProjectPanel: React.FC<{
  nets: Net[];
  fixture: CanonicalCaseFixture | null;
  totals: NetworkTotals;
  crossCounts: Map<string, string[]>;
  filter: NetworkStatus | null;
  onFilter: (s: NetworkStatus | null) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
}> = ({ nets, fixture, totals, crossCounts, filter, onFilter, onOpen, onHover }) => {
  const [limit, setLimit] = useState(60);
  // every network at once, as one pseudo-network, so the totals open their rows
  const all = useMemo<Net>(
    () => ({
      network_id: 'all networks',
      member_count: totals.accounts,
      mule_count: totals.mules,
      victim_count: totals.victims,
      amount_inr: totals.paidIn,
      cashed_out_inr: totals.cashedOut,
      recoverable_inr: totals.recoverable,
      members: nets.flatMap((n) => n.members),
    }),
    [nets, totals],
  );
  const figs = useMemo(
    () => (fixture ? { paidIn: networkFigure(fixture, all, 'paidIn'), cashedOut: networkFigure(fixture, all, 'cashedOut'), recoverable: networkFigure(fixture, all, 'recoverable') } : null),
    [fixture, all],
  );
  const fig = (k: 'paidIn' | 'cashedOut' | 'recoverable') => figs?.[k] ?? null;
  const counts = useMemo(() => {
    const c = new Map<NetworkStatus, number>();
    for (const n of nets) c.set(statusOf(n), (c.get(statusOf(n)) ?? 0) + 1);
    return c;
  }, [nets]);
  const rows = useMemo(() => [...nets].filter((n) => !filter || statusOf(n) === filter).sort((a, b) => (b.amount_inr || 0) - (a.amount_inr || 0)), [nets, filter]);
  return (
    <div className="flex flex-col min-h-0 h-full" data-testid="network-panel-project">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
        <div className="text-[13.5px] font-semibold text-[var(--fg-1)]">{plural(totals.networks, 'gang network')}</div>
        <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
          {plural(totals.mules, 'suspected mule')}, {plural(totals.victims, 'victim')}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-3">
          <Money label="Paid in by victims" hint="Money victims sent into these networks" figure={fig('paidIn')} total={totals.paidIn} />
          <Money label="Still in mule accounts" hint="What a debit freeze could still hold" figure={fig('recoverable')} total={totals.recoverable} tone="--safe" />
          <Money label="Already cashed out" hint="Withdrawn at ATMs, crypto or other cash-out points" figure={fig('cashedOut')} total={totals.cashedOut} tone="--risk" />
          <Money label="Not yet traced" hint="Left the mules to accounts not in these statements" figure={null} total={totals.unaccounted} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-[var(--line)]" role="group" aria-label="Filter by status">
        {STATUS_ORDER.filter((s) => counts.get(s)).map((s) => (
          <button
            key={s}
            onClick={() => onFilter(filter === s ? null : s)}
            aria-pressed={filter === s}
            className={clsx('rounded-full transition-opacity', filter && filter !== s && 'opacity-45 hover:opacity-80')}
            title={STATUS_META[s].hint}
          >
            <StatusPill status={s} className={filter === s ? 'ring-2 ring-[var(--accent-ring)]' : ''} />
            <span className="sr-only">{counts.get(s)}</span>
          </button>
        ))}
        {STATUS_ORDER.filter((s) => counts.get(s)).length > 0 && (
          <span className="text-[11px] text-[var(--fg-3)] self-center ml-auto tabular-nums">
            {filter ? `${n0(rows.length)} of ${n0(nets.length)}` : 'all statuses'}
          </span>
        )}
      </div>
      <ol className="flex-1 overflow-y-auto py-1" data-testid="network-list">
        {rows.slice(0, limit).map((n) => {
          const xc = crossCounts.get(n.network_id) ?? [];
          return (
            <li key={n.network_id}>
              <button
                onClick={() => onOpen(n.network_id)}
                onMouseEnter={() => onHover(n.network_id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(n.network_id)}
                onBlur={() => onHover(null)}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-none grid grid-cols-[auto_1fr_auto] gap-x-3 items-center"
              >
                <i className="w-2.5 h-2.5 rounded-full" style={{ background: `var(${STATUS_META[statusOf(n)].token})` }} title={STATUS_META[statusOf(n)].label} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-[var(--fg-1)] truncate v6-mono" title={n.network_id}>
                    {n.network_id}
                  </span>
                  <span className="block text-[11.5px] text-[var(--fg-3)] truncate">
                    {plural(n.mule_count, 'mule')}, {plural(n.victim_count, 'victim')}
                    {xc.length > 0 && <span className="text-[var(--risk)] font-medium"> · {crossCaseText(xc.length)}</span>}
                  </span>
                </span>
                <span className="text-[12.5px] font-semibold tabular-nums text-[var(--fg-1)]">{formatInr(n.amount_inr || 0, { compact: true })}</span>
              </button>
            </li>
          );
        })}
        {rows.length > limit && (
          <li className="px-4 py-2">
            <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 100)}>
              Show {Math.min(100, rows.length - limit)} more
            </Button>
          </li>
        )}
      </ol>
    </div>
  );
};

/* ---------------- network zoom ---------------- */

const ROLE_TABS: [MemberRole | 'HUB', string][] = [
  ['MULE', 'Mules'],
  ['VICTIM', 'Victims'],
  ['HUB', 'ATMs & shops'],
];

const ControllersCard: React.FC<{ controllers: ControllerGroup[]; onAccount: (id: string) => void }> = ({ controllers, onAccount }) => {
  const [openRows, setOpenRows] = useState<string | null>(null);
  if (!controllers.length) return null;
  return (
    <div className="px-4 py-3 border-b border-[var(--line)] space-y-2" data-testid="network-controllers-card">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--fg-3)]">
        <Smartphone className="w-3.5 h-3.5 text-[var(--accent)]" /> Controller attribution
      </div>
      {controllers.map((cg) => (
        <div key={cg.controller_id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/70 p-2.5 space-y-1.5">
          <div className="text-[12.5px] font-semibold text-[var(--fg-1)]">{cg.summary}</div>
          <div className="flex flex-wrap gap-1">
            {cg.devices.map((d) => (
              <span
                key={`${d.kind}:${d.value}`}
                title={`${d.kind.toUpperCase()} seen across ${d.accounts.length} accounts (${d.events} log events)`}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-bg)] text-[var(--accent)] px-1.5 py-0.5 v6-mono text-[10.5px] font-medium"
              >
                {d.kind.toUpperCase()}: {d.value}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {cg.accounts.slice(0, 6).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onAccount(a)}
                className="rounded px-1.5 py-0.5 bg-[var(--glass-1)] border border-[var(--line)] v6-mono text-[10.5px] text-[var(--fg-2)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
              >
                {a}
              </button>
            ))}
            {cg.accounts.length > 6 && (
              <span className="text-[10.5px] text-[var(--fg-3)] self-center">+{cg.accounts.length - 6} more</span>
            )}
          </div>
          {cg.evidence_rows.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setOpenRows(openRows === cg.controller_id ? null : cg.controller_id)}
                className="text-[11px] font-medium text-[var(--accent)] hover:underline"
              >
                {openRows === cg.controller_id ? 'Hide' : 'Show'} device evidence rows ({cg.evidence_rows.length})
              </button>
              {openRows === cg.controller_id && (
                <ul className="mt-1.5 max-h-28 overflow-y-auto space-y-1 text-[10.5px] v6-mono text-[var(--fg-2)]">
                  {cg.evidence_rows.slice(0, 8).map((ev, idx) => (
                    <li key={idx} className="truncate" title={`${ev.job_id} line ${ev.line}`}>
                      {ev.account} · {ev.kind}={ev.value} · line {ev.line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TracesSummaryCard: React.FC<{ traces: VictimTrace[] }> = ({ traces }) => {
  const [expanded, setExpanded] = useState(false);
  if (!traces.length) return null;
  return (
    <div className="px-4 py-2.5 border-b border-[var(--line)] space-y-1.5" data-testid="network-traces-card">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--fg-3)]">Time-aware money paths</span>
        <button type="button" onClick={() => setExpanded((x) => !x)} className="text-[11px] font-medium text-[var(--accent)] hover:underline">
          {expanded ? 'Collapse' : `Show paths (${traces.length})`}
        </button>
      </div>
      {expanded && (
        <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
          {traces.slice(0, 6).map((vt) => (
            <div key={vt.victim_id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between font-semibold text-[var(--fg-1)]">
                <span className="truncate v6-mono">{vt.victim_label}</span>
                <span className="tabular-nums">{formatInr(vt.paid_in_inr, { compact: true })}</span>
              </div>
              {vt.paths.slice(0, 3).map((p, idx) => (
                <div key={idx} className="text-[var(--fg-2)] leading-snug">
                  <span className="v6-mono break-all">{p.hop_labels.join(' → ')}</span>{' '}
                  <span className="font-semibold tabular-nums text-[var(--fg-1)]">({formatInr(p.amount_inr, { compact: true })})</span>{' '}
                  <span className="text-[var(--fg-3)]">· {p.outcome === 'HELD' ? 'still held' : p.outcome === 'CASHED_OUT' ? 'cashed out' : 'moved elsewhere'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NetworkPanel: React.FC<{
  n: Net;
  caseId?: string;
  fixture: CanonicalCaseFixture | null;
  crossByMember: Map<string, string[]>;
  pathNote: string | null;
  pathOn: boolean;
  selectedSubgroupId?: string | null;
  onSubgroup?: (id: string | null) => void;
  onPath: () => void;
  onAccount: (id: string) => void;
}> = ({ n, caseId, fixture, crossByMember, pathNote, pathOn, selectedSubgroupId, onSubgroup, onPath, onAccount }) => {
  const [tab, setTab] = useState<MemberRole | 'HUB'>('MULE');
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 50;
  const pagedQ = useQuery({
    queryKey: ['network-members-page', caseId, n.network_id, selectedSubgroupId ?? '', pageOffset],
    queryFn: async () =>
      (
        await apiClient.get<{ total: number; items: NetworkMember[] }>(
          `/api/v1/cases/${encodeURIComponent(caseId!)}/networks/${encodeURIComponent(n.network_id)}/members`,
          { params: { offset: pageOffset, limit: pageSize, ...(selectedSubgroupId ? { subgroup_id: selectedSubgroupId } : {}) } },
        )
      ).data,
    enabled: !!caseId && (n.member_count > n.members.length || !!selectedSubgroupId),
  });

  const sourceMembers = pagedQ.data?.items ?? n.members;
  const list = useMemo(() => rankMembers(sourceMembers.filter((m) => (tab === 'HUB' ? isHub(m) : m.role === tab))), [sourceMembers, tab]);
  const figs = useMemo(
    () => (fixture ? { paidIn: networkFigure(fixture, n, 'paidIn'), cashedOut: networkFigure(fixture, n, 'cashedOut'), recoverable: networkFigure(fixture, n, 'recoverable') } : null),
    [fixture, n],
  );
  const fig = (k: 'paidIn' | 'cashedOut' | 'recoverable') => figs?.[k] ?? null;
  const tabCount = (t: MemberRole | 'HUB') => (t === 'MULE' ? n.mule_count : t === 'VICTIM' ? n.victim_count : sourceMembers.filter(isHub).length);
  return (
    <div className="flex flex-col min-h-0 h-full" data-testid="network-panel-network">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--line)] space-y-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Money label="Paid in by victims" hint="Money victims sent into this network" figure={fig('paidIn')} total={n.amount_inr || 0} />
          <Money label="Still in mule accounts" hint="What a debit freeze could still hold (LIBR)" figure={fig('recoverable')} total={n.recoverable_inr || 0} tone="--safe" />
          <Money label="Already cashed out" hint="Withdrawn at ATMs, crypto or other cash-out points" figure={fig('cashedOut')} total={n.cashed_out_inr || 0} tone="--risk" />
          <Money label="Not yet traced" hint="Left the mules to accounts not in these statements" figure={null} total={n.unaccounted_inr || 0} />
        </div>
        <Button size="sm" variant={pathOn ? 'primary' : 'default'} onClick={onPath} className="w-full justify-center" title="Highlight the shortest money route from a victim to the furthest account">
          <Route className="w-3.5 h-3.5 mr-1.5" /> {pathOn ? 'Hide the route' : 'Trace victim → cash-out'}
        </Button>
        {pathNote && <p className={clsx('text-[12px]', pathOn ? 'text-[var(--accent)] font-medium' : 'text-[var(--fg-3)]')}>{pathNote}</p>}
      </div>
      <ControllersCard controllers={n.controllers ?? []} onAccount={onAccount} />
      <TracesSummaryCard traces={n.traces ?? []} />
      {!!n.subgroups?.length && onSubgroup && (
        <div className="px-4 py-2 border-b border-[var(--line)] flex items-center justify-between gap-2 text-[11.5px]">
          <span className="text-[var(--fg-2)] truncate">
            {selectedSubgroupId ? `Sub-group: ${selectedSubgroupId}` : `${n.subgroups.length} sub-groups detected`}
          </span>
          {selectedSubgroupId && (
            <button type="button" onClick={() => { setPageOffset(0); onSubgroup(null); }} className="text-[var(--accent)] font-medium hover:underline">
              All sub-groups
            </button>
          )}
        </div>
      )}
      <div role="tablist" aria-label="Accounts in this network" className="flex gap-1 px-3 pt-2.5">
        {ROLE_TABS.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-[12px] font-medium whitespace-nowrap',
              tab === t ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--fg-2)] hover:bg-[var(--hover)]',
            )}
          >
            {label} <span className="tabular-nums opacity-70">{n0(tabCount(t))}</span>
          </button>
        ))}
      </div>
      <ol className="flex-1 overflow-y-auto py-1.5">
        {list.length === 0 && <li className="px-4 py-3 text-[12px] text-[var(--fg-3)]">None in this network.</li>}
        {list.map((m) => (
          <li key={m.id}>
            <button onClick={() => onAccount(m.id)} className="w-full text-left px-4 py-2 hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-none flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-[var(--fg-1)] truncate v6-mono" title={m.label}>
                  {m.label}
                </span>
                <span className="block text-[11px] text-[var(--fg-3)] truncate">
                  {m.hop === null ? 'distance unknown' : m.hop === 0 ? 'victim' : `hop ${m.hop}`}
                  {m.held_inr ? ` · holds ${formatInr(m.held_inr, { compact: true })}` : ''}
                </span>
              </span>
              <CrossCaseBadge compact cases={crossByMember.get(m.id) ?? []} />
              {m.role === 'MULE' && <HeatBar score={m.mule_score} />}
            </button>
          </li>
        ))}
      </ol>
      {(n.member_count > n.members.length || !!selectedSubgroupId) && (pagedQ.data?.total ?? n.member_count) > pageSize && (
        <div className="px-4 py-2 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--fg-3)]">
          <span>
            {pageOffset + 1}–{Math.min(pageOffset + pageSize, pagedQ.data?.total ?? n.member_count)} of {n0(pagedQ.data?.total ?? n.member_count)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageOffset === 0}
              onClick={() => setPageOffset((o) => Math.max(0, o - pageSize))}
              className="p-1 rounded hover:bg-[var(--hover)] disabled:opacity-40"
              aria-label="Previous members page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={pageOffset + pageSize >= (pagedQ.data?.total ?? n.member_count)}
              onClick={() => setPageOffset((o) => o + pageSize)}
              className="p-1 rounded hover:bg-[var(--hover)] disabled:opacity-40"
              aria-label="Next members page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HeatBar: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round((score ?? 0) * 100);
  return (
    <span className="w-11 flex-none" title={`Mule heat ${pct}%: how strongly the account behaves like a mule (money in and straight out, in a short burst)`}>
      <span className="block h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
        <span className="block h-full rounded-full bg-[var(--risk)]" style={{ width: `${pct}%`, opacity: 0.35 + pct / 160 }} />
      </span>
      <span className="block text-[10.5px] text-[var(--fg-3)] tabular-nums text-right mt-0.5">{pct}%</span>
    </span>
  );
};

/* ---------------- account zoom ---------------- */

export const AccountPanel: React.FC<{
  m: NetworkMember;
  n: Net;
  fixture: CanonicalCaseFixture | null;
  crossCases: string[];
  links: { into: number; out: number };
  onPathThrough: () => void;
  onAccount?: (id: string) => void;
}> = ({ m, n, fixture, crossCases, links, onPathThrough, onAccount }) => {
  const { setActiveView } = useCaseStore();
  const role = ROLE_LABEL[m.role];
  const fig = (k: 'in' | 'out' | 'held') => (fixture ? memberFigure(fixture, m, k) : null);
  const inFig = fig('in');
  const outFig = fig('out');
  const pct = Math.round((m.mule_score ?? 0) * 100);
  const ctrl = (n.controllers ?? []).find((cg) => cg.accounts.includes(m.id));
  const myPaths = (n.traces ?? []).flatMap((vt) =>
    vt.paths.filter((p) => p.hops.includes(m.id)),
  );
  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto" data-testid="network-panel-account">
      <div className="px-4 pt-4 pb-3 space-y-2.5 border-b border-[var(--line)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip variant={role.variant}>{m.verdict === 'NOT_MULE' ? 'Cleared: not a mule' : isHub(m) && m.role === 'UNKNOWN' ? 'ATM / shop / unclear' : role.label}</Chip>
          <CrossCaseBadge cases={crossCases} />
        </div>
        <div className="text-[15px] font-semibold text-[var(--fg-1)] break-all v6-mono">{m.label}</div>
        <div className="text-[12px] text-[var(--fg-3)]">
          {m.kind === 'vpa' ? 'UPI ID' : m.kind === 'phone' ? 'Phone number' : m.kind === 'account' ? 'Bank account' : m.kind} in {n.network_id} ·{' '}
          {m.hop === null ? 'distance unknown' : m.hop === 0 ? 'the victim' : `${m.hop} hop${m.hop === 1 ? '' : 's'} from a victim`}
        </div>
      </div>
      <div className="px-4 py-3 space-y-3 border-b border-[var(--line)]">
        {m.role !== 'VICTIM' && !isHub(m) && (
          <div>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-[var(--fg-3)]" title="How strongly the account behaves like a mule: money in and straight out again, in a short burst">
                Mule heat
              </span>
              <b className="text-[var(--fg-1)] tabular-nums">{pct}%</b>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden mt-1">
              <motion.div className="h-full rounded-full bg-[var(--risk)]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
            </div>
          </div>
        )}
        <p className="text-[12.5px] text-[var(--fg-2)] leading-relaxed">{m.why}</p>
        <div className="grid grid-cols-3 gap-2">
          <Money label="Money in" hint="Every credit into this account in the statements" figure={inFig} total={inFig ? inFig.totalInr : null} />
          <Money label="Money out" hint="Every debit out of this account" figure={outFig} total={outFig ? outFig.totalInr : null} />
          <Money label="Still there" hint="What a debit freeze on this account could hold" figure={fig('held')} total={m.held_inr ?? 0} tone="--safe" />
        </div>
        <div className="text-[11.5px] text-[var(--fg-3)]">
          Paid by {plural(links.into, 'account')} · paid {plural(links.out, 'account')} in this network
        </div>
        {ctrl && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/70 p-2.5 space-y-1.5" data-testid="account-panel-controller">
            <div className="text-[12px] font-semibold text-[var(--fg-1)] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[var(--accent)]" /> {ctrl.summary}
            </div>
            <div className="flex flex-wrap gap-1">
              {ctrl.devices.map((d) => (
                <span key={`${d.kind}:${d.value}`} className="rounded bg-[var(--accent-bg)] text-[var(--accent)] px-1.5 py-0.5 v6-mono text-[10.5px]">
                  {d.kind.toUpperCase()}: {d.value}
                </span>
              ))}
            </div>
            {onAccount && (
              <div className="flex flex-wrap gap-1">
                {ctrl.accounts.filter((a) => a !== m.id).slice(0, 5).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onAccount(a)}
                    className="rounded px-1.5 py-0.5 bg-[var(--glass-1)] border border-[var(--line)] v6-mono text-[10.5px] text-[var(--fg-2)] hover:text-[var(--accent)]"
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {myPaths.length > 0 && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5 space-y-1 text-[11px]" data-testid="account-panel-paths">
            <div className="font-semibold text-[var(--fg-1)]">Victim money paths through this account</div>
            {myPaths.slice(0, 3).map((p, idx) => (
              <div key={idx} className="text-[var(--fg-2)]">
                <span className="v6-mono break-all">{p.hop_labels.join(' → ')}</span>{' '}
                <span className="font-semibold tabular-nums">({formatInr(p.amount_inr, { compact: true })})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 grid gap-2">
        <Button size="sm" variant="default" onClick={onPathThrough} className="justify-start">
          <Route className="w-3.5 h-3.5 mr-1.5" /> Trace the money through this account
        </Button>
        {m.role !== 'VICTIM' && (
          <Button size="sm" variant="default" onClick={() => setActiveView('actions')} className="justify-start" title="Freeze notices are drafted on the Actions & report step (BNSS §106/§107)">
            <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Go to freeze notices
          </Button>
        )}
        <Button size="sm" variant="default" onClick={() => setActiveView('people')} className="justify-start">
          <Users className="w-3.5 h-3.5 mr-1.5" /> Open in People &amp; accounts
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          onClick={() => {
            void navigator.clipboard?.writeText(m.label);
            toast.success('Identifier copied');
          }}
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy identifier
        </Button>
      </div>
    </div>
  );
};

/* ---------------- decision bar ---------------- */

interface CaseRow {
  case_id: string;
  title?: string;
}

const DECISIONS: { id: NetworkDecisionKind; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'INVESTIGATE', label: 'Investigate', icon: <Search className="w-3.5 h-3.5" />, hint: 'Mark it under review: you are checking whether this is a real gang.' },
  { id: 'MAKE_CASE', label: 'Make it a case', icon: <FolderPlus className="w-3.5 h-3.5" />, hint: "Open a new case and copy this network's transactions into it." },
  { id: 'MERGE_FIR', label: 'Merge with FIR', icon: <GitMerge className="w-3.5 h-3.5" />, hint: "Copy this network's transactions into an existing case / FIR." },
  { id: 'DISMISS', label: 'Dismiss', icon: <Ban className="w-3.5 h-3.5" />, hint: 'Not a gang (e.g. salary and rent look-alikes). A reason is required.' },
];

export const DecisionBar: React.FC<{ caseId: string; n: Net; saved: boolean }> = ({ caseId, n, saved }) => {
  const qc = useQueryClient();
  const { setActiveCaseId } = useCaseStore();
  const [open, setOpen] = useState<'DISMISS' | 'MERGE_FIR' | null>(null);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState('');
  const status = statusOf(n);
  const cases = useQuery({
    queryKey: ['projects-cases'],
    queryFn: async () => (await apiClient.get<CaseRow[]>('/api/v1/projects/cases')).data,
    enabled: open === 'MERGE_FIR',
  });
  const base = `/api/v1/cases/${encodeURIComponent(caseId)}/networks/${encodeURIComponent(n.network_id)}`;
  const copyInto = async (into: string) => {
    try {
      const r = (await apiClient.post<{ rows_copied: number }>(`${base}/split`, { new_case_id: into })).data;
      return `${n0(r.rows_copied)} transactions copied to ${into}`;
    } catch (e) {
      // the decision still stands; tell the investigator the copy did not happen
      return `Transactions not copied: ${errText(e)}`;
    }
  };
  const decide = useMutation({
    mutationFn: async (d: { decision?: NetworkDecisionKind; status?: NetworkStatus; reason?: string; target?: string }) => {
      let target = d.target;
      let note: string | null = null;
      if (d.decision === 'MAKE_CASE') {
        target = (await apiClient.post<{ case_id: string }>('/api/v1/projects/cases', { title: `Gang ${n.network_id} from ${caseId}` })).data.case_id;
      }
      if (target && (d.decision === 'MAKE_CASE' || d.decision === 'MERGE_FIR')) note = await copyInto(target);
      const res = (await apiClient.put<NetworkTriage>(`${base}/status`, { decision: d.decision, status: d.status, reason: d.reason ?? '', target_case_id: target ?? null })).data;
      return { res, note };
    },
    onSuccess: ({ res, note }) => {
      void qc.invalidateQueries({ queryKey: ['networks', caseId] });
      void qc.invalidateQueries({ queryKey: ['projects-cases'] });
      const t = res.target_case_id;
      toast.success(`${n.network_id}: ${STATUS_META[res.status].label}`, {
        description: note ?? undefined,
        action: t && res.decision !== 'DISMISS' ? { label: `Open ${t}`, onClick: () => setActiveCaseId(t) } : undefined,
      });
      setOpen(null);
      setReason('');
    },
    onError: (e) => toast.error(`Could not save the decision: ${errText(e)}`),
  });

  if (!saved)
    return (
      <div className="v6-glass rounded-xl px-3 py-2 flex items-center gap-2 text-[12px] text-[var(--fg-3)]" data-testid="decision-bar">
        <StatusPill status="CASE_OPENED" />
        This network is the case record itself. Decisions are saved for gangs found in uploaded statements.
      </div>
    );

  return (
    <div className="v6-glass rounded-xl px-2.5 py-2" data-testid="decision-bar">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {n.triage?.decision && (
          <span className="text-[11.5px] text-[var(--fg-3)] truncate max-w-[260px]" title={[n.triage.reason, n.triage.updated_by && `by ${n.triage.updated_by}`].filter(Boolean).join(' · ')}>
            {n.triage.target_case_id ? `→ ${n.triage.target_case_id}` : n.triage.reason ?? ''}
          </span>
        )}
        <span className="flex-1" />
        {DECISIONS.map((d) => (
          <Button
            key={d.id}
            size="sm"
            variant={d.id === 'DISMISS' ? 'ghost' : n.triage?.decision === d.id ? 'primary' : 'default'}
            title={d.hint}
            disabled={decide.isPending}
            isLoading={decide.isPending && decide.variables?.decision === d.id}
            onClick={() => (d.id === 'DISMISS' || d.id === 'MERGE_FIR' ? setOpen(open === d.id ? null : d.id) : decide.mutate({ decision: d.id }))}
            data-testid={`decide-${d.id}`}
          >
            <span className="flex items-center gap-1.5">
              {d.icon}
              {d.label}
            </span>
          </Button>
        ))}
        {status !== 'FREEZES_SENT' && status !== 'NEW' && status !== 'CLOSED' && (
          <Button size="sm" variant="ghost" title="Record that debit-freeze notices went to the banks" onClick={() => decide.mutate({ status: 'FREEZES_SENT' })}>
            <Check className="w-3.5 h-3.5 mr-1" /> Freezes sent
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            key={open}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (open === 'DISMISS' && reason.trim()) decide.mutate({ decision: 'DISMISS', reason });
              if (open === 'MERGE_FIR' && target) decide.mutate({ decision: 'MERGE_FIR', target, reason });
            }}
          >
            <div className="flex items-center gap-2 pt-2">
              {open === 'MERGE_FIR' ? (
                <select
                  autoFocus
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label="Case or FIR to merge into"
                  className="flex-1 min-w-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[12.5px] bg-[var(--surface-2)] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                >
                  <option value="">{cases.isLoading ? 'Loading cases…' : cases.isError ? 'Could not load cases' : 'Pick the case / FIR to merge into'}</option>
                  {(cases.data ?? [])
                    .filter((c) => c.case_id !== caseId)
                    .map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id}
                        {c.title ? ` — ${c.title}` : ''}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  autoFocus
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this not a gang? (e.g. salary and rent payments)"
                  aria-label="Reason for dismissing"
                  className="flex-1 min-w-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[12.5px] bg-[var(--surface-2)] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary" disabled={open === 'DISMISS' ? !reason.trim() : !target} isLoading={decide.isPending}>
                {open === 'DISMISS' ? 'Dismiss network' : 'Merge'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

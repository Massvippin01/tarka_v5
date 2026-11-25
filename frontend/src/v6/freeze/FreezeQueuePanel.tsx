import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { AlertTriangle, BellRing, Download, Landmark, Printer, RotateCw, Send, Snowflake } from 'lucide-react';
import apiClient from '../../api/client';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import { formatInr } from '../../lib/formatInr';
import { Chip, EmptyState, Skeleton, SourceNumber, type ChipVariant } from '../ui';
import { memberFigure } from '../network/networkFocus';
import type { NetworkMember } from '../triage/triage';
import { buildBankNotice, groupByBank, type FreezeNotice, type NoticeCaseContext, type NoticeStatus, type QueueRow } from './freezeQueue';
import { noticeOverdue, type RankedRow } from './actionPlan';
import type { ActionData } from './useActionData';

const SECTION_HELP: Record<'106' | '107', string> = {
  '106': 'BNSS §106: police may seize property suspected to be stolen. Used here as a lien on only the tainted credit, so a merchant’s clean money stays usable. Reported to the Magistrate at once.',
  '107': 'BNSS §107: a Magistrate can attach proceeds of crime and return them to the victim. The bank holds the mule balance while the attachment application is heard.',
};

export const STATUS_LABEL: Record<QueueRow['status'], string> = {
  NOT_SENT: 'Not sent',
  SENT: 'Waiting for bank',
  ACKNOWLEDGED: 'Bank acknowledged',
  FROZEN: 'Frozen',
  RELEASED: 'Released',
  REFUSED: 'Rejected',
};
const STATUS_CHIP: Record<QueueRow['status'], ChipVariant> = {
  NOT_SENT: 'urgent',
  SENT: 'flow',
  ACKNOWLEDGED: 'flow',
  FROZEN: 'frozen',
  RELEASED: 'safe',
  REFUSED: 'risk',
};

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const Tip: React.FC<{ text: React.ReactNode; children: React.ReactNode }> = ({ text, children }) => (
  <Tooltip.Provider delayDuration={150}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-[320px] rounded-lg border border-[var(--glass-border)] bg-[var(--glass-3)] px-3 py-2 text-[12px] leading-relaxed text-[var(--fg-1)] shadow-[var(--glass-shadow)] backdrop-blur-md"
        >
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const SectionTag: React.FC<{ section: '106' | '107' }> = ({ section }) => (
  <Tip text={SECTION_HELP[section]}>
    <span tabIndex={0} className="cursor-help text-[11px] text-[var(--fg-3)] underline decoration-dotted underline-offset-2">
      {section === '106' ? 'lien on credit' : 'hold balance'}
    </span>
  </Tip>
);

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function printText(title: string, text: string) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return false;
  const pre = w.document.createElement('pre');
  pre.textContent = text; // textContent: no HTML injection from case data
  pre.style.cssText = 'font:12px/1.6 ui-monospace,Consolas,monospace;white-space:pre-wrap;margin:32px';
  w.document.title = title;
  w.document.body.appendChild(pre);
  w.focus();
  w.print();
  return true;
}

/** Same query key everywhere (People page, this page) so a notice shows up on both at once. */
export function useFreezeNotices(caseId: string) {
  return useQuery<{ notices: FreezeNotice[] }>({
    queryKey: ['case', caseId, 'freeze-notices'],
    queryFn: async () => (await apiClient.get<{ notices: FreezeNotice[] }>(`/api/v1/cases/${encodeURIComponent(caseId)}/freeze-notices`)).data,
  });
}

const heldFigure = (fixture: CanonicalCaseFixture, r: RankedRow) =>
  memberFigure(fixture, { label: r.holderName, held_inr: r.amountInr } as NetworkMember & { held_inr: number }, 'held');

const GRID = 'grid grid-cols-[22px_minmax(120px,1.5fr)_minmax(92px,1fr)_112px_70px_minmax(112px,auto)] items-center gap-2';
const ROW_H = 54;

/* ---------- ranked queue ---------- */

export const FreezeQueuePanel: React.FC<{ data: ActionData; fixture: CanonicalCaseFixture; initialSelection?: string[] }> = ({ data, fixture, initialSelection }) => {
  const { rows, issue, loading, noticesError } = data;
  const selectable = (r: RankedRow) => r.status === 'NOT_SENT' || r.status === 'REFUSED';
  const [selected, setSelected] = useState<Set<string>>(() => {
    const keys = new Set((initialSelection ?? []).map((s) => s.trim().toLowerCase()));
    return new Set(rows.filter((r) => selectable(r) && (keys.has(r.nodeId.toLowerCase()) || keys.has(r.holderName.toLowerCase()))).map((r) => r.nodeId));
  });
  const chosen = rows.filter((r) => selected.has(r.nodeId) && selectable(r));
  const chosenGroups = useMemo(() => groupByBank(chosen), [chosen]);
  const openRows = rows.filter(selectable);
  const allChosen = openRows.length > 0 && openRows.every((r) => selected.has(r.nodeId));
  const maxScore = Math.max(1, ...rows.map((r) => r.score));
  const disabled = loading || !!noticesError;

  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_H, overscan: 8 });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="v6-glass rounded-2xl p-4 space-y-3" data-testid="v6-freeze-queue" aria-labelledby="fq-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 id="fq-title" className="text-[15px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-[var(--accent)]" /> Freeze queue
          </h3>
          <p className="text-[12.5px] text-[var(--fg-3)] mt-0.5">
            Accounts still holding victims’ money, ranked by what can be recovered and how urgent it is. Tick several and send one notice per bank.
          </p>
        </div>
        {openRows.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSelected(allChosen ? new Set() : new Set(openRows.map((r) => r.nodeId)))}
            className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[12px] font-medium text-[var(--fg-2)] hover:bg-[var(--hover)] disabled:opacity-50"
          >
            {allChosen ? 'Clear selection' : `Select all ${openRows.length.toLocaleString('en-IN')} not sent`}
          </button>
        )}
      </header>

      {noticesError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--color-risk-bg)] px-3 py-2 text-[12px] text-[var(--risk)]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Can’t reach the notice register ({noticesError.message}), so sending is paused. The amounts below are still correct.
          </span>
          <button type="button" onClick={data.retryNotices} className="inline-flex items-center gap-1 font-semibold hover:underline">
            <RotateCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading freeze queue">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Landmark className="w-5 h-5" />}
          title="Nothing left to freeze here"
          description={
            data.scope.level === 'project'
              ? 'No account in this case still holds money traced to a victim. Check the Money trail for cash-outs; those need ATM/CCTV requisitions instead.'
              : 'Nothing in this focus still holds victims’ money. Go back to the whole case to see every account that does.'
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--line)] overflow-hidden">
          <div role="row" className={clsx(GRID, 'px-2.5 py-2 bg-[var(--glass-1)] text-[11.5px] font-semibold text-[var(--fg-3)] border-b border-[var(--line)]')}>
            <span />
            <span>Account (rank)</span>
            <span>Bank</span>
            <span className="text-right">Still recoverable</span>
            <Tip text="Freeze value = Money still held × Likelihood still there (decays exponentially with a 24 h half-life since last outflow). Rank = Freeze value × notice status.">
              <span tabIndex={0} className="cursor-help">Freeze value / Urgency</span>
            </Tip>
            <span>Status</span>
          </div>
          <div ref={scroller} className="max-h-[540px] overflow-auto" role="rowgroup" aria-label={`${rows.length} accounts`}>
            <div style={{ height: v.getTotalSize(), position: 'relative' }}>
              {v.getVirtualItems().map((vi) => {
                const r = rows[vi.index];
                const on = selected.has(r.nodeId);
                return (
                  <div
                    key={r.nodeId}
                    role="row"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H, transform: `translateY(${vi.start}px)` }}
                    className={clsx(GRID, 'px-2.5 border-b border-[var(--line)] text-[12.5px] transition-colors', on ? 'bg-[var(--color-flow-bg)]' : 'hover:bg-[var(--hover)]')}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.holderName}`}
                      checked={on}
                      disabled={!selectable(r) || disabled}
                      onChange={() => toggle(r.nodeId)}
                      className="accent-[var(--accent)] h-3.5 w-3.5"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--fg-1)] truncate" title={r.holderName}>
                        <span className="mr-1.5 font-normal text-[var(--fg-3)] tabular-nums">{vi.index + 1}</span>
                        {r.holderName}
                      </div>
                      <div className="text-[11px] text-[var(--fg-3)] truncate" title={r.networkId ? `Network ${r.networkId}` : r.accountMasked}>
                        {r.networkId && data.fromServer && data.scope.level === 'project' ? r.networkId : r.accountMasked}
                      </div>
                    </div>
                    <div className="min-w-0">
                      {r.bankKey.known ? (
                        <>
                          <div className="truncate text-[var(--fg-2)]" title={r.bankKey.label}>{r.bankKey.label}</div>
                          {r.ifsc && <div className="v6-mono text-[11px] text-[var(--fg-3)] truncate">{r.ifsc}</div>}
                        </>
                      ) : (
                        <Tip text="Only the UPI handle is known. A handle can belong to more than one bank, so TARKA does not guess; the notice asks NPCI to confirm the bank.">
                          <div tabIndex={0} className="min-w-0 cursor-help">
                            <div className="truncate text-[var(--fg-2)]">{r.bankKey.key === 'UNKNOWN' ? '—' : r.bankKey.key}</div>
                            <div className="truncate text-[11px] italic text-[var(--fg-3)]">bank not known</div>
                          </div>
                        </Tip>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={clsx('font-semibold tabular-nums', !r.recoverableInr && 'text-[var(--fg-3)] line-through')}>
                        <SourceNumber figure={heldFigure(fixture, r)} />
                      </div>
                      <SectionTag section={r.section} />
                    </div>
                    <Tip text={<div className="space-y-1"><div>{r.formula}</div><div className="text-[var(--fg-3)]">{r.why}</div></div>}>
                      <span tabIndex={0} className="flex flex-col gap-0.5 cursor-help" aria-label={`${r.formula}. ${r.why}`}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-10 rounded-full bg-[var(--line)] overflow-hidden">
                            <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, (r.score / maxScore) * 100)}%` }} />
                          </span>
                          <span className="text-[11px] tabular-nums text-[var(--fg-2)]">{formatInr(r.freezeValueInr, { compact: true })}</span>
                        </span>
                      </span>
                    </Tip>
                    <span className="min-w-0">
                      <Chip variant={STATUS_CHIP[r.status]}>{STATUS_LABEL[r.status]}</Chip>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {chosen.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="sticky bottom-3 z-10 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-3)] px-3 py-2.5 shadow-[var(--glass-shadow)] backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12.5px] text-[var(--fg-2)]">
                {chosen.length.toLocaleString('en-IN')} account{chosen.length === 1 ? '' : 's'} at {chosenGroups.length} bank{chosenGroups.length === 1 ? '' : 's'}, total{' '}
                <strong className="text-[var(--fg-1)]">{formatInr(chosen.reduce((s, r) => s + r.amountInr, 0))}</strong>
              </span>
              <button
                type="button"
                disabled={issue.isPending}
                onClick={() => issue.mutate(chosenGroups, { onSuccess: () => setSelected(new Set()) })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {issue.isPending ? 'Preparing…' : `Prepare ${chosenGroups.length} bank notice${chosenGroups.length === 1 ? '' : 's'}`}
              </button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chosenGroups.slice(0, 12).map((g) => (
                <li key={g.key} className={clsx('rounded-md border border-[var(--line)] px-2 py-0.5 text-[11.5px]', g.known ? 'text-[var(--fg-2)]' : 'text-[var(--fg-3)] italic')} title={g.bank}>
                  {g.bank}: {g.rows.length} · {formatInr(g.totalInr, { compact: true })}
                </li>
              ))}
              {chosenGroups.length > 12 && <li className="px-1 text-[11.5px] text-[var(--fg-3)]">+{chosenGroups.length - 12} more banks</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

/* ---------- notices sent, bank replies, reminders ---------- */

function reminderText(ctx: NoticeCaseContext, n: FreezeNotice, totalInr: number, at: Date): string {
  return `REMINDER: FREEZE NOTICE AWAITING YOUR RESPONSE

Ref: ${n.referenceNo} (reminder ${(n.reminders?.length ?? 0) + 1})
Date: ${at.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
From: ${ctx.officer}, ${ctx.policeStation}
To: The Nodal Officer, ${n.bank}

Case: ${ctx.firNumber}
Our notice of ${fmtTime(n.sentAt)} asked you to hold ${formatInr(totalInr)} across ${n.accountIds.length} account(s).
${n.status === 'SENT' ? 'We have not received your acknowledgement.' : `You acknowledged it on ${fmtTime(n.acknowledgedAt)} but have not yet confirmed the amount held.`}

Please confirm the amount actually held in each account immediately.

Investigating Officer
${ctx.officer}, ${ctx.policeStation}`;
}

export const NoticeList: React.FC<{ data: ActionData }> = ({ data }) => {
  const { notices, allRows, ctx, advance, remind, now, loading, noticesError } = data;
  const [freezing, setFreezing] = useState<{ id: string; amount: string } | null>(null);
  const [releasing, setReleasing] = useState<{ id: string; note: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'bank'>('list');
  const total = (n: FreezeNotice) => allRows.filter((r) => n.accountIds.includes(r.nodeId)).reduce((s, r) => s + r.amountInr, 0);
  const text = (n: FreezeNotice) => {
    const g = groupByBank(allRows.filter((r) => n.accountIds.includes(r.nodeId)))[0];
    return g ? buildBankNotice(ctx, { ...g, bank: n.bank }, n.referenceNo, new Date(n.sentAt)) : '';
  };
  const overdueFirst = [...notices].sort((a, b) => Number(!!noticeOverdue(b, now)) - Number(!!noticeOverdue(a, now)));
  const byBank = useMemo(() => {
    const m = new Map<string, { bank: string; items: FreezeNotice[]; askedInr: number; frozenInr: number; overdueCount: number }>();
    for (const n of overdueFirst) {
      const key = n.bank || 'Unknown bank';
      const entry = m.get(key) ?? { bank: key, items: [], askedInr: 0, frozenInr: 0, overdueCount: 0 };
      entry.items.push(n);
      const asked = total(n);
      entry.askedInr += asked;
      if (n.status === 'FROZEN' || n.status === 'RELEASED') entry.frozenInr += n.frozenInr ?? asked;
      if (noticeOverdue(n, now)) entry.overdueCount += 1;
      m.set(key, entry);
    }
    return [...m.values()].sort((a, b) => b.overdueCount - a.overdueCount || b.askedInr - a.askedInr);
  }, [overdueFirst, now, allRows]);
  const btn = 'inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-[12px] text-[var(--fg-2)] hover:bg-[var(--hover)] disabled:opacity-50';

  return (
    <section className="v6-glass rounded-2xl p-4 space-y-3" aria-labelledby="nl-title" id="notices" data-testid="v6-notice-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="nl-title" className="text-[15px] font-semibold text-[var(--fg-1)]">Notices sent to banks</h3>
        {notices.length > 0 && (
          <div role="tablist" aria-label="Bank notice grouping" className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--glass-1)] p-0.5 text-[11.5px]">
            <button type="button" role="tab" aria-selected={viewMode === 'list'} onClick={() => setViewMode('list')} className={clsx('rounded-md px-2.5 py-1 font-medium', viewMode === 'list' ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--fg-3)]')}>
              All notices ({notices.length})
            </button>
            <button type="button" role="tab" aria-selected={viewMode === 'bank'} onClick={() => setViewMode('bank')} className={clsx('rounded-md px-2.5 py-1 font-medium', viewMode === 'bank' ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--fg-3)]')}>
              Per bank ({byBank.length})
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2"><Skeleton height={64} /><Skeleton height={64} /></div>
      ) : notices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--line-2)] px-3 py-5 text-center text-[12.5px] text-[var(--fg-3)]">
          {noticesError ? 'Notice history is unavailable right now.' : 'No notices yet. Tick accounts in the freeze queue and prepare one notice per bank.'}
        </p>
      ) : viewMode === 'bank' ? (
        <ul className="space-y-2.5" data-testid="per-bank-notices">
          {byBank.map((b) => (
            <li key={b.bank} className="rounded-xl border border-[var(--line)] bg-[var(--glass-1)] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-semibold text-[var(--fg-1)]">{b.bank}</div>
                  <div className="text-[11.5px] text-[var(--fg-3)] tabular-nums">
                    {b.items.length} notice{b.items.length === 1 ? '' : 's'} · asked {formatInr(b.askedInr)} · held/frozen {formatInr(b.frozenInr)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {b.overdueCount > 0 && <Chip variant="urgent">{b.overdueCount} overdue</Chip>}
                  {(['SENT', 'ACKNOWLEDGED', 'FROZEN', 'RELEASED', 'REFUSED'] as NoticeStatus[]).map((st) => {
                    const c = b.items.filter((x) => x.status === st).length;
                    return c > 0 ? <Chip key={st} variant={STATUS_CHIP[st]}>{c} {STATUS_LABEL[st]}</Chip> : null;
                  })}
                </div>
              </div>
              <div className="space-y-1.5 border-t border-[var(--line)] pt-2">
                {b.items.map((n) => (
                  <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="font-mono text-[var(--fg-2)] truncate">{n.referenceNo}</span>
                    <div className="flex items-center gap-1.5">
                      <Chip variant={STATUS_CHIP[n.status]}>{STATUS_LABEL[n.status]}</Chip>
                      {n.status === 'SENT' && (
                        <button type="button" className={btn} onClick={() => advance.mutate({ id: n.id, status: 'ACKNOWLEDGED' })}>Acknowledged</button>
                      )}
                      {(n.status === 'SENT' || n.status === 'ACKNOWLEDGED') && (
                        <button type="button" className={btn} onClick={() => advance.mutate({ id: n.id, status: 'FROZEN', frozenInr: Math.round(total(n)) })}>Freeze full ₹</button>
                      )}
                      {n.status === 'FROZEN' && (
                        <button type="button" className={btn} onClick={() => advance.mutate({ id: n.id, status: 'RELEASED', note: 'Released per court order' })}>Release</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {overdueFirst.map((n) => {
            const overdue = noticeOverdue(n, now);
            const busy = (advance.isPending && advance.variables?.id === n.id) || (remind.isPending && remind.variables === n.id);
            const next: NoticeStatus[] =
              n.status === 'SENT' ? ['ACKNOWLEDGED', 'FROZEN', 'REFUSED']
              : n.status === 'ACKNOWLEDGED' ? ['FROZEN', 'REFUSED']
              : n.status === 'FROZEN' ? ['RELEASED']
              : [];
            const asked = total(n);
            const steps: [string, string | null | undefined][] = [
              ['Sent', n.sentAt],
              ['Acknowledged', n.acknowledgedAt],
              [n.status === 'REFUSED' ? 'Rejected' : 'Frozen', n.status === 'REFUSED' ? n.refusedAt : n.frozenAt],
              ...(n.status === 'FROZEN' || n.status === 'RELEASED' ? [['Released', n.releasedAt] as [string, string | null | undefined]] : []),
            ];
            return (
              <li key={n.id} className={clsx('rounded-xl border bg-[var(--glass-1)] p-3', overdue ? 'border-[var(--urgent)]' : 'border-[var(--line)]')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--fg-1)] truncate max-w-[320px]" title={n.bank}>{n.bank}</span>
                      <Chip variant={STATUS_CHIP[n.status]}>{STATUS_LABEL[n.status]}</Chip>
                      {overdue && (
                        <Chip variant="urgent" icon={<BellRing className="w-3 h-3" />}>
                          {overdue === 'ack' ? 'No acknowledgement in 2 h' : 'No confirmation in 24 h'}
                        </Chip>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--fg-3)] truncate" title={n.referenceNo}>
                      {n.referenceNo} · {n.accountIds.length} account{n.accountIds.length === 1 ? '' : 's'} · asked {formatInr(asked)}
                      {n.status === 'FROZEN' && ` · bank holds ${formatInr(n.frozenInr ?? asked)}`}
                      {n.reminders?.length ? ` · ${n.reminders.length} reminder${n.reminders.length === 1 ? '' : 's'}, last ${fmtTime(n.reminders.at(-1))}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(n.status === 'SENT' || n.status === 'ACKNOWLEDGED') && (
                      <button
                        type="button"
                        disabled={busy}
                        className={clsx(btn, overdue && 'border-[var(--urgent)] text-[var(--urgent)]')}
                        onClick={() =>
                          remind.mutate(n.id, {
                            onSuccess: () => downloadText(`${n.referenceNo.replace(/[^\w-]+/g, '_')}_reminder.txt`, reminderText(ctx, n, asked, new Date())),
                          })
                        }
                      >
                        <BellRing className="w-3 h-3" /> Send reminder
                      </button>
                    )}
                    <button type="button" className={btn} onClick={() => downloadText(`${n.referenceNo.replace(/[^\w-]+/g, '_')}.txt`, text(n))}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                    <button type="button" className={btn} onClick={() => printText(n.referenceNo, text(n)) || downloadText(`${n.referenceNo.replace(/[^\w-]+/g, '_')}.txt`, text(n))}>
                      <Printer className="w-3 h-3" /> Print
                    </button>
                  </div>
                </div>

                <ol className={clsx('mt-2.5 grid gap-2', steps.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')} aria-label="Notice progress">
                  {steps.map(([label, at]) => (
                    <li key={label} className={clsx('rounded-lg px-2 py-1.5 text-[11.5px]', at ? 'bg-[var(--surface-2)] text-[var(--fg-1)]' : 'border border-dashed border-[var(--line)] text-[var(--fg-3)]')}>
                      <div className="font-semibold">{label}</div>
                      <div className="tabular-nums">{at ? fmtTime(at) : 'Waiting'}</div>
                    </li>
                  ))}
                </ol>
                {n.note && <p className="mt-1.5 text-[11.5px] text-[var(--fg-2)]">Note: {n.note}</p>}

                {next.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] text-[var(--fg-3)] mr-1">Bank replied:</span>
                    {freezing?.id === n.id ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const v = Number(freezing.amount.replace(/[,₹\s]/g, ''));
                          if (!Number.isFinite(v) || v < 0) return;
                          advance.mutate({ id: n.id, status: 'FROZEN', frozenInr: v }, { onSuccess: () => setFreezing(null) });
                        }}
                      >
                        <label className="text-[12px] text-[var(--fg-2)]" htmlFor={`amt-${n.id}`}>Amount the bank holds ₹</label>
                        <input
                          id={`amt-${n.id}`}
                          autoFocus
                          inputMode="decimal"
                          value={freezing.amount}
                          onChange={(e) => setFreezing({ id: n.id, amount: e.target.value })}
                          className="w-28 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-[12px] tabular-nums outline-none focus:border-[var(--accent)]"
                        />
                        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[12px] font-semibold text-white disabled:opacity-60">Save</button>
                        <button type="button" onClick={() => setFreezing(null)} className="text-[12px] text-[var(--fg-3)] hover:underline">Cancel</button>
                      </form>
                    ) : releasing?.id === n.id ? (
                      <form
                        className="flex flex-wrap items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          advance.mutate({ id: n.id, status: 'RELEASED', note: releasing.note || 'Released per order' }, { onSuccess: () => setReleasing(null) });
                        }}
                      >
                        <label className="text-[12px] text-[var(--fg-2)]" htmlFor={`rel-${n.id}`}>Release note</label>
                        <input
                          id={`rel-${n.id}`}
                          autoFocus
                          value={releasing.note}
                          onChange={(e) => setReleasing({ id: n.id, note: e.target.value })}
                          placeholder="e.g. Magistrate release order"
                          className="w-48 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
                        />
                        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[12px] font-semibold text-white disabled:opacity-60">Confirm release</button>
                        <button type="button" onClick={() => setReleasing(null)} className="text-[12px] text-[var(--fg-3)] hover:underline">Cancel</button>
                      </form>
                    ) : (
                      next.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            s === 'FROZEN'
                              ? setFreezing({ id: n.id, amount: String(Math.round(asked)) })
                              : s === 'RELEASED'
                                ? setReleasing({ id: n.id, note: '' })
                                : advance.mutate({ id: n.id, status: s })
                          }
                          className={clsx(
                            'rounded-lg border px-2 py-1 text-[12px] font-medium disabled:opacity-60',
                            s === 'REFUSED'
                              ? 'border-[var(--line)] text-[var(--risk)] hover:bg-[var(--color-risk-bg)]'
                              : s === 'FROZEN' || s === 'RELEASED'
                                ? 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--color-flow-bg)]'
                                : 'border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]',
                          )}
                        >
                          {s === 'ACKNOWLEDGED' ? 'Acknowledged' : s === 'FROZEN' ? 'Money frozen…' : s === 'RELEASED' ? 'Released…' : 'Rejected'}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

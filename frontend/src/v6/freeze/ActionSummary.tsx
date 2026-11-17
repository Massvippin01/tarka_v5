import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowUpRight, CheckCircle2, CircleDashed, Gavel } from 'lucide-react';
import { formatInr } from '../../lib/formatInr';
import { useCaseStore } from '../../store/useCaseStore';
import { Chip, SourceNumber } from '../ui';
import { isCourtReady } from './actionPlan';
import { Tip } from './FreezeQueuePanel';
import type { ActionData } from './useActionData';

const L = (v: number) => formatInr(v, { compact: true });

/** "₹42 L requested · ₹31 L frozen · 12/37 networks decided · 3 networks court-ready", with the recovery bar under it. */
export const ProgressHeader: React.FC<{ data: ActionData }> = ({ data }) => {
  const { progress: p, rows, figures, checklist, scope, networksReady } = data;
  const setActiveView = useCaseStore((s) => s.setActiveView);
  const reduce = useReducedMotion();
  const fig = (label: string) => figures.find((f) => f.label === label)!.figure;
  const waiting = rows.filter((r) => r.status === 'SENT' || r.status === 'ACKNOWLEDGED').reduce((s, r) => s + r.amountInr, 0);
  const notHeld = Math.max(0, p.requestedInr - p.frozenInr - waiting - p.refusedInr);
  const total = p.requestedInr + p.notSentInr;
  const segs = [
    { key: 'frozen', label: 'Frozen', v: p.frozenInr, cls: 'bg-[var(--accent)]' },
    { key: 'waiting', label: 'Waiting on banks', v: waiting, cls: 'bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]' },
    { key: 'short', label: 'Bank held less than asked', v: notHeld, cls: 'bg-[var(--fg-3)]' },
    { key: 'refused', label: 'Rejected', v: p.refusedInr, cls: 'bg-[var(--risk)]' },
    { key: 'notsent', label: 'No notice yet', v: p.notSentInr, cls: 'bg-[var(--line-2)]' },
  ].filter((s) => s.v > 0);
  const ready = isCourtReady(checklist);
  const missing = checklist.filter((c) => !c.ok).length;
  const link = 'rounded-md underline decoration-[var(--line-2)] underline-offset-4 hover:decoration-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]';

  return (
    <section className="v6-glass rounded-2xl px-5 py-4" aria-label="Progress" data-testid="v6-actions-progress">
      <p className="text-[19px] leading-snug font-semibold text-[var(--fg-1)] tracking-tight tabular-nums">
        <SourceNumber figure={fig('requested')} className={link}>{L(p.requestedInr)}</SourceNumber>
        <span className="font-normal text-[var(--fg-2)]"> requested</span>
        <span className="mx-2 text-[var(--fg-3)]">·</span>
        <SourceNumber figure={fig('frozen')} className={link}>{L(p.frozenInr)}</SourceNumber>
        <span className="font-normal text-[var(--fg-2)]"> frozen</span>
        <span className="mx-2 text-[var(--fg-3)]">·</span>
        <button type="button" className={link} onClick={() => setActiveView('network')} title="Open the networks to decide the rest">
          {p.networksDecided}/{p.networksTotal}
        </button>
        <span className="font-normal text-[var(--fg-2)]"> network{p.networksTotal === 1 ? '' : 's'} decided</span>
        <span className="mx-2 text-[var(--fg-3)]">·</span>
        <a href="#court-checklist" className={link}>
          {networksReady !== null ? `${networksReady}` : ready ? 'Court ready' : `${missing} thing${missing === 1 ? '' : 's'} missing`}
        </a>
        {networksReady !== null && (
          <span className="font-normal text-[var(--fg-2)]"> network{networksReady === 1 ? '' : 's'} court-ready</span>
        )}
        {networksReady === null && <span className="font-normal text-[var(--fg-2)]"> for court</span>}
      </p>

      {total > 0 ? (
        <>
          <div
            className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
            role="img"
            aria-label={segs.map((s) => `${s.label} ${L(s.v)}`).join(', ')}
          >
            {segs.map((s, i) => (
              <motion.span
                key={s.key}
                className={clsx('h-full', s.cls, i > 0 && 'border-l border-[var(--surface-1)]')}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${(s.v / total) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--fg-2)]">
            {segs.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 tabular-nums">
                <span className={clsx('h-2 w-2 rounded-full', s.cls)} aria-hidden /> {s.label} {L(s.v)}
              </li>
            ))}
            <li className="text-[var(--fg-3)]">of {L(total)} that can still be frozen{scope.level !== 'project' ? ' in this focus' : ''}</li>
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[12.5px] text-[var(--fg-3)]">No money left in any account here that a freeze could catch.</p>
      )}
    </section>
  );
};

export const CourtChecklist: React.FC<{ data: ActionData }> = ({ data }) => {
  const { checklist, scope } = data;
  const setActiveView = useCaseStore((s) => s.setActiveView);
  const ready = isCourtReady(checklist);
  const open = checklist.filter((c) => !c.ok);
  const done = checklist.filter((c) => c.ok);
  return (
    <section id="court-checklist" className="v6-glass rounded-2xl p-4 space-y-3 scroll-mt-20" aria-labelledby="cc-title">
      <header className="flex items-center justify-between gap-2">
        <h3 id="cc-title" className="text-[15px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
          <Gavel className="w-4 h-4 text-[var(--accent)]" /> Before court
        </h3>
        <Chip variant={ready ? 'safe' : 'urgent'}>{ready ? 'Court ready' : `${open.length} to do`}</Chip>
      </header>
      <p className="text-[12.5px] text-[var(--fg-3)]">
        {ready
          ? `Everything checked for this ${scope.level === 'project' ? 'case' : scope.level}. Build the report and file it.`
          : `What is still missing for this ${scope.level === 'project' ? 'case' : scope.level}, most important first.`}
      </p>
      <ul className="space-y-1.5">
        {[...open, ...done].map((c) => (
          <li key={c.id} className={clsx('flex items-start gap-2.5 rounded-lg px-2.5 py-2', !c.ok && 'bg-[var(--glass-1)] border border-[var(--line)]')}>
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--safe)]" aria-label="Done" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--urgent)]" aria-label="Missing" />
            )}
            <div className="min-w-0 flex-1">
              <Tip text={c.hint}>
                <span tabIndex={0} className={clsx('block text-[12.5px] leading-snug cursor-help', c.ok ? 'text-[var(--fg-3)]' : 'text-[var(--fg-1)] font-medium')}>
                  {c.text}
                </span>
              </Tip>
            </div>
            {!c.ok && c.view && (
              <button
                type="button"
                onClick={() => setActiveView(c.view!)}
                className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Fix <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
            {!c.ok && !c.view && (
              <a href={c.id === 'notices' ? '#fq-title' : '#notices'} className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-[var(--accent)] hover:underline">
                Go <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

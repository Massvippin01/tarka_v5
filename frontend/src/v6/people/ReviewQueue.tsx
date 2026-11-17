import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, GitMerge, Undo2, UserRoundX, X } from 'lucide-react';
import clsx from 'clsx';
import { BorderBeam } from '../../components/magicui/border-beam';
import { setFocus } from '../../lib/focusUrl';
import { plural, sortReview, type PairVerdict, type ReviewPair } from '../../selectors/peopleSelectors';
import { Button } from '../ui';
import { usePairVerdict } from './usePeopleData';

/** Ask for a reason, then save. Used for "Not same" here and "Not a mule" in the dossier. */
export const ReasonDialog: React.FC<{
  open: boolean;
  title: string;
  hint: string;
  confirm: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
}> = ({ open, title, hint, confirm, busy, onClose, onSave }) => {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content className="v6-glass fixed left-1/2 top-1/2 z-50 w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-[var(--fg-1)] shadow-xl">
          <Dialog.Title className="text-[15px] font-[650]">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-[12.5px] text-[var(--fg-2)]">{hint}</Dialog.Description>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim()) onSave(reason.trim());
            }}
          >
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Salary account; employer letter and 2 years of statements checked"
              className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--glass-1)] p-2.5 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <p className="text-[12px] text-[var(--fg-3)]">Saved to the audit log with your name and the time.</p>
            <div className="flex justify-end gap-2 whitespace-nowrap">
              <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" variant="primary" disabled={!reason.trim() || busy} isLoading={busy}>{confirm}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const PairCard: React.FC<{ p: ReviewPair; caseId: string; onAskReason: (p: ReviewPair) => void }> = ({ p, caseId, onAskReason }) => {
  const save = usePairVerdict(caseId);
  const decide = (verdict: PairVerdict | null) => save.mutate({ a: p.a, b: p.b, verdict });
  const name = (label: string) => (
    <button
      type="button"
      onClick={() => setFocus({ networkId: null, account: label })}
      className="block max-w-full truncate text-left v6-mono text-[12.5px] font-medium text-[var(--fg-1)] hover:text-[var(--accent)] hover:underline"
      title={`${label}\nOpen this account`}
    >
      {label}
    </button>
  );
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={clsx('rounded-xl border border-[var(--line)] bg-[var(--glass-1)] p-3', p.verdict && 'opacity-70')}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {name(p.a)}
        <span className="text-[11.5px] text-[var(--fg-3)]">and</span>
        {name(p.b)}
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--fg-2)]">
        Probably the same person: <span className="font-medium text-[var(--fg-1)]">{p.why}</span>.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        {p.verdict ? (
          <>
            <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold',
              p.verdict === 'MERGE' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'bg-[var(--glass-2)] text-[var(--fg-2)]')}>
              {p.verdict === 'MERGE' ? <><GitMerge className="h-3.5 w-3.5" /> Same person</> : <><UserRoundX className="h-3.5 w-3.5" /> Not the same</>}
            </span>
            {p.savable && (
              <button type="button" onClick={() => decide(null)} disabled={save.isPending} className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <Undo2 className="h-3 w-3" /> Undo
              </button>
            )}
          </>
        ) : p.savable ? (
          <>
            <Button size="sm" variant="primary" onClick={() => decide('MERGE')} isLoading={save.isPending} title="Record that both accounts belong to one person (audit-logged)">
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Merge</span>
            </Button>
            <Button size="sm" onClick={() => onAskReason(p)} disabled={save.isPending} title="Record that these are different people; you'll be asked why">
              <span className="flex items-center gap-1"><X className="h-3.5 w-3.5" /> Not same</span>
            </Button>
          </>
        ) : (
          <span className="text-[12px] text-[var(--fg-3)]" title="Demo cases have no uploaded statements to record decisions against.">
            Demo case: decisions are saved once statements are uploaded.
          </span>
        )}
      </div>
    </motion.li>
  );
};

export const ReviewQueue: React.FC<{ caseId: string; pairs: ReviewPair[] }> = ({ caseId, pairs }) => {
  const [asking, setAsking] = useState<ReviewPair | null>(null);
  const [showAll, setShowAll] = useState(false);
  const save = usePairVerdict(caseId);
  const sorted = sortReview(pairs);
  const pending = sorted.filter((p) => !p.verdict).length;
  const visible = showAll ? sorted : sorted.slice(0, 6);
  if (!pairs.length) return null;
  return (
    <section aria-label="Same-person check" className="v6-glass relative overflow-hidden rounded-2xl p-4" data-testid="review-queue">
      {pending > 0 && <BorderBeam size={80} duration={8} colorFrom="var(--accent)" colorTo="var(--flow)" />}
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-[650] text-[var(--fg-1)]">Are these the same person?</h3>
          <p className="text-[12.5px] text-[var(--fg-2)]" title="Entity resolution: TARKA never merges people by itself. Each pair needs an investigator's decision, which is audit-logged.">
            {pending ? `${plural(pending, 'pair')} to check.` : 'All pairs checked.'} TARKA suggests; you decide.
          </p>
        </div>
        {sorted.length > 6 && (
          <button type="button" onClick={() => setShowAll((s) => !s)} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
            {showAll ? 'Show fewer' : `Show all ${sorted.length.toLocaleString('en-IN')}`}
          </button>
        )}
      </header>
      <ul className={clsx('grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3', showAll && 'max-h-[520px] overflow-auto pr-1')}>
        <AnimatePresence initial={false}>
          {visible.map((p) => <PairCard key={p.key} p={p} caseId={caseId} onAskReason={setAsking} />)}
        </AnimatePresence>
      </ul>
      <ReasonDialog
        open={!!asking}
        title="Not the same person"
        hint={asking ? `Why are ${asking.a} and ${asking.b} different people?` : ''}
        confirm="Save: not the same"
        busy={save.isPending}
        onClose={() => setAsking(null)}
        onSave={(reason) => asking && save.mutate({ a: asking.a, b: asking.b, verdict: 'NOT_SAME', reason }, { onSuccess: () => setAsking(null) })}
      />
    </section>
  );
};

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Info } from 'lucide-react';
import { PageHead, EmptyState, TechnicalDetails } from '../ui';
import { formatInr } from '../../utils/formatters';
import { buildLoom, formatSpan, type LoomEvent } from '../../selectors/timelineSelectors';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';

const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});
const ist = (ts: number) => `${IST.format(ts)} IST`;


const CaseTimelineInner: React.FC<ActiveCaseProps> = ({ fixture }) => {
  const view = useMemo(() => buildLoom(fixture), [fixture]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = view.events.find((e) => e.id === selectedId) ?? null;
  const span = Math.max(1, view.end - view.start);
  const x = (e: LoomEvent) => `${2 + ((e.ts - view.start) / span) * 96}%`;
  const highlighted = new Set(view.gaps.flatMap((g) => [g.fromId, g.toId]));

  return (
    <div className="v6-enter space-y-4" data-testid="v6-case-timeline">
      <PageHead
        kicker="Advanced"
        title="Case timeline"
        subtitle="See what happened when — contact, money, complaint and police action — on one clock, so you know how fast this gang moves."
      />

      {view.events.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-5 h-5" />}
          title="No dated events in this case yet"
          description="The timeline fills in from this case's complaint, bank statements and call or device records once they are uploaded."
        />
      ) : (
        <>
          {view.gaps.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {view.gaps.map((g) => (
                <div key={g.id} className="v6-card">
                  <span className="text-[12px] font-medium text-[var(--fg-3)] flex items-center gap-1 truncate" title={g.tip}>
                    {g.label} <Info className="w-3 h-3 opacity-60 shrink-0" />
                  </span>
                  <span className="block text-[24px] leading-tight font-semibold text-[var(--fg-1)] mt-1 tabular-nums">
                    {formatSpan(g.ms)}
                  </span>
                  {g.id === 'loss-to-complaint' && (
                    <span className={`block text-[12px] mt-0.5 ${g.ms <= 3600000 ? 'text-[var(--safe)]' : 'text-[var(--fg-3)]'}`}>
                      {g.ms <= 3600000 ? 'Inside the golden hour' : 'After the golden hour'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="v6-card">
            <div className="v6-card-h">
              <div>
                <div className="v6-card-t">Events by source</div>
                <div className="v6-card-s">{ist(view.start)} → {ist(view.end)} · {view.events.length.toLocaleString('en-IN')} events. Click a dot for details.</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {view.lanes.map((lane) => (
                <div key={lane.id} className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <span className="text-[12.5px] text-[var(--fg-2)] truncate" title={lane.tip}>
                    {lane.label} <span className="text-[var(--fg-3)]">· {lane.count}</span>
                  </span>
                  <div className="relative h-9 rounded-lg bg-[var(--surface-2)]/60 border border-[var(--line)]">
                    <div className="absolute inset-x-2 top-1/2 h-px bg-[var(--line-2)]" />
                    {view.events.filter((e) => e.lane === lane.id).map((e) => {
                      const on = e.id === selectedId;
                      return (
                        <button key={e.id} type="button" onClick={() => setSelectedId(on ? null : e.id)}
                          title={`${ist(e.ts)} · ${e.title}`} aria-label={`${e.title}, ${ist(e.ts)}`} aria-pressed={on}
                          style={{ left: x(e) }}
                          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                            on ? 'w-4 h-4 bg-[var(--accent)] ring-4 ring-[var(--accent)]/25'
                              : highlighted.has(e.id) ? 'w-3 h-3 bg-[var(--accent)] hover:scale-125'
                                : 'w-2.5 h-2.5 bg-[var(--fg-3)] hover:bg-[var(--accent)] hover:scale-125'
                          }`} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {view.hiddenTxns > 0 && (
              <p className="mt-2 text-[12px] text-[var(--fg-3)]">
                Showing the first {(view.events.filter((e) => e.lane === 'money').length).toLocaleString('en-IN')} transactions;
                {' '}{view.hiddenTxns.toLocaleString('en-IN')} later ones are in the Money trail.
              </p>
            )}
            <AnimatePresence>
              {selected && (
                <motion.div key={selected.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-bg)]/40 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-[13.5px] text-[var(--fg-1)] truncate" title={selected.title}>{selected.title}</span>
                    <span className="text-[12px] text-[var(--fg-3)] whitespace-nowrap tabular-nums">{ist(selected.ts)}</span>
                  </div>
                  {selected.detail && <p className="text-[12.5px] text-[var(--fg-2)] mt-1">{selected.detail}</p>}
                  <p className="text-[12px] text-[var(--fg-3)] mt-1.5">
                    {selected.amount !== undefined && <span className="text-[var(--fg-1)] font-medium mr-2">{formatInr(selected.amount)}</span>}
                    Source: {selected.source}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="v6-card !p-0 overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-[var(--surface-1)] text-[var(--fg-3)] text-left">
                  <tr><th className="px-4 py-2 font-medium w-[150px]">When (IST)</th><th className="px-2 py-2 font-medium w-[170px]">Source</th><th className="px-2 py-2 font-medium">What happened</th><th className="px-4 py-2 font-medium text-right w-[120px]">Amount</th></tr>
                </thead>
                <tbody>
                  {view.events.map((e) => (
                    <tr key={e.id} onClick={() => setSelectedId(e.id)}
                      className={`border-t border-[var(--line)] cursor-pointer ${e.id === selectedId ? 'bg-[var(--accent-bg)]/50' : 'hover:bg-[var(--hover)]'}`}>
                      <td className="px-4 py-2 tabular-nums text-[var(--fg-2)] whitespace-nowrap">{IST.format(e.ts)}</td>
                      <td className="px-2 py-2 text-[var(--fg-3)] truncate max-w-[170px]" title={view.lanes.find((l) => l.id === e.lane)?.label}>{view.lanes.find((l) => l.id === e.lane)?.label}</td>
                      <td className="px-2 py-2 text-[var(--fg-1)] truncate max-w-0 w-full" title={e.detail || e.title}>{e.title}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[var(--fg-1)]">{e.amount !== undefined ? formatInr(e.amount) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <TechnicalDetails>
        <p>Every event comes from this case's own record: the case timeline entries when the case has them, otherwise the
          transactions read from its uploaded statements (salary credits left out). Nothing from other cases is shown.</p>
        <p>Times are each source's own timestamp, converted to Indian Standard Time. Sources can disagree by a few minutes
          because bank, telecom and phone clocks are not synchronised; check the original record before quoting an exact minute in court.</p>
        <p>The "golden hour" is the first 60 minutes after the loss, when a 1930 complaint is most likely to get the money frozen.</p>
      </TechnicalDetails>
    </div>
  );
};

export const CaseTimelineScreen = withActiveCase(CaseTimelineInner);

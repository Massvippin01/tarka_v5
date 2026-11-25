import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Clock, CheckCircle2 } from 'lucide-react';
import type { GoldenHourClock } from '../../fixtures/cases';
import { Chip } from '../ui';

function fmtSecs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const GoldenHourClockBar: React.FC<{ goldenHour?: GoldenHourClock | null }> = ({ goldenHour }) => {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (!goldenHour?.active || goldenHour.total_elapsed_secs != null) return;
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [goldenHour?.active, goldenHour?.total_elapsed_secs]);

  if (!goldenHour?.active) return null;
  const elapsed =
    goldenHour.total_elapsed_secs != null
      ? goldenHour.total_elapsed_secs
      : goldenHour.started_at
        ? Math.max(0, nowSec - goldenHour.started_at)
        : 0;
  const targetSecs = (goldenHour.target_mins || 5) * 60;
  const underTarget = elapsed <= targetSecs;

  return (
    <section className="v6-glass rounded-2xl px-4 py-3 space-y-2 border border-[var(--line)]" data-testid="golden-hour-bar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--fg-1)]">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          Golden-hour rapid containment
          <span className="text-[12px] font-normal text-[var(--fg-3)]">
            (target &lt; {goldenHour.target_mins || 5} min from complaint)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="v6-mono text-[13px] font-bold tabular-nums text-[var(--fg-1)]" data-testid="golden-hour-elapsed">
            {fmtSecs(elapsed)}
          </span>
          <Chip variant={goldenHour.total_elapsed_secs != null && underTarget ? 'safe' : underTarget ? 'flow' : 'urgent'}>
            {goldenHour.total_elapsed_secs != null
              ? underTarget
                ? 'Under 5 min target'
                : 'Over 5 min target'
              : 'Live clock'}
          </Chip>
        </div>
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
        {goldenHour.steps.map((st) => {
          const done = st.at !== null;
          return (
            <li
              key={st.key}
              className={clsx(
                'rounded-lg px-2.5 py-1.5 border',
                done ? 'border-[var(--safe)]/30 bg-[var(--surface-2)] text-[var(--fg-1)]' : 'border-dashed border-[var(--line)] text-[var(--fg-3)]',
              )}
            >
              <div className="flex items-center gap-1 font-medium truncate">
                {done && <CheckCircle2 className="w-3 h-3 text-[var(--safe)] shrink-0" />}
                <span className="truncate">{st.label}</span>
              </div>
              <div className="v6-mono text-[11px] tabular-nums mt-0.5">
                {st.elapsed_secs != null ? `+${fmtSecs(st.elapsed_secs)}` : 'Pending'}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

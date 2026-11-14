import React from 'react';
import clsx from 'clsx';

export interface ScoreWaterfallItem {
  label: string;
  value: number;
}

export interface ScoreWaterfallProps {
  items: ScoreWaterfallItem[];
  className?: string;
}

export const ScoreWaterfall: React.FC<ScoreWaterfallProps> = ({
  items,
  className,
}) => {
  const maxAbs = Math.max(
    1,
    ...items.map((it) => Math.abs(it.value))
  );

  return (
    <div className={clsx('space-y-1', className)}>
      {items.map((it, idx) => {
        const isNegative = it.value < 0;
        const pct = Math.min(100, (Math.abs(it.value) / maxAbs) * 100);

        return (
          <div key={idx} className="v6-wf-row">
            <div className="truncate text-xs text-[var(--fg-1)]" title={it.label}>
              {it.label}
            </div>
            <div className="bg-[var(--surface-3)] rounded-full h-2.5 overflow-hidden">
              <div
                className="v6-wf-bar h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  animationDelay: `${idx * 60}ms`,
                  background: isNegative
                    ? 'linear-gradient(90deg, var(--safe), #34d399)'
                    : 'linear-gradient(90deg, var(--risk), #fb7185)',
                }}
              />
            </div>
            <div
              className={clsx(
                'v6-mono text-right text-xs font-semibold',
                isNegative ? 'text-[var(--safe)]' : 'text-[#fda4af]'
              )}
            >
              {it.value > 0 ? `+${it.value}` : it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

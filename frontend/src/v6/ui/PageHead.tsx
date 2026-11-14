import React from 'react';
import clsx from 'clsx';

export interface PageHeadProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHead: React.FC<PageHeadProps> = ({
  kicker,
  title,
  subtitle,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={clsx('flex items-center justify-between gap-4 mb-2.5', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {kicker && (
            <span className="text-[12px] font-bold tracking-wider uppercase text-[var(--accent)] flex-none">
              {kicker}
            </span>
          )}
          {kicker && <span className="text-[var(--line-2)] flex-none">/</span>}
          <h1 className="text-[20px] font-[650] tracking-tight leading-tight text-[var(--fg-1)] truncate">
            {title}
          </h1>
          {badge && <div className="flex-none">{badge}</div>}
        </div>
        {subtitle && (
          <div className="text-[12.5px] text-[var(--fg-2)] mt-0.5 truncate flex items-center gap-2">
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-none">
          {actions}
        </div>
      )}
    </div>
  );
};

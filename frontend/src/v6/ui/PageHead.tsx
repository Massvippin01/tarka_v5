import React from 'react';
import clsx from 'clsx';

export interface PageHeadProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHead: React.FC<PageHeadProps> = ({
  kicker,
  title,
  subtitle,
  actions,
  className,
}) => {
  return (
    <div className={clsx('flex items-end justify-between gap-4 mb-4', className)}>
      <div>
        {kicker && (
          <div className="text-xs font-semibold tracking-wider uppercase text-[var(--flow-2)] mb-1">
            {kicker}
          </div>
        )}
        <h1 className="text-[26px] font-extrabold tracking-tight leading-tight text-[var(--fg-1)]">
          {title}
        </h1>
        {subtitle && (
          <div className="text-sm text-[var(--fg-2)] mt-1">
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-none">
          {actions}
        </div>
      )}
    </div>
  );
};

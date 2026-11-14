import React from 'react';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--surface-1)]',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[var(--surface-3)] text-[var(--fg-2)] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <div className="text-base font-bold text-[var(--fg-1)] mb-1">
        {title}
      </div>
      {description && (
        <div className="text-xs text-[var(--fg-3)] max-w-sm mb-4 leading-relaxed">
          {description}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

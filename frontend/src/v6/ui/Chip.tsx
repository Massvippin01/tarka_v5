import React from 'react';
import clsx from 'clsx';

export type ChipVariant = 'risk' | 'safe' | 'urgent' | 'flow' | 'frozen' | 'muted';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  withDot?: boolean;
  live?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  className,
  variant = 'muted',
  withDot = false,
  live = false,
  icon,
  children,
  ...props
}) => {
  return (
    <span
      className={clsx('v6-chip', variant, className)}
      {...props}
    >
      {withDot && <span className={clsx('v6-dot', live && 'live')} />}
      {icon && <span className="flex-none">{icon}</span>}
      {children}
    </span>
  );
};

import React from 'react';
import clsx from 'clsx';
import { useCountUp } from './useCountUp';

export interface KpiCardProps {
  label: React.ReactNode;
  value: number;
  isInr?: boolean;
  showPaise?: boolean;
  icon?: React.ReactNode;
  iconClass?: string;
  foot?: React.ReactNode;
  onWhy?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  isInr = false,
  showPaise = false,
  icon,
  iconClass,
  foot,
  onWhy,
  className,
}) => {
  const displayVal = useCountUp(value, { isInr, showPaise });

  return (
    <div className={clsx('v6-card v6-kpi', className)}>
      <div className="k-label">
        {icon && (
          <span className={clsx('v6-k-ico', iconClass)}>
            {icon}
          </span>
        )}
        <span className="flex-1">{label}</span>
        {onWhy && (
          <button
            type="button"
            className="v6-why"
            onClick={onWhy}
          >
            Why?
          </button>
        )}
      </div>
      <div className="k-val v6-mono">{displayVal}</div>
      {foot && <div className="k-foot">{foot}</div>}
    </div>
  );
};

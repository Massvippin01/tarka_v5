import React from 'react';
import clsx from 'clsx';
import { Check, AlertTriangle, IndianRupee } from 'lucide-react';

export type FindingVariant = 'safe' | 'warn' | 'urgent';

export interface FindingStripProps {
  variant?: FindingVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const FindingStrip: React.FC<FindingStripProps> = ({
  variant = 'safe',
  icon,
  children,
  action,
  className,
}) => {
  const defaultIcon = {
    safe: <Check className="w-4 h-4" />,
    warn: <AlertTriangle className="w-4 h-4" />,
    urgent: <IndianRupee className="w-4 h-4" />,
  }[variant];

  return (
    <div
      className={clsx(
        'v6-finding',
        variant !== 'safe' && variant,
        className
      )}
    >
      <div className="v6-finding-ico">
        {icon || defaultIcon}
      </div>
      <div className="v6-finding-text">
        {children}
      </div>
      {action && (
        <div className="flex-none ml-2">
          {action}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={clsx('v6-card', className)} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}) => {
  return (
    <div className={clsx('v6-card-h', className)} {...props}>
      <div>
        {title && <div className="v6-card-t">{title}</div>}
        {subtitle && <div className="v6-card-s">{subtitle}</div>}
      </div>
      {action && <div className="flex items-center gap-2 flex-none">{action}</div>}
      {children}
    </div>
  );
};

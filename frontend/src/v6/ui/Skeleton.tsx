import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  width,
  height,
  style,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-[var(--surface-3)]',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'rounded h-4 my-1',
        variant === 'rect' && 'rounded-lg',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};
